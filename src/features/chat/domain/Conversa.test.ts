import { describe, expect, it } from 'vitest'
import { Conversa } from './Conversa'
import { Mensagem } from './Mensagem'

const criadaEm = new Date('2026-11-23T10:00:00Z')

function conversa(ultima: Mensagem | null = null) {
  return new Conversa(
    'c1',
    'perfil-ana',
    'Ana',
    'v1',
    'perfil-leo',
    'Café do Leo',
    criadaEm,
    ultima,
  )
}

describe('Conversa (US18)', () => {
  it('mostra o nome do vendedor para o consumidor e o do consumidor para o vendedor', () => {
    expect(conversa().nomeDaOutraPessoa('perfil-ana')).toBe('Café do Leo')
    expect(conversa().nomeDaOutraPessoa('perfil-leo')).toBe('Ana')
  })

  it('a última atividade é a última mensagem, ou a abertura se não há mensagens', () => {
    const enviadaEm = new Date('2026-11-23T11:30:00Z')
    const ultima = new Mensagem('m1', 'c1', 'perfil-ana', 'Oi', enviadaEm)

    expect(conversa().ultimaAtividade()).toEqual(criadaEm)
    expect(conversa(ultima).ultimaAtividade()).toEqual(enviadaEm)
  })
})

describe('Mensagem (US18)', () => {
  it('sabe se foi escrita por um perfil', () => {
    const mensagem = new Mensagem('m1', 'c1', 'perfil-ana', 'Oi', criadaEm)

    expect(mensagem.ehDe('perfil-ana')).toBe(true)
    expect(mensagem.ehDe('perfil-leo')).toBe(false)
  })
})
