import type { FormEvent } from 'react'
import type { AuthRepository } from '../domain/AuthRepository'
import { Campo, estiloBotao, estiloCampo, estiloInstrucao, estiloTitulo } from './Campo'
import { useNovaSenhaViewModel } from './useNovaSenhaViewModel'

interface NovaSenhaPageProps {
  /** Chamado depois que a senha foi trocada. O App usa para ir ao mapa. */
  aoTrocar?: () => void
  /** Só para os testes: repositório falso. */
  repositorio?: AuthRepository
}

/**
 * Tela "Nova senha" (US15): quem abriu o link de recuperação do e-mail já está logado e escolhe
 * a senha nova, digitada duas vezes.
 */
export function NovaSenhaPage({ aoTrocar, repositorio }: NovaSenhaPageProps) {
  const vm = useNovaSenhaViewModel({ repositorio })

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (await vm.salvar()) aoTrocar?.()
  }

  return (
    <section className="w-full">
      <h2 className={estiloTitulo}>Nova senha</h2>
      <p className={estiloInstrucao}>Escolha a senha nova da sua conta.</p>

      <form onSubmit={enviar} noValidate className="mt-10 flex flex-col gap-6">
        <Campo id="senha" rotulo="Nova senha" erro={vm.erros.senha}>
          <input
            id="senha"
            type="password"
            autoComplete="new-password"
            className={estiloCampo}
            value={vm.senha}
            onChange={(e) => vm.alterarSenha(e.target.value)}
            aria-invalid={!!vm.erros.senha}
            aria-describedby={vm.erros.senha ? 'senha-erro' : undefined}
          />
        </Campo>

        <Campo id="confirmacao" rotulo="Repita a nova senha" erro={vm.erros.confirmacao}>
          <input
            id="confirmacao"
            type="password"
            autoComplete="new-password"
            className={estiloCampo}
            value={vm.confirmacao}
            onChange={(e) => vm.alterarConfirmacao(e.target.value)}
            aria-invalid={!!vm.erros.confirmacao}
            aria-describedby={vm.erros.confirmacao ? 'confirmacao-erro' : undefined}
          />
        </Campo>

        {vm.erro && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {vm.erro}
          </p>
        )}

        <button type="submit" disabled={vm.carregando} className={estiloBotao}>
          {vm.carregando ? 'Salvando…' : 'Salvar a nova senha'}
        </button>
      </form>
    </section>
  )
}
