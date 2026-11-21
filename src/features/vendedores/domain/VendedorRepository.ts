import type { Contato } from './Contato'
import type { PerfilVendedor } from './PerfilVendedor'
import type { Vendedor } from './Vendedor'

/**
 * Padrão Repository: o resto do app depende desta interface, não do Supabase.
 */
export interface VendedorRepository {
  /**
   * Cria o perfil de vendedor do usuário com os contatos e a foto opcional, e devolve o vendedor salvo.
   * Lança `Falha` se não conseguir; nesse caso nada fica gravado pela metade.
   */
  criar(vendedor: Vendedor, contatos: Contato[], foto?: Blob): Promise<Vendedor>

  /**
   * Atualiza o próprio perfil de vendedor (US14): nome, descrição, foto e contatos. `vendedor.id` diz qual perfil.
   * `contatos` é a lista completa que o vendedor quer ter: o que já existe tem o valor atualizado, o canal
   * novo é criado e o canal que saiu da lista é apagado. Precisa ter ao menos um contato (RN06).
   * Sem `foto`, a foto atual fica como está. Devolve o vendedor salvo.
   * Lança `Falha` se não conseguir; se o erro vier nos contatos, o nome, a descrição e a foto já foram salvos.
   */
  atualizarPerfil(vendedor: Vendedor, contatos: Contato[], foto?: Blob): Promise<Vendedor>

  /**
   * Busca o perfil público do vendedor `id`: dados, contatos, itens e se está ativo agora (US10).
   * Devolve `null` se o vendedor não existe. Lança `Falha` se não conseguir buscar.
   */
  buscarPerfil(id: string): Promise<PerfilVendedor | null>

  /** O perfil de vendedor da conta `perfilId`, ou null se ela ainda não criou um. Lança `Falha` se não conseguir. */
  buscarDoUsuario(perfilId: string): Promise<Vendedor | null>
}
