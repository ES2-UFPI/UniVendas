import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Falha } from '../../../core/falha'
import { rotaConversa } from '../../../core/routes'
import { SupabaseChatRepository } from '../data/SupabaseChatRepository'
import type { ChatRepository } from '../domain/ChatRepository'

const MENSAGEM_PADRAO = 'Não foi possível abrir a conversa. Tente de novo.'

interface Opcoes {
  /** Vendedor com quem a conversa vai ser aberta. */
  vendedorId: string
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: ChatRepository
}

/**
 * ViewModel do botão "Chat" (US18): abre a conversa com o vendedor, ou reabre a que já existe
 * (uma por par, RN22), e leva para a tela da conversa.
 */
export function useBotaoChatViewModel({ vendedorId, repositorio }: Opcoes) {
  const navegar = useNavigate()
  const [abrindo, setAbrindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function abrir() {
    if (abrindo) return
    setAbrindo(true)
    setErro(null)
    try {
      // O repositório só é criado no toque: o balão e o perfil abrem sem depender do Supabase.
      const repo = repositorio ?? new SupabaseChatRepository()
      const conversa = await repo.abrirConversa(vendedorId)
      navegar(rotaConversa(conversa.id))
    } catch (e) {
      setErro(e instanceof Falha ? e.mensagem : MENSAGEM_PADRAO)
      setAbrindo(false)
    }
  }

  return { abrir, abrindo, erro }
}
