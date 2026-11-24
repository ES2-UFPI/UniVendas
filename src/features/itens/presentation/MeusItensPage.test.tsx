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
  alternarDisponibilidade = vi.fn((id: string, disponivel: boolean) =>
    Promise.resolve(new Item(id, 'v1', 7, 'Brownie', 5.5, '', null, disponivel)),
  ),
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
            alternarDisponibilidade,
            listarCategorias: vi.fn().mockResolvedValue([]),
          } as unknown as ItemRepository
        }
      />
    </MemoryRouter>,
  )
  return { remover, alternarDisponibilidade }
}

describe('MeusItensPage', () => {
  it('lista os itens do vendedor com o preço em reais', async () => {
    abrir()

    expect(await screen.findByText('Brownie')).toBeInTheDocument()
    expect(screen.getByText('Café')).toBeInTheDocument()
    // O Intl separa o "R$" do valor com um espaço especial (não quebrável).
    expect(screen.getByText(/^R\$\s5,50$/)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Meus itens' })).toBeInTheDocument()
  })

  it('resume quantos itens há, quantos estão disponíveis e quantos esgotados', async () => {
    abrir({
      listar: vi
        .fn()
        .mockResolvedValue([brownie, new Item('i2', 'v1', 12, 'Café', 3, '', null, false)]),
    })

    expect(await screen.findByText('2 itens cadastrados')).toBeInTheDocument()
    expect(screen.getByText('1 disponível · 1 esgotado')).toBeInTheDocument()
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

const interruptor = (nome: string) => screen.findByRole('switch', { name: `${nome} disponível` })

describe('MeusItensPage: disponível e esgotado (RN08)', () => {
  it('um toque no interruptor marca o item como esgotado', async () => {
    const { alternarDisponibilidade } = abrir()
    expect(await interruptor('Brownie')).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(await interruptor('Brownie'))

    expect(await screen.findByText('Esgotado')).toBeInTheDocument()
    expect(alternarDisponibilidade).toHaveBeenCalledWith('i1', false)
    expect(await interruptor('Brownie')).toHaveAttribute('aria-checked', 'false')
    expect(await interruptor('Café')).toHaveAttribute('aria-checked', 'true')
  })

  it('um segundo toque volta o item a disponível', async () => {
    const { alternarDisponibilidade } = abrir()
    fireEvent.click(await interruptor('Brownie'))
    await screen.findByText('Esgotado')

    fireEvent.click(await interruptor('Brownie'))

    await waitFor(() => expect(alternarDisponibilidade).toHaveBeenLastCalledWith('i1', true))
    await waitFor(async () => expect(await interruptor('Brownie')).toBeEnabled())
    expect(await interruptor('Brownie')).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByText('Esgotado')).not.toBeInTheDocument()
  })

  it('mostra o erro e mantém o item quando não consegue salvar', async () => {
    abrir({
      alternarDisponibilidade: vi
        .fn()
        .mockRejectedValue(
          new Falha('Este item não existe mais ou não é seu.', 'item-nao-encontrado'),
        ),
    })

    fireEvent.click(await interruptor('Brownie'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Este item não existe mais')
    expect(screen.queryByText('Esgotado')).not.toBeInTheDocument()
    await waitFor(async () => expect(await interruptor('Brownie')).toBeEnabled())
    expect(await interruptor('Brownie')).toHaveAttribute('aria-checked', 'true')
  })
})

describe('MeusItensPage: formulário de adicionar e editar', () => {
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
    arvore = categorias,
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
              listarCategorias: vi.fn().mockResolvedValue(arvore),
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

  const lista = () => within(screen.getByRole('list'))

  it('já mostra o formulário "Adicionar item" ao lado da lista', async () => {
    abrirComFormulario()

    expect(await screen.findByRole('heading', { name: 'Adicionar item' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome do item')).toHaveValue('')
    expect(screen.getByLabelText('Adicionar foto')).toHaveAttribute('type', 'file')
  })

  it('não mostra o formulário quando a conta não tem perfil de vendedor', async () => {
    abrir({ doUsuario: vi.fn().mockResolvedValue(null) })

    await screen.findByRole('link', { name: 'perfil de vendedor' })
    expect(screen.queryByRole('heading', { name: 'Adicionar item' })).not.toBeInTheDocument()
  })

  it('só oferece as categorias folha, agrupadas pela categoria pai (RN07)', async () => {
    abrirComFormulario()
    await screen.findByRole('option', { name: 'Bolo' })

    const opcoes = within(screen.getByLabelText('Categoria')).getAllByRole('option')
    expect(opcoes.map((o) => o.textContent)).toEqual(['Escolha a categoria', 'Bolo', 'Brownie'])
    expect(screen.getByRole('group', { name: 'Doces' })).toBeInTheDocument()
  })

  it('o tipo de produto (a raiz da árvore) filtra as categorias', async () => {
    abrirComFormulario({
      arvore: [
        { id: 1, nome: 'Alimentação', categoriaPaiId: null, folha: false },
        { id: 2, nome: 'Outros produtos', categoriaPaiId: null, folha: false },
        { id: 3, nome: 'Doces', categoriaPaiId: 1, folha: false },
        { id: 7, nome: 'Brownie', categoriaPaiId: 3, folha: true },
        { id: 20, nome: 'Artesanato', categoriaPaiId: 2, folha: true },
      ],
    })
    const outros = await screen.findByRole('button', { name: 'Outros produtos' })
    const opcoes = () =>
      within(screen.getByLabelText('Categoria'))
        .getAllByRole('option')
        .map((o) => o.textContent)
    expect(opcoes()).toEqual(['Escolha a categoria', 'Brownie', 'Artesanato'])

    fireEvent.click(outros)

    expect(outros).toHaveAttribute('aria-pressed', 'true')
    expect(opcoes()).toEqual(['Escolha a categoria', 'Artesanato'])
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: '20' } })

    fireEvent.click(screen.getByRole('button', { name: 'Alimentação' }))

    expect(opcoes()).toEqual(['Escolha a categoria', 'Brownie'])
    expect(screen.getByLabelText('Categoria')).toHaveValue('')
  })

  it('mostra os erros e não salva com o formulário vazio', async () => {
    const { criar } = abrirComFormulario()

    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar item' }))

    expect(await screen.findByText('Informe o nome do item.')).toBeInTheDocument()
    expect(screen.getByText('Informe o preço.')).toBeInTheDocument()
    expect(screen.getByText('Escolha a categoria.')).toBeInTheDocument()
    expect(criar).not.toHaveBeenCalled()
  })

  it('adiciona o item na lista e o formulário volta vazio', async () => {
    const { criar } = abrirComFormulario()
    await screen.findByRole('heading', { name: 'Adicionar item' })
    await screen.findByRole('option', { name: 'Bolo' })

    fireEvent.change(screen.getByLabelText('Nome do item'), {
      target: { value: 'Bolo de cenoura' },
    })
    fireEvent.change(screen.getByLabelText('Preço'), { target: { value: '4,50' } })
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }))

    expect(await lista().findByText('Bolo de cenoura')).toBeInTheDocument()
    expect(criar).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.getByLabelText('Nome do item')).toHaveValue(''))
    expect(screen.getByText('3 itens cadastrados')).toBeInTheDocument()
  })

  it('"Editar" leva o item para o formulário e salva a mudança', async () => {
    const { editar } = abrirComFormulario()
    await screen.findByRole('option', { name: 'Bolo' })
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Brownie' }))

    expect(screen.getByRole('heading', { name: 'Editar item' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome do item')).toHaveValue('Brownie')
    expect(screen.getByLabelText('Nome do item')).toHaveFocus()
    expect(screen.getByLabelText('Preço')).toHaveValue('5,50')
    expect(screen.getByLabelText('Categoria')).toHaveValue('7')
    expect(screen.getByRole('button', { name: 'Doces' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.change(screen.getByLabelText('Preço'), { target: { value: '6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(editar).toHaveBeenCalledOnce())
    expect(await screen.findByText(/^R\$\s6,00$/)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Adicionar item' })).toBeInTheDocument()
  })

  it('"Cancelar edição" volta a adicionar item sem salvar', async () => {
    const { editar } = abrirComFormulario()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Brownie' }))

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }))

    expect(await screen.findByRole('heading', { name: 'Adicionar item' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome do item')).toHaveValue('')
    expect(lista().getByText('Brownie')).toBeInTheDocument()
    expect(editar).not.toHaveBeenCalled()
  })
})
