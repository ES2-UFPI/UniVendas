import { describe, expect, it } from 'vitest'
import { Falha } from '../../../core/falha'
import { VendedorAmbulante } from './Vendedor'
import { VendedorFactory, type VendedorRow } from './VendedorFactory'

const linha: VendedorRow = {
  id: 'v1',
  perfil_id: 'u1',
  tipo: 'ambulante',
  nome_exibicao: 'Brownies da Ana',
  descricao: null,
  foto_url: null,
  latitude: null,
  longitude: null,
  criado_em: '2026-10-20T12:00:00Z',
}

describe('VendedorFactory.criar', () => {
  it('cria um VendedorAmbulante a partir da linha do banco', () => {
    const vendedor = VendedorFactory.criar(linha)
    expect(vendedor).toBeInstanceOf(VendedorAmbulante)
    expect(vendedor.tipo).toBe('ambulante')
    expect(vendedor.id).toBe('v1')
    expect(vendedor.perfilId).toBe('u1')
    expect(vendedor.nomeExibicao).toBe('Brownies da Ana')
    expect(vendedor.descricao).toBe('')
    expect(vendedor.fotoUrl).toBeNull()
  })

  it.each(['quiosque', 'prestador'])('recusa o tipo %s, que é do incremento 2', (tipo) => {
    expect(() => VendedorFactory.criar({ ...linha, tipo })).toThrow(Falha)
  })
})

describe('VendedorFactory.doFormulario', () => {
  it('monta o ambulante e os contatos no formato 55 + DDD', () => {
    const { vendedor, contatos } = VendedorFactory.doFormulario('u1', {
      nomeExibicao: '  Brownies da Ana ',
      descricao: ' Brownie e café ',
      whatsapp: '(86) 99999-8888',
      telefone: '86 3215-1234',
    })
    expect(vendedor).toBeInstanceOf(VendedorAmbulante)
    expect(vendedor.perfilId).toBe('u1')
    expect(vendedor.nomeExibicao).toBe('Brownies da Ana')
    expect(vendedor.descricao).toBe('Brownie e café')
    expect(contatos).toEqual([
      { canal: 'whatsapp', valor: '5586999998888' },
      { canal: 'telefone', valor: '558632151234' },
    ])
  })

  it('não cria contato para o campo vazio', () => {
    const { contatos } = VendedorFactory.doFormulario('u1', {
      nomeExibicao: 'Ana',
      descricao: '',
      whatsapp: '',
      telefone: '86 3215-1234',
    })
    expect(contatos.map((c) => c.canal)).toEqual(['telefone'])
  })
})
