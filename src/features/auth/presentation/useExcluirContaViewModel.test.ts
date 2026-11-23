import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { AuthRepository } from '../domain/AuthRepository'
import { useExcluirContaViewModel } from './useExcluirContaViewModel'

function falso(excluirConta = vi.fn().mockResolvedValue(undefined)) {
  return { repositorio: { excluirConta } as unknown as AuthRepository, excluirConta }
}

describe('useExcluirContaViewModel (US17)', () => {
  it('começa sem pedir confirmação', () => {
    const { result } = renderHook(() =>
      useExcluirContaViewModel({ repositorio: falso().repositorio }),
    )

    expect(result.current.confirmando).toBe(false)
    expect(result.current.excluindo).toBe(false)
    expect(result.current.erro).toBeNull()
  })

  it('pedir abre a confirmação e cancelar fecha, sem excluir nada', () => {
    const { repositorio, excluirConta } = falso()
    const { result } = renderHook(() => useExcluirContaViewModel({ repositorio }))

    act(() => result.current.pedir())
    expect(result.current.confirmando).toBe(true)

    act(() => result.current.cancelar())
    expect(result.current.confirmando).toBe(false)
    expect(excluirConta).not.toHaveBeenCalled()
  })

  it('exclui a conta e devolve true', async () => {
    const { repositorio, excluirConta } = falso()
    const { result } = renderHook(() => useExcluirContaViewModel({ repositorio }))
    act(() => result.current.pedir())

    let excluiu = false
    await act(async () => {
      excluiu = await result.current.excluir()
    })

    expect(excluiu).toBe(true)
    expect(excluirConta).toHaveBeenCalledTimes(1)
    expect(result.current.erro).toBeNull()
    expect(result.current.excluindo).toBe(false)
  })

  it('mostra a mensagem da Falha e continua na confirmação quando não consegue', async () => {
    const falha = new Falha('Não foi possível excluir a conta. Tente de novo.', '42501')
    const { repositorio } = falso(vi.fn().mockRejectedValue(falha))
    const { result } = renderHook(() => useExcluirContaViewModel({ repositorio }))
    act(() => result.current.pedir())

    let excluiu = true
    await act(async () => {
      excluiu = await result.current.excluir()
    })

    expect(excluiu).toBe(false)
    expect(result.current.erro).toBe('Não foi possível excluir a conta. Tente de novo.')
    expect(result.current.confirmando).toBe(true)
  })

  it('mostra uma mensagem genérica para erros inesperados', async () => {
    const { repositorio } = falso(vi.fn().mockRejectedValue(new Error('rede caiu')))
    const { result } = renderHook(() => useExcluirContaViewModel({ repositorio }))

    await act(() => result.current.excluir())

    expect(result.current.erro).toBe('Não foi possível excluir a conta. Tente de novo.')
  })

  it('ignora o segundo toque enquanto a exclusão está em andamento', async () => {
    let terminar: () => void = () => {}
    const excluirConta = vi.fn(
      () =>
        new Promise<void>((resolver) => {
          terminar = resolver
        }),
    )
    const { repositorio } = falso(excluirConta)
    const { result } = renderHook(() => useExcluirContaViewModel({ repositorio }))

    let primeiro: Promise<boolean> = Promise.resolve(false)
    let segundo = true
    await act(async () => {
      primeiro = result.current.excluir()
      segundo = await result.current.excluir()
    })
    expect(segundo).toBe(false)
    expect(result.current.excluindo).toBe(true)

    await act(async () => {
      terminar()
      await primeiro
    })

    expect(excluirConta).toHaveBeenCalledTimes(1)
  })

  it('não deixa cancelar no meio da exclusão', async () => {
    let terminar: () => void = () => {}
    const excluirConta = vi.fn(
      () =>
        new Promise<void>((resolver) => {
          terminar = resolver
        }),
    )
    const { repositorio } = falso(excluirConta)
    const { result } = renderHook(() => useExcluirContaViewModel({ repositorio }))
    act(() => result.current.pedir())

    let pendente: Promise<boolean> = Promise.resolve(false)
    await act(async () => {
      pendente = result.current.excluir()
    })
    act(() => result.current.cancelar())

    expect(result.current.confirmando).toBe(true)
    await act(async () => {
      terminar()
      await pendente
    })
  })
})
