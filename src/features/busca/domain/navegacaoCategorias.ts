import type { Categoria } from '../../itens/domain/Categoria'
import type { ItemRepository } from '../../itens/domain/ItemRepository'

/** De onde a busca lê a árvore de categorias: só precisa listar, então serve o repositório de itens. */
export type FonteCategorias = Pick<ItemRepository, 'listarCategorias'>

const ordem = (a: Categoria, b: Categoria) => a.nome.localeCompare(b.nome, 'pt-BR')

/** As categorias logo abaixo de `paiId`, em ordem alfabética. Com `null`, as da raiz (ex.: Alimentação). */
export function filhasDe(categorias: Categoria[], paiId: number | null): Categoria[] {
  return categorias.filter((c) => c.categoriaPaiId === paiId).sort(ordem)
}

/**
 * O caminho da raiz até a categoria, para a trilha "Todas › Alimentação › Doces".
 * Com `null` ou id que não está na lista, devolve vazio.
 */
export function caminhoAte(categorias: Categoria[], id: number | null): Categoria[] {
  const porId = new Map(categorias.map((c) => [c.id, c]))
  const caminho: Categoria[] = []
  const vistos = new Set<number>()
  for (let atual = id === null ? undefined : porId.get(id); atual && !vistos.has(atual.id);) {
    vistos.add(atual.id)
    caminho.unshift(atual)
    atual = atual.categoriaPaiId === null ? undefined : porId.get(atual.categoriaPaiId)
  }
  return caminho
}
