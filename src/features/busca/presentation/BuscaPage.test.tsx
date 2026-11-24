import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Categoria } from '../../itens/domain/Categoria'
import { Item } from '../../itens/domain/Item'
import type { BuscaRepository, ResultadoBusca } from '../domain/BuscaRepository'
import { BuscaPage } from './BuscaPage'
import { limparMemoriaDaBusca } from './memoriaDaBusca'

beforeEach(limparMemoriaDaBusca)
afterEach(cleanup)

const categorias: Categoria[] = [
  { id: 1, nome: 'Alimentação', categoriaPaiId: null, folha: false },
  { id: 2, nome: 'Outros produtos', categoriaPaiId: null, folha: false },
  { id: 7, nome: 'Brownie', categoriaPaiId: 1, folha: true },
  { id: 9, nome: 'Café', categoriaPaiId: 1, folha: true },
  { id: 20, nome: 'Artesanato', categoriaPaiId: 2, folha: true },
]

function resultado(
  id: string,
  categoriaId: number,
  nome: string,
  { disponivel = true, foto = null as string | null, noCampusAgora = true } = {},
): ResultadoBusca {
  return {
    item: new Item(id, 'v1', categoriaId, nome, 6, '', foto, disponivel),
    vendedorNome: 'Doces da Ana',
    noCampusAgora,
    referencia: noCampusAgora ? 'Perto da Biblioteca Central' : null,
  }
}

const brownie = resultado('a', 7, 'Brownie de chocolate', { foto: 'https://x/brownie.jpg' })
const cafe = resultado('b', 9, 'Café coado', { noCampusAgora: false })
const esgotado = resultado('c', 7, 'Brownie 100% cacau', { disponivel: false })
const chaveiro = resultado('d', 20, 'Chaveiro artesanal')

function buscaFalsa() {
  return vi.fn(({ texto, categoriaId }: { texto: string; categoriaId?: number | null }) => {
    if (texto) return Promise.resolve(texto === 'nada' ? [] : [brownie])
    return Promise.resolve(categoriaId === 2 ? [chaveiro] : [brownie, cafe, esgotado])
  })
}

/** Mostra o endereço atual, para conferir para onde o clique levou. */
function Endereco() {
  return <p data-testid="endereco">{useLocation().pathname}</p>
}

function abrir(buscar = buscaFalsa()) {
  const repositorio = { buscar, detalhar: vi.fn() } as unknown as BuscaRepository
  const categoriasRepositorio = { listarCategorias: vi.fn().mockResolvedValue(categorias) }
  render(
    <MemoryRouter initialEntries={['/busca']}>
      <Routes>
        <Route
          path="/busca"
          element={
            <BuscaPage repositorio={repositorio} categoriasRepositorio={categoriasRepositorio} />
          }
        />
        <Route path="*" element={<Endereco />} />
      </Routes>
    </MemoryRouter>,
  )
  return { buscar }
}

const nomes = (lista: HTMLElement) =>
  within(lista)
    .getAllByRole('heading', { level: 4 })
    .map((h) => h.textContent)

function buscarPor(texto: string) {
  const campo = screen.getByRole('searchbox', { name: 'Busque um produto ou vendedor' })
  fireEvent.change(campo, { target: { value: texto } })
  fireEvent.submit(campo)
}

