import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import { VendedorAmbulante } from '../domain/Vendedor'
import type { VendedorRepository } from '../domain/VendedorRepository'
import { useCadastroVendedorViewModel } from './useCadastroVendedorViewModel'

const salvo = new VendedorAmbulante('v1', 'u1', 'Brownies da Ana')

function repositorioFalso(criar = vi.fn().mockResolvedValue(salvo)) {
  return { repositorio: { criar } as VendedorRepository, criar }
}

function preencher(result: { current: ReturnType<typeof useCadastroVendedorViewModel> }) {
  act(() => {
    result.current.alterar('nomeExibicao', 'Brownies da Ana')
    result.current.alterar('whatsapp', '(86) 99999-8888')
  })
}

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
    preencher(result)
    let valido = false
    act(() => {
      valido = result.current.validar()
    })
    expect(valido).toBe(true)
    expect(result.current.erros).toEqual({})
  })
})

describe('useCadastroVendedorViewModel: foto', () => {
  it('guarda a foto comprimida (RN10)', async () => {
    const comprimida = new Blob(['pequena'], { type: 'image/jpeg' })
    const comprimir = vi.fn().mockResolvedValue(comprimida)
    const { result } = renderHook(() => useCadastroVendedorViewModel({ comprimir }))

    await act(() => result.current.escolherFoto(new Blob(['original'], { type: 'image/png' })))

    expect(comprimir).toHaveBeenCalledOnce()
    expect(result.current.foto).toBe(comprimida)
    expect(result.current.erroFoto).toBeNull()
  })

  it('mostra o erro da compressão e fica sem foto', async () => {
    const comprimir = vi
      .fn()
      .mockRejectedValue(
        new Falha('Escolha uma foto (JPEG, PNG ou WebP).', 'foto-formato-invalido'),
      )
    const { result } = renderHook(() => useCadastroVendedorViewModel({ comprimir }))

    await act(() => result.current.escolherFoto(new Blob(['pdf'], { type: 'application/pdf' })))

    expect(result.current.foto).toBeNull()
    expect(result.current.erroFoto).toBe('Escolha uma foto (JPEG, PNG ou WebP).')
  })

  it('tira a foto quando recebe null (a foto é opcional, RN06)', async () => {
    const comprimir = vi.fn().mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }))
    const { result } = renderHook(() => useCadastroVendedorViewModel({ comprimir }))
    await act(() => result.current.escolherFoto(new Blob(['x'], { type: 'image/jpeg' })))

    await act(() => result.current.escolherFoto(null))

    expect(result.current.foto).toBeNull()
  })
})

describe('useCadastroVendedorViewModel: salvar', () => {
  it('não chama o repositório se o formulário é inválido', async () => {
    const { repositorio, criar } = repositorioFalso()
    const { result } = renderHook(() => useCadastroVendedorViewModel({ repositorio }))

    let ok = true
    await act(async () => {
      ok = await result.current.salvar('u1')
    })

    expect(ok).toBe(false)
    expect(criar).not.toHaveBeenCalled()
    expect(result.current.erros).toHaveProperty('nomeExibicao')
  })

  it('salva o perfil com os contatos normalizados e a foto comprimida', async () => {
    const { repositorio, criar } = repositorioFalso()
    const comprimida = new Blob(['pequena'], { type: 'image/jpeg' })
    const comprimir = vi.fn().mockResolvedValue(comprimida)
    const { result } = renderHook(() => useCadastroVendedorViewModel({ repositorio, comprimir }))
    preencher(result)
    await act(() => result.current.escolherFoto(new Blob(['original'], { type: 'image/png' })))

    let ok = false
    await act(async () => {
      ok = await result.current.salvar('u1')
    })

    expect(ok).toBe(true)
    const [vendedor, contatos, foto] = criar.mock.calls[0]
    expect(vendedor.perfilId).toBe('u1')
    expect(vendedor.nomeExibicao).toBe('Brownies da Ana')
    expect(contatos).toEqual([{ canal: 'whatsapp', valor: '5586999998888' }])
    expect(foto).toBe(comprimida)
    expect(result.current.vendedorSalvo).toBe(salvo)
    expect(result.current.salvando).toBe(false)
  })

  it('mostra a mensagem da Falha quando o repositório recusa', async () => {
    const { repositorio } = repositorioFalso(
      vi
        .fn()
        .mockRejectedValue(new Falha('Você já tem um perfil de vendedor.', 'perfil-ja-existe')),
    )
    const { result } = renderHook(() => useCadastroVendedorViewModel({ repositorio }))
    preencher(result)

    let ok = true
    await act(async () => {
      ok = await result.current.salvar('u1')
    })

    expect(ok).toBe(false)
    expect(result.current.erroGeral).toBe('Você já tem um perfil de vendedor.')
    expect(result.current.vendedorSalvo).toBeNull()
  })
})
