import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { Database } from '../../../types/database.types'
import type { Mensagem } from '../domain/Mensagem'
import { SupabaseChatRepository } from './SupabaseChatRepository'

type Resposta = { data: unknown; error: unknown }

const ok = (data: unknown): Resposta => ({ data, error: null })
const erro = (code: string): Resposta => ({ data: null, error: { code, message: code } })

/**
 * Consulta falsa do Supabase: cada método devolve a própria consulta, e ela termina com a resposta
 * combinada (com `await`, `maybeSingle()` ou `single()`). Guarda as chamadas para os testes conferirem.
 */
function consulta(resposta: Resposta) {
  const q = {
    select: vi.fn(() => q),
    insert: vi.fn(() => q),
    eq: vi.fn(() => q),
    order: vi.fn(() => q),
    limit: vi.fn(() => q),
    maybeSingle: vi.fn(() => Promise.resolve(resposta)),
    single: vi.fn(() => Promise.resolve(resposta)),
    then: (resolver: (r: Resposta) => unknown) => Promise.resolve(resposta).then(resolver),
  }
  return q
}

/** Cliente falso: `consultas` são as respostas de cada `from()`, na ordem. Nada acessa o Supabase de verdade. */
function clienteFalso(
  consultas: ReturnType<typeof consulta>[] = [],
  perfilId: string | null = 'ana',
) {
  let aoEvento: (evento: { new: unknown }) => void = () => {}
  const canal = {
    on: vi.fn((_tipo: string, _filtro: unknown, callback: (evento: { new: unknown }) => void) => {
      aoEvento = callback
      return canal
    }),
    subscribe: vi.fn(() => canal),
  }
  const fila = [...consultas]
  const client = {
    from: vi.fn(() => fila.shift()),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: perfilId ? { user: { id: perfilId } } : null },
      }),
    },
    channel: vi.fn(() => canal),
    removeChannel: vi.fn(),
  }
  const repo = new SupabaseChatRepository(client as unknown as SupabaseClient<Database>)
  return { repo, client, canal, emitir: (linha: unknown) => aoEvento({ new: linha }) }
}

async function falhaDe(promessa: Promise<unknown>) {
  const e = await promessa.catch((x) => x)
  expect(e).toBeInstanceOf(Falha)
  return e as Falha
}

const linhaMensagem = (id: string, autor: string, texto: string, enviadaEm: string) => ({
  id,
  conversa_id: 'c1',
  autor_id: autor,
  texto,
  enviada_em: enviadaEm,
})

const linhaConversa = (id: string, criadaEm: string, mensagens?: unknown[]) => ({
  id,
  consumidor_id: 'ana',
  vendedor_id: 'v1',
  criada_em: criadaEm,
  perfis: { nome: 'Ana' },
  vendedores: { nome_exibicao: 'Café do Leo', perfil_id: 'leo' },
  ...(mensagens ? { mensagens } : {}),
})

describe('SupabaseChatRepository.abrirConversa', () => {
  it('devolve a conversa que já existe com o vendedor, sem criar outra (RN22)', async () => {
    const busca = consulta(ok(linhaConversa('c1', '2026-11-23T10:00:00Z')))
    const { repo, client } = clienteFalso([busca])

    const conversa = await repo.abrirConversa('v1')

    expect(client.from).toHaveBeenCalledTimes(1)
    expect(client.from).toHaveBeenCalledWith('conversas')
    expect(busca.eq).toHaveBeenCalledWith('consumidor_id', 'ana')
    expect(busca.eq).toHaveBeenCalledWith('vendedor_id', 'v1')
    expect(conversa.id).toBe('c1')
    expect(conversa.nomeDaOutraPessoa('ana')).toBe('Café do Leo')
  })

  it('cria a conversa em nome de quem está logado quando ainda não existe', async () => {
    const busca = consulta(ok(null))
    const criacao = consulta(ok(linhaConversa('c2', '2026-11-23T10:00:00Z')))
    const { repo } = clienteFalso([busca, criacao])

    const conversa = await repo.abrirConversa('v1')

    expect(criacao.insert).toHaveBeenCalledWith({ consumidor_id: 'ana', vendedor_id: 'v1' })
    expect(conversa.id).toBe('c2')
  })

  it('se outra aba criou a conversa ao mesmo tempo, usa a que ficou gravada', async () => {
    const { repo } = clienteFalso([
      consulta(ok(null)),
      consulta(erro('23505')),
      consulta(ok(linhaConversa('c3', '2026-11-23T10:00:00Z'))),
    ])

    await expect(repo.abrirConversa('v1')).resolves.toMatchObject({ id: 'c3' })
  })

  it('avisa quando o vendedor é o próprio usuário (RN22)', async () => {
    const { repo } = clienteFalso([consulta(ok(null)), consulta(erro('42501'))])

    const falha = await falhaDe(repo.abrirConversa('v1'))

    expect(falha.codigo).toBe('conversa-consigo')
  })

  it('pede para entrar na conta quando não há sessão', async () => {
    const { repo, client } = clienteFalso([], null)

    const falha = await falhaDe(repo.abrirConversa('v1'))

    expect(falha.codigo).toBe('sem-sessao')
    expect(client.from).not.toHaveBeenCalled()
  })
})

