import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Item } from '../domain/Item'
import { ItemDoPerfil } from './ItemDoPerfil'

afterEach(cleanup)

function mostrar(item: Item) {
  render(
    <ul>
      <ItemDoPerfil item={item} />
    </ul>,
  )
}

describe('ItemDoPerfil (US09)', () => {
  it('mostra o item disponível normal, sem risco e sem a marca "Esgotado"', () => {
    mostrar(new Item('i1', 'v1', 7, 'Brownie', 6.5))

    expect(screen.getByText('Brownie')).not.toHaveClass('line-through')
    expect(screen.queryByText('Esgotado')).not.toBeInTheDocument()
    expect(screen.getByText(/R\$\s*6,50/)).toBeInTheDocument()
  })

  it('mostra o item esgotado riscado e com a marca "Esgotado" (RN09)', () => {
    mostrar(new Item('i1', 'v1', 7, 'Brownie', 6.5, '', null, false))

    expect(screen.getByText('Brownie')).toHaveClass('line-through')
    expect(screen.getByText('Esgotado')).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*6,50/)).toBeInTheDocument()
  })
})
