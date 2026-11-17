import { afterEach, describe, expect, it, vi } from 'vitest'
import { esquecerPresenca, lembrarPresenca, lerMarcaPresenca } from './MarcaPresencaAtiva'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('MarcaPresencaAtiva', () => {
  it('lembra a referência de quem ligou', () => {
    lembrarPresenca('u1', 'em frente ao RU')
    expect(lerMarcaPresenca('u1')).toEqual({ referencia: 'em frente ao RU', ponto: null })
  })

  it('lembra o ponto fixo escolhido no mapa (RN14)', () => {
    const ponto = { latitude: -5.058, longitude: -42.796 }
    lembrarPresenca('u1', 'RU', ponto)
    expect(lerMarcaPresenca('u1')).toEqual({ referencia: 'RU', ponto })
  })

  it('lê a marca antiga, sem ponto, como posição real', () => {
    localStorage.setItem('univendas:presenca-ativa:u1', JSON.stringify({ referencia: 'RU' }))
    expect(lerMarcaPresenca('u1')).toEqual({ referencia: 'RU', ponto: null })
  })

  it('devolve null para quem não ligou', () => {
    expect(lerMarcaPresenca('u1')).toBeNull()
  })

  it('guarda uma marca para cada usuário', () => {
    lembrarPresenca('u1', 'RU')
    expect(lerMarcaPresenca('u2')).toBeNull()
  })

  it('esquece a marca', () => {
    lembrarPresenca('u1', 'RU')
    esquecerPresenca('u1')
    expect(lerMarcaPresenca('u1')).toBeNull()
  })

  it('ignora um valor guardado que não é uma marca', () => {
    localStorage.setItem('univendas:presenca-ativa:u1', 'não é json')
    expect(lerMarcaPresenca('u1')).toBeNull()
  })

  it('não quebra quando o navegador bloqueia o armazenamento', () => {
    const bloqueado = () => {
      throw new Error('bloqueado')
    }
    vi.stubGlobal('localStorage', {
      getItem: bloqueado,
      setItem: bloqueado,
      removeItem: bloqueado,
    })

    expect(() => lembrarPresenca('u1', 'RU')).not.toThrow()
    expect(lerMarcaPresenca('u1')).toBeNull()
    expect(() => esquecerPresenca('u1')).not.toThrow()
  })
})
