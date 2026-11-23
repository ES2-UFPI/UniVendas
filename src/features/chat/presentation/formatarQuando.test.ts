import { describe, expect, it } from 'vitest'
import { formatarQuando } from './formatarQuando'

describe('formatarQuando', () => {
  const agora = new Date(2026, 10, 23, 15, 0)

  it('hoje mostra só a hora', () => {
    expect(formatarQuando(new Date(2026, 10, 23, 9, 5), agora)).toBe('09:05')
  })

  it('antes de hoje mostra o dia e o mês', () => {
    expect(formatarQuando(new Date(2026, 10, 21, 9, 5), agora)).toBe('21/11')
  })
})
