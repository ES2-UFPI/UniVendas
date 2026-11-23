/** Uma mensagem de texto numa conversa (US18). A hora do envio é a do servidor. */
export class Mensagem {
  readonly id: string
  readonly conversaId: string
  /** Perfil de quem escreveu (`perfis.id`, o mesmo id da conta). */
  readonly autorId: string
  readonly texto: string
  readonly enviadaEm: Date

  constructor(id: string, conversaId: string, autorId: string, texto: string, enviadaEm: Date) {
    this.id = id
    this.conversaId = conversaId
    this.autorId = autorId
    this.texto = texto
    this.enviadaEm = enviadaEm
  }

  /** A tela da conversa alinha à direita as mensagens de quem está logado. */
  ehDe(perfilId: string): boolean {
    return this.autorId === perfilId
  }
}
