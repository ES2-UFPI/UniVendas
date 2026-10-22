import { describe, expect, it } from 'vitest'
import { comprimirImagem, dimensoesReduzidas } from './comprimirImagem'
import { Falha } from './falha'

describe('dimensoesReduzidas', () => {
  it('reduz a foto deitada para 1080 px de largura, mantendo a proporção', () => {
    expect(dimensoesReduzidas(4000, 3000)).toEqual({ largura: 1080, altura: 810 })
  })

  it('reduz a foto em pé pela altura', () => {
    expect(dimensoesReduzidas(3000, 4000)).toEqual({ largura: 810, altura: 1080 })
  })

  it('não aumenta uma foto que já é pequena', () => {
    expect(dimensoesReduzidas(640, 480)).toEqual({ largura: 640, altura: 480 })
  })
})

describe('comprimirImagem', () => {
  it('recusa arquivo que não é imagem', async () => {
    const pdf = new Blob(['%PDF'], { type: 'application/pdf' })
    const erro = await comprimirImagem(pdf).catch((e) => e)
    expect(erro).toBeInstanceOf(Falha)
    expect(erro.codigo).toBe('foto-formato-invalido')
  })
})
