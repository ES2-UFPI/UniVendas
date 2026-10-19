import type { Usuario } from './Usuario'

/**
 * Padrão Repository: o resto do app depende desta interface, não do Supabase.
 * Assim dá para trocar a implementação (por exemplo, por uma falsa nos testes).
 * Os métodos entrar, sair e aoMudarUsuario entram na tarefa da US02.
 */
export interface AuthRepository {
  /** Cria a conta e já deixa o usuário logado (RN01). Lança `Falha` se não conseguir. */
  cadastrar(nome: string, email: string, senha: string): Promise<Usuario>
}
