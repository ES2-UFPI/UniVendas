import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { Categoria } from '../../itens/domain/Categoria'
import { Item } from '../../itens/domain/Item'
import type { BuscaRepository, ResultadoBusca } from '../domain/BuscaRepository'

type Buscar = BuscaRepository['buscar']
import { limparMemoriaDaBusca, useMemoriaDaBusca } from './memoriaDaBusca'
import { useBuscaViewModel } from './useBuscaViewModel'

const categorias: Categoria[] = [
  { id: 1, nome: 'Alimentação', categoriaPaiId: null, folha: false },
  { id: 2, nome: 'Outros produtos', categoriaPaiId: null, folha: false },
  { id: 3, nome: 'Doces', categoriaPaiId: 1, folha: false },
  { id: 7, nome: 'Brownie', categoriaPaiId: 3, folha: true },
  { id: 9, nome: 'Café', categoriaPaiId: 1, folha: true },
  { id: 20, nome: 'Artesanato', categoriaPaiId: 2, folha: true },
]

function resultado(
  id: string,
  categoriaId: number,
  nome: string,
  disponivel = true,
): ResultadoBusca {
  return {
    item: new Item(id, 'v1', categoriaId, nome, 5, '', `https://x/${id}.jpg`, disponivel),
    vendedorNome: 'Doces da Ana',
    noCampusAgora: true,
    referencia: 'Perto da Biblioteca Central',
  }
}

const brownie = resultado('a', 7, 'Brownie de chocolate')
const cafe = resultado('b', 9, 'Café coado')
const esgotado = resultado('c', 7, 'Brownie 100% cacau', false)
const chaveiro = resultado('d', 20, 'Chaveiro')

/** Busca falsa: Alimentação (1) traz comida; Outros produtos (2), o chaveiro; com texto, só o brownie. */
function buscaFalsa() {
  return vi.fn(({ texto, categoriaId }: { texto: string; categoriaId?: number | null }) => {
    if (texto) return Promise.resolve([brownie])
    return Promise.resolve(categoriaId === 2 ? [chaveiro] : [brownie, cafe, esgotado])
  })
}

function abrir(
  buscar: Buscar = buscaFalsa(),
  listarCategorias = vi.fn().mockResolvedValue(categorias),
) {
  // Criados fora do renderHook: um objeto novo a cada render faria o hook reler tudo sem parar.
  const repositorio = { buscar, detalhar: vi.fn() } as unknown as BuscaRepository
  const categoriasRepositorio = { listarCategorias }
  const hook = renderHook(() => useBuscaViewModel({ repositorio, categoriasRepositorio }))
  return { ...hook, buscar, listarCategorias }
}

async function aberto(buscar: Buscar = buscaFalsa()) {
  const tudo = abrir(buscar)
  await waitFor(() => expect(tudo.result.current.carregou).toBe(true))
  return tudo
}

beforeEach(limparMemoriaDaBusca)
afterEach(cleanup)

