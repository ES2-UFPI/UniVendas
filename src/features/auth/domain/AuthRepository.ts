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
   * Exclui a conta de quem está logado e os dados dela (US17, RN05): primeiro as fotos do bucket e,
   * depois, em cascata no servidor, perfil, vendedor, itens, contatos, presença e conversas.
   * Em seguida a pessoa sai da conta neste aparelho. Lança `Falha` se não conseguir; se a falha vier
   * depois das fotos, a conta continua, mas as fotos já foram apagadas.
   */
  excluirConta(): Promise<void>

  /**
   * Manda para o e-mail o link de recuperar a senha (US15). O link abre a tela "Nova senha".
   * Não diz se o e-mail tem conta: com ou sem conta, o resultado é o mesmo. Lança `Falha` se não conseguir enviar.
   */
  enviarLinkDeRecuperacao(email: string): Promise<void>

  /**
   * Troca a senha de quem está logado, e quem abre o link de recuperação fica logado (US15).
   * Lança `Falha` se a senha for fraca, igual à atual, ou se o link tiver expirado.
   */
  definirNovaSenha(senha: string): Promise<void>

  /**
   * Padrão Observer: avisa `ouvinte` sempre que o usuário logado muda (entrou, saiu ou a sessão
   * foi restaurada ao abrir o app). Recebe `null` quando ninguém está logado.
   * Devolve uma função que cancela a inscrição.
   */
  aoMudarUsuario(ouvinte: (usuario: Usuario | null) => void): () => void
}
