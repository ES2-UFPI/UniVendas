import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { Database } from '../../../types/database.types'
import { Item } from '../domain/Item'
import { SupabaseItemRepository } from './SupabaseItemRepository'

const linha = {
  id: 'i1',
  vendedor_id: 'v1',
  categoria_id: 7,
  nome: 'Brownie de chocolate',
  descricao: 'Com nozes' as string | null,
  preco: 5.5,
  foto_url: null as string | null,
  disponivel: true,
  criado_em: '2026-11-10T12:00:00Z',
}

type Resposta = { data: unknown; error: unknown }

// Consulta falsa: cada método (select, eq, order...) fica registrado e devolve a própria consulta;
// no fim, o `await` entrega a resposta configurada. Nenhum teste acessa o Supabase de verdade.
const METODOS = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single'] as const

function consultaFalsa(resposta: Resposta) {
  const consulta = {
    then: (resolver: (r: Resposta) => unknown) => Promise.resolve(resposta).then(resolver),
  } as unknown as Record<(typeof METODOS)[number], ReturnType<typeof vi.fn>> & PromiseLike<Resposta>
  for (const metodo of METODOS) {
    consulta[metodo] = vi.fn(() => consulta)
  }
  return consulta
}

function clienteFalso(resposta: Resposta = { data: linha, error: null }, erroUpload?: unknown) {
  const consulta = consultaFalsa(resposta)
  const from = vi.fn(() => consulta)
  const upload = vi.fn(() => Promise.resolve({ data: {}, error: erroUpload ?? null }))
  const getPublicUrl = vi.fn((caminho: string) => ({
    data: { publicUrl: `https://exemplo.supabase.co/storage/v1/object/public/fotos/${caminho}` },
  }))
  const client = {
    from,
    storage: { from: () => ({ upload, getPublicUrl }) },
  } as unknown as SupabaseClient<Database>

  return { repo: new SupabaseItemRepository(client), consulta, from, upload }
}

async function falhaDe(promessa: Promise<unknown>) {
  const erro = await promessa.catch((e) => e)
  expect(erro).toBeInstanceOf(Falha)
  return erro as Falha
}

const item = new Item('', 'v1', 7, 'Brownie de chocolate', 5.5, 'Com nozes')

describe('SupabaseItemRepository.listar', () => {
  it('busca os itens do vendedor em ordem alfabética e devolve objetos Item', async () => {
    const { repo, consulta, from } = clienteFalso({ data: [linha], error: null })

    const itens = await repo.listar('v1')

    expect(from).toHaveBeenCalledWith('itens')
    expect(consulta.eq).toHaveBeenCalledWith('vendedor_id', 'v1')
    expect(consulta.order).toHaveBeenCalledWith('nome')
    expect(itens).toHaveLength(1)
    expect(itens[0]).toBeInstanceOf(Item)
    expect(itens[0]).toMatchObject({
      id: 'i1',
      vendedorId: 'v1',
      categoriaId: 7,
      nome: 'Brownie de chocolate',
      descricao: 'Com nozes',
      preco: 5.5,
      fotoUrl: null,
      disponivel: true,
    })
  })

  it('troca a descrição nula por texto vazio', async () => {
    const { repo } = clienteFalso({ data: [{ ...linha, descricao: null }], error: null })

    const [primeiro] = await repo.listar('v1')

    expect(primeiro.descricao).toBe('')
  })

  it('lança Falha quando a busca dá erro', async () => {
    const { repo } = clienteFalso({ data: null, error: { code: '500' } })

    const falha = await falhaDe(repo.listar('v1'))

    expect(falha.mensagem).toBe('Não foi possível carregar os itens. Tente de novo.')
  })
})

