import { describe, expect, it } from 'vitest'
import {
  normalizarTelefone,
  telefoneValido,
  validarCadastroVendedor,
  type DadosCadastroVendedor,
} from './validacoesVendedor'

const validos: DadosCadastroVendedor = {
  nomeExibicao: 'Brownies da Ana',
  descricao: '',
  whatsapp: '(86) 99999-8888',
  telefone: '',
}

describe('normalizarTelefone', () => {
  it('tira a máscara e põe o 55 na frente', () => {
    expect(normalizarTelefone('(86) 99999-8888')).toBe('5586999998888')
  })

  it('mantém o número que já vem com 55', () => {
    expect(normalizarTelefone('+55 86 99999-8888')).toBe('5586999998888')
  })

  it('aceita telefone fixo com 8 dígitos', () => {
    expect(normalizarTelefone('86 3215-1234')).toBe('558632151234')
  })
})

describe('telefoneValido', () => {
  it.each(['(86) 99999-8888', '5586999998888', '86 3215-1234'])('aceita %s', (numero) => {
    expect(telefoneValido(numero)).toBe(true)
  })

  it.each(['99999-8888', '(06) 99999-8888', '123', 'abc'])('recusa %s', (numero) => {
    expect(telefoneValido(numero)).toBe(false)
  })
})

describe('validarCadastroVendedor', () => {
  it('não tem erros com nome e um contato válido', () => {
    expect(validarCadastroVendedor(validos)).toEqual({})
  })

  it('exige o nome de exibição (RN06)', () => {
    expect(validarCadastroVendedor({ ...validos, nomeExibicao: '   ' })).toHaveProperty(
      'nomeExibicao',
    )
  })

  it('exige ao menos um contato (RN06)', () => {
    const erros = validarCadastroVendedor({ ...validos, whatsapp: '', telefone: '' })
    expect(erros).toHaveProperty('contato')
  })

  it('aceita só o telefone, sem WhatsApp', () => {
    expect(validarCadastroVendedor({ ...validos, whatsapp: '', telefone: '86 3215-1234' })).toEqual(
      {},
    )
  })

  it('recusa WhatsApp sem DDD (RN21)', () => {
    expect(validarCadastroVendedor({ ...validos, whatsapp: '99999-8888' })).toHaveProperty(
      'whatsapp',
    )
  })

  it('recusa telefone inválido mesmo com WhatsApp válido (RN21)', () => {
    expect(validarCadastroVendedor({ ...validos, telefone: '123' })).toHaveProperty('telefone')
  })

  it('descrição é opcional', () => {
    expect(validarCadastroVendedor({ ...validos, descricao: '' })).toEqual({})
  })
})
