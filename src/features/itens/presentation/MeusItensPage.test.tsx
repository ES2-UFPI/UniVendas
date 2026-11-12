import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import { VendedorAmbulante } from '../../vendedores/domain/Vendedor'
import type { VendedorRepository } from '../../vendedores/domain/VendedorRepository'
import { Item } from '../domain/Item'
import type { ItemRepository } from '../domain/ItemRepository'
import { MeusItensPage } from './MeusItensPage'

afterEach(cleanup)

const vendedor = new VendedorAmbulante('v1', 'u1', 'Brownies da Ana')
const brownie = new Item('i1', 'v1', 7, 'Brownie', 5.5)
const cafe = new Item('i2', 'v1', 12, 'Café', 3)

function abrir({
  doUsuario = vi.fn().mockResolvedValue(vendedor),
  listar = vi.fn().mockResolvedValue([brownie, cafe]),
  remover = vi.fn().mockResolvedValue(undefined),
} = {}) {
  render(
    <MemoryRouter>
      <MeusItensPage
        perfilId="u1"
        vendedores={{ buscarDoUsuario: doUsuario } as unknown as VendedorRepository}
        repositorio={{ listar, remover } as unknown as ItemRepository}
      />
    </MemoryRouter>,
  )
  return { remover }
}

describe('MeusItensPage', () => {
  it('lista os itens do vendedor com o preço em reais', async () => {
    abrir()

    expect(await screen.findByText('Brownie')).toBeInTheDocument()
    expect(screen.getByText('Café')).toBeInTheDocument()
    // O Intl separa o "R$" do valor com um espaço especial (não quebrável).
    expect(screen.getByText(/^R\$\s5,50$/)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('avisa quando ainda não há itens', async () => {
    abrir({ listar: vi.fn().mockResolvedValue([]) })

    expect(await screen.findByText('Você ainda não cadastrou nenhum item.')).toBeInTheDocument()
  })

  it('manda criar o perfil de vendedor quando a conta não tem um', async () => {
    abrir({ doUsuario: vi.fn().mockResolvedValue(null) })

    expect(await screen.findByRole('link', { name: 'perfil de vendedor' })).toHaveAttribute(
      'href',
      '/quero-vender',
    )
  })

  it('pede confirmação antes de remover, e cancelar mantém o item', async () => {
    const { remover } = abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Remover Brownie' }))

    const confirmacao = screen.getByRole('alertdialog', { name: 'Remover Brownie?' })
    fireEvent.click(within(confirmacao).getByRole('button', { name: 'Cancelar' }))

    expect(remover).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('Brownie')).toBeInTheDocument()
  })

  it('remove o item depois de confirmar', async () => {
    const { remover } = abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Remover Brownie' }))

    fireEvent.click(screen.getByRole('button', { name: 'Sim, remover' }))

    await waitFor(() => expect(screen.queryByText('Brownie')).not.toBeInTheDocument())
    expect(remover).toHaveBeenCalledWith('i1')
    expect(screen.getByText('Café')).toBeInTheDocument()
  })

  it('mostra o erro e mantém o item quando remover falha', async () => {
    abrir({
      remover: vi
        .fn()
        .mockRejectedValue(
          new Falha('Este item não existe mais ou não é seu.', 'item-nao-encontrado'),
        ),
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Remover Brownie' }))

    fireEvent.click(screen.getByRole('button', { name: 'Sim, remover' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este item não existe mais ou não é seu.',
    )
    expect(screen.getByText('Brownie')).toBeInTheDocument()
  })
})
