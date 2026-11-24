import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { Database } from '../../../types/database.types'
import { Item } from '../../itens/domain/Item'
import { SupabaseBuscaRepository } from './SupabaseBuscaRepository'

const linha = {
  id: 'i1',
  vendedor_id: 'v1',
  vendedor_nome: 'Doces da Ana',
  categoria_id: 7,
  nome: 'Brownie de chocolate',
  descricao: null as string | null,
  preco: 5.5,
  foto_url: null as string | null,
  disponivel: true,
  no_campus_agora: false,
  referencia: null as string | null,
}

// Cliente falso: só tem o `rpc`, que é o que o repositório usa. Nenhum teste acessa o Supabase de verdade.
function clienteFalso(resposta: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(resposta)
  const repo = new SupabaseBuscaRepository({ rpc } as unknown as SupabaseClient<Database>)
  return { repo, rpc }
}

describe('SupabaseBuscaRepository.buscar', () => {
  it('chama a função buscar_itens com o texto sem espaços nas pontas', async () => {
    const { repo, rpc } = clienteFalso({ data: [linha], error: null })

    await repo.buscar({ texto: '  brownie ' })

    expect(rpc).toHaveBeenCalledWith('buscar_itens', { texto: 'brownie' })
  })

  it('devolve cada linha como um resultado com o Item, o vendedor e a presença', async () => {
    const { repo } = clienteFalso({
      data: [linha, { ...linha, id: 'i2', disponivel: false, no_campus_agora: true }],
      error: null,
    })

    const [primeiro, segundo] = await repo.buscar({ texto: 'brownie' })

    expect(primeiro.item).toBeInstanceOf(Item)
    expect(primeiro.item).toMatchObject({
      id: 'i1',
      vendedorId: 'v1',
      categoriaId: 7,
      nome: 'Brownie de chocolate',
      descricao: '',
      preco: 5.5,
      fotoUrl: null,
      disponivel: true,
    })
    expect(primeiro.vendedorNome).toBe('Doces da Ana')
    expect(primeiro.noCampusAgora).toBe(false)
    expect(segundo.item.disponivel).toBe(false)
    expect(segundo.noCampusAgora).toBe(true)
    expect(primeiro.referencia).toBeNull()
  })

  it('traz a referência de onde achar o vendedor (RN18)', async () => {
    const { repo } = clienteFalso({
      data: [{ ...linha, no_campus_agora: true, referencia: 'Perto da Biblioteca Central' }],
      error: null,
    })

    const [resultado] = await repo.buscar({ texto: 'brownie' })

    expect(resultado.referencia).toBe('Perto da Biblioteca Central')
  })

  it('mantém a ordem do servidor: disponíveis primeiro, esgotados depois (RN09)', async () => {
    const { repo } = clienteFalso({
      data: [
        { ...linha, id: 'a', disponivel: true },
        { ...linha, id: 'b', disponivel: false },
      ],
      error: null,
    })

    const resultados = await repo.buscar({ texto: 'brownie' })

    expect(resultados.map((r) => r.item.id)).toEqual(['a', 'b'])
  })

  it('não chama o servidor com menos de 2 letras', async () => {
    const { repo, rpc } = clienteFalso({ data: [], error: null })

    await expect(repo.buscar({ texto: ' b ' })).resolves.toEqual([])

    expect(rpc).not.toHaveBeenCalled()
  })

  it('manda a categoria escolhida junto com o texto (US12)', async () => {
    const { repo, rpc } = clienteFalso({ data: [linha], error: null })

    await repo.buscar({ texto: ' cenoura ', categoriaId: 3 })

    expect(rpc).toHaveBeenCalledWith('buscar_itens', { texto: 'cenoura', categoria: 3 })
  })

  it('com categoria, busca mesmo sem texto: traz todos os itens dela e das filhas', async () => {
    const { repo, rpc } = clienteFalso({ data: [linha], error: null })

    const resultados = await repo.buscar({ texto: '', categoriaId: 1 })

    expect(rpc).toHaveBeenCalledWith('buscar_itens', { texto: '', categoria: 1 })
    expect(resultados).toHaveLength(1)
  })

  it('categoria nula é o mesmo que sem categoria', async () => {
    const { repo, rpc } = clienteFalso({ data: [], error: null })

    await repo.buscar({ texto: 'brownie', categoriaId: null })
    await repo.buscar({ texto: 'b', categoriaId: null })

    expect(rpc).toHaveBeenCalledOnce()
    expect(rpc).toHaveBeenCalledWith('buscar_itens', { texto: 'brownie' })
  })

  it('lança Falha quando a busca dá erro', async () => {
    const { repo } = clienteFalso({ data: null, error: { code: '500' } })

    const erro = await repo.buscar({ texto: 'brownie' }).catch((e) => e)

    expect(erro).toBeInstanceOf(Falha)
    expect(erro.mensagem).toBe('Não foi possível buscar agora. Tente de novo.')
  })
})

describe('SupabaseBuscaRepository.detalhar', () => {
  it('lê o item pelo id, no mesmo formato da busca', async () => {
    const { repo, rpc } = clienteFalso({ data: [linha], error: null })

    const resultado = await repo.detalhar('i1')

    expect(rpc).toHaveBeenCalledWith('buscar_itens', { item: 'i1' })
    expect(resultado?.item.nome).toBe('Brownie de chocolate')
    expect(resultado?.vendedorNome).toBe('Doces da Ana')
  })

  it('devolve null quando o item não existe mais', async () => {
    const { repo } = clienteFalso({ data: [], error: null })

    expect(await repo.detalhar('sumiu')).toBeNull()
  })

  it('lança Falha quando a leitura dá erro', async () => {
    const { repo } = clienteFalso({ data: null, error: { code: '500' } })

    const erro = await repo.detalhar('i1').catch((e) => e)

    expect(erro).toBeInstanceOf(Falha)
    expect(erro.mensagem).toBe('Não foi possível abrir o item agora. Tente de novo.')
  })
})
