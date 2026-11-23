/** Canais de contato do MVP. Instagram entra no incremento 2 (RN20). */
export type CanalTipo = 'whatsapp' | 'telefone'

/**
 * Forma de falar com o vendedor, fora do app. `valor` no formato 55 + DDD + número (RN21).
 * `visivel` diz se os outros usuários recebem este contato; oculto, só o dono vê (RN24).
 */
export class Contato {
  readonly canal: CanalTipo
  readonly valor: string
  readonly visivel: boolean

  // Todo contato começa visível (RN24).
  constructor(canal: CanalTipo, valor: string, visivel = true) {
    this.canal = canal
    this.valor = valor
    this.visivel = visivel
  }
}
