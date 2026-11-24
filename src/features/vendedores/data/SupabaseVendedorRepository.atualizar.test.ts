import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { Database } from '../../../types/database.types'
import { Contato } from '../domain/Contato'
import { VendedorAmbulante } from '../domain/Vendedor'
import { SupabaseVendedorRepository } from './SupabaseVendedorRepository'

const linhaSalva = {
  id: 'v1',
  perfil_id: 'u1',
  tipo: 'ambulante',
  nome_exibicao: 'Brownies da Ana',
  descricao: 'Brownie e café',
  foto_url: null as string | null,
  latitude: null,
  longitude: null,
  criado_em: '2026-10-20T12:00:00Z',
}

type Resposta = { data?: unknown; error: unknown }

/** O que cada operação devolve, pela chave "tabela.operação". Quem não está na lista dá certo. */
type Respostas = Partial<Record<string, Resposta>>

const PADRAO: Record<string, Resposta> = {
  'vendedores.update': { data: linhaSalva, error: null },
  'contatos.update': { data: [{ id: 'c1' }], error: null },
  'contatos.insert': { error: null },
  'contatos.delete': { error: null },
}

// Cliente falso: cada chamada (update, eq, select...) fica registrada, e o `await` entrega a resposta
// da operação. Nenhum teste acessa o Supabase de verdade.
function clienteFalso(respostas: Respostas = {}) {
  const chamadas: { chave: string; metodo: string; args: unknown[] }[] = []

  function consulta(chave: string) {
    const c: Record<string, unknown> = {
      then: (resolver: (r: Resposta) => unknown) =>
        Promise.resolve(respostas[chave] ?? PADRAO[chave]).then(resolver),
    }
    for (const metodo of ['eq', 'not', 'select', 'single']) {
      c[metodo] = (...args: unknown[]) => {
        chamadas.push({ chave, metodo, args })
        return c
      }
    }
    return c
  }

  const from = (tabela: string) => {
    const operacao: Record<string, unknown> = {}
    for (const op of ['update', 'insert', 'delete']) {
      operacao[op] = (...args: unknown[]) => {
        const chave = `${tabela}.${op}`
        chamadas.push({ chave, metodo: op, args })
        return consulta(chave)
      }
    }
    return operacao
  }

  const upload = vi.fn(() => Promise.resolve({ data: {}, error: null }))
  const remove = vi.fn(() => Promise.resolve({ data: [], error: null }))
  const getPublicUrl = vi.fn((caminho: string) => ({
    data: { publicUrl: `https://exemplo.supabase.co/storage/v1/object/public/fotos/${caminho}` },
  }))
  const client = {
    from,
    storage: { from: () => ({ upload, remove, getPublicUrl }) },
  } as unknown as SupabaseClient<Database>

  /** Os argumentos da chamada `metodo` da operação `chave` (a primeira, ou a de índice `n`). */
  const args = (chave: string, metodo: string, n = 0) =>
    chamadas.filter((c) => c.chave === chave && c.metodo === metodo)[n]?.args
  const vezes = (chave: string, metodo: string) =>
    chamadas.filter((c) => c.chave === chave && c.metodo === metodo).length

  return { client, upload, remove, args, vezes }
}

const vendedor = new VendedorAmbulante('v1', 'u1', 'Brownies da Ana', 'Brownie e café')
const whatsapp = new Contato('whatsapp', '5586999998888')
const telefone = new Contato('telefone', '5586988887777')
const foto = new Blob(['jpeg'], { type: 'image/jpeg' })

async function falhaDe(promessa: Promise<unknown>) {
  const erro = await promessa.catch((e) => e)
  expect(erro).toBeInstanceOf(Falha)
  return erro as Falha
}

describe('SupabaseVendedorRepository.atualizarPerfil: dados do perfil', () => {
  it('atualiza o nome e a descrição pelo id e devolve o vendedor criado pela fábrica', async () => {
    const falso = clienteFalso()

    const salvo = await new SupabaseVendedorRepository(falso.client).atualizarPerfil(vendedor, [
      whatsapp,
    ])

    expect(falso.args('vendedores.update', 'update')).toEqual([
      { nome_exibicao: 'Brownies da Ana', descricao: 'Brownie e café' },
    ])
    expect(falso.args('vendedores.update', 'eq')).toEqual(['id', 'v1'])
    expect(falso.upload).not.toHaveBeenCalled()
    expect(salvo).toBeInstanceOf(VendedorAmbulante)
    expect(salvo.id).toBe('v1')
  })

  it('grava a descrição vazia como nulo', async () => {
    const falso = clienteFalso()

    await new SupabaseVendedorRepository(falso.client).atualizarPerfil(
      new VendedorAmbulante('v1', 'u1', 'Brownies da Ana'),
      [whatsapp],
    )

    expect(falso.args('vendedores.update', 'update')).toEqual([
      { nome_exibicao: 'Brownies da Ana', descricao: null },
    ])
  })

  it('envia a foto nova para a pasta da conta e grava a URL pública', async () => {
    const falso = clienteFalso()

    await new SupabaseVendedorRepository(falso.client).atualizarPerfil(vendedor, [whatsapp], foto)

    const [caminho, , opcoes] = falso.upload.mock.calls[0] as unknown as [string, Blob, object]
    expect(caminho).toMatch(/^u1\/perfil-\d+\.jpg$/)
    expect(opcoes).toEqual({ contentType: 'image/jpeg' })
    expect(falso.args('vendedores.update', 'update')).toEqual([
      expect.objectContaining({
        foto_url: `https://exemplo.supabase.co/storage/v1/object/public/fotos/${caminho}`,
      }),
    ])
  })

  it('recusa foto que não é JPEG, PNG ou WebP sem gravar nada', async () => {
    const falso = clienteFalso()
    const gif = new Blob(['gif'], { type: 'image/gif' })

    const falha = await falhaDe(
      new SupabaseVendedorRepository(falso.client).atualizarPerfil(vendedor, [whatsapp], gif),
    )

    expect(falha.codigo).toBe('foto-formato-invalido')
    expect(falso.upload).not.toHaveBeenCalled()
    expect(falso.vezes('vendedores.update', 'update')).toBe(0)
  })

  it('avisa quando o perfil não existe ou é de outra pessoa (a RLS esconde a linha) e apaga a foto enviada', async () => {
    const falso = clienteFalso({ 'vendedores.update': { data: null, error: { code: 'PGRST116' } } })

    const falha = await falhaDe(
      new SupabaseVendedorRepository(falso.client).atualizarPerfil(vendedor, [whatsapp], foto),
    )

    expect(falha.codigo).toBe('perfil-nao-encontrado')
    expect(falso.remove).toHaveBeenCalledOnce()
    expect(falso.vezes('contatos.update', 'update')).toBe(0)
  })

  it('lança Falha quando o banco dá erro e apaga a foto enviada', async () => {
    const falso = clienteFalso({ 'vendedores.update': { data: null, error: { code: '500' } } })

    const falha = await falhaDe(
      new SupabaseVendedorRepository(falso.client).atualizarPerfil(vendedor, [whatsapp], foto),
    )

    expect(falha.codigo).toBe('500')
    expect(falha.mensagem).toBe('Não foi possível salvar o perfil. Tente de novo.')
    expect(falso.remove).toHaveBeenCalledOnce()
  })
})

