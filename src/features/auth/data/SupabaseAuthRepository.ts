import type { AuthError, SupabaseClient } from '@supabase/supabase-js'
import { Falha } from '../../../core/falha'
import { SupabaseService } from '../../../core/supabaseService'
import type { Database } from '../../../types/database.types'
import type { AuthRepository } from '../domain/AuthRepository'
import { Usuario } from '../domain/Usuario'

/** Traduz os códigos de erro do Supabase Auth para mensagens que o usuário entende. */
const MENSAGENS: Record<string, string> = {
  user_already_exists: 'Este e-mail já tem uma conta. Tente entrar.',
  email_exists: 'Este e-mail já tem uma conta. Tente entrar.',
  email_address_invalid: 'Digite um e-mail válido.',
  validation_failed: 'Digite um e-mail válido.',
  weak_password: 'A senha precisa ter 6 ou mais caracteres.',
  over_request_rate_limit: 'Muitas tentativas seguidas. Espere um pouco e tente de novo.',
}

function paraFalha(erro: AuthError): Falha {
  const codigo = erro.code ?? 'desconhecido'
  return new Falha(MENSAGENS[codigo] ?? 'Não foi possível criar a conta. Tente de novo.', codigo)
}

export class SupabaseAuthRepository implements AuthRepository {
  private readonly client: SupabaseClient<Database>

  // O cliente pode ser passado de fora para os testes; no app, usa o do Singleton.
  constructor(client: SupabaseClient<Database> = SupabaseService.getInstance().client) {
    this.client = client
  }

  async cadastrar(nome: string, email: string, senha: string): Promise<Usuario> {
    // O nome vai nos metadados; o trigger do banco usa ele para criar o registro em `perfis`.
    const { data, error } = await this.client.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { data: { nome: nome.trim() } },
    })

    if (error) throw paraFalha(error)
    if (!data.user) throw new Falha('Não foi possível criar a conta. Tente de novo.', 'sem_usuario')

    return new Usuario(data.user.id, nome.trim(), data.user.email ?? email.trim())
  }
}
