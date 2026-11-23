import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { Categoria } from '../../itens/domain/Categoria'
import { Item } from '../../itens/domain/Item'
import type { BuscaRepository, ResultadoBusca } from '../domain/BuscaRepository'
import { useBuscaViewModel } from './useBuscaViewModel'

function resultado(id: string, disponivel = true): ResultadoBusca {
  return {
    item: new Item(id, 'v1', 7, `Brownie ${id}`, 5, '', null, disponivel),
    vendedorNome: 'Doces da Ana',
    noCampusAgora: false,
  }
}

const categorias: Categoria[] = [
  { id: 1, nome: 'Alimentação', categoriaPaiId: null, folha: false },
  { id: 3, nome: 'Doces', categoriaPaiId: 1, folha: false },
  { id: 4, nome: 'Bebidas', categoriaPaiId: 1, folha: false },
  { id: 7, nome: 'Brownie', categoriaPaiId: 3, folha: true },
  { id: 2, nome: 'Outros produtos', categoriaPaiId: null, folha: false },
]

// Fonte falsa da árvore: nenhum teste lê as categorias do Supabase de verdade.
const categoriasRepositorio = { listarCategorias: vi.fn().mockResolvedValue(categorias) }

function falso(buscar = vi.fn().mockResolvedValue([resultado('a')])) {
  return { repositorio: { buscar } as BuscaRepository, categoriasRepositorio, buscar }
}

/** Abre o hook e espera a árvore de categorias carregar. */
async function aberto(f = falso()) {
  const hook = renderHook(() => useBuscaViewModel(f))
  await waitFor(() => expect(hook.result.current.subcategorias).toHaveLength(2))
  return { ...hook, ...f }
}

