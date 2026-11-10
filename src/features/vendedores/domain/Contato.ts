/** Canais de contato do MVP. Instagram entra no incremento 2 (RN20). */
export type CanalTipo = 'whatsapp' | 'telefone'

/** Forma de falar com o vendedor, fora do app. `valor` no formato 55 + DDD + número (RN21). */
export class Contato {
  readonly canal: CanalTipo
  readonly valor: string

  constructor(canal: CanalTipo, valor: string) {
    this.canal = canal
    this.valor = valor
  }
}
