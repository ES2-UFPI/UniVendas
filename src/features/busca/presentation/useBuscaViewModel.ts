import { useRef, useState } from 'react'
import { Falha } from '../../../core/falha'
import { SupabaseBuscaRepository } from '../data/SupabaseBuscaRepository'
import {
  MINIMO_LETRAS_BUSCA,
  type BuscaRepository,
  type ResultadoBusca,
} from '../domain/BuscaRepository'

interface Opcoes {
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: BuscaRepository
}

/**
 * ViewModel da tela de busca (US11): guarda o texto, busca por nome de produto ou de vendedor
 * e guarda os resultados, que já vêm com os disponíveis primeiro e os esgotados depois (RN09).
 */
export function useBuscaViewModel({ repositorio }: Opcoes = {}) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscou, setBuscou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // Cada busca ganha um número; só a resposta da última vale, mesmo se uma antiga chegar depois.
  const ultimaBusca = useRef(0)

  async function buscar(): Promise<void> {
    setErro(null)
    if (texto.trim().length < MINIMO_LETRAS_BUSCA) {
      setErro(`Digite pelo menos ${MINIMO_LETRAS_BUSCA} letras.`)
      return
    }

    const numero = ++ultimaBusca.current
    setBuscando(true)
    try {
      const encontrados = await (repositorio ?? new SupabaseBuscaRepository()).buscar({ texto })
      if (numero !== ultimaBusca.current) return
      setResultados(encontrados)
      setBuscou(true)
    } catch (e) {
      if (numero !== ultimaBusca.current) return
      setResultados([])
      setErro(e instanceof Falha ? e.mensagem : 'Não foi possível buscar agora. Tente de novo.')
    } finally {
      if (numero === ultimaBusca.current) setBuscando(false)
    }
  }

  return { texto, alterarTexto: setTexto, resultados, buscando, buscou, erro, buscar }
}
