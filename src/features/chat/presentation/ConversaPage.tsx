import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ROTAS, rotaPerfilVendedor } from '../../../core/routes'
import { Avatar } from '../../../core/ui/Avatar'
import { Aviso } from '../../../core/ui/Aviso'
import { estiloEntrada } from '../../../core/ui/CampoFormulario'
import { Icone } from '../../../core/ui/Icone'
import type { ChatRepository } from '../domain/ChatRepository'
import { LIMITE_MENSAGEM } from '../domain/validacoesMensagem'
import { rotuloDoDia } from './formatarQuando'
import { useConversaViewModel } from './useConversaViewModel'

const HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** O campo da mensagem: o campo do tema, que cresce até umas cinco linhas. */
const ESTILO_CAMPO = `${estiloEntrada.replace('h-[52px]', 'min-h-[52px] max-h-40')} resize-none py-3.5 leading-snug`

interface ConversaPageProps {
  /** Id da conversa, vindo da rota `/conversa/:id`. */
  conversaId: string
  /** Perfil de quem está logado. */
  perfilId: string | null
  /** Só para os testes: repositório falso. */
  repositorio?: ChatRepository
}

/** No celular, a lista some quando a conversa abre; este link volta para ela. */
function VoltarAsConversas() {
  return (
    <Link
      to={ROTAS.conversas}
      className="inline-flex items-center gap-2 self-start rounded-controle py-1 text-[15px] font-bold text-marca-600 hover:text-marca-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600 md:hidden"
    >
      <Icone nome="voltar" />
      Voltar às conversas
    </Link>
  )
}

/**
 * Tela da conversa (US18, visual da US21): o topo com quem está do outro lado, as mensagens em
 * balões (as de quem está logado à direita), separadas por dia, e o campo para escrever.
 * As mensagens novas aparecem sem recarregar a página.
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
      <p role="status" className="p-5 text-tinta-suave">
        Carregando a conversa…
      </p>
    )
  }

  if (vm.erro) {
    return (
      <div className="flex flex-col gap-4 p-5">
        <VoltarAsConversas />
        <Aviso tipo="erro">{vm.erro}</Aviso>
      </div>
    )
  }

  if (vm.naoEncontrada) {
    return (
      <div className="flex flex-col gap-4 p-5">
        <VoltarAsConversas />
        <p className="text-tinta-suave">Esta conversa não existe ou não é sua.</p>
      </div>
    )
  }

  const nome = vm.nomeDaOutraPessoa ?? ''

  return (
    <section aria-label={`Conversa com ${nome}`} className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col gap-3 border-b border-linha p-4 md:px-6 md:py-5">
        <VoltarAsConversas />
        <div className="flex items-center gap-3">
          <Avatar nome={nome} fotoUrl={null} className="h-11 w-11 text-base" />
          <h3 className="min-w-0 flex-1 text-lg font-bold break-words text-tinta">{nome}</h3>
          {vm.vendedorId && (
            <Link
              to={rotaPerfilVendedor(vm.vendedorId)}
              className="shrink-0 rounded-controle px-2 py-1 text-[15px] font-bold text-marca-600 hover:text-marca-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600"
            >
              Ver perfil
            </Link>
          )}
        </div>
      </header>

      <div className="flex min-h-[280px] flex-1 flex-col overflow-y-auto p-4 md:px-6">
        {vm.mensagens.length === 0 ? (
          <p className="m-auto text-sm text-tinta-suave">
            Nenhuma mensagem ainda. Mande a primeira!
          </p>
        ) : (
          <ul aria-label="Mensagens" className="flex flex-col gap-3">
            {vm.mensagens.map((m, i) => {
              const dia = rotuloDoDia(m.enviadaEm)
              const novoDia = i === 0 || rotuloDoDia(vm.mensagens[i - 1].enviadaEm) !== dia
              return (
                <li key={m.id} className="flex flex-col gap-3">
                  {novoDia && (
                    <p className="self-center text-xs font-medium text-tinta-suave">{dia}</p>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 md:max-w-[70%] ${
                      m.minha
                        ? 'self-end rounded-br-md bg-marca-50 text-tinta'
                        : 'self-start rounded-bl-md bg-campo text-tinta'
                    }`}
                  >
                    <span className="sr-only">{m.minha ? 'Você: ' : `${nome}: `}</span>
                    <p className="text-[15px] leading-[22px] break-words whitespace-pre-wrap">
                      {m.texto}
                    </p>
                    <time
                      dateTime={m.enviadaEm.toISOString()}
                      className="mt-1 block text-xs text-tinta-suave"
                    >
                      {HORA.format(m.enviadaEm)}
                    </time>
                  </div>
                </li>
              )
            })}
            <li ref={fim} aria-hidden="true" />
          </ul>
        )}
      </div>

      <form
        className="flex flex-col gap-1.5 border-t border-linha p-4 md:px-6"
        onSubmit={(e) => {
          e.preventDefault()
          void vm.enviar()
        }}
      >
        <div className="flex items-end gap-3">
          <label htmlFor="texto-mensagem" className="sr-only">
            Mensagem
          </label>
          <textarea
            id="texto-mensagem"
            rows={1}
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
            placeholder="Escreva sua mensagem"
            className={ESTILO_CAMPO}
          />
          <button
            type="submit"
            disabled={vm.enviando}
            aria-label={vm.enviando ? 'Enviando…' : 'Enviar'}
            title="Enviar"
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-controle bg-marca-600 text-white hover:bg-marca-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600 disabled:opacity-45"
          >
            <Icone nome="enviar" />
          </button>
        </div>
        {vm.erroEnvio ? (
          <p role="alert" className="text-sm text-perigo">
            {vm.erroEnvio}
          </p>
        ) : (
          vm.restantes < 100 && (
            <p className="text-xs text-tinta-suave">{vm.restantes} caracteres restantes</p>
          )
        )}
      </form>
    </section>
  )
}
