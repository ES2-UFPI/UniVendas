import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { Database } from '../../../types/database.types'
import { Contato } from '../../vendedores/domain/Contato'
import { Presenca } from '../domain/Presenca'
import { SupabasePresencaRepository } from './SupabasePresencaRepository'

const agora = new Date('2026-10-24T12:00:00Z')
const haMinutos = (minutos: number) => new Date(agora.getTime() - minutos * 60 * 1000).toISOString()

function linha(
  id: string,
  nome: string | null,
  sinal: string,
  referencia: string | null = null,
  contatos: { canal: string; valor: string }[] = [],
) {
  return {
    vendedor_id: id,
    latitude: -5.0577,
    longitude: -42.7955,
    ponto_escolhido: false,
    referencia,
    ultimo_sinal_em: sinal,
    vendedores: nome === null ? null : { nome_exibicao: nome, contatos },
  }
}

type Resposta = { data: unknown; error: unknown }

/** Cliente falso: só tem o que o repositório usa. Nenhum teste acessa o Supabase de verdade. */
function clienteFalso(select = vi.fn().mockResolvedValue({ data: [], error: null })) {
  let aoEvento: () => void = () => {}
  const canal = {
    on: vi.fn((_tipo: string, _filtro: unknown, callback: () => void) => {
      aoEvento = callback
      return canal
    }),
    subscribe: vi.fn(() => canal),
  }
  const client = {
    from: vi.fn(() => ({ select })),
    channel: vi.fn(() => canal),
    removeChannel: vi.fn(),
  }
  const repo = new SupabasePresencaRepository(
    client as unknown as SupabaseClient<Database>,
    () => agora,
  )
  return { repo, client, canal, select, emitir: () => aoEvento() }
}

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0))

describe('SupabasePresencaRepository.listarAtivos', () => {
  it('lê a presença com o nome do vendedor e devolve entidades Presenca', async () => {
    const { repo, client, select } = clienteFalso(
      vi.fn().mockResolvedValue({
        data: [linha('v1', 'Brownies da Ana', haMinutos(5), 'em frente ao RU')],
        error: null,
      } satisfies Resposta),
    )

    const ativos = await repo.listarAtivos()

    expect(client.from).toHaveBeenCalledWith('presenca')
    expect(select).toHaveBeenCalledWith(
      expect.stringContaining('vendedores(nome_exibicao, contatos(canal, valor))'),
    )
    expect(ativos).toHaveLength(1)
    expect(ativos[0]).toBeInstanceOf(Presenca)
    expect(ativos[0]).toMatchObject({
      vendedorId: 'v1',
      nomeVendedor: 'Brownies da Ana',
      posicao: { latitude: -5.0577, longitude: -42.7955 },
      pontoEscolhido: false,
      referencia: 'em frente ao RU',
    })
    expect(ativos[0].ultimoSinalEm).toEqual(new Date(haMinutos(5)))
  })

  it('traz os contatos do vendedor e ignora canal que o app não conhece (US07)', async () => {
    const { repo } = clienteFalso(
      vi.fn().mockResolvedValue({
        data: [
          linha('v1', 'Brownies da Ana', haMinutos(5), null, [
            { canal: 'whatsapp', valor: '5586999990000' },
            { canal: 'telefone', valor: '5586988880000' },
            { canal: 'instagram', valor: 'ana.brownies' },
          ]),
          linha('v2', 'Café do Leo', haMinutos(5)),
        ],
        error: null,
      }),
    )

    const [ana, leo] = await repo.listarAtivos()

    expect(ana.contatos).toEqual([
      new Contato('whatsapp', '5586999990000'),
      new Contato('telefone', '5586988880000'),
    ])
    expect(leo.contatos).toEqual([])
  })

  it('não devolve quem está há 30 minutos ou mais sem sinal (RN16)', async () => {
    const { repo } = clienteFalso(
      vi.fn().mockResolvedValue({
        data: [
          linha('v1', 'Brownies da Ana', haMinutos(29)),
          linha('v2', 'Café do Leo', haMinutos(30)),
          linha('v3', 'Pastel do Zé', haMinutos(120)),
        ],
        error: null,
      }),
    )

    const ativos = await repo.listarAtivos()

    expect(ativos.map((p) => p.vendedorId)).toEqual(['v1'])
  })

  it('usa um nome padrão se o nome do vendedor não vier', async () => {
    const { repo } = clienteFalso(
      vi.fn().mockResolvedValue({ data: [linha('v1', null, haMinutos(1))], error: null }),
    )

    const [presenca] = await repo.listarAtivos()

    expect(presenca.nomeVendedor).toBe('Vendedor')
  })

  it('lança Falha quando a leitura não funciona', async () => {
    const { repo } = clienteFalso(
      vi.fn().mockResolvedValue({ data: null, error: { code: '42501', message: 'negado' } }),
    )

    const erro = await repo.listarAtivos().catch((e) => e)

    expect(erro).toBeInstanceOf(Falha)
    expect(erro.codigo).toBe('42501')
    expect(erro.mensagem).toBe('Não foi possível carregar os vendedores do mapa. Tente de novo.')
  })
})

