import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import { VendedorAmbulante } from '../../vendedores/domain/Vendedor'
import type { VendedorRepository } from '../../vendedores/domain/VendedorRepository'
import { Item } from '../domain/Item'
import type { ItemRepository } from '../domain/ItemRepository'
import { useItensViewModel } from './useItensViewModel'

const vendedor = new VendedorAmbulante('v1', 'u1', 'Brownies da Ana')
const brownie = new Item('i1', 'v1', 7, 'Brownie', 5.5)
const cafe = new Item('i2', 'v1', 12, 'Café', 3)

function falsos({
  doUsuario = vi.fn().mockResolvedValue(vendedor),
  listar = vi.fn().mockResolvedValue([brownie, cafe]),
  remover = vi.fn().mockResolvedValue(undefined),
  alternarDisponibilidade = vi.fn((id: string, disponivel: boolean) =>
    Promise.resolve(
      new Item(id, 'v1', 7, id === 'i1' ? 'Brownie' : 'Café', 5.5, '', null, disponivel),
    ),
  ),
} = {}) {
  return {
    vendedores: { buscarDoUsuario: doUsuario } as unknown as VendedorRepository,
    repositorio: {
      listar,
      remover,
      alternarDisponibilidade,
      listarCategorias: vi.fn().mockResolvedValue([]),
    } as unknown as ItemRepository,
    doUsuario,
    listar,
    remover,
    alternarDisponibilidade,
  }
}

describe('useItensViewModel: lista do vendedor', () => {
  it('sem conta logada, não busca nada', () => {
    const f = falsos()
    renderHook(() => useItensViewModel({ ...f }))
    expect(f.doUsuario).not.toHaveBeenCalled()
  })

  it('busca o vendedor da conta e lista os itens dele', async () => {
    const f = falsos()
    const { result } = renderHook(() => useItensViewModel({ ...f, perfilId: 'u1' }))

    expect(result.current.carregando).toBe(true)
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(f.doUsuario).toHaveBeenCalledWith('u1')
    expect(f.listar).toHaveBeenCalledWith('v1')
    expect(result.current.itens).toEqual([brownie, cafe])
    expect(result.current.semPerfil).toBe(false)
  })

  it('avisa quando a conta ainda não tem perfil de vendedor', async () => {
    const f = falsos({ doUsuario: vi.fn().mockResolvedValue(null) })
    const { result } = renderHook(() => useItensViewModel({ ...f, perfilId: 'u1' }))

    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.semPerfil).toBe(true)
    expect(f.listar).not.toHaveBeenCalled()
  })

  it('mostra a mensagem da Falha quando a lista não carrega', async () => {
    const f = falsos({
      listar: vi.fn().mockRejectedValue(new Falha('Sem conexão.', 'rede')),
    })
    const { result } = renderHook(() => useItensViewModel({ ...f, perfilId: 'u1' }))

    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.erro).toBe('Sem conexão.')
    expect(result.current.itens).toEqual([])
  })
})

describe('useItensViewModel: remover', () => {
  it('remove o item e tira ele da lista', async () => {
    const f = falsos()
    const { result } = renderHook(() => useItensViewModel({ ...f, perfilId: 'u1' }))
    await waitFor(() => expect(result.current.itens).toHaveLength(2))

    let ok = false
    await act(async () => {
      ok = await result.current.remover('i1')
    })

    expect(ok).toBe(true)
    expect(f.remover).toHaveBeenCalledWith('i1')
    expect(result.current.itens).toEqual([cafe])
  })

  it('mantém o item e mostra o erro quando remover falha', async () => {
    const f = falsos({
      remover: vi
        .fn()
        .mockRejectedValue(
          new Falha('Este item não existe mais ou não é seu.', 'item-nao-encontrado'),
        ),
    })
    const { result } = renderHook(() => useItensViewModel({ ...f, perfilId: 'u1' }))
    await waitFor(() => expect(result.current.itens).toHaveLength(2))

    let ok = true
    await act(async () => {
      ok = await result.current.remover('i1')
    })

    expect(ok).toBe(false)
    expect(result.current.itens).toHaveLength(2)
    expect(result.current.erro).toBe('Este item não existe mais ou não é seu.')
  })
})

describe('useItensViewModel: disponível e esgotado (RN08)', () => {
  async function aberto(f = falsos()) {
    const hook = renderHook(() => useItensViewModel({ ...f, perfilId: 'u1' }))
    await waitFor(() => expect(hook.result.current.carregando).toBe(false))
    return { ...hook, f }
  }

  it('marca como esgotado o item disponível e atualiza a lista', async () => {
    const { result, f } = await aberto()

    let deuCerto = false
    await act(async () => {
      deuCerto = await result.current.alternarDisponibilidade(brownie)
    })

    expect(deuCerto).toBe(true)
    expect(f.alternarDisponibilidade).toHaveBeenCalledWith('i1', false)
    expect(result.current.itens.find((i) => i.id === 'i1')?.disponivel).toBe(false)
    expect(result.current.itens.find((i) => i.id === 'i2')?.disponivel).toBe(true)
  })

  it('volta a disponível o item esgotado', async () => {
    const esgotado = new Item('i1', 'v1', 7, 'Brownie', 5.5, '', null, false)
    const { result, f } = await aberto(falsos({ listar: vi.fn().mockResolvedValue([esgotado]) }))

    await act(async () => {
      await result.current.alternarDisponibilidade(esgotado)
    })

    expect(f.alternarDisponibilidade).toHaveBeenCalledWith('i1', true)
    expect(result.current.itens[0].disponivel).toBe(true)
  })

  it('mostra o erro e mantém o item como estava quando não consegue salvar', async () => {
    const falha = new Falha('Só o dono pode mudar os itens deste vendedor.', 'sem-permissao')
    const { result } = await aberto(
      falsos({ alternarDisponibilidade: vi.fn().mockRejectedValue(falha) }),
    )

    let deuCerto = true
    await act(async () => {
      deuCerto = await result.current.alternarDisponibilidade(brownie)
    })

    expect(deuCerto).toBe(false)
    expect(result.current.erro).toBe('Só o dono pode mudar os itens deste vendedor.')
    expect(result.current.itens.find((i) => i.id === 'i1')?.disponivel).toBe(true)
  })
})
