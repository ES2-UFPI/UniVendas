import type { Categoria } from './Categoria'
import type { Item } from './Item'

/**
 * Padrão Repository: as telas de itens dependem desta interface, não do Supabase.
 * Todos os métodos lançam `Falha` quando não conseguem.
 */
export interface ItemRepository {
  /** Itens de um vendedor, em ordem alfabética. */
  listar(vendedorId: string): Promise<Item[]>

  /** Grava um item novo e devolve o item salvo, já com o id. O `id` recebido é ignorado. */
  criar(item: Item): Promise<Item>

  /** Salva os dados do item (nome, preço, categoria, foto, disponível) e devolve o item salvo. */
  editar(item: Item): Promise<Item>

  remover(itemId: string): Promise<void>

  /** A árvore de categorias, em ordem alfabética; o formulário só oferece as folhas (RN07). */
  listarCategorias(): Promise<Categoria[]>

  /**
   * Envia a foto (já comprimida, RN10) para a pasta do dono no bucket e devolve a URL pública,
   * para guardar no `fotoUrl` do item. `perfilId` é o id da conta (`auth.uid()`), dono da pasta.
   */
  enviarFoto(perfilId: string, foto: Blob): Promise<string>
}
