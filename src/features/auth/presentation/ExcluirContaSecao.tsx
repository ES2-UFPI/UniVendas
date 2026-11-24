import { Botao } from '../../../core/ui/Botao'
import { Icone } from '../../../core/ui/Icone'
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
    <section
      aria-labelledby="titulo-excluir-conta"
      className="flex flex-col gap-3 rounded-cartao border border-red-200 bg-white p-5 md:p-6"
    >
      <h3 id="titulo-excluir-conta" className="font-titulo text-lg tracking-[-0.035em] text-perigo">
        Excluir minha conta
      </h3>
      <p className="text-sm text-tinta-suave">
        Apaga a sua conta e tudo o que está nela: perfil, fotos, itens, contatos, presença e
        conversas.
      </p>

      {!vm.confirmando ? (
        <Botao variante="perigo" icone="lixeira" onClick={vm.pedir} className="self-start">
          Excluir minha conta
        </Botao>
      ) : (
        <div
          role="alertdialog"
          aria-label="Excluir minha conta?"
          className="flex flex-col gap-3 rounded-controle bg-red-50 p-4"
        >
          <p className="text-[15px] text-tinta">
            <strong className="text-perigo">Isso não pode ser desfeito.</strong> Sua conta e todos
            os seus dados serão apagados para sempre.
          </p>
          {vm.erro && (
            <p role="alert" className="text-sm text-perigo">
              {vm.erro}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Botao
              variante="secundario"
              onClick={vm.cancelar}
              disabled={vm.excluindo}
              className="flex-1"
            >
              Cancelar
            </Botao>
            <button
              type="button"
              onClick={() => void confirmar()}
              disabled={vm.excluindo}
              className="inline-flex min-h-[50px] flex-1 items-center justify-center gap-2.5 rounded-controle bg-perigo px-5 py-2 font-bold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-perigo disabled:opacity-45"
            >
              <Icone nome="lixeira" className="h-[18px] w-[18px]" />
              {vm.excluindo ? 'Excluindo…' : 'Sim, excluir minha conta'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
