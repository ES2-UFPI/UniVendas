import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { limparMemoriaDaBusca, useMemoriaDaBusca } from '../../busca/presentation/memoriaDaBusca'
import type { VendedorNaLista } from './ListaNoCampus'
import { VisaoDoCampus } from './VisaoDoCampus'

afterEach(() => {
  cleanup()
  limparMemoriaDaBusca()
})

const vendedores: VendedorNaLista[] = [
  { id: 'v1', nome: 'Brownies da Ana', referencia: null, ultimoSinalEm: new Date() },
]

function abrir(carregando = false, lista = vendedores) {
  render(
    <MemoryRouter>
      <Routes>
        <Route
          path="/"
          element={<VisaoDoCampus marcadores={[]} vendedores={lista} carregando={carregando} />}
        />
        <Route path="/busca" element={<p>tela de busca</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('VisaoDoCampus (US06, US13)', () => {
  it('tem o título da tela, o campus e quantos vendedores estão no campus agora (US21)', () => {
    abrir(false, [...vendedores, { ...vendedores[0], id: 'v2', nome: 'Café do Leo' }])

    expect(
      screen.getByRole('heading', { level: 2, name: 'Encontre quem está por perto' }),
    ).toBeInTheDocument()
    expect(screen.getByText('UFPI · Campus Ministro Petrônio Portella')).toBeInTheDocument()
    expect(screen.getByText('2 vendedores no campus agora')).toBeInTheDocument()
  })

  it('carregando, ainda não conta ninguém', () => {
    abrir(true)
    expect(screen.queryByText(/no campus agora$/)).not.toBeInTheDocument()
  })

  it('buscar no campo do mapa abre a tela de busca já buscando o texto', () => {
    abrir()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Busque um produto ou vendedor' }), {
      target: { value: 'brownie ' },
    })
    fireEvent.submit(screen.getByRole('search'))

    expect(screen.getByText('tela de busca')).toBeInTheDocument()
    expect(useMemoriaDaBusca.getState()).toMatchObject({ texto: 'brownie ', buscado: 'brownie' })
  })

  it('texto curto demais só fica escrito no campo da busca, sem buscar', () => {
    abrir()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'b' } })
    fireEvent.submit(screen.getByRole('search'))

    expect(useMemoriaDaBusca.getState()).toMatchObject({ texto: 'b', buscado: null })
  })

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
