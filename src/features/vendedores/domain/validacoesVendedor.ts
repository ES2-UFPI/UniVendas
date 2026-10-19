/** Campos do formulário "Quero vender" (US03). */
export interface DadosCadastroVendedor {
  nomeExibicao: string
  descricao: string
  whatsapp: string
  telefone: string
}

export type ErrosCadastroVendedor = Partial<
  Record<'nomeExibicao' | 'contato' | 'whatsapp' | 'telefone', string>
>

// 55 + DDD (sem zero na frente) + número de 8 ou 9 dígitos. É a mesma regra da tabela contatos (RN21).
const FORMATO_TELEFONE = /^55[1-9][0-9][0-9]{8,9}$/

/**
 * Deixa só os dígitos e põe o 55 na frente quando a pessoa digitou só DDD + número.
 * Ex.: "(86) 99999-8888" vira "5586999998888".
 */
export function normalizarTelefone(texto: string): string {
  const digitos = texto.replace(/\D/g, '')
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`
  return digitos
}

export function telefoneValido(texto: string): boolean {
  return FORMATO_TELEFONE.test(normalizarTelefone(texto))
}

/** Valida os dados do perfil de vendedor (RN06, RN21). Sem erros, devolve um objeto vazio. */
export function validarCadastroVendedor(dados: DadosCadastroVendedor): ErrosCadastroVendedor {
  const erros: ErrosCadastroVendedor = {}

  if (dados.nomeExibicao.trim() === '') {
    erros.nomeExibicao = 'Informe o nome que os compradores vão ver.'
  }

  const temWhatsapp = dados.whatsapp.trim() !== ''
  const temTelefone = dados.telefone.trim() !== ''

  if (!temWhatsapp && !temTelefone) {
    erros.contato = 'Informe ao menos um contato: WhatsApp ou telefone.'
  }
  if (temWhatsapp && !telefoneValido(dados.whatsapp)) {
    erros.whatsapp = 'Use o DDD e o número, por exemplo (86) 99999-8888.'
  }
  if (temTelefone && !telefoneValido(dados.telefone)) {
    erros.telefone = 'Use o DDD e o número, por exemplo (86) 3215-1234.'
  }

  return erros
}
