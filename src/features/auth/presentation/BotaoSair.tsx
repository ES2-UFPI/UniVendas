import type { AuthRepository } from '../domain/AuthRepository'
import { useAuthViewModel } from './useAuthViewModel'

interface BotaoSairProps {
  /** Chamado depois que a conta saiu. A #58 usa para voltar à tela de login. */
  aoSair?: () => void
  /** Só para os testes: repositório falso. */
  repositorio?: AuthRepository
}

/** Botão de sair da conta (US02). Fica sozinho para poder ir no topo de qualquer tela. */
export function BotaoSair({ aoSair, repositorio }: BotaoSairProps) {
  const vm = useAuthViewModel({ repositorio })

  async function sair() {
    if (await vm.sair()) aoSair?.()
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={sair}
        disabled={vm.carregando}
        className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
      >
        {vm.carregando ? 'Saindo…' : 'Sair'}
      </button>
      {vm.erro && (
        <p role="alert" className="text-sm text-red-700">
          {vm.erro}
        </p>
      )}
    </div>
  )
}
