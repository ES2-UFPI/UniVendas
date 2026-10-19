/** Quem está usando o app. Todo usuário é comprador; vira vendedor quando tem registro em `vendedores`. */
export class Usuario {
  readonly id: string
  readonly nome: string
  readonly email: string
  readonly ehModerador: boolean
  readonly vendedorId: string | null

  constructor(
    id: string,
    nome: string,
    email: string,
    ehModerador = false,
    vendedorId: string | null = null,
  ) {
    this.id = id
    this.nome = nome
    this.email = email
    this.ehModerador = ehModerador
    this.vendedorId = vendedorId
  }

  ehVendedor(): boolean {
    return this.vendedorId !== null
  }
}
