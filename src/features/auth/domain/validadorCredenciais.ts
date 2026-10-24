/** Campos do formulário de cadastro (US01). */
export interface DadosCadastro {
  nome: string
  email: string
  senha: string
}

export type ErrosCadastro = Partial<Record<keyof DadosCadastro, string>>

/** Tamanho mínimo da senha. É o mesmo mínimo configurado no Supabase Auth. */
export const TAMANHO_MINIMO_SENHA = 6

// Algo antes do @, um domínio e um ponto com algo depois, sem espaços. Ex.: ana@ufpi.edu.br.
// Qualquer e-mail vale, não só o da UFPI (RN01).
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function emailValido(email: string): boolean {
  return FORMATO_EMAIL.test(email.trim())
}

/** A senha não passa por trim: espaço também conta como caractere. */
export function senhaValida(senha: string): boolean {
  return senha.length >= TAMANHO_MINIMO_SENHA
}

/** Valida os dados do cadastro (US01, RN01). Sem erros, devolve um objeto vazio. */
export function validarCadastro(dados: DadosCadastro): ErrosCadastro {
  const erros: ErrosCadastro = {}

  if (dados.nome.trim() === '') {
    erros.nome = 'Informe seu nome.'
  }
  if (dados.email.trim() === '') {
    erros.email = 'Informe seu e-mail.'
  } else if (!emailValido(dados.email)) {
    erros.email = 'Digite um e-mail válido, por exemplo ana@ufpi.edu.br.'
  }
  if (!senhaValida(dados.senha)) {
    erros.senha = `A senha precisa ter ${TAMANHO_MINIMO_SENHA} ou mais caracteres.`
  }

  return erros
}

/**
 * Valida os dados do login (US02). Aqui não se cobra o tamanho mínimo da senha: quem decide se
 * ela está certa é o servidor, e a mensagem de senha errada vem de lá (RN04).
 */
export function validarLogin(dados: Pick<DadosCadastro, 'email' | 'senha'>): ErrosCadastro {
  const erros: ErrosCadastro = {}

  if (dados.email.trim() === '') {
    erros.email = 'Informe seu e-mail.'
  } else if (!emailValido(dados.email)) {
    erros.email = 'Digite um e-mail válido, por exemplo ana@ufpi.edu.br.'
  }
  if (dados.senha === '') {
    erros.senha = 'Informe sua senha.'
  }

  return erros
}
