import type { AuthError, SupabaseClient, User } from '@supabase/supabase-js'
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
  invalid_credentials: 'E-mail ou senha incorretos.',
  over_request_rate_limit: 'Muitas tentativas seguidas. Espere um pouco e tente de novo.',
}

function paraFalha(erro: AuthError, mensagemPadrao: string): Falha {
  const codigo = erro.code ?? 'desconhecido'
  return new Falha(MENSAGENS[codigo] ?? mensagemPadrao, codigo)
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

    if (error) throw paraFalha(error, 'Não foi possível criar a conta. Tente de novo.')
    if (!data.user) throw new Falha('Não foi possível criar a conta. Tente de novo.', 'sem_usuario')

    return new Usuario(data.user.id, nome.trim(), data.user.email ?? email.trim())
  }

  async entrar(email: string, senha: string): Promise<Usuario> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })

    if (error) throw paraFalha(error, 'Não foi possível entrar. Tente de novo.')

    return this.montarUsuario(data.user)
  }

  async sair(): Promise<void> {
    const { error } = await this.client.auth.signOut()
    if (error) throw paraFalha(error, 'Não foi possível sair. Tente de novo.')
  }

  aoMudarUsuario(ouvinte: (usuario: Usuario | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_evento, sessao) => {
      // A documentação do Supabase pede para não chamar o banco direto dentro deste callback
      // (pode travar). O setTimeout deixa a busca do perfil para logo depois.
      setTimeout(() => {
        if (!sessao) {
          ouvinte(null)
          return
        }
        this.montarUsuario(sessao.user)
          .then(ouvinte)
          .catch(() => ouvinte(null))
      }, 0)
    })

    return () => data.subscription.unsubscribe()
  }

  /** Junta o usuário do Auth com o nome e o papel de moderador (`perfis`) e o vendedor, se tiver. */
  private async montarUsuario(user: User): Promise<Usuario> {
    const [perfil, vendedor] = await Promise.all([
      this.client.from('perfis').select('nome, eh_moderador').eq('id', user.id).maybeSingle(),
      this.client.from('vendedores').select('id').eq('perfil_id', user.id).maybeSingle(),
    ])

    if (perfil.error || vendedor.error) {
      throw new Falha('Não foi possível carregar a sua conta. Tente de novo.', 'perfil')
    }

    return new Usuario(
      user.id,
      perfil.data?.nome ?? '',
      user.email ?? '',
      perfil.data?.eh_moderador ?? false,
      vendedor.data?.id ?? null,
    )
  }
}
