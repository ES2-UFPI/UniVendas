import { describe, expect, it } from 'vitest'
import { LIMITE_MENSAGEM, validarMensagem } from './validacoesMensagem'

describe('validarMensagem (RN23)', () => {
  it('aceita um texto comum', () => {
    expect(validarMensagem('Oi, ainda tem brownie?')).toBeNull()
  })

  it('recusa texto vazio ou só com espaços', () => {
    expect(validarMensagem('')).toBe('Escreva uma mensagem.')
    expect(validarMensagem('   \n ')).toBe('Escreva uma mensagem.')
  })

  it('aceita exatamente 1000 caracteres e recusa 1001', () => {
    expect(validarMensagem('a'.repeat(LIMITE_MENSAGEM))).toBeNull()
    expect(validarMensagem('a'.repeat(LIMITE_MENSAGEM + 1))).toBe(
      'A mensagem pode ter até 1000 caracteres.',
    )
  })

  it('não conta os espaços das pontas', () => {
    expect(validarMensagem(`  ${'a'.repeat(LIMITE_MENSAGEM)}  `)).toBeNull()
  })
})
