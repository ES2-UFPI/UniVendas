import type { Contato } from './Contato'
import type { PerfilVendedor } from './PerfilVendedor'
import type { Vendedor } from './Vendedor'

/**
 * Padrão Repository: o resto do app depende desta interface, não do Supabase.
 * Editar o perfil entra numa história futura.
 */
export interface VendedorRepository {
  /**
   * Cria o perfil de vendedor do usuário com os contatos e a foto opcional, e devolve o vendedor salvo.
   * Lança `Falha` se não conseguir; nesse caso nada fica gravado pela metade.
   */
  criar(vendedor: Vendedor, contatos: Contato[], foto?: Blob): Promise<Vendedor>

  /**
   * Busca o perfil público do vendedor `id`: dados, contatos, itens e se está ativo agora (US10).
   * Devolve `null` se o vendedor não existe. Lança `Falha` se não conseguir buscar.
   */
  buscarPerfil(id: string): Promise<PerfilVendedor | null>
}
