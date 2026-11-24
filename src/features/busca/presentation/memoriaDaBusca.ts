import { create } from 'zustand'
import type { Categoria } from '../../itens/domain/Categoria'
import { MINIMO_LETRAS_BUSCA, type ResultadoBusca } from '../domain/BuscaRepository'

/** O que a tela de busca guarda para "Voltar à busca" reabrir do mesmo jeito. */
export interface MemoriaDaBusca {
  categorias: Categoria[]
  /** A aba escolhida (Alimentação ou Outros produtos): uma categoria da raiz. */
  abaId: number | null
  /** O que está escrito no campo. */
  texto: string
  /** O texto da última busca enviada; nulo quando a tela mostra a oferta da aba. */
  buscado: string | null
  /** O atalho escolhido (um tipo de produto), que filtra a lista. */
  atalhoId: number | null
  /** Itens da aba (ou da busca), disponíveis primeiro e esgotados depois (RN09). */
  lista: ResultadoBusca[]
  /** De qual aba e texto é a `lista`, para saber se ainda serve ao voltar. */
  listaDe: string | null
}

const inicial: MemoriaDaBusca = {
  categorias: [],
  abaId: null,
  texto: '',
  buscado: null,
  atalhoId: null,
  lista: [],
  listaDe: null,
}

/**
 * Memória da busca (Zustand): fica viva enquanto o app está aberto, então sair para o detalhe
 * de um item e voltar mantém o texto, a aba, o atalho e a lista.
 */
export const useMemoriaDaBusca = create<MemoriaDaBusca>()(() => ({ ...inicial }))

/**
 * Até onde a pessoa rolou a busca. Fica fora da store para rolar a tela não redesenhar nada.
 */
export const rolagemDaBusca = { y: 0 }

/** Chave que diz de onde veio a lista: a aba e o texto buscado. */
export function chaveDaLista(abaId: number, buscado: string | null): string {
  return `${abaId}|${buscado ?? ''}`
}

/** Esquece tudo (nos testes, e para a próxima pessoa que entrar no mesmo aparelho). */
export function limparMemoriaDaBusca(): void {
  useMemoriaDaBusca.setState({ ...inicial }, true)
  rolagemDaBusca.y = 0
}

/**
 * Prepara a busca de um texto vindo de outra tela (o campo do mapa): a tela de busca abre já
 * buscando esse texto, na aba de antes. Texto curto demais só fica escrito no campo.
 */
export function prepararBusca(texto: string): void {
  const limpo = texto.trim()
  useMemoriaDaBusca.setState({
    texto,
    buscado: limpo.length >= MINIMO_LETRAS_BUSCA ? limpo : null,
    atalhoId: null,
  })
  rolagemDaBusca.y = 0
}
