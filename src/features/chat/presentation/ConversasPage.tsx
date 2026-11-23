import { Link } from 'react-router-dom'
import type { ChatRepository } from '../domain/ChatRepository'
import { formatarQuando } from './formatarQuando'
import { useConversasViewModel } from './useConversasViewModel'

interface ConversasPageProps {
  /** Perfil de quem está logado. */
  perfilId: string | null
  /** Só para os testes: repositório falso. */
  repositorio?: ChatRepository
}

/**
 * Tela "Conversas" (US18): uma linha por conversa, com o nome da outra pessoa e a última
 * mensagem, as mais recentes primeiro. Tocar na linha abre a conversa.
 */
export function ConversasPage({ perfilId, repositorio }: ConversasPageProps) {
  const vm = useConversasViewModel({ perfilId, repositorio })

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-3">
      <h2 className="text-xl font-bold text-gray-900">Conversas</h2>

      {vm.carregando && (
        <p role="status" className="text-gray-600">
          Carregando as conversas…
        </p>
      )}

      {vm.erro && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {vm.erro}
        </p>
      )}

      {!vm.carregando && !vm.erro && vm.conversas.length === 0 && (
        <p className="text-sm text-gray-600">
          Você ainda não tem conversas. Abra uma pelo balão de um vendedor no mapa ou pelo perfil
          dele.
        </p>
      )}

      {vm.conversas.length > 0 && (
        <ul className="flex flex-col divide-y divide-gray-200">
          {vm.conversas.map((c) => (
            <li key={c.id}>
              <Link to={c.link} className="flex items-center gap-3 py-3 hover:bg-gray-50">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 font-bold text-green-700"
                >
                  {c.nome.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-gray-900">{c.nome}</span>
                  <span className="block truncate text-sm text-gray-600">
                    {c.ultimaMensagem ?? 'Nenhuma mensagem ainda'}
                  </span>
                </span>
                <time dateTime={c.quando.toISOString()} className="text-xs text-gray-500">
                  {formatarQuando(c.quando)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
