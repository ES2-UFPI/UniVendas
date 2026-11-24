import type { Categoria } from '../../itens/domain/Categoria'
import type { ResultadoBusca } from './BuscaRepository'

/** Um atalho da busca: um tipo de produto que está à venda agora, com a foto de um dos itens. */
export interface Atalho {
  categoria: Categoria
  /** Foto de um item desse tipo, de preferência de um disponível. Nula se nenhum tem foto. */
  fotoUrl: string | null
  /** Quantos itens desse tipo estão na lista. */
  quantidade: number
}

/**
 * Monta os atalhos a partir do que os vendedores oferecem de verdade: um por categoria que
 * aparece nos resultados (Brownie, Café...). Os que têm foto vêm antes, por chamarem mais atenção;
 * dentro de cada grupo, ordem alfabética. Categoria sem item não vira atalho.
 */
export function atalhosDe(resultados: ResultadoBusca[], categorias: Categoria[]): Atalho[] {
  const porId = new Map(categorias.map((c) => [c.id, c]))
  const atalhos = new Map<number, Atalho>()

  // Disponíveis primeiro, para a foto do atalho vir de um item que dá para comprar agora.
  const ordenados = [...resultados].sort(
    (a, b) => Number(b.item.disponivel) - Number(a.item.disponivel),
  )
  for (const { item } of ordenados) {
    const categoria = porId.get(item.categoriaId)
    if (!categoria) continue
    const atalho = atalhos.get(categoria.id) ?? { categoria, fotoUrl: null, quantidade: 0 }
    atalho.quantidade++
    atalho.fotoUrl ??= item.fotoUrl
    atalhos.set(categoria.id, atalho)
  }

  return [...atalhos.values()].sort(
    (a, b) =>
      Number(b.fotoUrl !== null) - Number(a.fotoUrl !== null) ||
      a.categoria.nome.localeCompare(b.categoria.nome, 'pt-BR'),
  )
}
