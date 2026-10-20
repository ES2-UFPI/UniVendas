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

interface Respostas {
  vendedor?: { data: unknown; error: unknown }
  contatos?: { error: unknown }
  upload?: { error: unknown }
}

// Cliente falso: só tem o que o repositório usa. Nenhum teste acessa o Supabase de verdade.
function clienteFalso(respostas: Respostas = {}) {
  const insertVendedor = vi.fn(() => ({
    select: () => ({
      single: () => Promise.resolve(respostas.vendedor ?? { data: linhaSalva, error: null }),
    }),
  }))
  const insertContatos = vi.fn(() => Promise.resolve(respostas.contatos ?? { error: null }))
  const eqDelete = vi.fn(() => Promise.resolve({ error: null }))
  const deleteVendedor = vi.fn(() => ({ eq: eqDelete }))
  const upload = vi.fn(() => Promise.resolve(respostas.upload ?? { data: {}, error: null }))
  const remove = vi.fn(() => Promise.resolve({ data: [], error: null }))
  const getPublicUrl = vi.fn((caminho: string) => ({
    data: { publicUrl: `https://exemplo.supabase.co/storage/v1/object/public/fotos/${caminho}` },
  }))

  const client = {
    from: (tabela: string) =>
      tabela === 'vendedores'
        ? { insert: insertVendedor, delete: deleteVendedor }
        : { insert: insertContatos },
    storage: { from: () => ({ upload, remove, getPublicUrl }) },
  } as unknown as SupabaseClient<Database>

  return { client, insertVendedor, insertContatos, deleteVendedor, eqDelete, upload, remove }
}

const vendedor = new VendedorAmbulante('', 'u1', 'Brownies da Ana', 'Brownie e café')
const contatos = [new Contato('whatsapp', '5586999998888')]
const foto = new Blob(['jpeg'], { type: 'image/jpeg' })

describe('SupabaseVendedorRepository.criar', () => {
  it('salva o vendedor e os contatos e devolve o vendedor criado pela fábrica', async () => {
    const falso = clienteFalso()
    const salvo = await new SupabaseVendedorRepository(falso.client).criar(vendedor, contatos)

    expect(falso.insertVendedor).toHaveBeenCalledWith({
      perfil_id: 'u1',
      tipo: 'ambulante',
      nome_exibicao: 'Brownies da Ana',
      descricao: 'Brownie e café',
      foto_url: null,
    })
    expect(falso.insertContatos).toHaveBeenCalledWith([
      { vendedor_id: 'v1', canal: 'whatsapp', valor: '5586999998888' },
    ])
    expect(falso.upload).not.toHaveBeenCalled()
    expect(salvo).toBeInstanceOf(VendedorAmbulante)
    expect(salvo.id).toBe('v1')
  })

  it('envia a foto para a pasta do usuário e grava a URL pública', async () => {
    const falso = clienteFalso()
    await new SupabaseVendedorRepository(falso.client).criar(vendedor, contatos, foto)

    const [caminho, , opcoes] = falso.upload.mock.calls[0] as unknown as [string, Blob, object]
    expect(caminho).toMatch(/^u1\/perfil-\d+\.jpg$/)
    expect(opcoes).toEqual({ contentType: 'image/jpeg' })
    expect(falso.insertVendedor).toHaveBeenCalledWith(
      expect.objectContaining({
        foto_url: `https://exemplo.supabase.co/storage/v1/object/public/fotos/${caminho}`,
      }),
    )
  })

  it('recusa foto que não é JPEG, PNG ou WebP sem gravar nada', async () => {
    const falso = clienteFalso()
    const gif = new Blob(['gif'], { type: 'image/gif' })
    const erro = await new SupabaseVendedorRepository(falso.client)
      .criar(vendedor, contatos, gif)
      .catch((e) => e)

    expect(erro).toBeInstanceOf(Falha)
    expect(erro.codigo).toBe('foto-formato-invalido')
    expect(falso.upload).not.toHaveBeenCalled()
    expect(falso.insertVendedor).not.toHaveBeenCalled()
  })

  it('avisa quando a conta já tem perfil de vendedor (RN02) e apaga a foto enviada', async () => {
    const falso = clienteFalso({ vendedor: { data: null, error: { code: '23505' } } })
    const erro = await new SupabaseVendedorRepository(falso.client)
      .criar(vendedor, contatos, foto)
      .catch((e) => e)

    expect(erro).toBeInstanceOf(Falha)
    expect(erro.codigo).toBe('perfil-ja-existe')
    expect(falso.remove).toHaveBeenCalledOnce()
    expect(falso.insertContatos).not.toHaveBeenCalled()
  })

  it('desfaz o perfil e a foto se os contatos não forem salvos (RN06)', async () => {
    const falso = clienteFalso({ contatos: { error: { code: '23514' } } })
    const erro = await new SupabaseVendedorRepository(falso.client)
      .criar(vendedor, contatos, foto)
      .catch((e) => e)

    expect(erro).toBeInstanceOf(Falha)
    expect(erro.codigo).toBe('dados-invalidos')
    expect(falso.deleteVendedor).toHaveBeenCalledOnce()
    expect(falso.eqDelete).toHaveBeenCalledWith('id', 'v1')
    expect(falso.remove).toHaveBeenCalledOnce()
  })

  it('não grava o vendedor se a foto não subir', async () => {
    const falso = clienteFalso({ upload: { error: { message: 'Payload too large' } } })
    const erro = await new SupabaseVendedorRepository(falso.client)
      .criar(vendedor, contatos, foto)
      .catch((e) => e)

    expect(erro).toBeInstanceOf(Falha)
    expect(erro.codigo).toBe('foto-nao-enviada')
    expect(falso.insertVendedor).not.toHaveBeenCalled()
  })
})
