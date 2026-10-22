import { describe, expect, it } from 'vitest'
import { emailValido, senhaValida, validarCadastro } from './validadorCredenciais'

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
