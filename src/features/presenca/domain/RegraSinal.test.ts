import { describe, expect, it } from 'vitest'
import {
  INTERVALO_SINAL_MS,
  LIMITE_DESLOCAMENTO_M,
  deveEnviarSinal,
  distanciaEmMetros,
} from './RegraSinal'

const base = { latitude: -5.0577, longitude: -42.7955 }
const inicio = new Date('2026-11-16T10:00:00Z')

/** Um ponto a `metros` ao norte de `base` (1 grau de latitude ≈ 111,19 km). */
function aoNorte(metros: number) {
  return { latitude: base.latitude + metros / 111_195, longitude: base.longitude }
}

function depoisDe(ms: number) {
  return new Date(inicio.getTime() + ms)
}

describe('distanciaEmMetros', () => {
  it('é zero para o mesmo ponto', () => {
    expect(distanciaEmMetros(base, base)).toBe(0)
  })

  it('mede cerca de 100 m para um ponto 100 m ao norte', () => {
    expect(distanciaEmMetros(base, aoNorte(100))).toBeCloseTo(100, 0)
  })
})

describe('deveEnviarSinal (RN13)', () => {
  const ultimo = { posicao: base, em: inicio }

  it('os limites são 2 minutos e 25 m', () => {
    expect(INTERVALO_SINAL_MS).toBe(120_000)
    expect(LIMITE_DESLOCAMENTO_M).toBe(25)
  })

  it('envia o primeiro sinal quando ainda não enviou nenhum', () => {
    expect(deveEnviarSinal(null, base, inicio)).toBe(true)
  })

  it('não envia se passou pouco tempo e o vendedor quase não se moveu', () => {
    expect(deveEnviarSinal(ultimo, aoNorte(10), depoisDe(60_000))).toBe(false)
  })

  it('envia quando passam 2 minutos, mesmo parado', () => {
    expect(deveEnviarSinal(ultimo, base, depoisDe(120_000))).toBe(true)
  })

  it('não envia 1 ms antes dos 2 minutos', () => {
    expect(deveEnviarSinal(ultimo, base, depoisDe(119_999))).toBe(false)
  })

  it('envia quando o vendedor se move mais de 25 m, mesmo antes dos 2 minutos', () => {
    expect(deveEnviarSinal(ultimo, aoNorte(30), depoisDe(10_000))).toBe(true)
  })

  it('não envia com 25 m ou menos', () => {
    expect(deveEnviarSinal(ultimo, aoNorte(24), depoisDe(10_000))).toBe(false)
  })
})
