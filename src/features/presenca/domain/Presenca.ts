import type { LatLng } from '../../../core/localizacaoService'

/** Sem sinal por 30 minutos, o servidor desliga o vendedor (RN16). */
export const LIMITE_SEM_SINAL_MS = 30 * 60 * 1000

/** Um vendedor ativo no campus agora, como aparece no mapa. */
export class Presenca {
  readonly vendedorId: string
  /** Nome de exibição do vendedor (`vendedores.nome_exibicao`), que o balão do marcador mostra. */
  readonly nomeVendedor: string
  /** Posição exibida no mapa: o ponto escolhido, se houver, ou a localização real (RN14, RN17). */
  readonly posicao: LatLng
  readonly pontoEscolhido: boolean
  readonly referencia: string | null
  readonly ultimoSinalEm: Date

  constructor(
    vendedorId: string,
    nomeVendedor: string,
    posicao: LatLng,
    pontoEscolhido: boolean,
    referencia: string | null,
    ultimoSinalEm: Date,
  ) {
    this.vendedorId = vendedorId
    this.nomeVendedor = nomeVendedor
    this.posicao = posicao
    this.pontoEscolhido = pontoEscolhido
    this.referencia = referencia
    this.ultimoSinalEm = ultimoSinalEm
  }

  /**
   * Está ativa se o último sinal foi há menos de 30 minutos. O mapa aplica este filtro também,
   * para não depender só do job do servidor que apaga as presenças antigas.
   */
  estaAtiva(agora: Date): boolean {
    return agora.getTime() - this.ultimoSinalEm.getTime() < LIMITE_SEM_SINAL_MS
  }
}
