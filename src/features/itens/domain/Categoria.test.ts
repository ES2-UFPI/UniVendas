import { describe, expect, it } from 'vitest'
import { agruparFolhas, type Categoria } from './Categoria'

const categorias: Categoria[] = [
  { id: 1, nome: 'Alimentação', categoriaPaiId: null, folha: false },
  { id: 2, nome: 'Outros produtos', categoriaPaiId: null, folha: false },
  { id: 3, nome: 'Doces', categoriaPaiId: 1, folha: false },
  { id: 4, nome: 'Bebidas', categoriaPaiId: 1, folha: false },
  { id: 7, nome: 'Brownie', categoriaPaiId: 3, folha: true },
  { id: 8, nome: 'Bolo', categoriaPaiId: 3, folha: true },
  { id: 12, nome: 'Café', categoriaPaiId: 4, folha: true },
  { id: 20, nome: 'Artesanato', categoriaPaiId: 2, folha: true },
]

describe('agruparFolhas', () => {
  it('junta as folhas pelo caminho da categoria pai, em ordem alfabética', () => {
    expect(agruparFolhas(categorias)).toEqual([
      { grupo: 'Alimentação › Bebidas', folhas: [categorias[6]] },
      { grupo: 'Alimentação › Doces', folhas: [categorias[5], categorias[4]] },
      { grupo: 'Outros produtos', folhas: [categorias[7]] },
    ])
  })

  it('deixa de fora as categorias que não são folha', () => {
    const nomes = agruparFolhas(categorias).flatMap((g) => g.folhas.map((f) => f.nome))
    expect(nomes).not.toContain('Doces')
    expect(nomes).not.toContain('Alimentação')
  })

  it('devolve lista vazia sem categorias', () => {
    expect(agruparFolhas([])).toEqual([])
  })
})
