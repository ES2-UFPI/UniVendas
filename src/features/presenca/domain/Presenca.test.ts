import { describe, expect, it } from 'vitest'
import { Presenca } from './Presenca'

const ultimoSinal = new Date('2026-10-24T12:00:00Z')

function presencaComSinalEm(sinal: Date) {
  return new Presenca(
    'v1',
    'Brownies da Ana',
    { latitude: -5.0577, longitude: -42.7955 },
    false,
    null,
    sinal,
  )
}

const minutosDepois = (minutos: number) => new Date(ultimoSinal.getTime() + minutos * 60 * 1000)

describe('Presenca.estaAtiva', () => {
  it('está ativa logo depois do sinal', () => {
    expect(presencaComSinalEm(ultimoSinal).estaAtiva(ultimoSinal)).toBe(true)
  })

  it('continua ativa até 30 minutos sem sinal', () => {
    expect(presencaComSinalEm(ultimoSinal).estaAtiva(minutosDepois(29))).toBe(true)
  })

  it('deixa de estar ativa com 30 minutos ou mais sem sinal (RN16)', () => {
    expect(presencaComSinalEm(ultimoSinal).estaAtiva(minutosDepois(30))).toBe(false)
    expect(presencaComSinalEm(ultimoSinal).estaAtiva(minutosDepois(120))).toBe(false)
  })
})
