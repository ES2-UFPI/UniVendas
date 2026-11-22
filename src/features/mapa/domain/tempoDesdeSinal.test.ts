import { describe, expect, it } from 'vitest'
import { tempoDesdeSinal } from './tempoDesdeSinal'

const sinal = new Date('2026-11-21T12:00:00Z')

function depoisDe(ms: number) {
  return new Date(sinal.getTime() + ms)
}

describe('tempoDesdeSinal', () => {
  it('diz "agora" até 59 segundos depois do sinal', () => {
    expect(tempoDesdeSinal(sinal, sinal)).toBe('agora')
    expect(tempoDesdeSinal(sinal, depoisDe(59_999))).toBe('agora')
  })

  it('conta os minutos inteiros', () => {
    expect(tempoDesdeSinal(sinal, depoisDe(60_000))).toBe('há 1 min')
    expect(tempoDesdeSinal(sinal, depoisDe(5 * 60_000 + 30_000))).toBe('há 5 min')
    expect(tempoDesdeSinal(sinal, depoisDe(29 * 60_000))).toBe('há 29 min')
  })

  it('não mostra tempo negativo se o relógio do aparelho estiver adiantado', () => {
    expect(tempoDesdeSinal(sinal, depoisDe(-120_000))).toBe('agora')
  })
})
