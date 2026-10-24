import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { Database } from '../../../types/database.types'
import { SupabaseAuthRepository } from './SupabaseAuthRepository'

// Cliente falso: só tem o que o repositório usa. Nenhum teste acessa o Supabase de verdade.
function clienteFalso(signUp: ReturnType<typeof vi.fn>) {
  return { auth: { signUp } } as unknown as SupabaseClient<Database>
}

describe('SupabaseAuthRepository.cadastrar', () => {
  it('cria a conta mandando o nome nos metadados e devolve o usuário', async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'u1', email: 'ana@ufpi.edu.br' }, session: {} },
      error: null,
    })
    const repo = new SupabaseAuthRepository(clienteFalso(signUp))

    const usuario = await repo.cadastrar(' Ana ', ' ana@ufpi.edu.br ', '123456')

    expect(signUp).toHaveBeenCalledWith({
      email: 'ana@ufpi.edu.br',
      password: '123456',
      options: { data: { nome: 'Ana' } },
    })
    expect(usuario.id).toBe('u1')
    expect(usuario.nome).toBe('Ana')
    expect(usuario.email).toBe('ana@ufpi.edu.br')
    expect(usuario.ehVendedor()).toBe(false)
  })

  it('avisa quando o e-mail já tem conta', async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'user_already_exists', message: 'User already registered' },
    })
    const repo = new SupabaseAuthRepository(clienteFalso(signUp))

    const erro = await repo.cadastrar('Ana', 'ana@ufpi.edu.br', '123456').catch((e) => e)

    expect(erro).toBeInstanceOf(Falha)
    expect(erro.codigo).toBe('user_already_exists')
    expect(erro.mensagem).toBe('Este e-mail já tem uma conta. Tente entrar.')
  })

  it('usa uma mensagem genérica para erros desconhecidos', async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'algo_novo', message: 'boom' },
    })
    const repo = new SupabaseAuthRepository(clienteFalso(signUp))

    await expect(repo.cadastrar('Ana', 'ana@ufpi.edu.br', '123456')).rejects.toThrow(
      'Não foi possível criar a conta. Tente de novo.',
    )
  })
})

type Linha = Record<string, unknown> | null

// Cliente falso com o Auth e as consultas a `perfis` e `vendedores` que o login faz.
function clienteComBanco(auth: Record<string, unknown>, perfil: Linha, vendedor: Linha = null) {
  const linhas: Record<string, Linha> = { perfis: perfil, vendedores: vendedor }
  const from = vi.fn((tabela: string) => ({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: linhas[tabela], error: null }) }),
    }),
  }))
  return { auth, from } as unknown as SupabaseClient<Database>
}

const usuarioDoAuth = { id: 'u1', email: 'ana@ufpi.edu.br' }

describe('SupabaseAuthRepository.entrar', () => {
  it('entra e devolve o usuário com o nome do perfil e o vendedor', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: usuarioDoAuth, session: {} },
      error: null,
    })
    const repo = new SupabaseAuthRepository(
      clienteComBanco({ signInWithPassword }, { nome: 'Ana', eh_moderador: false }, { id: 'v9' }),
    )

    const usuario = await repo.entrar(' ana@ufpi.edu.br ', '123456')

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@ufpi.edu.br',
      password: '123456',
    })
    expect(usuario.nome).toBe('Ana')
    expect(usuario.email).toBe('ana@ufpi.edu.br')
    expect(usuario.ehVendedor()).toBe(true)
    expect(usuario.vendedorId).toBe('v9')
  })

  it('usuário sem linha em vendedores é só comprador', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: usuarioDoAuth, session: {} },
      error: null,
    })
    const repo = new SupabaseAuthRepository(
      clienteComBanco({ signInWithPassword }, { nome: 'Ana', eh_moderador: true }),
    )

    const usuario = await repo.entrar('ana@ufpi.edu.br', '123456')

    expect(usuario.ehVendedor()).toBe(false)
    expect(usuario.ehModerador).toBe(true)
  })

  it('mostra mensagem clara quando o e-mail ou a senha estão errados', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })
    const repo = new SupabaseAuthRepository(clienteComBanco({ signInWithPassword }, null))

    const erro = await repo.entrar('ana@ufpi.edu.br', 'errada').catch((e) => e)

    expect(erro).toBeInstanceOf(Falha)
    expect(erro.mensagem).toBe('E-mail ou senha incorretos.')
  })
})

describe('SupabaseAuthRepository.sair', () => {
  it('sai da conta', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null })
    const repo = new SupabaseAuthRepository(clienteComBanco({ signOut }, null))

    await repo.sair()

    expect(signOut).toHaveBeenCalled()
  })

  it('lança Falha se o Supabase não conseguir sair', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: { code: 'algo', message: 'boom' } })
    const repo = new SupabaseAuthRepository(clienteComBanco({ signOut }, null))

    await expect(repo.sair()).rejects.toThrow('Não foi possível sair. Tente de novo.')
  })
})

describe('SupabaseAuthRepository.aoMudarUsuario', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  // Guarda o callback que o repositório registra, para o teste disparar os eventos.
  function authObservavel() {
    let callback: (evento: string, sessao: unknown) => void = () => {}
    const unsubscribe = vi.fn()
    const onAuthStateChange = vi.fn((cb: typeof callback) => {
      callback = cb
      return { data: { subscription: { unsubscribe } } }
    })
    return {
      auth: { onAuthStateChange },
      disparar: (e: string, s: unknown) => callback(e, s),
      unsubscribe,
    }
  }

  it('avisa o ouvinte com o usuário ao entrar e com null ao sair', async () => {
    vi.useFakeTimers()
    const { auth, disparar } = authObservavel()
    const repo = new SupabaseAuthRepository(
      clienteComBanco(auth, { nome: 'Ana', eh_moderador: false }),
    )
    const ouvinte = vi.fn()

    repo.aoMudarUsuario(ouvinte)
    disparar('SIGNED_IN', { user: usuarioDoAuth })
    await vi.runAllTimersAsync()

    expect(ouvinte).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'u1', nome: 'Ana' }))

    disparar('SIGNED_OUT', null)
    await vi.runAllTimersAsync()

    expect(ouvinte).toHaveBeenLastCalledWith(null)
  })

  it('a função devolvida cancela a inscrição', () => {
    const { auth, unsubscribe } = authObservavel()
    const repo = new SupabaseAuthRepository(clienteComBanco(auth, null))

    const cancelar = repo.aoMudarUsuario(vi.fn())
    cancelar()

    expect(unsubscribe).toHaveBeenCalled()
  })
})
