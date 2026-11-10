/**
 * Item à venda de um vendedor (US08): nome, preço, categoria folha e foto opcional (RN07).
 * Não há estoque: o item só está disponível ou esgotado (RN08).
 */
export class Item {
  readonly id: string
  readonly vendedorId: string
  readonly categoriaId: number
  readonly nome: string
  readonly descricao: string
  /** Em reais, maior ou igual a zero. */
  readonly preco: number
  readonly fotoUrl: string | null
  readonly disponivel: boolean

  constructor(
    id: string,
    vendedorId: string,
    categoriaId: number,
    nome: string,
    preco: number,
    descricao = '',
    fotoUrl: string | null = null,
    disponivel = true,
  ) {
    this.id = id
    this.vendedorId = vendedorId
    this.categoriaId = categoriaId
    this.nome = nome
    this.preco = preco
    this.descricao = descricao
    this.fotoUrl = fotoUrl
    this.disponivel = disponivel
  }
}
