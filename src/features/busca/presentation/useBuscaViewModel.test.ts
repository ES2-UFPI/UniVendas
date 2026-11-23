import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import { Item } from '../../itens/domain/Item'
import type { BuscaRepository, ResultadoBusca } from '../domain/BuscaRepository'
import { useBuscaViewModel } from './useBuscaViewModel'

function resultado(id: string, disponivel = true): ResultadoBusca {
  return {
    item: new Item(id, 'v1', 7, `Brownie ${id}`, 5, '', null, disponivel),
    vendedorNome: 'Doces da Ana',
    noCampusAgora: false,
  }
}

function falso(buscar = vi.fn().mockResolvedValue([resultado('a')])) {
  return { repositorio: { buscar } as BuscaRepository, buscar }
}

describe('useBuscaViewModel', () => {
  it('começa sem texto, sem resultados e sem ter buscado', () => {
    const { result } = renderHook(() => useBuscaViewModel(falso()))
    expect(result.current.texto).toBe('')
    expect(result.current.resultados).toEqual([])
    expect(result.current.buscou).toBe(false)
  })

  it('busca pelo texto digitado e guarda os resultados', async () => {
    const { repositorio, buscar } = falso()
    const { result } = renderHook(() => useBuscaViewModel({ repositorio }))
    act(() => result.current.alterarTexto('brownie'))

    await act(() => result.current.buscar())

    expect(buscar).toHaveBeenCalledWith({ texto: 'brownie' })
    expect(result.current.resultados).toHaveLength(1)
    expect(result.current.buscou).toBe(true)
    expect(result.current.buscando).toBe(false)
  })

  it('com menos de 2 letras avisa e não chama o repositório', async () => {
    const { repositorio, buscar } = falso()
    const { result } = renderHook(() => useBuscaViewModel({ repositorio }))
    act(() => result.current.alterarTexto(' b '))

    await act(() => result.current.buscar())

    expect(buscar).not.toHaveBeenCalled()
    expect(result.current.erro).toBe('Digite pelo menos 2 letras.')
    expect(result.current.buscou).toBe(false)
  })

  it('mostra a mensagem da Falha e limpa os resultados quando a busca falha', async () => {
    const buscar = vi
      .fn()
      .mockResolvedValueOnce([resultado('a')])
      .mockRejectedValueOnce(new Falha('Não foi possível buscar agora. Tente de novo.', 'rede'))
    const { result } = renderHook(() => useBuscaViewModel({ repositorio: { buscar } }))
    act(() => result.current.alterarTexto('brownie'))
    await act(() => result.current.buscar())

    await act(() => result.current.buscar())

    expect(result.current.erro).toBe('Não foi possível buscar agora. Tente de novo.')
    expect(result.current.resultados).toEqual([])
  })

  it('ignora a resposta de uma busca antiga que chega depois da nova', async () => {
    let responderAntiga: (r: ResultadoBusca[]) => void = () => {}
    const buscar = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (responderAntiga = resolve)))
      .mockResolvedValueOnce([resultado('nova')])
    const { result } = renderHook(() => useBuscaViewModel({ repositorio: { buscar } }))

    act(() => result.current.alterarTexto('bro'))
    let antiga: Promise<void> = Promise.resolve()
    act(() => {
      antiga = result.current.buscar()
    })
    act(() => result.current.alterarTexto('brownie'))
    await act(() => result.current.buscar())
    await act(async () => {
      responderAntiga([resultado('antiga')])
      await antiga
    })

    expect(result.current.resultados.map((r) => r.item.id)).toEqual(['nova'])
  })
})
