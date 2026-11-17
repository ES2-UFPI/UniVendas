import { useEffect, useRef, useState } from 'react'
import { Falha } from '../../../core/falha'
import { LocalizacaoService, type LatLng } from '../../../core/localizacaoService'
import { useSessaoStore } from '../../../core/sessaoStore'
import { esquecerPresenca, lembrarPresenca, lerMarcaPresenca } from '../data/MarcaPresencaAtiva'
import { SupabasePresencaRepository } from '../data/SupabasePresencaRepository'
import { ResultadoRegistro, type PresencaRepository } from '../domain/PresencaRepository'
import { deveEnviarSinal, type UltimoSinal } from '../domain/RegraSinal'

/** Tamanho máximo da referência ("em frente ao RU"), RN18. */
export const LIMITE_REFERENCIA = 80

const MENSAGEM_FORA_DO_CAMPUS =
  'Você está fora do campus. Entre no campus para ficar visível no mapa.'
const MENSAGEM_NAO_RELIGOU =
  'Sua presença estava desligada e você está fora do campus, então ela não voltou sozinha. Ao chegar, toque em "Estou no campus".'
const MENSAGEM_DESLIGADO_PELO_SERVIDOR =
  'Sua presença foi desligada: você saiu do campus ou ficou muito tempo sem sinal. Toque em "Estou no campus" para ligar de novo.'
const MENSAGEM_REFERENCIA = `A referência pode ter até ${LIMITE_REFERENCIA} caracteres.`
const MENSAGEM_PADRAO = 'Não foi possível ficar visível no mapa. Tente de novo.'
const MENSAGEM_DESLIGAR = 'Não foi possível desligar sua presença. Tente de novo.'

/** De quanto em quanto tempo a regra do sinal é reavaliada, para pegar os 2 minutos com o vendedor parado. */
const CONFERENCIA_MS = 15_000

interface Opcoes {
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: PresencaRepository
  /** Nos testes, uma localização falsa (o jsdom não tem GPS); no app, o serviço do `core`. */
  localizacao?: Pick<LocalizacaoService, 'posicaoAtual' | 'acompanhar'>
}

/**
 * ViewModel do painel do vendedor (US04): guarda a referência, o estado do botão
 * "Estou no campus" e o erro. Ao abrir, recupera a presença que o vendedor já tem ligada; se o servidor
 * já a apagou mas o vendedor não desligou de propósito, liga de novo sozinho quando ele está no campus (RN16).
 * Se o servidor desligar enquanto o painel está aberto (RN15, RN16), mostra o aviso.
 * Ao ligar, lê a posição do celular e chama o `PresencaRepository`; ao desligar, volta ao estado inicial.
 * Enquanto está ativo, acompanha o GPS e renova o sinal a cada 2 minutos ou 25 m (RN13).
 * O vendedor pode escolher um ponto fixo no mapa (RN14): o marcador fica nele, e não na posição do
 * celular. O servidor recusa ponto fora do campus.
 */