describe('BuscaPage', () => {
  it('tem o campo de busca e não fala de acentos nem maiúsculas na tela', async () => {
    abrir()
    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Busque um produto ou vendedor')).toBeInTheDocument()
    await screen.findByRole('list', { name: 'Itens disponíveis' })
    expect(screen.queryByText(/acento/i)).not.toBeInTheDocument()
  })

  it('abre na aba Alimentação com a oferta: disponíveis e, depois, esgotados riscados (RN09)', async () => {
    abrir()

    expect(await screen.findByRole('tab', { name: 'Alimentação' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const disponiveis = await screen.findByRole('list', { name: 'Itens disponíveis' })
    expect(nomes(disponiveis)).toEqual(['Brownie de chocolate', 'Café coado'])
    expect(screen.getByRole('heading', { name: 'Disponíveis agora' })).toBeInTheDocument()

    const esgotados = screen.getByRole('list', { name: 'Itens esgotados' })
    expect(nomes(esgotados)).toEqual(['Brownie 100% cacau'])
    expect(within(esgotados).getByText('Brownie 100% cacau')).toHaveClass('line-through')
    expect(within(esgotados).getByText('Esgotado')).toBeInTheDocument()
  })

  it('cada item mostra a situação, o vendedor, onde achar e o preço', async () => {
    abrir()
    const [primeiro, segundo] = within(
      await screen.findByRole('list', { name: 'Itens disponíveis' }),
    ).getAllByRole('listitem')

    expect(primeiro).toHaveTextContent('Disponível agora')
    expect(primeiro).toHaveTextContent('Doces da Ana')
    expect(primeiro).toHaveTextContent('Perto da Biblioteca Central')
    expect(primeiro).toHaveTextContent('R$ 6,00')
    // Disponível, mas o vendedor saiu do mapa.
    expect(segundo).toHaveTextContent('Disponível')
    expect(segundo).not.toHaveTextContent('Disponível agora')
    expect(segundo).toHaveTextContent('Fora do campus agora')
  })

  it('mostra os atalhos com foto, ou com a inicial quando não há foto', async () => {
    abrir()
    const atalhos = await screen.findByRole('region', { name: 'Para descobrir no campus' })

    const brownieAtalho = within(atalhos).getByRole('button', { name: 'Brownie' })
    expect(brownieAtalho.querySelector('img')).toHaveAttribute('src', 'https://x/brownie.jpg')
    const cafeAtalho = within(atalhos).getByRole('button', { name: 'Café' })
    expect(cafeAtalho.querySelector('img')).toBeNull()
  })

  it('o atalho filtra a lista e "Ver todos" tira o filtro', async () => {
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Café' }))

    expect(screen.getByRole('button', { name: 'Café' })).toHaveAttribute('aria-pressed', 'true')
    expect(nomes(screen.getByRole('list', { name: 'Itens disponíveis' }))).toEqual(['Café coado'])
    expect(screen.queryByRole('list', { name: 'Itens esgotados' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ver todos' }))
    expect(nomes(screen.getByRole('list', { name: 'Itens disponíveis' }))).toHaveLength(2)
  })

  it('a aba Outros produtos mostra a oferta dela; as setas do teclado também trocam de aba', async () => {
    const { buscar } = abrir()
    const alimentacao = await screen.findByRole('tab', { name: 'Alimentação' })
    await screen.findByRole('list', { name: 'Itens disponíveis' })

    fireEvent.keyDown(alimentacao, { key: 'ArrowRight' })

    const outros = screen.getByRole('tab', { name: 'Outros produtos' })
    expect(outros).toHaveAttribute('aria-selected', 'true')
    expect(outros).toHaveFocus()
    expect(buscar).toHaveBeenLastCalledWith({ texto: '', categoriaId: 2 })
    await waitFor(() =>
      expect(nomes(screen.getByRole('list', { name: 'Itens disponíveis' }))).toEqual([
        'Chaveiro artesanal',
      ]),
    )
  })

  it('busca o texto dentro da aba e mostra o título dos resultados', async () => {
    const { buscar } = abrir()
    await screen.findByRole('list', { name: 'Itens disponíveis' })

    buscarPor('BROWNIE')

    expect(await screen.findByRole('heading', { name: 'Resultados para “BROWNIE”' })).toBeVisible()
    expect(buscar).toHaveBeenLastCalledWith({ texto: 'BROWNIE', categoriaId: 1 })
  })

  it('avisa quando a busca não acha nada', async () => {
    abrir()
    await screen.findByRole('list', { name: 'Itens disponíveis' })

    buscarPor('nada')

    expect(await screen.findByText('Nada encontrado para “nada” em Alimentação.')).toHaveAttribute(
      'role',
      'status',
    )
  })

  it('clicar num item abre o detalhe dele', async () => {
    abrir()
    const lista = await screen.findByRole('list', { name: 'Itens disponíveis' })

    fireEvent.click(within(lista).getAllByRole('link')[0])

    expect(screen.getByTestId('endereco')).toHaveTextContent('/item/a')
  })
})