describe('useBuscaViewModel', () => {
  it('começa sem texto, sem resultados e sem ter buscado', async () => {
    const { result } = await aberto()
    expect(result.current.texto).toBe('')
    expect(result.current.resultados).toEqual([])
    expect(result.current.buscou).toBe(false)
  })

  it('busca pelo texto digitado e guarda os resultados', async () => {
    const { result, buscar } = await aberto()
    act(() => result.current.alterarTexto('brownie'))

    await act(() => result.current.buscar())

    expect(buscar).toHaveBeenCalledWith({ texto: 'brownie' })
    expect(result.current.resultados).toHaveLength(1)
    expect(result.current.buscou).toBe(true)
    expect(result.current.buscando).toBe(false)
  })

  it('com menos de 2 letras avisa e não chama o repositório', async () => {
    const { result, buscar } = await aberto()
    act(() => result.current.alterarTexto(' b '))

    await act(() => result.current.buscar())

    expect(buscar).not.toHaveBeenCalled()
    expect(result.current.erro).toBe('Digite pelo menos 2 letras.')
    expect(result.current.buscou).toBe(false)
  })

  it('mostra a mensagem da Falha e limpa os resultados quando a busca falha', async () => {
    const buscar = vi
      .fn()
      .mockResolvedValueOnce([resultado('a')])
      .mockRejectedValueOnce(new Falha('Não foi possível buscar agora. Tente de novo.', 'rede'))
    const { result } = renderHook(() =>
      useBuscaViewModel({ repositorio: { buscar }, categoriasRepositorio }),
    )
    act(() => result.current.alterarTexto('brownie'))
    await act(() => result.current.buscar())

    await act(() => result.current.buscar())

    expect(result.current.erro).toBe('Não foi possível buscar agora. Tente de novo.')
    expect(result.current.resultados).toEqual([])
  })

  it('ignora a resposta de uma busca antiga que chega depois da nova', async () => {
    let responderAntiga: (r: ResultadoBusca[]) => void = () => {}
    const buscar = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (responderAntiga = resolve)))
      .mockResolvedValueOnce([resultado('nova')])
    const { result } = renderHook(() =>
      useBuscaViewModel({ repositorio: { buscar }, categoriasRepositorio }),
    )

    act(() => result.current.alterarTexto('bro'))
    let antiga: Promise<void> = Promise.resolve()
    act(() => {
      antiga = result.current.buscar()
    })
    act(() => result.current.alterarTexto('brownie'))
    await act(() => result.current.buscar())
    await act(async () => {
      responderAntiga([resultado('antiga')])
      await antiga
    })

    expect(result.current.resultados.map((r) => r.item.id)).toEqual(['nova'])
  })

  it('carrega a árvore e mostra as categorias da raiz, sem nenhuma escolhida', async () => {
    const { result } = await aberto()
    expect(result.current.subcategorias.map((c) => c.nome)).toEqual([
      'Alimentação',
      'Outros produtos',
    ])
    expect(result.current.categoriaAtual).toBeNull()
    expect(result.current.caminho).toEqual([])
  })

  it('escolher Alimentação busca os itens dela e mostra Bebidas e Doces embaixo (US12)', async () => {
    const { result, buscar } = await aberto()

    await act(() => result.current.escolherCategoria(1))

    expect(buscar).toHaveBeenCalledWith({ texto: '', categoriaId: 1 })
    expect(result.current.resultados).toHaveLength(1)
    expect(result.current.categoriaAtual?.nome).toBe('Alimentação')
    expect(result.current.subcategorias.map((c) => c.nome)).toEqual(['Bebidas', 'Doces'])
  })

  it('desce até Brownie: a trilha é Alimentação › Doces › Brownie e não há mais níveis', async () => {
    const { result, buscar } = await aberto()

    await act(() => result.current.escolherCategoria(1))
    await act(() => result.current.escolherCategoria(3))
    await act(() => result.current.escolherCategoria(7))

    expect(buscar).toHaveBeenLastCalledWith({ texto: '', categoriaId: 7 })
    expect(result.current.caminho.map((c) => c.nome)).toEqual(['Alimentação', 'Doces', 'Brownie'])
    expect(result.current.subcategorias).toEqual([])
  })

  it('com categoria, o texto filtra dentro dela e pode ter 1 letra só', async () => {
    const { result, buscar } = await aberto()
    await act(() => result.current.escolherCategoria(3))
    act(() => result.current.alterarTexto('c'))

    await act(() => result.current.buscar())

    expect(buscar).toHaveBeenLastCalledWith({ texto: 'c', categoriaId: 3 })
    expect(result.current.erro).toBeNull()
  })

  it('guarda o que foi buscado, com a categoria, para a mensagem de nada encontrado', async () => {
    const { result } = await aberto(falso(vi.fn().mockResolvedValue([])))
    await act(() => result.current.escolherCategoria(3))

    expect(result.current.buscado).toEqual({ texto: '', categoria: categorias[1] })
  })

  it('voltar para "Todas" sem texto limpa os resultados sem chamar o repositório', async () => {
    const { result, buscar } = await aberto()
    await act(() => result.current.escolherCategoria(1))

    await act(() => result.current.escolherCategoria(null))

    expect(buscar).toHaveBeenCalledOnce()
    expect(result.current.resultados).toEqual([])
    expect(result.current.buscou).toBe(false)
    expect(result.current.erro).toBeNull()
  })

  it('sem texto e sem categoria, pede uma das duas coisas', async () => {
    const { result, buscar } = await aberto()

    await act(() => result.current.buscar())

    expect(buscar).not.toHaveBeenCalled()
    expect(result.current.erro).toBe('Digite pelo menos 2 letras ou escolha uma categoria.')
  })

  it('avisa quando não consegue carregar as categorias', async () => {
    const { result } = renderHook(() =>
      useBuscaViewModel({
        ...falso(),
        categoriasRepositorio: {
          listarCategorias: vi
            .fn()
            .mockRejectedValue(
              new Falha('Não foi possível carregar as categorias. Tente de novo.', 'rede'),
            ),
        },
      }),
    )

    await waitFor(() =>
      expect(result.current.erroCategorias).toBe(
        'Não foi possível carregar as categorias. Tente de novo.',
      ),
    )
  })
})
