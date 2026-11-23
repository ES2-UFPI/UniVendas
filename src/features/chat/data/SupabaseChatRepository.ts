import type { SupabaseClient } from '@supabase/supabase-js'
import { Falha } from '../../../core/falha'
import { SupabaseService } from '../../../core/supabaseService'
import type { Database } from '../../../types/database.types'
import type { Unsubscribe } from '../../presenca/domain/PresencaRepository'
import type { ChatRepository } from '../domain/ChatRepository'
import { Conversa } from '../domain/Conversa'
import { Mensagem } from '../domain/Mensagem'
import { validarMensagem } from '../domain/validacoesMensagem'

const MENSAGEM_ABRIR = 'Não foi possível abrir a conversa. Tente de novo.'
const MENSAGEM_LISTAR = 'Não foi possível carregar as conversas. Tente de novo.'
const MENSAGEM_MENSAGENS = 'Não foi possível carregar as mensagens. Tente de novo.'
const MENSAGEM_ENVIAR = 'Não foi possível enviar a mensagem. Tente de novo.'
const NOME_CONSUMIDOR = 'Consumidor'
const NOME_VENDEDOR = 'Vendedor'

/** Colunas de `mensagens` que viram a entidade `Mensagem`. */
const COLUNAS_MENSAGEM = 'id, conversa_id, autor_id, texto, enviada_em'

/**
 * A conversa com o nome dos dois lados: o do consumidor vem de `perfis` (o vendedor só lê o perfil
 * de quem conversa com ele, pela RLS) e o do vendedor vem de `vendedores`.
 */
const COLUNAS_CONVERSA =
  'id, consumidor_id, vendedor_id, criada_em, perfis(nome), vendedores(nome_exibicao, perfil_id)'

/** Na lista, cada conversa vem também com a última mensagem. */
const COLUNAS_LISTA = `${COLUNAS_CONVERSA}, mensagens(${COLUNAS_MENSAGEM})`

interface LinhaMensagem {
  id: string
  conversa_id: string
  autor_id: string
  texto: string
  enviada_em: string
}

interface LinhaConversa {
  id: string
  consumidor_id: string
  vendedor_id: string
  criada_em: string
  perfis: { nome: string } | null
  vendedores: { nome_exibicao: string; perfil_id: string } | null
  mensagens?: LinhaMensagem[]
}

function paraMensagem(linha: LinhaMensagem): Mensagem {
  return new Mensagem(
    linha.id,
    linha.conversa_id,
    linha.autor_id,
    linha.texto,
    new Date(linha.enviada_em),
  )
}

function paraConversa(linha: LinhaConversa): Conversa {
  const ultima = linha.mensagens?.[0]
  return new Conversa(
    linha.id,
    linha.consumidor_id,
    linha.perfis?.nome.trim() || NOME_CONSUMIDOR,
    linha.vendedor_id,
    linha.vendedores?.perfil_id ?? '',
    linha.vendedores?.nome_exibicao ?? NOME_VENDEDOR,
    new Date(linha.criada_em),
    ultima ? paraMensagem(ultima) : null,
  )
}

/** Traduz os códigos de erro do PostgreSQL para mensagens que o usuário entende. */
function paraFalha(erro: { code?: string }, mensagemPadrao: string): Falha {
  switch (erro.code) {
    case '42501': // a RLS recusou: não participa da conversa, ou o vendedor é o próprio usuário
      return new Falha('Você não pode conversar aqui.', 'sem-permissao')
    case '23503': // chave estrangeira: o vendedor ou a conversa não existem mais
      return new Falha('Esta conversa não existe mais.', 'nao-encontrada')
    case '23514': // check do texto (RN23)
      return new Falha('A mensagem pode ter de 1 a 1000 caracteres.', 'texto-invalido')
    default:
      return new Falha(mensagemPadrao, erro.code ?? 'desconhecido')
  }
}

export class SupabaseChatRepository implements ChatRepository {
  private readonly client: SupabaseClient<Database>
  private canais = 0

  // O cliente pode ser passado de fora para os testes; no app, usa o do Singleton.
  constructor(client: SupabaseClient<Database> = SupabaseService.getInstance().client) {
    this.client = client
  }

