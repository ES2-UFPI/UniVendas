/**
 * Strategy do módulo Contato: cada canal sabe montar o próprio link.
 * Para um canal novo (Instagram no incremento 2), basta criar outra classe
 * que implemente esta interface e registrá-la no `ContatoService`.
 */
export interface CanalContato {
  /** Texto do botão, por exemplo "WhatsApp" ou "Ligar". */
  rotulo(): string
  /** `valor` no formato 55 + DDD + número (RN21). */
  gerarLink(valor: string, mensagem: string): string
}

/** Deixa só os dígitos, para o link não quebrar com espaço, traço ou parêntese. */
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}
