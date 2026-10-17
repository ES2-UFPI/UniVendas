/**
 * Erro padronizado do app: `mensagem` é o texto que pode ir para a tela,
 * `codigo` identifica o caso (útil nos testes e para decidir o que fazer).
 */
export class Falha extends Error {
  readonly codigo: string

  constructor(mensagem: string, codigo: string) {
    super(mensagem)
    this.name = 'Falha'
    this.codigo = codigo
  }

  get mensagem(): string {
    return this.message
  }
}
