import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import type { VendedorNaLista } from './ListaNoCampus'
import { VisaoDoCampus } from './VisaoDoCampus'

afterEach(cleanup)

const vendedores: VendedorNaLista[] = [
  { id: 'v1', nome: 'Brownies da Ana', referencia: null, ultimoSinalEm: new Date() },
]

function abrir(carregando = false) {
  render(
    <MemoryRouter>
      <VisaoDoCampus marcadores={[]} vendedores={vendedores} carregando={carregando} />
    </MemoryRouter>,
  )
}

describe('VisaoDoCampus (US06, US13)', () => {
  it('abre no mapa, com o botão "Mapa" marcado', () => {
    abrir()

    expect(screen.getByLabelText('Mapa do campus')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mapa' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('"Lista" troca o mapa pela lista de quem está no campus', () => {
    abrir()

    fireEvent.click(screen.getByRole('button', { name: 'Lista' }))

    expect(screen.getByRole('list', { name: 'Vendedores no campus agora' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Brownies da Ana/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Mapa do campus')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('"Mapa" volta para o mapa', () => {
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Lista' }))

    fireEvent.click(screen.getByRole('button', { name: 'Mapa' }))

    expect(screen.getByLabelText('Mapa do campus')).toBeInTheDocument()
  })

  it('repassa o carregando à lista', () => {
    abrir(true)

    fireEvent.click(screen.getByRole('button', { name: 'Lista' }))

    expect(screen.getByRole('status')).toHaveTextContent('Carregando quem está no campus…')
  })
})
