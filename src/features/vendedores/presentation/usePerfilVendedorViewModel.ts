import { useEffect, useMemo, useState } from 'react'
import { Falha } from '../../../core/falha'
import { ContatoService } from '../../contato/domain/ContatoService'
import { SupabaseVendedorRepository } from '../data/SupabaseVendedorRepository'
import type { CanalTipo } from '../domain/Contato'
import type { PerfilVendedor } from '../domain/PerfilVendedor'
import type { VendedorRepository } from '../domain/VendedorRepository'

const MENSAGEM_PADRAO = 'Não foi possível carregar o perfil. Tente de novo.'

const contatoService = new ContatoService()

export interface BotaoContatoPerfil {
  canal: CanalTipo
  rotulo: string
  link: string
}

interface Opcoes {
  /** Id do vendedor, vindo da rota `/vendedor/:id`. */
  id: string
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: VendedorRepository
}

/**
 * ViewModel do perfil do vendedor (US10): busca o perfil pelo id e entrega à tela os dados,
 * os botões de contato já com o link (Strategy do `ContatoService`, US07) e os estados de
 * carregando, erro e "não encontrado".
 */
export function usePerfilVendedorViewModel({ id, repositorio }: Opcoes) {
  // Guarda o id junto com o resultado: ao trocar de vendedor, o perfil antigo deixa de valer.
  const [resultado, setResultado] = useState<{
    id: string
    perfil: PerfilVendedor | null
    erro: string | null
  } | null>(null)

  const repo = useMemo<VendedorRepository | null>(() => {
    try {
      return repositorio ?? new SupabaseVendedorRepository()
    } catch {
      return null
    }
  }, [repositorio])

  useEffect(() => {
    if (!repo) return
    let montado = true
    repo
      .buscarPerfil(id)
      .then((perfil) => {
        if (montado) setResultado({ id, perfil, erro: null })
      })
      .catch((e) => {
        if (montado)
          setResultado({
            id,
            perfil: null,
            erro: e instanceof Falha ? e.mensagem : MENSAGEM_PADRAO,
          })
      })
    return () => {
      montado = false
    }
  }, [repo, id])

  const atual = resultado?.id === id ? resultado : null
  const perfil = atual?.perfil ?? null

  const botoesContato = useMemo<BotaoContatoPerfil[]>(
    () =>
      (perfil?.contatos ?? []).map((contato) => ({
        canal: contato.canal,
        rotulo: contatoService.rotulo(contato),
        link: contatoService.gerarLink(contato),
      })),
    [perfil],
  )

  return {
    perfil,
    botoesContato,
    carregando: repo !== null && atual === null,
    erro: repo === null ? MENSAGEM_PADRAO : (atual?.erro ?? null),
    naoEncontrado: atual !== null && atual.erro === null && atual.perfil === null,
  }
}