export function usePainelVendedorViewModel({ repositorio, localizacao }: Opcoes = {}) {
  const [ativo, setAtivo] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [referencia, setReferencia] = useState('')
  // Ponto fixo escolhido no mapa (RN14); null = o marcador mostra a posição real do celular.
  const [ponto, setPonto] = useState<LatLng | null>(null)
  const usuarioId = useSessaoStore((s) => s.usuario?.id ?? null)

  // O estado `carregando` só muda no próximo render; a ref barra o segundo toque que chega antes disso.
  const emAndamento = useRef(false)
  // Onde e quando foi o último sinal enviado; a regra do RN13 compara com isso.
  const ultimoSinal = useRef<UltimoSinal | null>(null)

  useEffect(() => {
    let cancelado = false
    const repo = repositorio ?? new SupabasePresencaRepository()

    // Religa sozinho: o vendedor tinha ligado e não desligou de propósito, mas o servidor apagou a presença.
    async function religar(referenciaSalva: string, pontoSalvo: LatLng | null) {
      emAndamento.current = true
      setCarregando(true)
      try {
        const real = await (localizacao ?? new LocalizacaoService()).posicaoAtual()
        if (cancelado) return
        const resultado = await repo.registrar(real, pontoSalvo, referenciaSalva)
        if (cancelado) return
        if (resultado === ResultadoRegistro.ATIVO) {
          ultimoSinal.current = { posicao: real, em: new Date() }
          setAtivo(true)
          setReferencia(referenciaSalva)
          setPonto(pontoSalvo)
        } else {
          if (usuarioId) esquecerPresenca(usuarioId)
          setErro(MENSAGEM_NAO_RELIGOU)
        }
      } catch (e) {
        // Sem GPS ou sem rede agora: a marca fica, e o vendedor liga à mão se quiser.
        if (e instanceof Falha && e.codigo === 'nao-e-vendedor' && usuarioId) {
          esquecerPresenca(usuarioId)
        }
      } finally {
        emAndamento.current = false
        setCarregando(false)
      }
    }

    repo
      .minhaPresenca()
      .then(async (presenca) => {
        if (cancelado) return
        if (presenca) {
          ultimoSinal.current = { posicao: presenca.posicao, em: presenca.ultimoSinalEm }
          setAtivo(true)
          setReferencia(presenca.referencia ?? '')
          // Se a presença usa um ponto fixo, os próximos sinais precisam mandar o mesmo ponto.
          setPonto(presenca.pontoEscolhido ? presenca.posicao : null)
          return
        }
        const marca = usuarioId ? lerMarcaPresenca(usuarioId) : null
        if (marca && !emAndamento.current) await religar(marca.referencia, marca.ponto)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [repositorio, localizacao, usuarioId])

  // Com a presença ligada, avisa se o servidor a desligar (saída do campus ou 30 minutos sem sinal).
  useEffect(() => {
    if (!ativo) return
    const repo = repositorio ?? new SupabasePresencaRepository()
    let cancelado = false
    let cancelar = () => {}

    repo
      .minhaPresenca()
      .then((presenca) => {
        if (cancelado || !presenca) return
        const meuId = presenca.vendedorId
        cancelar = repo.observarAtivos((ativos) => {
          // Quando o próprio vendedor desliga, a lista também perde o nome dele, mas sem aviso.
          if (emAndamento.current || ativos.some((a) => a.vendedorId === meuId)) return
          setAtivo(false)
          setErro(MENSAGEM_DESLIGADO_PELO_SERVIDOR)
        })
      })
      .catch(() => {})

    return () => {
      cancelado = true
      cancelar()
    }
  }, [ativo, repositorio])

  // Com a presença ligada, acompanha o GPS e envia um sinal quando a regra do RN13 mandar.
  useEffect(() => {
    if (!ativo) return
    const repo = repositorio ?? new SupabasePresencaRepository()
    const servico = localizacao ?? new LocalizacaoService()
    let ultimaLeitura: LatLng | null = null
    let enviando = false
    let encerrado = false

    async function avaliar() {
      const posicao = ultimaLeitura
      if (!posicao || enviando || encerrado) return
      const agora = new Date()
      if (!deveEnviarSinal(ultimoSinal.current, posicao, agora)) return

      enviando = true
      try {
        const resultado = await repo.enviarSinal(posicao, ponto, referencia)
        if (encerrado) return
        if (resultado === ResultadoRegistro.ATIVO) {
          ultimoSinal.current = { posicao, em: agora }
        } else {
          setAtivo(false)
          setErro(MENSAGEM_FORA_DO_CAMPUS)
        }
      } catch {
        // Falha de rede passageira: o último sinal não muda, e a próxima conferência tenta de novo.
      } finally {
        enviando = false
      }
    }

    const parar = servico.acompanhar(
      (posicao) => {
        ultimaLeitura = posicao
        void avaliar()
      },
      (falha) => setErro(falha.mensagem),
    )
    const relogio = setInterval(() => void avaliar(), CONFERENCIA_MS)

    return () => {
      encerrado = true
      parar()
      clearInterval(relogio)
    }
  }, [ativo, repositorio, localizacao, referencia, ponto])

  /** Liga a presença. Devolve true se o vendedor ficou ativo; o motivo da falha fica em `erro`. */
  async function ligar(): Promise<boolean> {
    if (emAndamento.current) return false
    setErro(null)

    if (referencia.trim().length > LIMITE_REFERENCIA) {
      setErro(MENSAGEM_REFERENCIA)
      return false
    }

    emAndamento.current = true
    setCarregando(true)
    try {
      // Ler a posição já faz o navegador pedir a permissão; sem ela, a `Falha` explica o motivo (RN12).
      const real = await (localizacao ?? new LocalizacaoService()).posicaoAtual()
      const resultado = await (repositorio ?? new SupabasePresencaRepository()).registrar(
        real,
        ponto,
        referencia,
      )

      if (resultado === ResultadoRegistro.ATIVO) {
        ultimoSinal.current = { posicao: real, em: new Date() }
        if (usuarioId) lembrarPresenca(usuarioId, referencia, ponto)
        setAtivo(true)
        return true
      }
      setAtivo(false)
      setErro(MENSAGEM_FORA_DO_CAMPUS)
      return false
    } catch (e) {
      setAtivo(false)
      setErro(e instanceof Falha ? e.mensagem : MENSAGEM_PADRAO)
      return false
    } finally {
      emAndamento.current = false
      setCarregando(false)
    }
  }

  /** Desliga a presença e volta ao estado inicial. Devolve true se desligou; o motivo da falha fica em `erro`. */
  async function desligar(): Promise<boolean> {
    if (emAndamento.current) return false
    setErro(null)

    emAndamento.current = true
    setCarregando(true)
    try {
      await (repositorio ?? new SupabasePresencaRepository()).desligar()
      ultimoSinal.current = null
      if (usuarioId) esquecerPresenca(usuarioId)
      setAtivo(false)
      setReferencia('')
      setPonto(null)
      return true
    } catch (e) {
      setErro(e instanceof Falha ? e.mensagem : MENSAGEM_DESLIGAR)
      return false
    } finally {
      emAndamento.current = false
      setCarregando(false)
    }
  }

  return {
    ativo,
    carregando,
    erro,
    referencia,
    alterarReferencia: setReferencia,
    ponto,
    /** Escolhe o ponto fixo (só antes de ligar). `null` volta a mostrar a posição real. */
    escolherPonto: (novo: LatLng | null) => {
      if (!ativo && !emAndamento.current) setPonto(novo)
    },
    ligar,
    desligar,
  }
}
