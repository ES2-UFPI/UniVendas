import type { FormEvent } from 'react'
import type { AuthRepository } from '../domain/AuthRepository'
import { Campo, estiloBotao, estiloCampo, estiloInstrucao, estiloTitulo } from './Campo'
import { useEsqueciSenhaViewModel } from './useEsqueciSenhaViewModel'

interface EsqueciSenhaPageProps {
  /** Só para os testes: repositório falso. */
  repositorio?: AuthRepository
}

/** Tela "Esqueci a senha" (US15): pede o e-mail e manda o link para criar uma senha nova. */
export function EsqueciSenhaPage({ repositorio }: EsqueciSenhaPageProps) {
  const vm = useEsqueciSenhaViewModel({ repositorio })

  if (vm.enviado) {
    return (
      <section className="w-full" role="status">
        <h2 className={estiloTitulo}>Confira seu e-mail</h2>
        <p className={estiloInstrucao}>
          Se existir uma conta com o e-mail {vm.email.trim()}, enviamos um link para criar uma senha
          nova. Olhe também a caixa de spam.
        </p>
      </section>
    )
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    await vm.enviar()
  }

  return (
    <section className="w-full">
      <h2 className={estiloTitulo}>Esqueci a senha</h2>
      <p className={estiloInstrucao}>
        Digite o e-mail da sua conta e enviamos um link para criar uma senha nova.
      </p>

      <form onSubmit={enviar} noValidate className="mt-10 flex flex-col gap-6">
        <Campo id="email" rotulo="E-mail" erro={vm.erros.email}>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className={estiloCampo}
            value={vm.email}
            onChange={(e) => vm.alterarEmail(e.target.value)}
            aria-invalid={!!vm.erros.email}
            aria-describedby={vm.erros.email ? 'email-erro' : undefined}
            placeholder="ana@ufpi.edu.br"
          />
        </Campo>

        {vm.erro && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {vm.erro}
          </p>
        )}

        <button type="submit" disabled={vm.carregando} className={estiloBotao}>
          {vm.carregando ? 'Enviando…' : 'Enviar o link'}
        </button>
      </form>
    </section>
  )
}