  /** Perfil de quem está logado. O servidor confere de novo, pela RLS; aqui é só para montar o pedido. */
  private async perfilLogado(): Promise<string> {
    const { data } = await this.client.auth.getSession()
    const perfilId = data.session?.user.id
    if (!perfilId) throw new Falha('Entre na sua conta para usar o chat.', 'sem-sessao')
    return perfilId
  }

  private async buscarConversa(consumidorId: string, vendedorId: string): Promise<Conversa | null> {
    const { data, error } = await this.client
      .from('conversas')
      .select(COLUNAS_CONVERSA)
      .eq('consumidor_id', consumidorId)
      .eq('vendedor_id', vendedorId)
      .maybeSingle()
    if (error) throw paraFalha(error, MENSAGEM_ABRIR)
    return data ? paraConversa(data as unknown as LinhaConversa) : null
  }

  async abrirConversa(vendedorId: string): Promise<Conversa> {
    const consumidorId = await this.perfilLogado()

    // Uma conversa por par (RN22): se já existe, reabre a mesma.
    const existente = await this.buscarConversa(consumidorId, vendedorId)
    if (existente) return existente

    const { data, error } = await this.client
      .from('conversas')
      .insert({ consumidor_id: consumidorId, vendedor_id: vendedorId })
      .select(COLUNAS_CONVERSA)
      .single()

    if (error?.code === '23505') {
      // Outra aba criou a mesma conversa entre a busca e o insert: usa a que ficou gravada.
      const criada = await this.buscarConversa(consumidorId, vendedorId)
      if (criada) return criada
    }
    if (error?.code === '42501') {
      throw new Falha(
        'Você não pode abrir uma conversa com o seu próprio perfil de vendedor.',
        'conversa-consigo',
      )
    }
    if (error || !data) throw paraFalha(error ?? {}, MENSAGEM_ABRIR)
    return paraConversa(data as unknown as LinhaConversa)
  }

  async listarConversas(): Promise<Conversa[]> {
    // A RLS só devolve as conversas de quem está logado, dos dois lados (RN23).
    // De cada conversa vem só a mensagem mais recente.
    const { data, error } = await this.client
      .from('conversas')
      .select(COLUNAS_LISTA)
      .order('enviada_em', { referencedTable: 'mensagens', ascending: false })
      .limit(1, { referencedTable: 'mensagens' })
    if (error) throw paraFalha(error, MENSAGEM_LISTAR)

    return (data as unknown as LinhaConversa[])
      .map(paraConversa)
      .sort((a, b) => b.ultimaAtividade().getTime() - a.ultimaAtividade().getTime())
  }

  async listarMensagens(conversaId: string): Promise<Mensagem[]> {
    const { data, error } = await this.client
      .from('mensagens')
      .select(COLUNAS_MENSAGEM)
      .eq('conversa_id', conversaId)
      .order('enviada_em', { ascending: true })
    if (error) throw paraFalha(error, MENSAGEM_MENSAGENS)
    return data.map(paraMensagem)
  }

  async enviar(conversaId: string, texto: string): Promise<Mensagem> {
    const erro = validarMensagem(texto)
    if (erro) throw new Falha(erro, 'texto-invalido')

    const autorId = await this.perfilLogado()

    // A hora do envio é preenchida pelo banco, então a ordem das mensagens não depende do relógio do celular.
    const { data, error } = await this.client
      .from('mensagens')
      .insert({ conversa_id: conversaId, autor_id: autorId, texto: texto.trim() })
      .select(COLUNAS_MENSAGEM)
      .single()
    if (error) throw paraFalha(error, MENSAGEM_ENVIAR)
    return paraMensagem(data)
  }

  observarMensagens(conversaId: string, aoReceber: (mensagem: Mensagem) => void): Unsubscribe {
    let cancelado = false

    // O Realtime manda cada mensagem nova da conversa, já com a RLS aplicada: só os participantes recebem.
    const canal = this.client
      .channel(`mensagens-${conversaId}-${++this.canais}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `conversa_id=eq.${conversaId}`,
        },
        (evento: { new: LinhaMensagem }) => {
          if (!cancelado) aoReceber(paraMensagem(evento.new))
        },
      )
      .subscribe()

    return () => {
      cancelado = true
      void this.client.removeChannel(canal)
    }
  }
}