describe('SupabaseVendedorRepository.atualizarPerfil: contatos', () => {
  it('muda o valor do canal que já existe, sem criar outro', async () => {
    const falso = clienteFalso()

    await new SupabaseVendedorRepository(falso.client).atualizarPerfil(vendedor, [whatsapp])

    expect(falso.args('contatos.update', 'update')).toEqual([
      { valor: '5586999998888', visivel: true },
    ])
    expect(falso.args('contatos.update', 'eq', 0)).toEqual(['vendedor_id', 'v1'])
    expect(falso.args('contatos.update', 'eq', 1)).toEqual(['canal', 'whatsapp'])
    expect(falso.vezes('contatos.insert', 'insert')).toBe(0)
  })

  it('cria o canal que ainda não existe (RN06)', async () => {
    const falso = clienteFalso({ 'contatos.update': { data: [], error: null } })

    await new SupabaseVendedorRepository(falso.client).atualizarPerfil(vendedor, [telefone])

    expect(falso.args('contatos.insert', 'insert')).toEqual([
      { vendedor_id: 'v1', canal: 'telefone', valor: '5586988887777', visivel: true },
    ])
  })

  it('grava o número oculto como oculto (US19, RN24)', async () => {
    const falso = clienteFalso()
    const oculto = new Contato('whatsapp', '5586999998888', false)

    await new SupabaseVendedorRepository(falso.client).atualizarPerfil(vendedor, [oculto])

    expect(falso.args('contatos.update', 'update')).toEqual([
      { valor: '5586999998888', visivel: false },
    ])
  })

  it('apaga os canais que saíram da lista, só depois de salvar os que ficaram', async () => {
    const falso = clienteFalso()

    await new SupabaseVendedorRepository(falso.client).atualizarPerfil(vendedor, [whatsapp])

    expect(falso.args('contatos.delete', 'eq')).toEqual(['vendedor_id', 'v1'])
    expect(falso.args('contatos.delete', 'not')).toEqual(['canal', 'in', '(whatsapp)'])
  })

  it('mantém os dois canais quando a lista tem os dois', async () => {
    const falso = clienteFalso()

    await new SupabaseVendedorRepository(falso.client).atualizarPerfil(vendedor, [
      whatsapp,
      telefone,
    ])

    expect(falso.vezes('contatos.update', 'update')).toBe(2)
    expect(falso.args('contatos.delete', 'not')).toEqual(['canal', 'in', '(whatsapp,telefone)'])
  })

  it('recusa a lista vazia, sem gravar nada (RN06)', async () => {
    const falso = clienteFalso()

    const falha = await falhaDe(
      new SupabaseVendedorRepository(falso.client).atualizarPerfil(vendedor, [], foto),
    )

    expect(falha.codigo).toBe('sem-contatos')
    expect(falso.upload).not.toHaveBeenCalled()
    expect(falso.vezes('vendedores.update', 'update')).toBe(0)
  })

  it('lança Falha quando o contato é recusado pelo banco (RN21)', async () => {
    const falso = clienteFalso({ 'contatos.update': { data: null, error: { code: '23514' } } })

    const falha = await falhaDe(
      new SupabaseVendedorRepository(falso.client).atualizarPerfil(vendedor, [whatsapp]),
    )

    expect(falha.codigo).toBe('dados-invalidos')
    expect(falso.vezes('contatos.delete', 'delete')).toBe(0)
  })

  it('lança Falha quando não consegue apagar o canal que saiu', async () => {
    const falso = clienteFalso({ 'contatos.delete': { error: { code: '500' } } })

    const falha = await falhaDe(
      new SupabaseVendedorRepository(falso.client).atualizarPerfil(vendedor, [whatsapp]),
    )

    expect(falha.codigo).toBe('500')
  })
})
