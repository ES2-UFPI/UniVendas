import type { Contato } from './Contato'
import type { Vendedor } from './Vendedor'

/**
 * Padrão Repository: o resto do app depende desta interface, não do Supabase.
 * Buscar, editar e o catálogo de itens entram nas tarefas das próximas histórias.
 */
export interface VendedorRepository {
  /**
   * Cria o perfil de vendedor do usuário com os contatos e a foto opcional, e devolve o vendedor salvo.
   * Lança `Falha` se não conseguir; nesse caso nada fica gravado pela metade.
   */
  criar(vendedor: Vendedor, contatos: Contato[], foto?: Blob): Promise<Vendedor>
}
