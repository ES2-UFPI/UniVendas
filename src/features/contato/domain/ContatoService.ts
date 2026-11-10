import type { CanalTipo, Contato } from '../../vendedores/domain/Contato'
import type { CanalContato } from './CanalContato'
import { TelefoneContato } from './TelefoneContato'
import { WhatsAppContato } from './WhatsAppContato'

export const MENSAGEM_PADRAO = 'Oi! Vi seu anúncio no UniVendas'

/** Mensagem pronta da RN20, com o nome do item quando houver. */
export function montarMensagem(nomeDoItem?: string): string {
  const item = nomeDoItem?.trim()
  return item ? `${MENSAGEM_PADRAO} e tenho interesse em: ${item}` : MENSAGEM_PADRAO
}

/**
 * Escolhe a estratégia pelo canal do contato (padrão Strategy).
 * Quem usa não precisa saber como cada link é montado.
 */
export class ContatoService {
  private readonly estrategias: Map<CanalTipo, CanalContato>

  constructor(
    estrategias: Map<CanalTipo, CanalContato> = new Map<CanalTipo, CanalContato>([
      ['whatsapp', new WhatsAppContato()],
      ['telefone', new TelefoneContato()],
    ]),
  ) {
    this.estrategias = estrategias
  }

  rotulo(contato: Contato): string {
    return this.estrategia(contato).rotulo()
  }

  gerarLink(contato: Contato, nomeDoItem?: string): string {
    return this.estrategia(contato).gerarLink(contato.valor, montarMensagem(nomeDoItem))
  }

  private estrategia(contato: Contato): CanalContato {
    const estrategia = this.estrategias.get(contato.canal)
    if (!estrategia) throw new Error(`Canal de contato sem suporte: ${contato.canal}`)
    return estrategia
  }
}