describe('SupabaseChatRepository.buscarConversa', () => {
  it('busca a conversa pelo id, com o nome dos dois lados', async () => {
    const busca = consulta(ok(linhaConversa('c1', '2026-11-23T10:00:00Z')))
    const { repo } = clienteFalso([busca])

    const conversa = await repo.buscarConversa('c1')

    expect(busca.eq).toHaveBeenCalledWith('id', 'c1')
    expect(conversa?.nomeDaOutraPessoa('leo')).toBe('Ana')
  })

  it('devolve null quando a conversa não existe ou não é de quem está logado', async () => {
    const { repo } = clienteFalso([consulta(ok(null))])

    await expect(repo.buscarConversa('c9')).resolves.toBeNull()
  })
})

describe('SupabaseChatRepository.listarConversas', () => {
  it('traz só a última mensagem de cada conversa e ordena pela atividade mais recente', async () => {
    const lista = consulta(
      ok([
        linhaConversa('antiga', '2026-11-20T10:00:00Z', [
          linhaMensagem('m1', 'ana', 'Oi', '2026-11-20T10:05:00Z'),
        ]),
        linhaConversa('sem-mensagem', '2026-11-22T09:00:00Z', []),
        linhaConversa('recente', '2026-11-19T10:00:00Z', [
          linhaMensagem('m2', 'leo', 'Tem sim!', '2026-11-23T08:00:00Z'),
        ]),
      ]),
    )
    const { repo } = clienteFalso([lista])

    const conversas = await repo.listarConversas()

    expect(lista.order).toHaveBeenCalledWith('enviada_em', {
      referencedTable: 'mensagens',
      ascending: false,
    })
    expect(lista.limit).toHaveBeenCalledWith(1, { referencedTable: 'mensagens' })
    expect(conversas.map((c) => c.id)).toEqual(['recente', 'sem-mensagem', 'antiga'])
    expect(conversas[0].ultimaMensagem?.texto).toBe('Tem sim!')
    expect(conversas[1].ultimaMensagem).toBeNull()
  })

  it('usa nomes padrão quando o nome não vem', async () => {
    const linha = { ...linhaConversa('c1', '2026-11-23T10:00:00Z', []), perfis: { nome: ' ' } }
    const { repo } = clienteFalso([consulta(ok([{ ...linha, vendedores: null }]))])

    const [conversa] = await repo.listarConversas()

    expect(conversa.nomeConsumidor).toBe('Consumidor')
    expect(conversa.nomeVendedor).toBe('Vendedor')
  })

  it('lança Falha quando a leitura falha', async () => {
    const { repo } = clienteFalso([consulta(erro('XX000'))])

    const falha = await falhaDe(repo.listarConversas())

    expect(falha.mensagem).toBe('Não foi possível carregar as conversas. Tente de novo.')
  })
})

