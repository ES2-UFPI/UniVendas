import { estiloBotao, type VarianteBotao } from '../../../core/ui/estiloBotao'
import { Icone } from '../../../core/ui/Icone'
import type { ChatRepository } from '../domain/ChatRepository'
import { useBotaoChatViewModel } from './useBotaoChatViewModel'

interface BotaoChatProps {
  vendedorId: string
  /** Classes do contorno do botão (largura, flex), para encaixar no balão do mapa ou no perfil. */
  className?: string
  /** Botão mais baixo, para o balão do mapa. */
  compacto?: boolean
  /** No perfil o Chat é a ação principal; no balão do mapa, a secundária. */
  variante?: VarianteBotao
  /** Só para os testes: repositório falso. */
  repositorio?: ChatRepository
}

/**
 * Botão "Chat" do balão do marcador e do perfil do vendedor (US18, RN22): abre a conversa
 * com o vendedor e leva para a tela dela. Quem decide esconder o botão no próprio perfil é a tela.
 */
export function BotaoChat({
  vendedorId,
  className = '',
  compacto = false,
  variante = 'secundario',
  repositorio,
}: BotaoChatProps) {
  const vm = useBotaoChatViewModel({ vendedorId, repositorio })

  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => void vm.abrir()}
        disabled={vm.abrindo}
        className={estiloBotao(variante, compacto ? 'h-10 w-full px-4 text-sm' : 'w-full')}
      >
        <Icone nome="chat" className="h-[18px] w-[18px]" />
        {vm.abrindo ? 'Abrindo…' : 'Chat'}
      </button>
      {vm.erro && (
        <span role="alert" className="text-xs text-perigo">
          {vm.erro}
        </span>
      )}
    </span>
  )
}
