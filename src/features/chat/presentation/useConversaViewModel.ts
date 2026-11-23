import { useEffect, useMemo, useState } from 'react'
import { Falha } from '../../../core/falha'
import { SupabaseChatRepository } from '../data/SupabaseChatRepository'
import type { ChatRepository } from '../domain/ChatRepository'
import type { Conversa } from '../domain/Conversa'
import type { Mensagem } from '../domain/Mensagem'
import { LIMITE_MENSAGEM, validarMensagem } from '../domain/validacoesMensagem'

const MENSAGEM_CARREGAR = 'Não foi possível carregar a conversa. Tente de novo.'
const MENSAGEM_ENVIAR = 'Não foi possível enviar a mensagem. Tente de novo.'

/** Uma mensagem como a tela mostra: o texto, a hora e de que lado fica o balão. */
export interface MensagemNaTela {
  id: string
  texto: string
  enviadaEm: Date
  /** `true` quando quem está logado escreveu: o balão fica à direita. */
  minha: boolean
}

interface Opcoes {
  /** Id da conversa, vindo da rota `/conversa/:id`. */
  conversaId: string
  /** Perfil de quem está logado, para saber quais mensagens são dele. */
  perfilId: string | null
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: ChatRepository
}

/**
 * Junta as mensagens novas às que já estão na tela, sem repetir e em ordem de envio.
 * A mesma mensagem pode chegar duas vezes: pela resposta do `enviar` e pelo Realtime.
 */
function juntar(atuais: Mensagem[], novas: Mensagem[]): Mensagem[] {
  const porId = new Map(atuais.map((m) => [m.id, m]))
  for (const m of novas) porId.set(m.id, m)
  return [...porId.values()].sort((a, b) => a.enviadaEm.getTime() - b.enviadaEm.getTime())
}

/**
 * ViewModel da tela da conversa (US18): carrega a conversa e as mensagens, assina as novas
 * (Observer, pelo `observarMensagens`) e envia o texto digitado, validado antes (RN23).
 */
export function useConversaViewModel({ conversaId, perfilId, repositorio }: Opcoes) {
  // Guarda o id junto com o resultado: ao trocar de conversa, a anterior deixa de valer.
  const [carga, setCarga] = useState<{
    id: string
    conversa: Conversa | null
    erro: string | null
  } | null>(null)
  const [mensagens, setMensagens] = useState<{ id: string; lista: Mensagem[] }>({
    id: conversaId,
    lista: [],
  })
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)

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

    const adicionar = (novas: Mensagem[]) =>
      setMensagens((atual) => ({
        id: conversaId,
        lista: juntar(atual.id === conversaId ? atual.lista : [], novas),
      }))

    // Assina antes de carregar: uma mensagem que chegar durante a carga não se perde.
    const cancelar = repo.observarMensagens(conversaId, (mensagem) => {
      if (montado) adicionar([mensagem])
    })

    Promise.all([repo.buscarConversa(conversaId), repo.listarMensagens(conversaId)])
      .then(([conversa, lista]) => {
        if (!montado) return
        adicionar(lista)
        setCarga({ id: conversaId, conversa, erro: null })
      })
      .catch((e) => {
        if (montado) {
          setCarga({
            id: conversaId,
            conversa: null,
            erro: e instanceof Falha ? e.mensagem : MENSAGEM_CARREGAR,
          })
        }
      })

    return () => {
      montado = false
      cancelar()
    }
  }, [repo, conversaId])

  const atual = carga?.id === conversaId ? carga : null
  const mensagensNaTela = useMemo<MensagemNaTela[]>(
    () =>
      (mensagens.id === conversaId ? mensagens.lista : []).map((m) => ({
        id: m.id,
        texto: m.texto,
        enviadaEm: m.enviadaEm,
        minha: perfilId !== null && m.ehDe(perfilId),
      })),
    [mensagens, conversaId, perfilId],
  )

  async function enviar() {
    if (!repo || enviando) return
    const erro = validarMensagem(texto)
    if (erro) {
      setErroEnvio(erro)
      return
    }

    setEnviando(true)
    setErroEnvio(null)
    try {
      const enviada = await repo.enviar(conversaId, texto)
      setMensagens((m) => ({ id: conversaId, lista: juntar(m.lista, [enviada]) }))
      setTexto('')
    } catch (e) {
      // O texto continua no campo, para a pessoa tentar de novo sem digitar outra vez.
      setErroEnvio(e instanceof Falha ? e.mensagem : MENSAGEM_ENVIAR)
    } finally {
      setEnviando(false)
    }
  }

  return {
    /** Nome de quem está do outro lado, para o topo da tela. */
    nomeDaOutraPessoa:
      atual?.conversa && perfilId ? atual.conversa.nomeDaOutraPessoa(perfilId) : null,
    mensagens: mensagensNaTela,
    texto,
    setTexto: (novo: string) => {
      setTexto(novo)
      if (erroEnvio) setErroEnvio(null)
    },
    /** Quantos caracteres ainda cabem na mensagem (RN23). */
    restantes: LIMITE_MENSAGEM - texto.trim().length,
    enviar,
    enviando,
    erroEnvio,
    carregando: repo !== null && atual === null,
    erro: repo === null ? MENSAGEM_CARREGAR : (atual?.erro ?? null),
    naoEncontrada: atual !== null && atual.erro === null && atual.conversa === null,
  }
}
