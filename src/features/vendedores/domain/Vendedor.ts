export type TipoVendedor = 'ambulante' | 'quiosque' | 'prestador'

/**
 * Perfil de vendedor (RN02: a conta vira vendedora ao ter um). Cada tipo é uma subclasse,
 * criada pela `VendedorFactory`. As regras de mapa por tipo (`apareceNoMapa`) entram com a presença (US04).
 */
export abstract class Vendedor {
  abstract readonly tipo: TipoVendedor
  readonly id: string
  readonly perfilId: string
  readonly nomeExibicao: string
  readonly descricao: string
  readonly fotoUrl: string | null

  constructor(
    id: string,
    perfilId: string,
    nomeExibicao: string,
    descricao = '',
    fotoUrl: string | null = null,
  ) {
    this.id = id
    this.perfilId = perfilId
    this.nomeExibicao = nomeExibicao
    this.descricao = descricao
    this.fotoUrl = fotoUrl
  }
}

/** Vende andando pelo campus. Único tipo do MVP. */
export class VendedorAmbulante extends Vendedor {
  readonly tipo = 'ambulante'
}
