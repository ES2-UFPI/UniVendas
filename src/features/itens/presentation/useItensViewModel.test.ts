import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Categoria } from '../domain/Categoria'
import { useItensViewModel } from './useItensViewModel'

const categorias: Categoria[] = [
  { id: 3, nome: 'Doces', categoriaPaiId: 1, folha: false },
  { id: 7, nome: 'Brownie', categoriaPaiId: 3, folha: true },
]

describe('useItensViewModel: validação do item', () => {
  it('começa vazio e sem erros', () => {
    const { result } = renderHook(() => useItensViewModel({ categorias }))
    expect(result.current.dados).toEqual({ nome: '', descricao: '', preco: '', categoriaId: null })
    expect(result.current.erros).toEqual({})
  })

  it('mostra os erros quando o formulário está vazio', () => {
    const { result } = renderHook(() => useItensViewModel({ categorias }))
    let valido = true
    act(() => {
      valido = result.current.validar()
    })
    expect(valido).toBe(false)
    expect(Object.keys(result.current.erros).sort()).toEqual(['categoria', 'nome', 'preco'])
  })

  it('recusa a categoria que não é folha (RN07)', () => {
    const { result } = renderHook(() => useItensViewModel({ categorias }))
    act(() => {
      result.current.alterar('nome', 'Brownie de chocolate')
      result.current.alterar('preco', '5,50')
      result.current.alterar('categoriaId', 3)
    })
    act(() => {
      result.current.validar()
    })
    expect(Object.keys(result.current.erros)).toEqual(['categoria'])
  })

  it('valida e limpa os erros depois que os campos são corrigidos', () => {
    const { result } = renderHook(() => useItensViewModel({ categorias }))
    act(() => {
      result.current.validar()
    })
    act(() => {
      result.current.alterar('nome', 'Brownie de chocolate')
      result.current.alterar('preco', '0')
      result.current.alterar('categoriaId', 7)
    })
    let valido = false
    act(() => {
      valido = result.current.validar()
    })
    expect(valido).toBe(true)
    expect(result.current.erros).toEqual({})
  })

  it('sem categorias carregadas, nenhuma categoria é aceita', () => {
    const { result } = renderHook(() => useItensViewModel())
    act(() => {
      result.current.alterar('nome', 'Brownie')
      result.current.alterar('preco', '5')
      result.current.alterar('categoriaId', 7)
    })
    act(() => {
      result.current.validar()
    })
    expect(result.current.erros).toHaveProperty('categoria')
  })
})
