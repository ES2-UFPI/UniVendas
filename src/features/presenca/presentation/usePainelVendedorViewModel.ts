import { useEffect, useRef, useState } from 'react'
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
const MENSAGEM_DESLIGAR = 'Não foi possível desligar sua presença. Tente de novo.'

interface Opcoes {
  repositorio?: PresencaRepository

  localizacao?: Pick<LocalizacaoService, 'posicaoAtual'>
}

export function usePainelVendedorViewModel({ repositorio, localizacao }: Opcoes = {}) {
  const [ativo, setAtivo] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [referencia, setReferencia] = useState('')

  const emAndamento = useRef(false)

  useEffect(() => {
    let cancelado = false
    ;(repositorio ?? new SupabasePresencaRepository())
      .minhaPresenca()
      .then((presenca) => {
        if (cancelado || !presenca) return
        setAtivo(true)
        setReferencia(presenca.referencia ?? '')
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [repositorio])

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

  async function desligar(): Promise<boolean> {
    if (emAndamento.current) return false
    setErro(null)

    emAndamento.current = true
    setCarregando(true)
    try {
      await (repositorio ?? new SupabasePresencaRepository()).desligar()
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
