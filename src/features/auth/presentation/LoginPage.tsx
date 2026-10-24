import { useState, type FormEvent } from 'react'
import type { AuthRepository } from '../domain/AuthRepository'
import type { Usuario } from '../domain/Usuario'
import { BotaoSair } from './BotaoSair'
import { Campo, estiloCampo } from './Campo'
import { useAuthViewModel } from './useAuthViewModel'

interface LoginPageProps {
  /** Chamado com o usuário quando ele entra. A #58 usa para ir ao mapa. */
  aoEntrar?: (usuario: Usuario) => void
  /** Só para os testes: repositório falso. */
  repositorio?: AuthRepository
}

/** Tela de login (US02): entra com e-mail e senha e mostra mensagem clara se a senha estiver errada (RN04). */
export function LoginPage({ aoEntrar, repositorio }: LoginPageProps) {
  const vm = useAuthViewModel({ repositorio })
  const { dados, erros } = vm
  // Quem está logado nesta tela. Volta a null quando a pessoa sai pelo botão.
  const [logado, setLogado] = useState<Usuario | null>(null)

  if (logado) {
    return (
      <section className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 text-center">
        <div role="status">
          <h2 className="text-xl font-bold text-green-700">Olá, {logado.nome}!</h2>
          <p className="mt-2 text-gray-700">Você entrou na sua conta.</p>
        </div>
        <BotaoSair
          repositorio={repositorio}
          aoSair={() => {
            // Volta para o formulário sem a senha de quem acabou de sair.
            vm.alterar('senha', '')
            setLogado(null)
          }}
        />
      </section>
    )
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    // Usa o retorno do entrar(): o estado do hook (vm.usuario) só muda no próximo render.
    const usuario = await vm.entrar()
    if (usuario) {
      setLogado(usuario)
      aoEntrar?.(usuario)
    }
  }

  return (
    <section className="mx-auto w-full max-w-md p-4">
      <h2 className="text-xl font-bold text-gray-900">Entrar</h2>
      <p className="mt-1 text-sm text-gray-600">Use o e-mail e a senha da sua conta.</p>

      <form onSubmit={enviar} noValidate className="mt-4 flex flex-col gap-4">
        <Campo id="email" rotulo="E-mail" erro={erros.email}>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className={estiloCampo}
            value={dados.email}
            onChange={(e) => vm.alterar('email', e.target.value)}
            aria-invalid={!!erros.email}
            aria-describedby={erros.email ? 'email-erro' : undefined}
            placeholder="ana@ufpi.edu.br"
          />
        </Campo>

        <Campo id="senha" rotulo="Senha" erro={erros.senha}>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            className={estiloCampo}
            value={dados.senha}
            onChange={(e) => vm.alterar('senha', e.target.value)}
            aria-invalid={!!erros.senha}
            aria-describedby={erros.senha ? 'senha-erro' : undefined}
          />
        </Campo>

        {vm.erro && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {vm.erro}
          </p>
        )}

        <button
          type="submit"
          disabled={vm.carregando}
          className="rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {vm.carregando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </section>
  )
}