describe('SupabasePresencaRepository.observarAtivos (Observer)', () => {
  it('assina as mudanças da tabela presenca no Realtime', () => {
    const { repo, canal } = clienteFalso()

    repo.observarAtivos(vi.fn())

    expect(canal.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'presenca' },
      expect.any(Function),
    )
    expect(canal.subscribe).toHaveBeenCalledTimes(1)
  })

  it('a cada mudança, busca a lista de novo e avisa quem se inscreveu', async () => {
    const select = vi
      .fn()
      .mockResolvedValue({ data: [linha('v1', 'Brownies da Ana', haMinutos(1))], error: null })
    const { repo, emitir } = clienteFalso(select)
    const callback = vi.fn()
    repo.observarAtivos(callback)

    emitir()
    await esperar()

    expect(select).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback.mock.calls[0][0].map((p: Presenca) => p.vendedorId)).toEqual(['v1'])
  })

  it('cancela a inscrição: remove o canal e para de avisar', async () => {
    const { repo, client, canal, emitir } = clienteFalso()
    const callback = vi.fn()
    const cancelar = repo.observarAtivos(callback)

    cancelar()
    emitir()
    await esperar()

    expect(client.removeChannel).toHaveBeenCalledWith(canal)
    expect(callback).not.toHaveBeenCalled()
  })

  it('só a busca mais recente vale, mesmo se a resposta antiga chegar depois', async () => {
    const respostas: Array<(r: Resposta) => void> = []
    const select = vi.fn(() => new Promise<Resposta>((resolver) => respostas.push(resolver)))
    const { repo, emitir } = clienteFalso(select)
    const callback = vi.fn()
    repo.observarAtivos(callback)

    emitir() // busca 1
    emitir() // busca 2
    respostas[1]({ data: [linha('v2', 'Café do Leo', haMinutos(1))], error: null })
    await esperar()
    respostas[0]({ data: [linha('v1', 'Brownies da Ana', haMinutos(1))], error: null })
    await esperar()

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback.mock.calls[0][0].map((p: Presenca) => p.vendedorId)).toEqual(['v2'])
  })

  it('mantém a lista anterior, sem avisar nem quebrar, quando a atualização falha', async () => {
    const select = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } })
    const { repo, emitir } = clienteFalso(select)
    const callback = vi.fn()
    repo.observarAtivos(callback)

    emitir()
    await esperar()

    expect(select).toHaveBeenCalledTimes(1)
    expect(callback).not.toHaveBeenCalled()
  })

  it('cada inscrição abre um canal com nome próprio', () => {
    const { repo, client } = clienteFalso()

    repo.observarAtivos(vi.fn())
    repo.observarAtivos(vi.fn())

    const nomes = client.channel.mock.calls.map((chamada) => (chamada as unknown[])[0])
    expect(new Set(nomes).size).toBe(2)
  })
})

describe('SupabasePresencaRepository.minhaPresenca', () => {
  function clienteDoVendedor(
    resposta: Resposta,
    sessao: { user: { id: string } } | null = { user: { id: 'perfil-1' } },
  ) {
    const maybeSingle = vi.fn().mockResolvedValue(resposta)
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const client = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: sessao } }) },
      from: vi.fn(() => ({ select })),
    }
    const repo = new SupabasePresencaRepository(
      client as unknown as SupabaseClient<Database>,
      () => agora,
    )
    return { repo, client, eq }
  }

  it('devolve a presença do vendedor logado, filtrando pelo perfil da sessão', async () => {
    const { repo, client, eq } = clienteDoVendedor({
      data: linha('v1', 'Ana', haMinutos(2), 'em frente ao RU'),
      error: null,
    })

    const presenca = await repo.minhaPresenca()

    expect(client.from).toHaveBeenCalledWith('presenca')
    expect(eq).toHaveBeenCalledWith('vendedores.perfil_id', 'perfil-1')
    expect(presenca).toBeInstanceOf(Presenca)
    expect(presenca?.referencia).toBe('em frente ao RU')
  })

  it('devolve null quando o vendedor não está ativo', async () => {
    const { repo } = clienteDoVendedor({ data: null, error: null })

    await expect(repo.minhaPresenca()).resolves.toBeNull()
  })

  it('devolve null quando o último sinal tem mais de 30 minutos', async () => {
    const { repo } = clienteDoVendedor({ data: linha('v1', 'Ana', haMinutos(31)), error: null })

    await expect(repo.minhaPresenca()).resolves.toBeNull()
  })

  it('devolve null, sem consultar o banco, quando não há sessão', async () => {
    const { repo, client } = clienteDoVendedor({ data: null, error: null }, null)

    await expect(repo.minhaPresenca()).resolves.toBeNull()
    expect(client.from).not.toHaveBeenCalled()
  })

  it('lança Falha quando a leitura falha', async () => {
    const { repo } = clienteDoVendedor({ data: null, error: { code: 'XX000', message: 'boom' } })

    const erro = await repo.minhaPresenca().catch((e) => e)

    expect(erro).toBeInstanceOf(Falha)
    expect(erro.codigo).toBe('XX000')
  })
})
