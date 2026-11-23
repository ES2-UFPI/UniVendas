import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Categoria } from '../../itens/domain/Categoria'
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

const categorias: Categoria[] = [
  { id: 1, nome: 'Alimentação', categoriaPaiId: null, folha: false },
  { id: 2, nome: 'Outros produtos', categoriaPaiId: null, folha: false },
  { id: 3, nome: 'Doces', categoriaPaiId: 1, folha: false },
  { id: 4, nome: 'Salgados', categoriaPaiId: 1, folha: false },
  { id: 7, nome: 'Brownie', categoriaPaiId: 3, folha: true },
]

function abrir(buscar = vi.fn().mockResolvedValue([disponivel, esgotado])) {
  render(
    <MemoryRouter>
      <BuscaPage
        repositorio={{ buscar } as BuscaRepository}
        categoriasRepositorio={{ listarCategorias: vi.fn().mockResolvedValue(categorias) }}
      />
    </MemoryRouter>,
  )
  return { buscar }
}

/** Clica numa categoria e espera a busca dela terminar. */
async function entrarEm(nome: string) {
  fireEvent.click(await screen.findByRole('button', { name: nome }))
  await screen.findByRole('button', { name: 'Buscar' })
}

function trilha() {
  const nav = screen.getByRole('navigation', { name: 'Categorias' })
  return within(within(nav).getAllByRole('list')[0])
    .getAllByRole('listitem')
    .map((li) => li.textContent?.replace('›', '').trim())
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

    const lista = await screen.findByRole('list', { name: 'Resultados da busca' })
    const linhas = within(lista).getAllByRole('listitem')
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

  it('navega Alimentação › Doces › Brownie, vendo os itens de cada nível (US12)', async () => {
    const { buscar } = abrir()

    await entrarEm('Alimentação')
    expect(buscar).toHaveBeenLastCalledWith({ texto: '', categoriaId: 1 })
    expect(await screen.findByRole('list', { name: 'Resultados da busca' })).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Categorias dentro de Alimentação' }))
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Doces', 'Salgados'])

    await entrarEm('Doces')
    expect(buscar).toHaveBeenLastCalledWith({ texto: '', categoriaId: 3 })

    await entrarEm('Brownie')
    expect(buscar).toHaveBeenLastCalledWith({ texto: '', categoriaId: 7 })
    expect(trilha()).toEqual(['Todas', 'Alimentação', 'Doces', 'Brownie'])
    expect(screen.getByText('Brownie', { selector: '[aria-current="page"]' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /Categorias dentro de/ })).not.toBeInTheDocument()
  })

  it('a trilha volta para um nível de cima e para "Todas"', async () => {
    const { buscar } = abrir()
    await entrarEm('Alimentação')
    await entrarEm('Doces')

    fireEvent.click(screen.getByRole('button', { name: 'Alimentação' }))
    await screen.findByRole('list', { name: 'Categorias dentro de Alimentação' })
    expect(buscar).toHaveBeenLastCalledWith({ texto: '', categoriaId: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }))
    expect(await screen.findByRole('list', { name: 'Categorias' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Resultados da busca' })).not.toBeInTheDocument()
  })

  it('com categoria escolhida, o texto busca dentro dela', async () => {
    const { buscar } = abrir()
    await entrarEm('Alimentação')
    await entrarEm('Doces')

    fireEvent.change(screen.getByLabelText('Produto ou vendedor em Doces'), {
      target: { value: 'cenoura' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    await waitFor(() =>
      expect(buscar).toHaveBeenLastCalledWith({ texto: 'cenoura', categoriaId: 3 }),
    )
  })

  it('avisa quando a categoria não tem itens', async () => {
    abrir(vi.fn().mockResolvedValue([]))
    await entrarEm('Outros produtos')

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Nenhum item em Outros produtos por enquanto.',
    )
  })
})
