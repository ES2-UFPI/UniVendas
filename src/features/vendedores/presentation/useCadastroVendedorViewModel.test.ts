import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useCadastroVendedorViewModel } from './useCadastroVendedorViewModel'

describe('useCadastroVendedorViewModel', () => {
  it('começa vazio e sem erros', () => {
    const { result } = renderHook(() => useCadastroVendedorViewModel())
    expect(result.current.dados.nomeExibicao).toBe('')
    expect(result.current.erros).toEqual({})
  })

  it('mostra os erros quando o formulário está vazio', () => {
    const { result } = renderHook(() => useCadastroVendedorViewModel())
    let valido = true
    act(() => {
      valido = result.current.validar()
    })
    expect(valido).toBe(false)
    expect(result.current.erros).toHaveProperty('nomeExibicao')
    expect(result.current.erros).toHaveProperty('contato')
  })

  it('valida depois que os campos são preenchidos', () => {
    const { result } = renderHook(() => useCadastroVendedorViewModel())
    act(() => {
      result.current.alterar('nomeExibicao', 'Brownies da Ana')
      result.current.alterar('whatsapp', '(86) 99999-8888')
    })
    let valido = false
    act(() => {
      valido = result.current.validar()
    })
    expect(valido).toBe(true)
    expect(result.current.erros).toEqual({})
  })
})
