import { describe, expect, it } from 'vitest'
import { Item } from '../../itens/domain/Item'
import type { ResultadoBusca } from './BuscaRepository'
import { ondeEncontrar, situacaoDoItem } from './situacaoDoItem'

function resultado(disponivel: boolean, noCampusAgora: boolean, referencia: string | null = null) {
  return {
    item: new Item('i1', 'v1', 7, 'Brownie', 6, '', null, disponivel),
    vendedorNome: 'Doces da Ana',
    noCampusAgora,
    referencia,
  } satisfies ResultadoBusca
}

describe('situacaoDoItem', () => {
  it('"Disponível agora" só com o item disponível e o vendedor no mapa', () => {
    expect(situacaoDoItem(resultado(true, true))).toEqual({
      rotulo: 'Disponível agora',
      tom: 'agora',
    })
  })

  it('disponível com o vendedor fora do mapa é só "Disponível"', () => {
    expect(situacaoDoItem(resultado(true, false)).rotulo).toBe('Disponível')
  })

  it('esgotado é "Esgotado", mesmo com o vendedor no mapa (RN08)', () => {
    expect(situacaoDoItem(resultado(false, true)).rotulo).toBe('Esgotado')
  })
})

describe('ondeEncontrar', () => {
  it('usa a referência do vendedor no mapa (RN18)', () => {
    expect(ondeEncontrar(resultado(true, true, 'Perto da Biblioteca Central'))).toBe(
      'Perto da Biblioteca Central',
    )
  })

  it('sem referência, diz que está no campus agora', () => {
    expect(ondeEncontrar(resultado(true, true))).toBe('No campus agora')
  })

  it('fora do mapa, diz que está fora do campus', () => {
    expect(ondeEncontrar(resultado(true, false, 'Antiga'))).toBe('Fora do campus agora')
  })
})
