import { describe, expect, it } from 'vitest'
import { formatarQuando, rotuloDoDia } from './formatarQuando'

describe('formatarQuando', () => {
  const agora = new Date(2026, 10, 23, 15, 0)

  it('hoje mostra só a hora', () => {
    expect(formatarQuando(new Date(2026, 10, 23, 9, 5), agora)).toBe('09:05')
  })

  it('antes de hoje mostra o dia e o mês', () => {
    expect(formatarQuando(new Date(2026, 10, 21, 9, 5), agora)).toBe('21/11')
  })
})

describe('rotuloDoDia', () => {
  const agora = new Date(2026, 10, 1, 9, 0)

  it('separa as mensagens em "Hoje", "Ontem" (mesmo virando o mês) e a data', () => {
    expect(rotuloDoDia(new Date(2026, 10, 1, 8, 0), agora)).toBe('Hoje')
    expect(rotuloDoDia(new Date(2026, 9, 31, 22, 0), agora)).toBe('Ontem')
    expect(rotuloDoDia(new Date(2026, 9, 29, 22, 0), agora)).toBe('29/10/2026')
  })
})
