import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import { VendedorAmbulante } from '../../vendedores/domain/Vendedor'
import type { VendedorRepository } from '../../vendedores/domain/VendedorRepository'
import type { Categoria } from '../domain/Categoria'
import { Item } from '../domain/Item'
import type { ItemRepository } from '../domain/ItemRepository'
import { useItensViewModel } from './useItensViewModel'

const vendedor = new VendedorAmbulante('v1', 'u1', 'Brownies da Ana')
const categorias: Categoria[] = [
  { id: 3, nome: 'Doces', categoriaPaiId: null, folha: false },
  { id: 7, nome: 'Brownie', categoriaPaiId: 3, folha: true },
  { id: 8, nome: 'Bolo', categoriaPaiId: 3, folha: true },
]
const brownie = new Item('i1', 'v1', 7, 'Brownie', 5.5, 'Com nozes', 'https://x/fotos/u1/a.jpg')
const cafe = new Item('i2', 'v1', 8, 'Café', 3)

function falsos({
  criar = vi.fn((item: Item) =>
    Promise.resolve(
      new Item(
        'i9',
        item.vendedorId,
        item.categoriaId,
        item.nome,
        item.preco,
        item.descricao,
        item.fotoUrl,
      ),
    ),
  ),
  editar = vi.fn((item: Item) => Promise.resolve(item)),
  enviarFoto = vi.fn().mockResolvedValue('https://x/fotos/u1/nova.jpg'),
  comprimir = vi.fn().mockResolvedValue(new Blob(['pequena'], { type: 'image/jpeg' })),
} = {}) {
  const repositorio = {
    listar: vi.fn().mockResolvedValue([brownie, cafe]),
    listarCategorias: vi.fn().mockResolvedValue(categorias),
    criar,
    editar,
    enviarFoto,
  } as unknown as ItemRepository
  const vendedores = {
    buscarDoUsuario: vi.fn().mockResolvedValue(vendedor),
  } as unknown as VendedorRepository
  return { repositorio, vendedores, comprimir, criar, editar, enviarFoto }
}

async function aberto(f = falsos()) {
  const hook = renderHook(() => useItensViewModel({ perfilId: 'u1', ...f }))
  await waitFor(() => expect(hook.result.current.carregando).toBe(false))
  return { ...hook, ...f }
}

