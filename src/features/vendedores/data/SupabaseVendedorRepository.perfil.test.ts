import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { Database } from '../../../types/database.types'
import { Contato } from '../domain/Contato'
import { PerfilVendedor } from '../domain/PerfilVendedor'
import { VendedorAmbulante } from '../domain/Vendedor'
import { SupabaseVendedorRepository } from './SupabaseVendedorRepository'

const agora = new Date('2026-11-12T12:00:00Z')
const haMinutos = (minutos: number) => new Date(agora.getTime() - minutos * 60 * 1000).toISOString()

function item(id: string, nome: string, disponivel: boolean) {
  return {
    id,
    vendedor_id: 'v1',
    categoria_id: 7,
    nome,
    descricao: null,
    preco: 5,
    foto_url: null,
    disponivel,
    criado_em: '2026-11-10T12:00:00Z',
  }
}

function linhaPerfil(presenca: { ultimo_sinal_em: string } | null) {
  return {
    id: 'v1',
    perfil_id: 'u1',
    tipo: 'ambulante',
    nome_exibicao: 'Brownies da Ana',
    descricao: 'Brownie e café',
    foto_url: null,
    latitude: null,
    longitude: null,
    criado_em: '2026-10-20T12:00:00Z',
    contatos: [
      { canal: 'whatsapp', valor: '5586999990000' },
      { canal: 'instagram', valor: 'ana.brownies' },
    ],
    itens: [
      item('i1', 'Café', true),
      item('i2', 'Bolo de pote', false),
      item('i3', 'Brownie', true),
    ],
    presenca,
  }
}

/** Cliente falso: from('vendedores').select(...).eq('id', ...).maybeSingle(). */
function clienteFalso(resposta: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn(() => Promise.resolve(resposta))
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const client = { from: vi.fn(() => ({ select })) }
  const repo = new SupabaseVendedorRepository(
    client as unknown as SupabaseClient<Database>,
    () => agora,
  )
  return { repo, client, select, eq }
}

describe('SupabaseVendedorRepository.buscarPerfil (US10)', () => {
  it('traz vendedor, contatos e itens numa consulta só', async () => {
    const { repo, client, select, eq } = clienteFalso({
      data: linhaPerfil({ ultimo_sinal_em: haMinutos(5) }),
      error: null,
    })

    const perfil = await repo.buscarPerfil('v1')

    expect(client.from).toHaveBeenCalledWith('vendedores')
    expect(select).toHaveBeenCalledWith(
      expect.stringContaining('contatos(canal, valor), itens(*), presenca(ultimo_sinal_em)'),
    )
    expect(eq).toHaveBeenCalledWith('id', 'v1')
    expect(perfil).toBeInstanceOf(PerfilVendedor)
    expect(perfil?.vendedor).toBeInstanceOf(VendedorAmbulante)
    expect(perfil?.vendedor).toMatchObject({ id: 'v1', nomeExibicao: 'Brownies da Ana' })
    // Canal que o app ainda não conhece (Instagram, incremento 2) fica de fora.
    expect(perfil?.contatos).toEqual([new Contato('whatsapp', '5586999990000')])
  })

  it('ordena os itens: disponíveis primeiro, esgotados depois, em ordem alfabética (RN09)', async () => {
    const { repo } = clienteFalso({ data: linhaPerfil(null), error: null })

    const perfil = await repo.buscarPerfil('v1')

    expect(perfil?.itens.map((i) => i.nome)).toEqual(['Brownie', 'Café', 'Bolo de pote'])
  })

  it('está ativo quando mandou sinal há menos de 30 minutos', async () => {
    const { repo } = clienteFalso({
      data: linhaPerfil({ ultimo_sinal_em: haMinutos(29) }),
      error: null,
    })
    expect((await repo.buscarPerfil('v1'))?.ativoAgora).toBe(true)
  })

  it('está fora do campus sem presença ou com o sinal de 30 minutos ou mais (RN19)', async () => {
    const semPresenca = clienteFalso({ data: linhaPerfil(null), error: null })
    const sinalVelho = clienteFalso({
      data: linhaPerfil({ ultimo_sinal_em: haMinutos(30) }),
      error: null,
    })

    expect((await semPresenca.repo.buscarPerfil('v1'))?.ativoAgora).toBe(false)
    expect((await sinalVelho.repo.buscarPerfil('v1'))?.ativoAgora).toBe(false)
  })

  it('devolve null quando o vendedor não existe', async () => {
    const { repo } = clienteFalso({ data: null, error: null })
    expect(await repo.buscarPerfil('nao-existe')).toBeNull()
  })

  it('lança Falha quando a consulta dá erro', async () => {
    const { repo } = clienteFalso({ data: null, error: { code: '500' } })
    await expect(repo.buscarPerfil('v1')).rejects.toBeInstanceOf(Falha)
  })
})
