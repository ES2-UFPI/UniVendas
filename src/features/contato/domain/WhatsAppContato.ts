import { somenteDigitos, type CanalContato } from './CanalContato'

/** Abre a conversa no WhatsApp já com a mensagem escrita (RN20). */
export class WhatsAppContato implements CanalContato {
  rotulo(): string {
    return 'WhatsApp'
  }

  gerarLink(valor: string, mensagem: string): string {
    return `https://wa.me/${somenteDigitos(valor)}?text=${encodeURIComponent(mensagem)}`
  }
}
