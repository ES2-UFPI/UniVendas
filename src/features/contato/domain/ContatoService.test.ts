import { describe, expect, it } from 'vitest'
import { Contato } from '../../vendedores/domain/Contato'
import { ContatoService, MENSAGEM_PADRAO, montarMensagem } from './ContatoService'
import { TelefoneContato } from './TelefoneContato'
import { WhatsAppContato } from './WhatsAppContato'

describe('montarMensagem', () => {
  it('usa a mensagem padrão quando não há item', () => {
    expect(montarMensagem()).toBe('Oi! Vi seu anúncio no UniVendas')
  })

  it('acrescenta o nome do item quando há', () => {
    expect(montarMensagem('Brownie')).toBe(
      'Oi! Vi seu anúncio no UniVendas e tenho interesse em: Brownie',
    )
  })

  it('ignora nome de item vazio', () => {
    expect(montarMensagem('   ')).toBe(MENSAGEM_PADRAO)
  })
})

describe('WhatsAppContato', () => {
  it('monta o link wa.me com a mensagem codificada', () => {
    expect(new WhatsAppContato().gerarLink('5586999990000', 'Oi! Tudo bem?')).toBe(
      'https://wa.me/5586999990000?text=Oi!%20Tudo%20bem%3F',
    )
  })

  it('tira o que não é dígito do número', () => {
    expect(new WhatsAppContato().gerarLink('+55 (86) 99999-0000', 'Oi')).toBe(
      'https://wa.me/5586999990000?text=Oi',
    )
  })
})

describe('TelefoneContato', () => {
  it('monta o link tel: no formato internacional', () => {
    expect(new TelefoneContato().gerarLink('5586999990000')).toBe('tel:+5586999990000')
  })
})

describe('ContatoService', () => {
  const service = new ContatoService()

  it('gera o link do WhatsApp com a mensagem e o item', () => {
    const link = service.gerarLink(new Contato('whatsapp', '5586999990000'), 'Brownie')
    expect(link).toBe(
      'https://wa.me/5586999990000?text=' +
        encodeURIComponent('Oi! Vi seu anúncio no UniVendas e tenho interesse em: Brownie'),
    )
  })

  it('gera o link do discador para telefone', () => {
    expect(service.gerarLink(new Contato('telefone', '5586999990000'))).toBe('tel:+5586999990000')
  })

  it('dá o rótulo do botão de cada canal', () => {
    expect(service.rotulo(new Contato('whatsapp', '5586999990000'))).toBe('WhatsApp')
    expect(service.rotulo(new Contato('telefone', '5586999990000'))).toBe('Ligar')
  })

  it('recusa canal sem estratégia registrada', () => {
    const soWhatsApp = new ContatoService(new Map([['whatsapp', new WhatsAppContato()]]))
    expect(() => soWhatsApp.gerarLink(new Contato('telefone', '5586999990000'))).toThrow(
      'Canal de contato sem suporte: telefone',
    )
  })
})
