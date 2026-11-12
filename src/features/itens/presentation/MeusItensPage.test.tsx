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
        repositorio={
          {
            listar,
            remover,
            listarCategorias: vi.fn().mockResolvedValue([]),
          } as unknown as ItemRepository
        }
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

describe('MeusItensPage: formulário de criar e editar', () => {
  const categorias = [
    { id: 3, nome: 'Doces', categoriaPaiId: null, folha: false },
    { id: 7, nome: 'Brownie', categoriaPaiId: 3, folha: true },
    { id: 8, nome: 'Bolo', categoriaPaiId: 3, folha: true },
  ]

  function abrirComFormulario({
    criar = vi.fn((item: Item) =>
      Promise.resolve(new Item('i9', item.vendedorId, item.categoriaId, item.nome, item.preco)),
    ),
    editar = vi.fn((item: Item) => Promise.resolve(item)),
  } = {}) {
    render(
      <MemoryRouter>
        <MeusItensPage
          perfilId="u1"
          vendedores={
            {
              buscarDoUsuario: vi.fn().mockResolvedValue(vendedor),
            } as unknown as VendedorRepository
          }
          repositorio={
            {
              listar: vi.fn().mockResolvedValue([brownie, cafe]),
              listarCategorias: vi.fn().mockResolvedValue(categorias),
              criar,
              editar,
            } as unknown as ItemRepository
          }
          comprimir={vi.fn()}
        />
      </MemoryRouter>,
    )
    return { criar, editar }
  }

  it('só oferece as categorias folha, agrupadas pela categoria pai (RN07)', async () => {
    abrirComFormulario()
    fireEvent.click(await screen.findByRole('button', { name: 'Novo item' }))

    const opcoes = within(screen.getByLabelText('Categoria')).getAllByRole('option')
    expect(opcoes.map((o) => o.textContent)).toEqual(['Escolha a categoria', 'Bolo', 'Brownie'])
    expect(screen.getByRole('group', { name: 'Doces' })).toBeInTheDocument()
  })

  it('mostra os erros e não salva com o formulário vazio', async () => {
    const { criar } = abrirComFormulario()
    fireEvent.click(await screen.findByRole('button', { name: 'Novo item' }))

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Informe o nome do item.')).toBeInTheDocument()
    expect(screen.getByText('Informe o preço.')).toBeInTheDocument()
    expect(screen.getByText('Escolha a categoria.')).toBeInTheDocument()
    expect(criar).not.toHaveBeenCalled()
  })

  it('cria o item e volta para a lista com ele', async () => {
    const { criar } = abrirComFormulario()
    fireEvent.click(await screen.findByRole('button', { name: 'Novo item' }))

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Bolo de cenoura' } })
    fireEvent.change(screen.getByLabelText('Preço (R$)'), { target: { value: '4,50' } })
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Bolo de cenoura')).toBeInTheDocument()
    expect(criar).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument()
  })

  it('"Editar" preenche o formulário com os dados do item e salva a mudança', async () => {
    const { editar } = abrirComFormulario()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Brownie' }))

    expect(screen.getByRole('heading', { name: 'Editar item' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Brownie')
    expect(screen.getByLabelText('Preço (R$)')).toHaveValue('5,50')
    expect(screen.getByLabelText('Categoria')).toHaveValue('7')

    fireEvent.change(screen.getByLabelText('Preço (R$)'), { target: { value: '6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(editar).toHaveBeenCalledOnce())
    expect(await screen.findByText(/^R\$\s6,00$/)).toBeInTheDocument()
  })

  it('"Cancelar" volta para a lista sem salvar', async () => {
    const { criar } = abrirComFormulario()
    fireEvent.click(await screen.findByRole('button', { name: 'Novo item' }))

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByText('Brownie')).toBeInTheDocument()
    expect(criar).not.toHaveBeenCalled()
  })
})
