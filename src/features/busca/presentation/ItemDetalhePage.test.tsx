import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import { Item } from '../../itens/domain/Item'
import type { BuscaRepository, ResultadoBusca } from '../domain/BuscaRepository'
import { ItemDetalhePage } from './ItemDetalhePage'

afterEach(cleanup)

const brownie: ResultadoBusca = {
  item: new Item('i1', 'v1', 7, 'Brownie de chocolate', 6, 'Feito em fornadas pequenas.', null),
  vendedorNome: 'Doces da Ana',
  noCampusAgora: true,
  referencia: 'Perto da Biblioteca Central',
}

function abrir({
  detalhar = vi.fn().mockResolvedValue(brownie),
  inicial = null as ResultadoBusca | null,
} = {}) {
  const aoVoltar = vi.fn()
  render(
    <MemoryRouter>
      <ItemDetalhePage
        itemId="i1"
        inicial={inicial}
        aoVoltar={aoVoltar}
        repositorio={{ buscar: vi.fn(), detalhar } as BuscaRepository}
      />
    </MemoryRouter>,
  )
  return { detalhar, aoVoltar }
}

describe('ItemDetalhePage', () => {
  it('mostra o item, o vendedor, o preço, a descrição e onde encontrar', async () => {
    const { detalhar } = abrir()

    expect(await screen.findByRole('heading', { name: 'Brownie de chocolate' })).toBeVisible()
    expect(detalhar).toHaveBeenCalledWith('i1')
    expect(screen.getByText('Disponível agora')).toBeInTheDocument()
    expect(screen.getByText('R$ 6,00')).toBeInTheDocument()
    expect(screen.getByText('Feito em fornadas pequenas.')).toBeInTheDocument()
    expect(screen.getByText('Perto da Biblioteca Central')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Doces da Ana' })).toHaveAttribute(
      'href',
      '/vendedor/v1',
    )
    expect(screen.getByRole('link', { name: 'Ver no mapa' })).toHaveAttribute('href', '/')
  })

  it('abre na hora com o item que veio da busca, sem esperar a rede', () => {
    abrir({ detalhar: vi.fn(() => new Promise(() => {})), inicial: brownie })

    expect(screen.getByRole('heading', { name: 'Brownie de chocolate' })).toBeVisible()
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument()
  })

  it('troca pelo que acabou de ler: o item pode ter esgotado (RN08)', async () => {
    const lido = {
      ...brownie,
      item: new Item('i1', 'v1', 7, 'Brownie de chocolate', 6, '', null, false),
    }
    abrir({ detalhar: vi.fn().mockResolvedValue(lido), inicial: brownie })

    expect(await screen.findByText('Esgotado')).toBeInTheDocument()
  })

  it('fora do mapa, não oferece "Ver no mapa"', async () => {
    abrir({ detalhar: vi.fn().mockResolvedValue({ ...brownie, noCampusAgora: false }) })

    expect(await screen.findByText('Fora do campus agora')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver no mapa' })).not.toBeInTheDocument()
  })

  it('"Voltar à busca" chama quem sabe voltar', async () => {
    const { aoVoltar } = abrir()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar à busca' }))

    expect(aoVoltar).toHaveBeenCalledOnce()
  })

  it('avisa quando o item não existe mais', async () => {
    abrir({ detalhar: vi.fn().mockResolvedValue(null) })

    expect(await screen.findByText('Este item não está mais à venda.')).toBeInTheDocument()
  })

  it('mostra a mensagem da Falha quando não consegue ler', async () => {
    abrir({ detalhar: vi.fn().mockRejectedValue(new Falha('Sem internet.', 'rede')) })

    expect(await screen.findByRole('alert')).toHaveTextContent('Sem internet.')
  })
})
