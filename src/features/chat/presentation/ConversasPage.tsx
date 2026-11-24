import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../core/ui/Avatar'
import { Aviso } from '../../../core/ui/Aviso'
import { TituloTela } from '../../../core/ui/TituloTela'
import type { ChatRepository } from '../domain/ChatRepository'
import { formatarQuando } from './formatarQuando'
import { useConversasViewModel } from './useConversasViewModel'

interface ConversasPageProps {
  /** Perfil de quem está logado. */
  perfilId: string | null
  /** A conversa aberta ao lado (rota `/conversa/:id`), que fica marcada na lista. */
  conversaAbertaId?: string
  /** A conversa aberta (a `ConversaPage`). Sem ela, o computador mostra um convite para escolher uma. */
  children?: ReactNode
  /** Só para os testes: repositório falso. */
  repositorio?: ChatRepository
}

/**
 * Tela "Conversas" (US18, visual da US21): uma linha por conversa, com o nome da outra pessoa e a
 * última mensagem, as mais recentes primeiro. Tocar na linha abre a conversa.
 * - Celular: a lista, e a conversa no lugar dela quando aberta.
 * - Computador: a lista à esquerda e a conversa aberta à direita.
 */
export function ConversasPage({
  perfilId,
  conversaAbertaId,
  children,
  repositorio,
}: ConversasPageProps) {
  const vm = useConversasViewModel({ perfilId, repositorio })
  const aberta = conversaAbertaId !== undefined

  return (
    <section className="flex w-full flex-1 flex-col">
      <TituloTela titulo="Conversas" apoio="Fale com os vendedores e combine onde encontrar." />

      <div className="mt-7 grid flex-1 grid-cols-1 gap-5 md:h-[640px] md:flex-none md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,368px)_minmax(0,1fr)]">
        <div
          className={`min-h-0 flex-col overflow-y-auto rounded-cartao border border-linha bg-cartao p-3 ${
            aberta ? 'hidden md:flex' : 'flex'
          }`}
        >
          {vm.carregando && (
            <p role="status" className="p-3 text-tinta-suave">
              Carregando as conversas…
            </p>
          )}

          {vm.erro && <Aviso tipo="erro">{vm.erro}</Aviso>}

          {!vm.carregando && !vm.erro && vm.conversas.length === 0 && (
            <p className="p-3 text-sm text-tinta-suave">
              Você ainda não tem conversas. Abra uma pelo balão de um vendedor no mapa ou pelo
              perfil dele.
            </p>
          )}

          {vm.conversas.length > 0 && (
            <ul aria-label="Suas conversas" className="flex flex-col gap-1">
              {vm.conversas.map((c) => {
                const escolhida = c.id === conversaAbertaId
                return (
                  <li key={c.id}>
                    <Link
                      to={c.link}
                      aria-current={escolhida ? 'page' : undefined}
                      className={`flex items-start gap-3 rounded-2xl p-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600 ${
                        escolhida ? 'bg-marca-50' : 'hover:bg-white'
                      }`}
                    >
                      <Avatar nome={c.nome} fotoUrl={null} className="h-11 w-11 text-base" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="truncate font-bold text-tinta">{c.nome}</span>
                          <time
                            dateTime={c.quando.toISOString()}
                            className="shrink-0 text-xs text-tinta-suave"
                          >
                            {formatarQuando(c.quando)}
                          </time>
                        </span>
                        <span className="block truncate text-sm text-tinta-suave">
                          {c.ultimaMensagem ?? 'Nenhuma mensagem ainda'}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div
          className={`min-h-0 flex-col overflow-hidden rounded-cartao border border-linha bg-white ${
            aberta ? 'flex' : 'hidden md:flex'
          }`}
        >
          {children ?? (
            <p className="m-auto max-w-xs p-6 text-center text-tinta-suave">
              Escolha uma conversa para ler e responder.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
