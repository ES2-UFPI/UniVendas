import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { AuthRepository } from '../domain/AuthRepository'
import { useEsqueciSenhaViewModel } from './useEsqueciSenhaViewModel'

function falso(enviarLinkDeRecuperacao = vi.fn().mockResolvedValue(undefined)) {
  return {
    repositorio: { enviarLinkDeRecuperacao } as unknown as AuthRepository,
    enviarLinkDeRecuperacao,
  }
}

describe('useEsqueciSenhaViewModel (US15)', () => {
  it('começa sem e-mail, sem erro e sem ter enviado', () => {
    const { result } = renderHook(() =>
      useEsqueciSenhaViewModel({ repositorio: falso().repositorio }),
    )

    expect(result.current.email).toBe('')
    expect(result.current.erro).toBeNull()
    expect(result.current.enviado).toBe(false)
  })

  it('pede o link com o e-mail digitado e marca como enviado', async () => {
    const { repositorio, enviarLinkDeRecuperacao } = falso()
    const { result } = renderHook(() => useEsqueciSenhaViewModel({ repositorio }))
    act(() => result.current.alterarEmail('ana@ufpi.edu.br'))

    let enviou = false
    await act(async () => {
      enviou = await result.current.enviar()
    })

    expect(enviou).toBe(true)
    expect(enviarLinkDeRecuperacao).toHaveBeenCalledWith('ana@ufpi.edu.br')
    expect(result.current.enviado).toBe(true)
    expect(result.current.carregando).toBe(false)
  })

  it('mostra o erro de e-mail e não chama o repositório quando o e-mail é inválido', async () => {
    const { repositorio, enviarLinkDeRecuperacao } = falso()
    const { result } = renderHook(() => useEsqueciSenhaViewModel({ repositorio }))
    act(() => result.current.alterarEmail('ana@'))

    let enviou = true
    await act(async () => {
      enviou = await result.current.enviar()
    })

    expect(enviou).toBe(false)
    expect(result.current.erros.email).toBeDefined()
    expect(enviarLinkDeRecuperacao).not.toHaveBeenCalled()
    expect(result.current.enviado).toBe(false)
  })

  it('mostra a mensagem da Falha e não marca como enviado', async () => {
    const falha = new Falha('Muitos e-mails pedidos. Espere um pouco e tente de novo.', 'limite')
    const { repositorio } = falso(vi.fn().mockRejectedValue(falha))
    const { result } = renderHook(() => useEsqueciSenhaViewModel({ repositorio }))
    act(() => result.current.alterarEmail('ana@ufpi.edu.br'))

    await act(() => result.current.enviar())

    expect(result.current.erro).toBe('Muitos e-mails pedidos. Espere um pouco e tente de novo.')
    expect(result.current.enviado).toBe(false)
  })

  it('mostra uma mensagem genérica para erros inesperados', async () => {
    const { repositorio } = falso(vi.fn().mockRejectedValue(new Error('rede caiu')))
    const { result } = renderHook(() => useEsqueciSenhaViewModel({ repositorio }))
    act(() => result.current.alterarEmail('ana@ufpi.edu.br'))

    await act(() => result.current.enviar())

    expect(result.current.erro).toBe('Não foi possível enviar o e-mail. Tente de novo.')
  })
})
