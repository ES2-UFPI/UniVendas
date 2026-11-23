import { afterEach, describe, expect, it } from 'vitest'
import { guardarModo, lerModo, modoAtual } from './modoDeUso'

afterEach(() => localStorage.clear())

describe('modoAtual (RN02)', () => {
  it('quem não tem perfil de vendedor é sempre consumidor', () => {
    expect(modoAtual(false, null)).toBe('consumidor')
    expect(modoAtual(false, 'vendedor')).toBe('consumidor')
  })

  it('quem é vendedor começa como vendedor e respeita a escolha guardada', () => {
    expect(modoAtual(true, null)).toBe('vendedor')
    expect(modoAtual(true, 'consumidor')).toBe('consumidor')
    expect(modoAtual(true, 'vendedor')).toBe('vendedor')
  })
})

describe('modo guardado', () => {
  it('lembra o modo de cada conta separadamente', () => {
    guardarModo('a', 'consumidor')
    guardarModo('b', 'vendedor')
    expect(lerModo('a')).toBe('consumidor')
    expect(lerModo('b')).toBe('vendedor')
    expect(lerModo('c')).toBeNull()
  })

  it('ignora um valor estranho guardado', () => {
    localStorage.setItem('univendas:modo:a', 'qualquer-coisa')
    expect(lerModo('a')).toBeNull()
  })
})
