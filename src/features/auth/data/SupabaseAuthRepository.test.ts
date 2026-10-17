import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
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
