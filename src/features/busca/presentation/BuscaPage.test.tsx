import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Item } from '../../itens/domain/Item'
import type { BuscaRepository, ResultadoBusca } from '../domain/BuscaRepository'
import { BuscaPage } from './BuscaPage'

afterEach(cleanup)

const disponivel: ResultadoBusca = {
  item: new Item('a', 'v1', 7, 'Brownie 100% cacau', 6),
  vendedorNome: 'Doces da Ana',
  noCampusAgora: true,
}
const esgotado: ResultadoBusca = {
  item: new Item('b', 'v1', 7, 'Brownie de chocolate', 5, '', null, false),
  vendedorNome: 'Doces da Ana',
  noCampusAgora: false,
}

function abrir(buscar = vi.fn().mockResolvedValue([disponivel, esgotado])) {
  render(
    <MemoryRouter>
      <BuscaPage repositorio={{ buscar } as BuscaRepository} />
    </MemoryRouter>,
  )
  return { buscar }
}

function buscarPor(texto: string) {
  fireEvent.change(screen.getByLabelText('Produto ou vendedor'), { target: { value: texto } })
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
}

describe('BuscaPage', () => {
  it('mostra os disponíveis primeiro e os esgotados riscados, com a marca "Esgotado" (RN09)', async () => {
    const { buscar } = abrir()
    buscarPor('BROWNIE')

    const lista = await screen.findByRole('list', { name: 'Resultados da busca' })
    const linhas = within(lista).getAllByRole('listitem')
    expect(buscar).toHaveBeenCalledWith({ texto: 'BROWNIE' })
    expect(linhas[0]).toHaveTextContent('Brownie 100% cacau')
    expect(linhas[1]).toHaveTextContent('Brownie de chocolate')
    expect(within(linhas[1]).getByText('Esgotado')).toBeInTheDocument()
    expect(within(linhas[1]).getByText('Brownie de chocolate')).toHaveClass('line-through')
    expect(within(linhas[0]).queryByText('Esgotado')).not.toBeInTheDocument()
  })

  it('leva ao perfil do vendedor e mostra quem está no campus agora', async () => {
    abrir()
    buscarPor('brownie')

    const linhas = await screen.findAllByRole('listitem')
    expect(within(linhas[0]).getByRole('link', { name: 'Doces da Ana' })).toHaveAttribute(
      'href',
      '/vendedor/v1',
    )
    expect(within(linhas[0]).getByText('No campus agora')).toBeInTheDocument()
    expect(within(linhas[1]).queryByText('No campus agora')).not.toBeInTheDocument()
  })

  it('avisa quando não encontra nada', async () => {
    abrir(vi.fn().mockResolvedValue([]))
    buscarPor('xyz')

    expect(await screen.findByRole('status')).toHaveTextContent('Nada encontrado para “xyz”.')
  })

  it('pede pelo menos 2 letras', async () => {
    const { buscar } = abrir()
    buscarPor('b')

    expect(await screen.findByRole('alert')).toHaveTextContent('Digite pelo menos 2 letras.')
    expect(buscar).not.toHaveBeenCalled()
  })
})