describe('SupabaseChatRepository.listarMensagens', () => {
  it('lista as mensagens da conversa, da mais antiga para a mais nova', async () => {
    const lista = consulta(
      ok([
        linhaMensagem('m1', 'ana', 'Oi', '2026-11-23T10:00:00Z'),
        linhaMensagem('m2', 'leo', 'Olá!', '2026-11-23T10:01:00Z'),
      ]),
    )
    const { repo, client } = clienteFalso([lista])

    const mensagens = await repo.listarMensagens('c1')

    expect(client.from).toHaveBeenCalledWith('mensagens')
    expect(lista.eq).toHaveBeenCalledWith('conversa_id', 'c1')
    expect(lista.order).toHaveBeenCalledWith('enviada_em', { ascending: true })
    expect(mensagens.map((m) => m.texto)).toEqual(['Oi', 'Olá!'])
    expect(mensagens[0].enviadaEm).toEqual(new Date('2026-11-23T10:00:00Z'))
  })

  it('lança Falha quando a leitura falha', async () => {
    const { repo } = clienteFalso([consulta(erro('XX000'))])

    await falhaDe(repo.listarMensagens('c1'))
  })
})

describe('SupabaseChatRepository.enviar', () => {
  it('grava o texto sem os espaços das pontas, em nome de quem está logado', async () => {
    const insercao = consulta(ok(linhaMensagem('m9', 'ana', 'Oi!', '2026-11-23T10:00:00Z')))
    const { repo } = clienteFalso([insercao])

    const mensagem = await repo.enviar('c1', '  Oi!  ')

    expect(insercao.insert).toHaveBeenCalledWith({
      conversa_id: 'c1',
      autor_id: 'ana',
      texto: 'Oi!',
    })
    expect(mensagem.id).toBe('m9')
  })

  it('não chama o servidor quando o texto é inválido (RN23)', async () => {
    const { repo, client } = clienteFalso()

    const vazio = await falhaDe(repo.enviar('c1', '   '))
    const longo = await falhaDe(repo.enviar('c1', 'a'.repeat(1001)))

    expect(vazio.codigo).toBe('texto-invalido')
    expect(longo.codigo).toBe('texto-invalido')
    expect(client.from).not.toHaveBeenCalled()
  })

  it('avisa quando quem envia não participa da conversa (RN23)', async () => {
    const { repo } = clienteFalso([consulta(erro('42501'))])

    const falha = await falhaDe(repo.enviar('c1', 'Oi'))

    expect(falha.codigo).toBe('sem-permissao')
  })

  it('avisa quando a conversa não existe mais', async () => {
    const { repo } = clienteFalso([consulta(erro('23503'))])

    const falha = await falhaDe(repo.enviar('c1', 'Oi'))

    expect(falha.codigo).toBe('nao-encontrada')
  })
})

describe('SupabaseChatRepository.observarMensagens (Observer)', () => {
  it('assina só as mensagens novas desta conversa no Realtime', () => {
    const { repo, canal } = clienteFalso()

    repo.observarMensagens('c1', vi.fn())

    expect(canal.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'mensagens', filter: 'conversa_id=eq.c1' },
      expect.any(Function),
    )
    expect(canal.subscribe).toHaveBeenCalledTimes(1)
  })

  it('avisa quem se inscreveu com a mensagem nova', () => {
    const { repo, emitir } = clienteFalso()
    const aoReceber = vi.fn()
    repo.observarMensagens('c1', aoReceber)

    emitir(linhaMensagem('m5', 'leo', 'Chegou agora', '2026-11-23T10:00:00Z'))

    expect(aoReceber).toHaveBeenCalledTimes(1)
    const mensagem = aoReceber.mock.calls[0][0] as Mensagem
    expect(mensagem.texto).toBe('Chegou agora')
    expect(mensagem.ehDe('leo')).toBe(true)
  })

  it('cancela a inscrição: remove o canal e para de avisar', () => {
    const { repo, client, canal, emitir } = clienteFalso()
    const aoReceber = vi.fn()
    const cancelar = repo.observarMensagens('c1', aoReceber)

    cancelar()
    emitir(linhaMensagem('m5', 'leo', 'Tarde demais', '2026-11-23T10:00:00Z'))

    expect(client.removeChannel).toHaveBeenCalledWith(canal)
    expect(aoReceber).not.toHaveBeenCalled()
  })

  it('cada inscrição abre um canal com nome próprio', () => {
    const { repo, client } = clienteFalso()

    repo.observarMensagens('c1', vi.fn())
    repo.observarMensagens('c1', vi.fn())

    expect(client.channel).toHaveBeenNthCalledWith(1, 'mensagens-c1-1')
    expect(client.channel).toHaveBeenNthCalledWith(2, 'mensagens-c1-2')
  })
})