describe('SupabaseItemRepository.criar', () => {
  it('grava só as colunas liberadas no banco e devolve o item com o id', async () => {
    const { repo, consulta } = clienteFalso()

    const salvo = await repo.criar(item)

    expect(consulta.insert).toHaveBeenCalledWith({
      vendedor_id: 'v1',
      categoria_id: 7,
      nome: 'Brownie de chocolate',
      descricao: 'Com nozes',
      preco: 5.5,
      foto_url: null,
      disponivel: true,
    })
    expect(salvo).toBeInstanceOf(Item)
    expect(salvo.id).toBe('i1')
  })

  it('manda descrição vazia como nula', async () => {
    const { repo, consulta } = clienteFalso()

    await repo.criar(new Item('', 'v1', 7, 'Brownie', 5))

    expect(consulta.insert).toHaveBeenCalledWith(expect.objectContaining({ descricao: null }))
  })

  it('avisa quando o banco recusa o preço ou a categoria (RN07)', async () => {
    const { repo } = clienteFalso({ data: null, error: { code: '23514' } })

    const falha = await falhaDe(repo.criar(item))

    expect(falha.codigo).toBe('dados-invalidos')
  })

  it('avisa quando o vendedor não é de quem está logado (RN11)', async () => {
    const { repo } = clienteFalso({ data: null, error: { code: '42501' } })

    const falha = await falhaDe(repo.criar(item))

    expect(falha.codigo).toBe('sem-permissao')
  })
})

describe('SupabaseItemRepository.editar', () => {
  it('atualiza os dados do item pelo id, sem mudar o vendedor', async () => {
    const { repo, consulta } = clienteFalso({ data: { ...linha, preco: 6 }, error: null })

    const salvo = await repo.editar(new Item('i1', 'v1', 7, 'Brownie de chocolate', 6, 'Com nozes'))

    expect(consulta.update).toHaveBeenCalledWith({
      categoria_id: 7,
      nome: 'Brownie de chocolate',
      descricao: 'Com nozes',
      preco: 6,
      foto_url: null,
      disponivel: true,
    })
    expect(consulta.eq).toHaveBeenCalledWith('id', 'i1')
    expect(salvo.preco).toBe(6)
  })

  it('avisa quando o item não existe ou é de outro vendedor (a RLS esconde a linha)', async () => {
    const { repo } = clienteFalso({ data: null, error: { code: 'PGRST116' } })

    const falha = await falhaDe(repo.editar(new Item('i9', 'v1', 7, 'Brownie', 5)))

    expect(falha.codigo).toBe('item-nao-encontrado')
  })
})

describe('SupabaseItemRepository.remover', () => {
  it('apaga o item pelo id', async () => {
    const { repo, consulta } = clienteFalso({ data: [{ id: 'i1' }], error: null })

    await repo.remover('i1')

    expect(consulta.delete).toHaveBeenCalledOnce()
    expect(consulta.eq).toHaveBeenCalledWith('id', 'i1')
  })

  it('avisa quando nenhuma linha foi apagada (item de outro vendedor ou já removido)', async () => {
    const { repo } = clienteFalso({ data: [], error: null })

    const falha = await falhaDe(repo.remover('i9'))

    expect(falha.codigo).toBe('item-nao-encontrado')
  })

  it('lança Falha quando o banco dá erro', async () => {
    const { repo } = clienteFalso({ data: null, error: { code: '500' } })

    await falhaDe(repo.remover('i1'))
  })
})

describe('SupabaseItemRepository.enviarFoto', () => {
  const foto = new Blob(['jpeg'], { type: 'image/jpeg' })

  it('envia a foto para a pasta do dono e devolve a URL pública', async () => {
    const { repo, upload } = clienteFalso()

    const url = await repo.enviarFoto('u1', foto)

    const [caminho, , opcoes] = upload.mock.calls[0] as unknown as [string, Blob, object]
    expect(caminho).toMatch(/^u1\/item-\d+\.jpg$/)
    expect(opcoes).toEqual({ contentType: 'image/jpeg' })
    expect(url).toBe(`https://exemplo.supabase.co/storage/v1/object/public/fotos/${caminho}`)
  })

  it('recusa foto que não é JPEG, PNG ou WebP sem enviar nada', async () => {
    const { repo, upload } = clienteFalso()

    const falha = await falhaDe(repo.enviarFoto('u1', new Blob(['gif'], { type: 'image/gif' })))

    expect(falha.codigo).toBe('foto-formato-invalido')
    expect(upload).not.toHaveBeenCalled()
  })

  it('avisa quando o envio falha (ex.: acima de 2 MB, RN10)', async () => {
    const { repo } = clienteFalso(undefined, { message: 'Payload too large' })

    const falha = await falhaDe(repo.enviarFoto('u1', foto))

    expect(falha.codigo).toBe('foto-nao-enviada')
  })
})
