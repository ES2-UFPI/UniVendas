import { describe, expect, it } from 'vitest'
import { contagemNoCampus } from './contagemNoCampus'

describe('contagemNoCampus', () => {
  it('conta no singular, no plural e quando não há ninguém', () => {
    expect(contagemNoCampus(0)).toBe('Nenhum vendedor no campus agora')
    expect(contagemNoCampus(1)).toBe('1 vendedor no campus agora')
    expect(contagemNoCampus(3)).toBe('3 vendedores no campus agora')
  })
})
