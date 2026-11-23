import type { Mensagem } from './Mensagem'

/**
 * Conversa entre um consumidor e um vendedor, no máximo uma por par (RN22).
 * Guarda os dois lados porque a mesma conversa aparece para os dois: o consumidor vê o nome
 * do vendedor, e o vendedor vê o nome do consumidor.
 */
export class Conversa {
  readonly id: string
  /** Perfil de quem abriu a conversa. */
  readonly consumidorId: string
  readonly nomeConsumidor: string
  readonly vendedorId: string
  /** Perfil do dono do vendedor, para saber de que lado quem está logado está. */
  readonly vendedorPerfilId: string
  /** Nome de exibição do vendedor (`vendedores.nome_exibicao`). */
  readonly nomeVendedor: string
  readonly criadaEm: Date
  /** A mensagem mais recente, que a tela "Conversas" mostra. `null` se ninguém escreveu ainda. */
  readonly ultimaMensagem: Mensagem | null

  constructor(
    id: string,
    consumidorId: string,
    nomeConsumidor: string,
    vendedorId: string,
    vendedorPerfilId: string,
    nomeVendedor: string,
    criadaEm: Date,
    ultimaMensagem: Mensagem | null = null,
  ) {
    this.id = id
    this.consumidorId = consumidorId
    this.nomeConsumidor = nomeConsumidor
    this.vendedorId = vendedorId
    this.vendedorPerfilId = vendedorPerfilId
    this.nomeVendedor = nomeVendedor
    this.criadaEm = criadaEm
    this.ultimaMensagem = ultimaMensagem
  }

  /** Nome de quem está do outro lado: o vendedor para o consumidor, e o consumidor para o vendedor. */
  nomeDaOutraPessoa(meuPerfilId: string): string {
    return meuPerfilId === this.vendedorPerfilId ? this.nomeConsumidor : this.nomeVendedor
  }

  /** Hora da última mensagem, ou da abertura, se ainda não há mensagens. Ordena a lista de conversas. */
  ultimaAtividade(): Date {
    return this.ultimaMensagem?.enviadaEm ?? this.criadaEm
  }
}
