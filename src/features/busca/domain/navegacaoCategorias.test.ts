import { describe, expect, it } from 'vitest'
import type { Categoria } from '../../itens/domain/Categoria'
import { caminhoAte, filhasDe } from './navegacaoCategorias'

// Pedaço da árvore dos dados iniciais, fora de ordem de propósito.
const categorias: Categoria[] = [
  { id: 7, nome: 'Brownie', categoriaPaiId: 3, folha: true },
  { id: 2, nome: 'Outros produtos', categoriaPaiId: null, folha: false },
  { id: 4, nome: 'Bebidas', categoriaPaiId: 1, folha: false },
  { id: 3, nome: 'Doces', categoriaPaiId: 1, folha: false },
  { id: 1, nome: 'Alimentação', categoriaPaiId: null, folha: false },
  { id: 8, nome: 'Bolo', categoriaPaiId: 3, folha: true },
]

describe('filhasDe', () => {
  it('sem pai, traz as categorias da raiz em ordem alfabética', () => {
    expect(filhasDe(categorias, null).map((c) => c.nome)).toEqual([
      'Alimentação',
      'Outros produtos',
    ])
  })

  it('traz só as filhas diretas: Alimentação tem Bebidas e Doces, não Brownie', () => {
    expect(filhasDe(categorias, 1).map((c) => c.nome)).toEqual(['Bebidas', 'Doces'])
  })

  it('a folha não tem filhas', () => {
    expect(filhasDe(categorias, 7)).toEqual([])
  })
})

describe('caminhoAte', () => {
  it('vai da raiz até a categoria: Alimentação › Doces › Brownie', () => {
    expect(caminhoAte(categorias, 7).map((c) => c.nome)).toEqual([
      'Alimentação',
      'Doces',
      'Brownie',
    ])
  })

  it('a categoria da raiz é o próprio caminho', () => {
    expect(caminhoAte(categorias, 1).map((c) => c.nome)).toEqual(['Alimentação'])
  })

  it('sem categoria, ou com uma que não existe, o caminho é vazio', () => {
    expect(caminhoAte(categorias, null)).toEqual([])
    expect(caminhoAte(categorias, 99)).toEqual([])
  })
})
