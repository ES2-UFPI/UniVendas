/** Tamanho máximo de uma mensagem, o mesmo do `check` da tabela `mensagens` (RN23). */
export const LIMITE_MENSAGEM = 1000

/**
 * Valida o texto da mensagem antes de enviar (RN23): não pode ser vazio nem passar de 1000 caracteres.
 * Os espaços das pontas não contam. Devolve a mensagem de erro, ou `null` se o texto está certo.
 */
export function validarMensagem(texto: string): string | null {
  const limpo = texto.trim()
  if (limpo === '') return 'Escreva uma mensagem.'
  if (limpo.length > LIMITE_MENSAGEM) {
    return `A mensagem pode ter até ${LIMITE_MENSAGEM} caracteres.`
  }
  return null
}
