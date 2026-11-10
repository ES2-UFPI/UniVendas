import { somenteDigitos, type CanalContato } from './CanalContato'

/** Abre o discador do celular. O link `tel:` não aceita mensagem, então ela é ignorada. */
export class TelefoneContato implements CanalContato {
  rotulo(): string {
    return 'Ligar'
  }

  gerarLink(valor: string): string {
    return `tel:+${somenteDigitos(valor)}`
  }
}
