import { describe, expect, it } from 'vitest'
import type { Categoria } from './Categoria'
import { lerPreco, validarItem, type DadosItem } from './validacoesItem'

// Alimentação > Doces > Brownie, como nos dados iniciais da tabela categorias.
const categorias: Categoria[] = [
  { id: 1, nome: 'Alimentação', categoriaPaiId: null, folha: false },
  { id: 3, nome: 'Doces', categoriaPaiId: 1, folha: false },
  { id: 7, nome: 'Brownie', categoriaPaiId: 3, folha: true },
]

const validos: DadosItem = {
  nome: 'Brownie de chocolate',
  descricao: '',
  preco: '5,50',
  categoriaId: 7,
}

describe('lerPreco', () => {
  it.each([
    ['5', 5],
    ['5,50', 5.5],
    ['5.5', 5.5],
    [' 12,90 ', 12.9],
    ['R$ 3,00', 3],
    ['0', 0],
    ['-2', -2],
  ])('lê "%s" como %d', (texto, valor) => {
    expect(lerPreco(texto)).toBe(valor)
  })

  it.each(['', 'abc', '5,555', '1.000,00', '5,'])('não consegue ler "%s"', (texto) => {
    expect(lerPreco(texto)).toBeNull()
  })
})

describe('validarItem', () => {
  it('não tem erros com nome, preço e categoria folha', () => {
    expect(validarItem(validos, categorias)).toEqual({})
  })

  it('aceita preço zero (item de graça)', () => {
    expect(validarItem({ ...validos, preco: '0' }, categorias)).toEqual({})
  })

  it('exige o nome', () => {
    expect(validarItem({ ...validos, nome: '   ' }, categorias)).toHaveProperty('nome')
  })

  it('exige o preço', () => {
    expect(validarItem({ ...validos, preco: '' }, categorias).preco).toBe('Informe o preço.')
  })

  it('recusa preço que não é um número', () => {
    expect(validarItem({ ...validos, preco: 'cinco' }, categorias)).toHaveProperty('preco')
  })

  it('recusa preço negativo (RN07)', () => {
    expect(validarItem({ ...validos, preco: '-1' }, categorias).preco).toBe(
      'O preço não pode ser negativo.',
    )
  })

  it('exige a categoria', () => {
    expect(validarItem({ ...validos, categoriaId: null }, categorias).categoria).toBe(
      'Escolha a categoria.',
    )
  })

  it('recusa categoria que não é folha, como Doces (RN07)', () => {
    expect(validarItem({ ...validos, categoriaId: 3 }, categorias)).toHaveProperty('categoria')
  })

  it('recusa categoria que não está na lista', () => {
    expect(validarItem({ ...validos, categoriaId: 99 }, categorias)).toHaveProperty('categoria')
  })

  it('junta todos os erros de uma vez', () => {
    const erros = validarItem({ nome: '', descricao: '', preco: '', categoriaId: null }, categorias)
    expect(Object.keys(erros).sort()).toEqual(['categoria', 'nome', 'preco'])
  })
})
