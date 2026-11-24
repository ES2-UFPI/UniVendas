import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Falha } from '../../../core/falha'
import { SupabaseItemRepository } from '../../itens/data/SupabaseItemRepository'
import { SupabaseBuscaRepository } from '../data/SupabaseBuscaRepository'
import { atalhosDe } from '../domain/atalhos'
import { MINIMO_LETRAS_BUSCA, type BuscaRepository } from '../domain/BuscaRepository'
import { filhasDe, type FonteCategorias } from '../domain/navegacaoCategorias'
import { chaveDaLista, useMemoriaDaBusca } from './memoriaDaBusca'

interface Opcoes {
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: BuscaRepository
  /** De onde vem a árvore de categorias (US12). Nos testes, uma fonte falsa. */
  categoriasRepositorio?: FonteCategorias
}

const definir = useMemoriaDaBusca.setState

/**
 * ViewModel da tela de busca (US11, US12, visual da US21).
 * As abas são as categorias da raiz (Alimentação, Outros produtos) e mostram o que os vendedores
 * oferecem nelas. Os atalhos são os tipos de produto dessa oferta e filtram a lista.
 * O texto busca por nome de produto ou de vendedor dentro da aba.
 * Tudo fica na memória da busca, para "Voltar à busca" reabrir a tela como estava.
 */
export function useBuscaViewModel({ repositorio, categoriasRepositorio }: Opcoes = {}) {
  const { categorias, abaId, texto, buscado, atalhoId, lista, listaDe } = useMemoriaDaBusca(
    useShallow((s) => ({
      categorias: s.categorias,
      abaId: s.abaId,
      texto: s.texto,
      buscado: s.buscado,
      atalhoId: s.atalhoId,
      lista: s.lista,
      listaDe: s.listaDe,
    })),
  )
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroCategorias, setErroCategorias] = useState<string | null>(null)
  // Cada consulta ganha um número; só a resposta da última vale, mesmo se uma antiga chegar depois.
  const ultimaConsulta = useRef(0)

  const busca = useMemo(() => repositorio ?? new SupabaseBuscaRepository(), [repositorio])
  const fonte = useMemo(
    () => categoriasRepositorio ?? new SupabaseItemRepository(),
    [categoriasRepositorio],
  )

  /**
   * Traz os itens da aba (com o texto, se houver). `silencioso` atualiza sem esvaziar a tela,
   * para quem volta à busca continuar vendo a lista enquanto ela se renova.
   */
  const carregar = useCallback(
    async (aba: number, textoBuscado: string | null, silencioso = false) => {
      const numero = ++ultimaConsulta.current
      setErro(null)
      if (!silencioso) {
        setCarregando(true)
        definir({ lista: [], listaDe: null })
      }
      try {
        const encontrados = await busca.buscar({ texto: textoBuscado ?? '', categoriaId: aba })
        if (numero !== ultimaConsulta.current) return
        definir({ lista: encontrados, listaDe: chaveDaLista(aba, textoBuscado) })
      } catch (e) {
        if (numero !== ultimaConsulta.current) return
        setErro(e instanceof Falha ? e.mensagem : 'Não foi possível buscar agora. Tente de novo.')
      } finally {
        if (numero === ultimaConsulta.current) setCarregando(false)
      }
    },
    [busca],
  )

  // Ao abrir: lê as categorias, escolhe a aba (a de antes, ou a primeira) e traz a lista.
  useEffect(() => {
    let ativo = true
    async function abrir() {
      let lidas = useMemoriaDaBusca.getState().categorias
      try {
        lidas = await fonte.listarCategorias()
        if (!ativo) return
        definir({ categorias: lidas })
      } catch (e) {
        if (!ativo) return
        setErroCategorias(
          e instanceof Falha ? e.mensagem : 'Não foi possível carregar as categorias.',
        )
        if (lidas.length === 0) return
      }

      const raizes = filhasDe(lidas, null)
      const memoria = useMemoriaDaBusca.getState()
      const aba = raizes.some((r) => r.id === memoria.abaId)
        ? memoria.abaId
        : (raizes[0]?.id ?? null)
      if (aba === null) return
      if (aba !== memoria.abaId) definir({ abaId: aba, atalhoId: null })
      const jaTem = memoria.listaDe === chaveDaLista(aba, memoria.buscado)
      await carregar(aba, memoria.buscado, jaTem)
    }
    void abrir()
    return () => {
      ativo = false
    }
  }, [fonte, carregar])

  const abas = useMemo(() => filhasDe(categorias, null), [categorias])
  const abaAtual = abas.find((a) => a.id === abaId) ?? null
  const atalhos = useMemo(() => atalhosDe(lista, categorias), [lista, categorias])
  const atalhoAtual = atalhos.find((a) => a.categoria.id === atalhoId)?.categoria ?? null
  const visiveis = useMemo(
    () => (atalhoId === null ? lista : lista.filter((r) => r.item.categoriaId === atalhoId)),
    [lista, atalhoId],
  )

  /** Volta para a oferta da aba, sem texto. */
  function limparBusca() {
    definir({ buscado: null, atalhoId: null })
    if (abaId !== null) void carregar(abaId, null)
  }

  function alterarTexto(novo: string) {
    definir({ texto: novo })
    // Apagar o campo (inclusive pelo "x" do campo de busca) volta para a oferta da aba.
    if (novo.trim() === '' && useMemoriaDaBusca.getState().buscado !== null) limparBusca()
  }

  /** Busca o texto digitado dentro da aba. */
  async function buscar(): Promise<void> {
    const limpo = texto.trim()
    if (limpo.length === 0) {
      setErro(null)
      if (buscado !== null) limparBusca()
      return
    }
    if (limpo.length < MINIMO_LETRAS_BUSCA) {
      setErro(`Digite pelo menos ${MINIMO_LETRAS_BUSCA} letras.`)
      return
    }
    definir({ buscado: limpo, atalhoId: null })
    if (abaId !== null) await carregar(abaId, limpo)
  }

  /** Troca de aba; o texto buscado continua valendo na aba nova. */
  async function trocarAba(id: number): Promise<void> {
    if (id === abaId) return
    definir({ abaId: id, atalhoId: null })
    await carregar(id, buscado)
  }

  /** Filtra a lista por um tipo de produto; escolher o mesmo de novo tira o filtro. */
  function escolherAtalho(id: number) {
    definir({ atalhoId: atalhoId === id ? null : id })
  }

  return {
    texto,
    alterarTexto,
    buscar,
    buscado,
    carregando,
    erro,
    erroCategorias,
    abas,
    abaAtual,
    trocarAba,
    atalhos,
    atalhoAtual,
    escolherAtalho,
    disponiveis: visiveis.filter((r) => r.item.disponivel),
    esgotados: visiveis.filter((r) => !r.item.disponivel),
    /** Já chegou alguma lista (mesmo vazia) para a aba e o texto atuais. */
    carregou: listaDe !== null,
  }
}
