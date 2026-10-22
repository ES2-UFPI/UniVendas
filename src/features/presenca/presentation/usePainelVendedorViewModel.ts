import { useRef, useState } from 'react'
import { Falha } from '../../../core/falha'
import { LocalizacaoService } from '../../../core/localizacaoService'
import { SupabasePresencaRepository } from '../data/SupabasePresencaRepository'
import { ResultadoRegistro, type PresencaRepository } from '../domain/PresencaRepository'

/** Tamanho máximo da referência ("em frente ao RU"), RN18. */
export const LIMITE_REFERENCIA = 80

const MENSAGEM_FORA_DO_CAMPUS =
  'Você está fora do campus. Entre no campus para ficar visível no mapa.'
const MENSAGEM_REFERENCIA = `A referência pode ter até ${LIMITE_REFERENCIA} caracteres.`
const MENSAGEM_PADRAO = 'Não foi possível ficar visível no mapa. Tente de novo.'

interface Opcoes {
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: PresencaRepository
  /** Nos testes, uma localização falsa (o jsdom não tem GPS); no app, o serviço do `core`. */
  localizacao?: Pick<LocalizacaoService, 'posicaoAtual'>
}

/**
 * ViewModel do painel do vendedor (US04): guarda a referência, o estado do botão
 * "Estou no campus" e o erro. Ao ligar, lê a posição do celular e chama o `PresencaRepository`.
 * Desligar, o ponto fixo no mapa e o sinal periódico (RN13) entram nas próximas tarefas.
 */
export function usePainelVendedorViewModel({ repositorio, localizacao }: Opcoes = {}) {
  const [ativo, setAtivo] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [referencia, setReferencia] = useState('')
  // O estado `carregando` só muda no próximo render; a ref barra o segundo toque que chega antes disso.
  const emAndamento = useRef(false)

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

  return { ativo, carregando, erro, referencia, alterarReferencia: setReferencia, ligar }
}
