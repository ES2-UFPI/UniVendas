import type { ChatRepository } from '../domain/ChatRepository'
import { useBotaoChatViewModel } from './useBotaoChatViewModel'

interface BotaoChatProps {
  vendedorId: string
  /** Classes de tamanho do botão: o balão do mapa usa um botão menor que o perfil. */
  className?: string
  /** Só para os testes: repositório falso. */
  repositorio?: ChatRepository
}

/**
 * Botão "Chat" do balão do marcador e do perfil do vendedor (US18, RN22): abre a conversa
 * com o vendedor e leva para a tela dela. Quem decide esconder o botão no próprio perfil é a tela.
 */
export function BotaoChat({ vendedorId, className = 'px-4 py-2', repositorio }: BotaoChatProps) {
  const vm = useBotaoChatViewModel({ vendedorId, repositorio })

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void vm.abrir()}
        disabled={vm.abrindo}
        className={`rounded-lg bg-purple-600 font-medium text-white disabled:opacity-60 ${className}`}
      >
        {vm.abrindo ? 'Abrindo…' : 'Chat'}
      </button>
      {vm.erro && (
        <span role="alert" className="text-xs text-red-700">
          {vm.erro}
        </span>
      )}
    </span>
  )
}
