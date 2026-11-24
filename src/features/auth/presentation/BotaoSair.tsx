import { estiloBotao } from '../../../core/ui/estiloBotao'
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
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={sair}
        disabled={vm.carregando}
        className={estiloBotao('secundario', 'h-11 w-full')}
      >
        {vm.carregando ? 'Saindo…' : 'Sair'}
      </button>
      {vm.erro && (
        <p role="alert" className="text-sm text-perigo">
          {vm.erro}
        </p>
      )}
    </div>
  )
}
