import { describe, expect, it } from 'vitest'
import { Usuario } from './Usuario'

describe('Usuario', () => {
  it('é só comprador quando não tem vendedor', () => {
    expect(new Usuario('u1', 'Ana', 'ana@ufpi.edu.br').ehVendedor()).toBe(false)
  })

  it('é vendedor quando tem vendedorId', () => {
    expect(new Usuario('u1', 'Ana', 'ana@ufpi.edu.br', false, 'v1').ehVendedor()).toBe(true)
  })
})
