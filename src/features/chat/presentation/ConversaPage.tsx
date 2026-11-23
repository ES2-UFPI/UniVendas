import { useEffect, useRef } from 'react'
import type { ChatRepository } from '../domain/ChatRepository'
import { LIMITE_MENSAGEM } from '../domain/validacoesMensagem'
import { useConversaViewModel } from './useConversaViewModel'

const HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

interface ConversaPageProps {
  /** Id da conversa, vindo da rota `/conversa/:id`. */
  conversaId: string
  /** Perfil de quem está logado. */
  perfilId: string | null
  /** Só para os testes: repositório falso. */
  repositorio?: ChatRepository
}

/**
 * Tela da conversa (US18): as mensagens em balões, as de quem está logado à direita, e o campo
 * para escrever. As mensagens novas aparecem sem recarregar a página.
 */
export function ConversaPage({ conversaId, perfilId, repositorio }: ConversaPageProps) {
  const vm = useConversaViewModel({ conversaId, perfilId, repositorio })
  const fim = useRef<HTMLLIElement>(null)

  // A cada mensagem nova, rola até o fim da lista.
  useEffect(() => {
    fim.current?.scrollIntoView?.({ block: 'end' })
  }, [vm.mensagens.length])

  if (vm.carregando) {
    return (
      <p role="status" className="p-4 text-gray-600">
        Carregando a conversa…
      </p>
    )
  }

  if (vm.erro) {
    return (
      <p role="alert" className="w-full max-w-md rounded-lg bg-red-50 p-3 text-sm text-red-800">
        {vm.erro}
      </p>
    )
  }

  if (vm.naoEncontrada) {
    return <p className="p-4 text-gray-700">Esta conversa não existe ou não é sua.</p>
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3">
      <h2 className="text-xl font-bold text-gray-900">{vm.nomeDaOutraPessoa}</h2>

      {vm.mensagens.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhuma mensagem ainda. Mande a primeira!</p>
      ) : (
        <ul aria-label="Mensagens" className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {vm.mensagens.map((m) => (
            <li
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                m.minha
                  ? 'self-end bg-green-600 text-white'
                  : 'self-start bg-gray-100 text-gray-900'
              }`}
            >
              <span className="sr-only">{m.minha ? 'Você: ' : `${vm.nomeDaOutraPessoa}: `}</span>
              <p className="break-words whitespace-pre-wrap">{m.texto}</p>
              <time
                dateTime={m.enviadaEm.toISOString()}
                className={`block text-right text-xs ${m.minha ? 'text-green-100' : 'text-gray-500'}`}
              >
                {HORA.format(m.enviadaEm)}
              </time>
            </li>
          ))}
          <li ref={fim} aria-hidden="true" />
        </ul>
      )}

      <form
        className="flex flex-col gap-1"
        onSubmit={(e) => {
          e.preventDefault()
          void vm.enviar()
        }}
      >
        <div className="flex items-end gap-2">
          <label htmlFor="texto-mensagem" className="sr-only">
            Mensagem
          </label>
          <textarea
            id="texto-mensagem"
            rows={2}
            maxLength={LIMITE_MENSAGEM}
            value={vm.texto}
            onChange={(e) => vm.setTexto(e.target.value)}
            onKeyDown={(e) => {
              // Enter envia; Shift+Enter quebra a linha.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void vm.enviar()
              }
            }}
            placeholder="Escreva uma mensagem"
            className="flex-1 resize-none rounded-lg border border-gray-300 p-2"
          />
          <button
            type="submit"
            disabled={vm.enviando}
            className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {vm.enviando ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
        {vm.erroEnvio ? (
          <p role="alert" className="text-sm text-red-700">
            {vm.erroEnvio}
          </p>
        ) : (
          vm.restantes < 100 && (
            <p className="text-xs text-gray-500">{vm.restantes} caracteres restantes</p>
          )
        )}
      </form>
    </section>
  )
}
