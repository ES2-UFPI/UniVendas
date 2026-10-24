import type { Usuario } from './Usuario'

/**
 * Padrão Repository: o resto do app depende desta interface, não do Supabase.
 * Assim dá para trocar a implementação (por exemplo, por uma falsa nos testes).
 */
export interface AuthRepository {
  /** Cria a conta e já deixa o usuário logado (RN01). Lança `Falha` se não conseguir. */
  cadastrar(nome: string, email: string, senha: string): Promise<Usuario>

  /** Entra com e-mail e senha. Lança `Falha` com mensagem clara se a senha estiver errada. */
  entrar(email: string, senha: string): Promise<Usuario>

  /** Sai da conta neste aparelho. */
  sair(): Promise<void>

  /**
   * Padrão Observer: avisa `ouvinte` sempre que o usuário logado muda (entrou, saiu ou a sessão
   * foi restaurada ao abrir o app). Recebe `null` quando ninguém está logado.
   * Devolve uma função que cancela a inscrição.
   */
  aoMudarUsuario(ouvinte: (usuario: Usuario | null) => void): () => void
}
