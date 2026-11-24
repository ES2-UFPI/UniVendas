import type { Item } from '../../itens/domain/Item'
import type { Contato } from './Contato'
import type { Vendedor } from './Vendedor'

/**
 * Tudo o que a tela de perfil do vendedor mostra (US10): os dados do vendedor, os contatos,
 * os itens e se ele está no campus agora. Quando não está, a tela mostra "fora do campus agora" (RN19).
 */
export class PerfilVendedor {
  readonly vendedor: Vendedor
  readonly contatos: Contato[]
  /** Disponíveis primeiro e esgotados depois, cada grupo em ordem alfabética (RN09). */
  readonly itens: Item[]
  readonly ativoAgora: boolean
  /** Onde achar o vendedor agora, ex.: "Perto da Biblioteca" (RN18); só quando está no campus. */
  readonly referencia: string | null

  constructor(
    vendedor: Vendedor,
    contatos: Contato[],
    itens: Item[],
    ativoAgora: boolean,
    referencia: string | null = null,
  ) {
    this.vendedor = vendedor
    this.contatos = contatos
    this.itens = [...itens].sort(
      (a, b) =>
        Number(b.disponivel) - Number(a.disponivel) || a.nome.localeCompare(b.nome, 'pt-BR'),
    )
    this.ativoAgora = ativoAgora
    this.referencia = referencia
  }
}
