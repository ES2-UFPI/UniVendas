import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { AuthRepository } from '../domain/AuthRepository'
import { useNovaSenhaViewModel } from './useNovaSenhaViewModel'

function falso(definirNovaSenha = vi.fn().mockResolvedValue(undefined)) {
  return {
    repositorio: { definirNovaSenha } as unknown as AuthRepository,
    definirNovaSenha,
  }
}

function preencher(
  result: { current: ReturnType<typeof useNovaSenhaViewModel> },
  senha: string,
  confirmacao: string,
) {
  act(() => result.current.alterarSenha(senha))
  act(() => result.current.alterarConfirmacao(confirmacao))
}

describe('useNovaSenhaViewModel (US15)', () => {
  it('troca a senha quando os dois campos são iguais e válidos', async () => {
    const { repositorio, definirNovaSenha } = falso()
    const { result } = renderHook(() => useNovaSenhaViewModel({ repositorio }))
    preencher(result, 'nova123', 'nova123')

    let trocou = false
    await act(async () => {
      trocou = await result.current.salvar()
    })

    expect(trocou).toBe(true)
    expect(definirNovaSenha).toHaveBeenCalledWith('nova123')
    expect(result.current.erro).toBeNull()
    expect(result.current.carregando).toBe(false)
  })

  it('mostra o erro de senha curta e não chama o repositório', async () => {
    const { repositorio, definirNovaSenha } = falso()
    const { result } = renderHook(() => useNovaSenhaViewModel({ repositorio }))
    preencher(result, '123', '123')

    let trocou = true
    await act(async () => {
      trocou = await result.current.salvar()
    })

    expect(trocou).toBe(false)
    expect(result.current.erros.senha).toBeDefined()
    expect(definirNovaSenha).not.toHaveBeenCalled()
  })

  it('mostra o erro quando a confirmação é diferente', async () => {
    const { repositorio, definirNovaSenha } = falso()
    const { result } = renderHook(() => useNovaSenhaViewModel({ repositorio }))
    preencher(result, 'nova123', 'outra123')

    await act(() => result.current.salvar())

    expect(result.current.erros.confirmacao).toBe('As senhas não são iguais.')
    expect(definirNovaSenha).not.toHaveBeenCalled()
  })

  it('mostra a mensagem da Falha, por exemplo quando o link expirou', async () => {
    const { repositorio } = falso(
      vi.fn().mockRejectedValue(new Falha('O link expirou. Peça um novo.', 'session_not_found')),
    )
    const { result } = renderHook(() => useNovaSenhaViewModel({ repositorio }))
    preencher(result, 'nova123', 'nova123')

    let trocou = true
    await act(async () => {
      trocou = await result.current.salvar()
    })

    expect(trocou).toBe(false)
    expect(result.current.erro).toBe('O link expirou. Peça um novo.')
  })

  it('mostra uma mensagem genérica para erros inesperados', async () => {
    const { repositorio } = falso(vi.fn().mockRejectedValue(new Error('rede caiu')))
    const { result } = renderHook(() => useNovaSenhaViewModel({ repositorio }))
    preencher(result, 'nova123', 'nova123')

    await act(() => result.current.salvar())

    expect(result.current.erro).toBe('Não foi possível trocar a senha. Tente de novo.')
  })
})
