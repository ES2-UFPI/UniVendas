import { describe, expect, it } from 'vitest'
import type { Categoria } from '../../itens/domain/Categoria'
import { Item } from '../../itens/domain/Item'
import type { ResultadoBusca } from './BuscaRepository'
import { atalhosDe } from './atalhos'

const categorias: Categoria[] = [
  { id: 7, nome: 'Brownie', categoriaPaiId: 3, folha: true },
  { id: 9, nome: 'Café', categoriaPaiId: 4, folha: true },
  { id: 10, nome: 'Bolo', categoriaPaiId: 3, folha: true },
]

function resultado(id: string, categoriaId: number, fotoUrl: string | null, disponivel = true) {
  return {
    item: new Item(id, 'v1', categoriaId, `Item ${id}`, 5, '', fotoUrl, disponivel),
    vendedorNome: 'Doces da Ana',
    noCampusAgora: true,
    referencia: null,
  } satisfies ResultadoBusca
}

describe('atalhosDe', () => {
  it('faz um atalho por tipo de produto à venda, em ordem alfabética, sem tipos vazios', () => {
    const atalhos = atalhosDe(
      [resultado('a', 9, null), resultado('b', 7, null), resultado('c', 7, null)],
      categorias,
    )

    expect(atalhos.map((a) => [a.categoria.nome, a.quantidade])).toEqual([
      ['Brownie', 2],
      ['Café', 1],
    ])
  })

  it('usa a foto de um item disponível antes da de um esgotado', () => {
    const [atalho] = atalhosDe(
      [resultado('a', 7, 'https://x/esgotado.jpg', false), resultado('b', 7, 'https://x/ok.jpg')],
      categorias,
    )

    expect(atalho.fotoUrl).toBe('https://x/ok.jpg')
  })

  it('pula itens sem foto e fica sem foto se nenhum tem', () => {
    const atalhos = atalhosDe(
      [resultado('a', 7, null), resultado('b', 7, 'https://x/b.jpg'), resultado('c', 9, null)],
      categorias,
    )

    expect(atalhos.map((a) => a.fotoUrl)).toEqual(['https://x/b.jpg', null])
  })

  it('põe os atalhos com foto antes dos sem foto', () => {
    const atalhos = atalhosDe(
      [resultado('a', 10, null), resultado('b', 9, 'https://x/cafe.jpg'), resultado('c', 7, null)],
      categorias,
    )

    expect(atalhos.map((a) => a.categoria.nome)).toEqual(['Café', 'Bolo', 'Brownie'])
  })

  it('ignora itens de categoria desconhecida', () => {
    expect(atalhosDe([resultado('a', 99, null)], categorias)).toEqual([])
  })
})
