import { describe, expect, it } from 'vitest'
import {
  emailValido,
  senhaValida,
  validarCadastro,
  validarEsqueciSenha,
  validarLogin,
  validarNovaSenha,
} from './validadorCredenciais'

describe('emailValido', () => {
  it.each(['ana@ufpi.edu.br', 'joao.silva@gmail.com', '  ana@ufpi.edu.br  '])(
    'aceita %j (qualquer e-mail vale, RN01)',
    (email) => {
      expect(emailValido(email)).toBe(true)
    },
  )

  it.each(['', 'ana', 'ana@', '@ufpi.edu.br', 'ana@ufpi', 'ana @ufpi.edu.br', 'ana@@ufpi.br'])(
    'recusa %j',
    (email) => {
      expect(emailValido(email)).toBe(false)
    },
  )
})

describe('senhaValida', () => {
  it('aceita 6 ou mais caracteres', () => {
    expect(senhaValida('123456')).toBe(true)
    expect(senhaValida('uma senha bem longa')).toBe(true)
  })

  it('recusa menos de 6 caracteres', () => {
    expect(senhaValida('')).toBe(false)
    expect(senhaValida('12345')).toBe(false)
  })
})

describe('validarCadastro', () => {
  it('não tem erros quando tudo está certo', () => {
    expect(validarCadastro({ nome: 'Ana', email: 'ana@ufpi.edu.br', senha: '123456' })).toEqual({})
  })

  it('aponta um erro para cada campo vazio', () => {
    const erros = validarCadastro({ nome: '  ', email: '', senha: '' })
    expect(erros.nome).toBe('Informe seu nome.')
    expect(erros.email).toBe('Informe seu e-mail.')
    expect(erros.senha).toBe('A senha precisa ter 6 ou mais caracteres.')
  })

  it('diferencia e-mail vazio de e-mail inválido', () => {
    const erros = validarCadastro({ nome: 'Ana', email: 'ana@', senha: '123456' })
    expect(erros).toEqual({ email: 'Digite um e-mail válido, por exemplo ana@ufpi.edu.br.' })
  })

  it('recusa senha curta', () => {
    const erros = validarCadastro({ nome: 'Ana', email: 'ana@ufpi.edu.br', senha: '12345' })
    expect(erros).toEqual({ senha: 'A senha precisa ter 6 ou mais caracteres.' })
  })
})

describe('validarLogin', () => {
  it('sem erros quando e-mail e senha foram preenchidos', () => {
    expect(validarLogin({ email: 'ana@ufpi.edu.br', senha: '1' })).toEqual({})
  })

  it('pede o e-mail e a senha quando estão vazios', () => {
    expect(validarLogin({ email: '', senha: '' })).toEqual({
      email: 'Informe seu e-mail.',
      senha: 'Informe sua senha.',
    })
  })

  it('recusa e-mail inválido', () => {
    expect(validarLogin({ email: 'ana', senha: '123456' })).toHaveProperty('email')
  })
})

describe('validarEsqueciSenha (US15)', () => {
  it('aceita um e-mail válido', () => {
    expect(validarEsqueciSenha({ email: 'ana@ufpi.edu.br' })).toEqual({})
  })

  it('pede o e-mail quando está vazio ou só com espaços', () => {
    expect(validarEsqueciSenha({ email: '' }).email).toBe('Informe seu e-mail.')
    expect(validarEsqueciSenha({ email: '   ' }).email).toBe('Informe seu e-mail.')
  })

  it('recusa e-mail mal escrito', () => {
    expect(validarEsqueciSenha({ email: 'ana@' }).email).toBe(
      'Digite um e-mail válido, por exemplo ana@ufpi.edu.br.',
    )
  })
})

describe('validarNovaSenha (US15)', () => {
  it('aceita senha com 6 ou mais caracteres e a confirmação igual', () => {
    expect(validarNovaSenha({ senha: '123456', confirmacao: '123456' })).toEqual({})
  })

  it('recusa senha curta', () => {
    expect(validarNovaSenha({ senha: '12345', confirmacao: '12345' }).senha).toBe(
      'A senha precisa ter 6 ou mais caracteres.',
    )
  })

  it('recusa a confirmação diferente', () => {
    expect(validarNovaSenha({ senha: '123456', confirmacao: '654321' }).confirmacao).toBe(
      'As senhas não são iguais.',
    )
  })

  it('a confirmação vazia não é igual à senha', () => {
    expect(validarNovaSenha({ senha: '123456', confirmacao: '' }).confirmacao).toBeDefined()
  })
})