describe('useBuscaViewModel', () => {
  it('abre na primeira aba, com a oferta dela: disponíveis e esgotados separados (RN09)', async () => {
    const { result, buscar } = await aberto()

    expect(result.current.abas.map((a) => a.nome)).toEqual(['Alimentação', 'Outros produtos'])
    expect(result.current.abaAtual?.nome).toBe('Alimentação')
    expect(buscar).toHaveBeenCalledWith({ texto: '', categoriaId: 1 })
    expect(result.current.disponiveis.map((r) => r.item.nome)).toEqual([
      'Brownie de chocolate',
      'Café coado',
    ])
    expect(result.current.esgotados.map((r) => r.item.nome)).toEqual(['Brownie 100% cacau'])
  })

  it('monta os atalhos com os tipos de produto da oferta', async () => {
    const { result } = await aberto()

    expect(result.current.atalhos.map((a) => [a.categoria.nome, a.quantidade])).toEqual([
      ['Brownie', 2],
      ['Café', 1],
    ])
  })

  it('o atalho filtra a lista sem buscar de novo; escolher de novo tira o filtro', async () => {
    const { result, buscar } = await aberto()

    act(() => result.current.escolherAtalho(9))

    expect(result.current.atalhoAtual?.nome).toBe('Café')
    expect(result.current.disponiveis.map((r) => r.item.nome)).toEqual(['Café coado'])
    expect(result.current.esgotados).toEqual([])
    expect(buscar).toHaveBeenCalledOnce()

    act(() => result.current.escolherAtalho(9))
    expect(result.current.atalhoAtual).toBeNull()
    expect(result.current.disponiveis).toHaveLength(2)
  })

  it('trocar de aba traz a oferta da outra aba e tira o atalho', async () => {
    const { result, buscar } = await aberto()
    act(() => result.current.escolherAtalho(7))

    await act(() => result.current.trocarAba(2))

    expect(buscar).toHaveBeenLastCalledWith({ texto: '', categoriaId: 2 })
    expect(result.current.abaAtual?.nome).toBe('Outros produtos')
    expect(result.current.atalhoAtual).toBeNull()
    expect(result.current.disponiveis.map((r) => r.item.nome)).toEqual(['Chaveiro'])
  })

  it('busca o texto dentro da aba', async () => {
    const { result, buscar } = await aberto()

    act(() => result.current.alterarTexto('BROWNIE'))
    await act(() => result.current.buscar())

    expect(buscar).toHaveBeenLastCalledWith({ texto: 'BROWNIE', categoriaId: 1 })
    expect(result.current.buscado).toBe('BROWNIE')
    expect(result.current.disponiveis.map((r) => r.item.nome)).toEqual(['Brownie de chocolate'])
  })

  it('o texto buscado continua valendo ao trocar de aba', async () => {
    const { result, buscar } = await aberto()
    act(() => result.current.alterarTexto('ana'))
    await act(() => result.current.buscar())

    await act(() => result.current.trocarAba(2))

    expect(buscar).toHaveBeenLastCalledWith({ texto: 'ana', categoriaId: 2 })
  })

  it('pede pelo menos 2 letras e não busca com 1', async () => {
    const { result, buscar } = await aberto()

    act(() => result.current.alterarTexto('b'))
    await act(() => result.current.buscar())

    expect(result.current.erro).toBe('Digite pelo menos 2 letras.')
    expect(buscar).toHaveBeenCalledOnce()
  })

  it('apagar o texto volta para a oferta da aba', async () => {
    const { result, buscar } = await aberto()
    act(() => result.current.alterarTexto('brownie'))
    await act(() => result.current.buscar())

    act(() => result.current.alterarTexto(''))

    await waitFor(() => expect(result.current.disponiveis).toHaveLength(2))
    expect(result.current.buscado).toBeNull()
    expect(buscar).toHaveBeenLastCalledWith({ texto: '', categoriaId: 1 })
  })

  it('mostra a mensagem da Falha quando a busca dá erro', async () => {
    const buscar = vi.fn().mockRejectedValue(new Falha('Sem internet.', 'rede'))
    const { result } = abrir(buscar)

    await waitFor(() => expect(result.current.erro).toBe('Sem internet.'))
    expect(result.current.carregando).toBe(false)
  })

  it('avisa quando não consegue ler as categorias', async () => {
    const { result, buscar } = abrir(
      buscaFalsa(),
      vi.fn().mockRejectedValue(new Falha('Categorias fora do ar.', 'rede')),
    )

    await waitFor(() => expect(result.current.erroCategorias).toBe('Categorias fora do ar.'))
    expect(buscar).not.toHaveBeenCalled()
  })

  it('só vale a resposta da última consulta, mesmo se uma antiga chegar depois', async () => {
    let soltarAntiga: (r: ResultadoBusca[]) => void = () => {}
    const buscar = vi
      .fn()
      .mockResolvedValueOnce([brownie, cafe])
      .mockImplementationOnce(() => new Promise((ok) => (soltarAntiga = ok)))
      .mockResolvedValueOnce([chaveiro])
    const { result } = await aberto(buscar)

    act(() => result.current.alterarTexto('brownie'))
    let antiga: Promise<void> = Promise.resolve()
    act(() => {
      antiga = result.current.buscar()
    })
    await act(() => result.current.trocarAba(2))
    await act(async () => {
      soltarAntiga([brownie])
      await antiga
    })

    expect(result.current.disponiveis.map((r) => r.item.nome)).toEqual(['Chaveiro'])
  })

  it('guarda tudo na memória: abrir de novo mostra a mesma tela e só renova a lista', async () => {
    const primeira = await aberto()
    act(() => primeira.result.current.alterarTexto('brownie'))
    await act(() => primeira.result.current.buscar())
    act(() => primeira.result.current.escolherAtalho(7))
    primeira.unmount()

    let soltar: (r: ResultadoBusca[]) => void = () => {}
    const buscar = vi.fn(() => new Promise<ResultadoBusca[]>((ok) => (soltar = ok)))
    const { result } = abrir(buscar)

    // Enquanto a lista se renova, a tela já está como antes, sem "Carregando…".
    expect(result.current.texto).toBe('brownie')
    expect(result.current.buscado).toBe('brownie')
    expect(result.current.atalhoAtual?.nome).toBe('Brownie')
    expect(result.current.disponiveis.map((r) => r.item.nome)).toEqual(['Brownie de chocolate'])
    await waitFor(() => expect(buscar).toHaveBeenCalledWith({ texto: 'brownie', categoriaId: 1 }))
    expect(result.current.carregando).toBe(false)

    await act(async () => soltar([brownie, esgotado]))
    expect(result.current.esgotados).toHaveLength(1)
  })

  it('limparMemoriaDaBusca esquece a busca anterior', async () => {
    const { result, unmount } = await aberto()
    act(() => result.current.alterarTexto('brownie'))
    unmount()

    limparMemoriaDaBusca()

    expect(useMemoriaDaBusca.getState()).toMatchObject({ texto: '', abaId: null, lista: [] })
  })
})
