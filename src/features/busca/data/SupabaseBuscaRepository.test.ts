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

  it('lança Falha quando a busca dá erro', async () => {
    const { repo } = clienteFalso({ data: null, error: { code: '500' } })

    const erro = await repo.buscar({ texto: 'brownie' }).catch((e) => e)

    expect(erro).toBeInstanceOf(Falha)
    expect(erro.mensagem).toBe('Não foi possível buscar agora. Tente de novo.')
  })
})
