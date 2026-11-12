import type { Contato } from './Contato'
import type { Vendedor } from './Vendedor'

/**
 * Padrão Repository: o resto do app depende desta interface, não do Supabase.
 * Editar o perfil entra numa tarefa futura.
 */
export interface VendedorRepository {
  /**
   * Cria o perfil de vendedor do usuário com os contatos e a foto opcional, e devolve o vendedor salvo.
   * Lança `Falha` se não conseguir; nesse caso nada fica gravado pela metade.
   */
  criar(vendedor: Vendedor, contatos: Contato[], foto?: Blob): Promise<Vendedor>

  /** O perfil de vendedor da conta `perfilId`, ou null se ela ainda não criou um. Lança `Falha` se não conseguir. */
  buscarDoUsuario(perfilId: string): Promise<Vendedor | null>
}
