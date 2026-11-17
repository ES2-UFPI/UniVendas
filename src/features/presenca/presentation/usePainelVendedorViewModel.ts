import { useEffect, useRef, useState } from 'react'
import { Falha } from '../../../core/falha'
import { LocalizacaoService, type LatLng } from '../../../core/localizacaoService'
import { SupabasePresencaRepository } from '../data/SupabasePresencaRepository'
import { ResultadoRegistro, type PresencaRepository } from '../domain/PresencaRepository'
import { deveEnviarSinal, type UltimoSinal } from '../domain/RegraSinal'

/** Tamanho máximo da referência ("em frente ao RU"), RN18. */
export const LIMITE_REFERENCIA = 80

const MENSAGEM_FORA_DO_CAMPUS =
  'Você está fora do campus. Entre no campus para ficar visível no mapa.'
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
 * "Estou no campus" e o erro. Ao abrir, recupera a presença que o vendedor já tem ligada.
 * Ao ligar, lê a posição do celular e chama o `PresencaRepository`; ao desligar, volta ao estado inicial.
 * Enquanto está ativo, acompanha o GPS e renova o sinal a cada 2 minutos ou 25 m (RN13).
 * O ponto fixo no mapa entra na próxima tarefa.
 */
export function usePainelVendedorViewModel({ repositorio, localizacao }: Opcoes = {}) {
  const [ativo, setAtivo] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [referencia, setReferencia] = useState('')

  // O estado `carregando` só muda no próximo render; a ref barra o segundo toque que chega antes disso.
  const emAndamento = useRef(false)
  // Onde e quando foi o último sinal enviado; a regra do RN13 compara com isso.
  const ultimoSinal = useRef<UltimoSinal | null>(null)

  useEffect(() => {
    let cancelado = false
    ;(repositorio ?? new SupabasePresencaRepository())
      .minhaPresenca()
      .then((presenca) => {
        if (cancelado || !presenca) return
        ultimoSinal.current = { posicao: presenca.posicao, em: presenca.ultimoSinalEm }
        setAtivo(true)
        setReferencia(presenca.referencia ?? '')
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [repositorio])

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
        const resultado = await repo.enviarSinal(posicao, null, referencia)
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
  }, [ativo, repositorio, localizacao, referencia])

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
        null,
        referencia,
      )

      if (resultado === ResultadoRegistro.ATIVO) {
        ultimoSinal.current = { posicao: real, em: new Date() }
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
      setAtivo(false)
      setReferencia('')
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
    ligar,
    desligar,
  }
}
