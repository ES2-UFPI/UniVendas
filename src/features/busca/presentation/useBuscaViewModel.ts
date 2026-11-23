import { useEffect, useMemo, useRef, useState } from 'react'
import { Falha } from '../../../core/falha'
import type { Categoria } from '../../itens/domain/Categoria'
import { SupabaseItemRepository } from '../../itens/data/SupabaseItemRepository'
import { SupabaseBuscaRepository } from '../data/SupabaseBuscaRepository'
import {
  MINIMO_LETRAS_BUSCA,
  type BuscaRepository,
  type ResultadoBusca,
} from '../domain/BuscaRepository'
import { caminhoAte, filhasDe, type FonteCategorias } from '../domain/navegacaoCategorias'

interface Opcoes {
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: BuscaRepository
  /** De onde vem a árvore de categorias (US12). Nos testes, uma fonte falsa. */
  categoriasRepositorio?: FonteCategorias
}

/** O que foi buscado por último, para a mensagem de "nada encontrado" não mudar enquanto a pessoa digita. */
export interface FiltroBuscado {
  texto: string
  categoria: Categoria | null
}

/**
 * ViewModel da tela de busca: procura por nome de produto ou de vendedor (US11) e navega pela
 * árvore de categorias (US12). Escolher uma categoria já busca os itens dela e das filhas.
 * Os resultados vêm com os disponíveis primeiro e os esgotados depois (RN09).
 */
export function useBuscaViewModel({ repositorio, categoriasRepositorio }: Opcoes = {}) {
  const [texto, setTexto] = useState('')
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [erroCategorias, setErroCategorias] = useState<string | null>(null)
  const [categoriaId, setCategoriaId] = useState<number | null>(null)
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscado, setBuscado] = useState<FiltroBuscado | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  // Cada busca ganha um número; só a resposta da última vale, mesmo se uma antiga chegar depois.
  const ultimaBusca = useRef(0)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      try {
        const lidas = await (
          categoriasRepositorio ?? new SupabaseItemRepository()
        ).listarCategorias()
        if (ativo) setCategorias(lidas)
      } catch (e) {
        if (ativo) {
          setErroCategorias(
            e instanceof Falha ? e.mensagem : 'Não foi possível carregar as categorias.',
          )
        }
      }
    }
    void carregar()
    return () => {
      ativo = false
    }
  }, [categoriasRepositorio])

  const caminho = useMemo(() => caminhoAte(categorias, categoriaId), [categorias, categoriaId])
  const categoriaAtual = caminho.at(-1) ?? null
  const subcategorias = useMemo(() => filhasDe(categorias, categoriaId), [categorias, categoriaId])

  async function executar(categoria: number | null): Promise<void> {
    setErro(null)
    const limpo = texto.trim()
    if (categoria === null && limpo.length < MINIMO_LETRAS_BUSCA) {
      // Voltar para "Todas" sem texto só limpa a tela; com texto curto, avisa.
      if (limpo.length > 0) setErro(`Digite pelo menos ${MINIMO_LETRAS_BUSCA} letras.`)
      ultimaBusca.current++
      setResultados([])
      setBuscado(null)
      setBuscando(false)
      return
    }

    const numero = ++ultimaBusca.current
    setBuscando(true)
    try {
      const encontrados = await (repositorio ?? new SupabaseBuscaRepository()).buscar(
        categoria === null ? { texto } : { texto, categoriaId: categoria },
      )
      if (numero !== ultimaBusca.current) return
      setResultados(encontrados)
      setBuscado({
        texto: limpo,
        categoria: categorias.find((c) => c.id === categoria) ?? null,
      })
    } catch (e) {
      if (numero !== ultimaBusca.current) return
      setResultados([])
      setErro(e instanceof Falha ? e.mensagem : 'Não foi possível buscar agora. Tente de novo.')
    } finally {
      if (numero === ultimaBusca.current) setBuscando(false)
    }
  }

  /** Busca pelo texto digitado, dentro da categoria escolhida (se houver). */
  async function buscar(): Promise<void> {
    if (categoriaId === null && texto.trim().length === 0) {
      setErro(`Digite pelo menos ${MINIMO_LETRAS_BUSCA} letras ou escolha uma categoria.`)
      return
    }
    await executar(categoriaId)
  }

  /** Entra numa categoria (ou volta para "Todas", com `null`) e já mostra os itens dela. */
  async function escolherCategoria(id: number | null): Promise<void> {
    setCategoriaId(id)
    await executar(id)
  }

  return {
    texto,
    alterarTexto: setTexto,
    resultados,
    buscando,
    buscou: buscado !== null,
    buscado,
    erro,
    buscar,
    erroCategorias,
    caminho,
    categoriaAtual,
    subcategorias,
    escolherCategoria,
  }
}