describe('useItensViewModel: formulário', () => {
  it('carrega as categorias junto com a lista', async () => {
    const { result } = await aberto()
    expect(result.current.categorias).toEqual(categorias)
  })

  it('"Novo item" abre o formulário vazio', async () => {
    const { result } = await aberto()

    act(() => result.current.novo())

    expect(result.current.formularioAberto).toBe(true)
    expect(result.current.editando).toBeNull()
    expect(result.current.dados).toEqual({ nome: '', descricao: '', preco: '', categoriaId: null })
  })

  it('"Editar" abre o formulário com os dados do item e o preço com vírgula', async () => {
    const { result } = await aberto()

    act(() => result.current.editar(brownie))

    expect(result.current.editando).toBe(brownie)
    expect(result.current.dados).toEqual({
      nome: 'Brownie',
      descricao: 'Com nozes',
      preco: '5,50',
      categoriaId: 7,
    })
    expect(result.current.previaFoto).toBe('https://x/fotos/u1/a.jpg')
  })

  it('não salva com campos inválidos (RN07)', async () => {
    const { result, criar } = await aberto()
    act(() => result.current.novo())

    let ok = true
    await act(async () => {
      ok = await result.current.salvar()
    })

    expect(ok).toBe(false)
    expect(criar).not.toHaveBeenCalled()
    expect(Object.keys(result.current.erros).sort()).toEqual(['categoria', 'nome', 'preco'])
  })

  it('cria o item, põe na lista em ordem alfabética e fecha o formulário', async () => {
    const { result, criar } = await aberto()
    act(() => result.current.novo())
    act(() => {
      result.current.alterar('nome', '  Bolo de cenoura ')
      result.current.alterar('preco', '4,5')
      result.current.alterar('categoriaId', 8)
    })

    let ok = false
    await act(async () => {
      ok = await result.current.salvar()
    })

    expect(ok).toBe(true)
    const [enviado] = criar.mock.calls[0] as [Item]
    expect(enviado).toMatchObject({
      vendedorId: 'v1',
      nome: 'Bolo de cenoura',
      preco: 4.5,
      categoriaId: 8,
      fotoUrl: null,
      disponivel: true,
    })
    expect(result.current.itens.map((i) => i.nome)).toEqual(['Bolo de cenoura', 'Brownie', 'Café'])
    expect(result.current.formularioAberto).toBe(false)
  })

  it('edita o item, mantém a foto antiga e troca na lista', async () => {
    const { result, editar, enviarFoto } = await aberto()
    act(() => result.current.editar(brownie))
    act(() => result.current.alterar('preco', '6'))

    await act(async () => {
      await result.current.salvar()
    })

    const [enviado] = editar.mock.calls[0] as [Item]
    expect(enviado).toMatchObject({ id: 'i1', preco: 6, fotoUrl: 'https://x/fotos/u1/a.jpg' })
    expect(enviarFoto).not.toHaveBeenCalled()
    expect(result.current.itens.find((i) => i.id === 'i1')?.preco).toBe(6)
  })

  it('comprime a foto escolhida (RN10), envia para a pasta da conta e grava a URL no item', async () => {
    const { result, comprimir, enviarFoto, criar } = await aberto()
    act(() => result.current.novo())
    act(() => {
      result.current.alterar('nome', 'Bolo')
      result.current.alterar('preco', '4')
      result.current.alterar('categoriaId', 8)
    })
    await act(() => result.current.escolherFoto(new Blob(['grande'], { type: 'image/png' })))

    await act(async () => {
      await result.current.salvar()
    })

    expect(comprimir).toHaveBeenCalledOnce()
    expect(enviarFoto).toHaveBeenCalledWith('u1', expect.any(Blob))
    expect((criar.mock.calls[0] as [Item])[0].fotoUrl).toBe('https://x/fotos/u1/nova.jpg')
  })

  it('mostra o erro da compressão (foto ilegível ou acima de 2 MB) e fica sem foto', async () => {
    const f = falsos({
      comprimir: vi.fn().mockRejectedValue(new Falha('A foto passou de 2 MB.', 'foto-grande')),
    })
    const { result } = await aberto(f)
    act(() => result.current.novo())

    await act(() => result.current.escolherFoto(new Blob(['x'], { type: 'image/jpeg' })))

    expect(result.current.erroFoto).toBe('A foto passou de 2 MB.')
    expect(result.current.previaFoto).toBeNull()
  })

  it('mostra a mensagem da Falha e mantém o formulário aberto quando salvar falha', async () => {
    const f = falsos({
      criar: vi
        .fn()
        .mockRejectedValue(new Falha('Confira o nome, o preço e a categoria.', 'dados-invalidos')),
    })
    const { result } = await aberto(f)
    act(() => result.current.novo())
    act(() => {
      result.current.alterar('nome', 'Bolo')
      result.current.alterar('preco', '4')
      result.current.alterar('categoriaId', 8)
    })

    let ok = true
    await act(async () => {
      ok = await result.current.salvar()
    })

    expect(ok).toBe(false)
    expect(result.current.erroFormulario).toBe('Confira o nome, o preço e a categoria.')
    expect(result.current.formularioAberto).toBe(true)
  })

  it('"Cancelar" fecha o formulário sem salvar', async () => {
    const { result, criar } = await aberto()
    act(() => result.current.novo())

    act(() => result.current.cancelar())

    expect(result.current.formularioAberto).toBe(false)
    expect(criar).not.toHaveBeenCalled()
  })
})
