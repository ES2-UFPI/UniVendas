import { useEffect, useMemo, useState } from 'react'
import { Falha } from '../../../core/falha'
import { rotaConversa } from '../../../core/routes'
import { SupabaseChatRepository } from '../data/SupabaseChatRepository'
import type { ChatRepository } from '../domain/ChatRepository'
import type { Conversa } from '../domain/Conversa'

const MENSAGEM_PADRAO = 'Não foi possível carregar as conversas. Tente de novo.'

/** Uma linha da tela "Conversas": com quem é, a última mensagem e para onde o toque leva. */
export interface LinhaConversa {
  id: string
  nome: string
  /** A última mensagem, com "Você: " na frente quando foi quem está logado que escreveu. */
  ultimaMensagem: string | null
  /** Hora da última mensagem, ou da abertura da conversa se ainda não há mensagens. */
  quando: Date
  link: string
}

interface Opcoes {
  /** Perfil de quem está logado, para saber de que lado da conversa ele está. */
  perfilId: string | null
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: ChatRepository
}

/**
 * ViewModel da tela "Conversas" (US18): lista as conversas de quem está logado, como consumidor
 * e como vendedor, as mais recentes primeiro (a ordem vem do repositório).
 */
export function useConversasViewModel({ perfilId, repositorio }: Opcoes) {
  const [resultado, setResultado] = useState<{
    conversas: Conversa[]
    erro: string | null
  } | null>(null)

  const repo = useMemo<ChatRepository | null>(() => {
    try {
      return repositorio ?? new SupabaseChatRepository()
    } catch {
      return null
    }
  }, [repositorio])

  useEffect(() => {
    if (!repo) return
    let montado = true
    repo
      .listarConversas()
      .then((conversas) => {
        if (montado) setResultado({ conversas, erro: null })
      })
      .catch((e) => {
        if (montado) {
          setResultado({ conversas: [], erro: e instanceof Falha ? e.mensagem : MENSAGEM_PADRAO })
        }
      })
    return () => {
      montado = false
    }
  }, [repo])

  const linhas = useMemo<LinhaConversa[]>(
    () =>
      (resultado?.conversas ?? []).map((c) => {
        const ultima = c.ultimaMensagem
        const minha = ultima !== null && perfilId !== null && ultima.ehDe(perfilId)
        return {
          id: c.id,
          nome: perfilId ? c.nomeDaOutraPessoa(perfilId) : c.nomeVendedor,
          ultimaMensagem: ultima ? `${minha ? 'Você: ' : ''}${ultima.texto}` : null,
          quando: c.ultimaAtividade(),
          link: rotaConversa(c.id),
        }
      }),
    [resultado, perfilId],
  )

  return {
    conversas: linhas,
    carregando: repo !== null && resultado === null,
    erro: repo === null ? MENSAGEM_PADRAO : (resultado?.erro ?? null),
  }
}
