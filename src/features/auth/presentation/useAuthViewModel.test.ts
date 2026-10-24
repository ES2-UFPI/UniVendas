import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { AuthRepository } from '../domain/AuthRepository'
import { Usuario } from '../domain/Usuario'
import { useAuthViewModel } from './useAuthViewModel'

const ana = new Usuario('u1', 'Ana', 'ana@ufpi.edu.br')

function repositorioFalso(cadastrar = vi.fn().mockResolvedValue(ana)) {
  return { repositorio: { cadastrar } as unknown as AuthRepository, cadastrar }
}

function preencher(result: { current: ReturnType<typeof useAuthViewModel> }, senha = '123456') {
  act(() => {
    result.current.alterar('nome', 'Ana')
    result.current.alterar('email', 'ana@ufpi.edu.br')
    result.current.alterar('senha', senha)
  })
}

describe('useAuthViewModel', () => {
  it('começa vazio, sem erros e sem usuário', () => {
    const { result } = renderHook(() => useAuthViewModel())
    expect(result.current.dados).toEqual({ nome: '', email: '', senha: '' })
    expect(result.current.erros).toEqual({})
    expect(result.current.usuario).toBeNull()
    expect(result.current.carregando).toBe(false)
  })

  it('mostra os erros e não chama o repositório quando o formulário está vazio', async () => {
    const { repositorio, cadastrar } = repositorioFalso()
    const { result } = renderHook(() => useAuthViewModel({ repositorio }))

    let criado: Usuario | null = ana
    await act(async () => {
      criado = await result.current.cadastrar()
    })

    expect(criado).toBeNull()
    expect(result.current.erros).toHaveProperty('nome')
    expect(result.current.erros).toHaveProperty('email')
    expect(result.current.erros).toHaveProperty('senha')
    expect(cadastrar).not.toHaveBeenCalled()
  })

  it('não envia senha com menos de 6 caracteres', async () => {
    const { repositorio, cadastrar } = repositorioFalso()
    const { result } = renderHook(() => useAuthViewModel({ repositorio }))
    preencher(result, '12345')

    await act(() => result.current.cadastrar())

    expect(result.current.erros).toEqual({ senha: 'A senha precisa ter 6 ou mais caracteres.' })
    expect(cadastrar).not.toHaveBeenCalled()
  })

  it('cria a conta e guarda o usuário logado (RN01)', async () => {
    const { repositorio, cadastrar } = repositorioFalso()
    const { result } = renderHook(() => useAuthViewModel({ repositorio }))
    preencher(result)

    let criado: Usuario | null = null
    await act(async () => {
      criado = await result.current.cadastrar()
    })

    expect(criado).toBe(ana)
    expect(cadastrar).toHaveBeenCalledWith('Ana', 'ana@ufpi.edu.br', '123456')
    expect(result.current.usuario).toBe(ana)
    expect(result.current.erro).toBeNull()
    expect(result.current.carregando).toBe(false)
  })

  it('mostra a mensagem da Falha quando o e-mail já tem conta', async () => {
    const { repositorio } = repositorioFalso(
      vi
        .fn()
        .mockRejectedValue(
          new Falha('Este e-mail já tem uma conta. Tente entrar.', 'user_already_exists'),
        ),
    )
    const { result } = renderHook(() => useAuthViewModel({ repositorio }))
    preencher(result)

    await act(() => result.current.cadastrar())

    expect(result.current.erro).toBe('Este e-mail já tem uma conta. Tente entrar.')
    expect(result.current.usuario).toBeNull()
  })

  it('mostra uma mensagem genérica para erros inesperados', async () => {
    const { repositorio } = repositorioFalso(vi.fn().mockRejectedValue(new Error('rede caiu')))
    const { result } = renderHook(() => useAuthViewModel({ repositorio }))
    preencher(result)

    await act(() => result.current.cadastrar())

    expect(result.current.erro).toBe('Não foi possível criar a conta. Tente de novo.')
  })
})

describe('useAuthViewModel.entrar e sair (US02)', () => {
  function repositorioLogin(
    entrar = vi.fn().mockResolvedValue(ana),
    sair = vi.fn().mockResolvedValue(undefined),
  ) {
    return { repositorio: { entrar, sair } as unknown as AuthRepository, entrar, sair }
  }

  function preencherLogin(result: { current: ReturnType<typeof useAuthViewModel> }) {
    act(() => {
      result.current.alterar('email', 'ana@ufpi.edu.br')
      result.current.alterar('senha', '123456')
    })
  }

  it('não chama o repositório sem e-mail e senha', async () => {
    const { repositorio, entrar } = repositorioLogin()
    const { result } = renderHook(() => useAuthViewModel({ repositorio }))

    await act(() => result.current.entrar())

    expect(result.current.erros).toEqual({
      email: 'Informe seu e-mail.',
      senha: 'Informe sua senha.',
    })
    expect(entrar).not.toHaveBeenCalled()
  })

  it('entra sem pedir o nome e guarda o usuário', async () => {
    const { repositorio, entrar } = repositorioLogin()
    const { result } = renderHook(() => useAuthViewModel({ repositorio }))
    preencherLogin(result)

    let logado: Usuario | null = null
    await act(async () => {
      logado = await result.current.entrar()
    })

    expect(logado).toBe(ana)
    expect(entrar).toHaveBeenCalledWith('ana@ufpi.edu.br', '123456')
    expect(result.current.usuario).toBe(ana)
  })

  it('mostra a mensagem da Falha quando a senha está errada (RN04)', async () => {
    const { repositorio } = repositorioLogin(
      vi.fn().mockRejectedValue(new Falha('E-mail ou senha incorretos.', 'invalid_credentials')),
    )
    const { result } = renderHook(() => useAuthViewModel({ repositorio }))
    preencherLogin(result)

    await act(() => result.current.entrar())

    expect(result.current.erro).toBe('E-mail ou senha incorretos.')
    expect(result.current.usuario).toBeNull()
  })

  it('sai, limpa o usuário e os campos', async () => {
    const { repositorio, sair } = repositorioLogin()
    const { result } = renderHook(() => useAuthViewModel({ repositorio }))
    preencherLogin(result)
    await act(() => result.current.entrar())

    let saiu = false
    await act(async () => {
      saiu = await result.current.sair()
    })

    expect(saiu).toBe(true)
    expect(sair).toHaveBeenCalled()
    expect(result.current.usuario).toBeNull()
    expect(result.current.dados.senha).toBe('')
  })
})
