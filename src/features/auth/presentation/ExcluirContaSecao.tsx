import type { AuthRepository } from '../domain/AuthRepository'
import { useExcluirContaViewModel } from './useExcluirContaViewModel'

interface ExcluirContaSecaoProps {
  /** Chamado depois que a conta foi excluída. O App usa para voltar ao login. */
  aoExcluir?: () => void
  /** Só para os testes: repositório falso. */
  repositorio?: AuthRepository
}

/**
 * Seção "Excluir minha conta" (US17): o botão pede uma confirmação antes de apagar a conta e
 * tudo o que está nela (RN05). Não dá para desfazer.
 */
export function ExcluirContaSecao({ aoExcluir, repositorio }: ExcluirContaSecaoProps) {
  const vm = useExcluirContaViewModel({ repositorio })

  async function confirmar() {
    if (await vm.excluir()) aoExcluir?.()
  }

  return (
    <section aria-labelledby="titulo-excluir-conta" className="mt-8 border-t border-gray-200 pt-6">
      <h3 id="titulo-excluir-conta" className="font-semibold text-gray-900">
        Excluir minha conta
      </h3>
      <p className="mt-1 text-sm text-gray-600">
        Apaga a sua conta e tudo o que está nela: perfil, fotos, itens, contatos, presença e
        conversas.
      </p>

      {!vm.confirmando ? (
        <button
          type="button"
          onClick={vm.pedir}
          className="mt-3 w-full rounded-lg border border-red-600 px-4 py-3 font-semibold text-red-700 hover:bg-red-50"
        >
          Excluir minha conta
        </button>
      ) : (
        <div
          role="alertdialog"
          aria-label="Excluir minha conta?"
          className="mt-3 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-3"
        >
          <p className="text-sm text-red-900">
            <strong>Isso não pode ser desfeito.</strong> Sua conta e todos os seus dados serão
            apagados para sempre.
          </p>
          {vm.erro && (
            <p role="alert" className="text-sm text-red-800">
              {vm.erro}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={vm.cancelar}
              disabled={vm.excluindo}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirmar()}
              disabled={vm.excluindo}
              className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {vm.excluindo ? 'Excluindo…' : 'Sim, excluir minha conta'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
