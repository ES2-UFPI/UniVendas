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

describe('SupabaseAuthRepository.enviarLinkDeRecuperacao (US15)', () => {
  function repositorioCom(resetPasswordForEmail: ReturnType<typeof vi.fn>) {
    return new SupabaseAuthRepository(
      { auth: { resetPasswordForEmail } } as unknown as SupabaseClient<Database>,
      'https://univendas.exemplo.app',
    )
  }

  it('pede o link com o e-mail sem espaços e manda voltar para a tela "Nova senha"', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ data: {}, error: null })

    await repositorioCom(resetPasswordForEmail).enviarLinkDeRecuperacao(' ana@ufpi.edu.br ')

    expect(resetPasswordForEmail).toHaveBeenCalledWith('ana@ufpi.edu.br', {
      redirectTo: 'https://univendas.exemplo.app/nova-senha',
    })
  })

  it('avisa quando foram pedidos e-mails demais', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'over_email_send_rate_limit', message: 'rate limit' },
    })

    const erro = await repositorioCom(resetPasswordForEmail)
      .enviarLinkDeRecuperacao('ana@ufpi.edu.br')
      .catch((e) => e)

    expect(erro).toBeInstanceOf(Falha)
    expect(erro.codigo).toBe('over_email_send_rate_limit')
    expect(erro.mensagem).toBe('Muitos e-mails pedidos. Espere um pouco e tente de novo.')
  })

  it('usa uma mensagem genérica para erros desconhecidos', async () => {
    const resetPasswordForEmail = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: 'algo_novo', message: 'boom' } })

    await expect(
      repositorioCom(resetPasswordForEmail).enviarLinkDeRecuperacao('ana@ufpi.edu.br'),
    ).rejects.toThrow('Não foi possível enviar o e-mail. Tente de novo.')
  })
})

describe('SupabaseAuthRepository.definirNovaSenha (US15)', () => {
  function repositorioCom(updateUser: ReturnType<typeof vi.fn>) {
    return new SupabaseAuthRepository({
      auth: { updateUser },
    } as unknown as SupabaseClient<Database>)
  }

  it('troca a senha de quem está logado', async () => {
    const updateUser = vi.fn().mockResolvedValue({ data: { user: {} }, error: null })

    await repositorioCom(updateUser).definirNovaSenha('nova123')

    expect(updateUser).toHaveBeenCalledWith({ password: 'nova123' })
  })

  it.each([
    ['same_password', 'A nova senha precisa ser diferente da atual.'],
    ['weak_password', 'A senha precisa ter 6 ou mais caracteres.'],
    ['session_not_found', 'O link expirou. Peça um novo.'],
  ])('traduz o erro "%s"', async (code, mensagem) => {
    const updateUser = vi.fn().mockResolvedValue({ data: null, error: { code, message: 'x' } })

    const erro = await repositorioCom(updateUser)
      .definirNovaSenha('nova123')
      .catch((e) => e)

    expect(erro).toBeInstanceOf(Falha)
    expect(erro.codigo).toBe(code)
    expect(erro.mensagem).toBe(mensagem)
  })

  it('sem sessão (link vencido), o Supabase manda só o nome do erro, e a mensagem é a do link', async () => {
    const updateUser = vi.fn().mockResolvedValue({
      data: null,
      error: { name: 'AuthSessionMissingError', message: 'Auth session missing!' },
    })

    const erro = await repositorioCom(updateUser)
      .definirNovaSenha('nova123')
      .catch((e) => e)

    expect(erro.codigo).toBe('session_not_found')
    expect(erro.mensagem).toBe('O link expirou. Peça um novo.')
  })

  it('usa uma mensagem genérica para erros desconhecidos', async () => {
    const updateUser = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: 'algo_novo', message: 'boom' } })

    await expect(repositorioCom(updateUser).definirNovaSenha('nova123')).rejects.toThrow(
      'Não foi possível trocar a senha. Tente de novo.',
    )
  })
})
