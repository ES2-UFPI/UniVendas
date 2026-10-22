import type { FormEvent, ReactNode } from 'react'
import type { AuthRepository } from '../domain/AuthRepository'
import type { Usuario } from '../domain/Usuario'
import { TAMANHO_MINIMO_SENHA } from '../domain/validadorCredenciais'
import { useAuthViewModel } from './useAuthViewModel'

interface CadastroPageProps {
  /** Chamado com o usuário já logado quando a conta é criada. A #58 usa para ir ao mapa. */
  aoCadastrar?: (usuario: Usuario) => void
  /** Só para os testes: repositório falso. */
  repositorio?: AuthRepository
}

const estiloCampo =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/30 aria-[invalid=true]:border-red-600'

function Campo({
  id,
  rotulo,
  erro,
  dica,
  children,
}: {
  id: string
  rotulo: string
  erro?: string
  dica?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-800">
        {rotulo}
      </label>
      {children}
      {dica && !erro && <p className="text-xs text-gray-500">{dica}</p>}
      {erro && (
        <p id={`${id}-erro`} className="text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  )
}

/** Tela de cadastro (US01): cria a conta com nome, e-mail e senha e já entra no app (RN01). */
export function CadastroPage({ aoCadastrar, repositorio }: CadastroPageProps) {
  const vm = useAuthViewModel({ repositorio })
  const { dados, erros } = vm

  if (vm.usuario) {
    return (
      <section className="mx-auto w-full max-w-md p-4 text-center" role="status">
        <h2 className="text-xl font-bold text-green-700">Bem-vindo, {vm.usuario.nome}!</h2>
        <p className="mt-2 text-gray-700">Sua conta foi criada e você já está dentro do app.</p>
      </section>
    )
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    // Usa o retorno do cadastrar(): o estado do hook (vm.usuario) só muda no próximo render.
    const usuario = await vm.cadastrar()
    if (usuario) aoCadastrar?.(usuario)
  }

  return (
    <section className="mx-auto w-full max-w-md p-4">
      <h2 className="text-xl font-bold text-gray-900">Criar conta</h2>
      <p className="mt-1 text-sm text-gray-600">
        Use qualquer e-mail. Toda conta já pode comprar, e você cria seu perfil de vendedor depois,
        se quiser.
      </p>

      <form onSubmit={enviar} noValidate className="mt-4 flex flex-col gap-4">
        <Campo id="nome" rotulo="Nome" erro={erros.nome}>
          <input
            id="nome"
            autoComplete="name"
            className={estiloCampo}
            value={dados.nome}
            onChange={(e) => vm.alterar('nome', e.target.value)}
            aria-invalid={!!erros.nome}
            aria-describedby={erros.nome ? 'nome-erro' : undefined}
          />
        </Campo>

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

        <Campo
          id="senha"
          rotulo="Senha"
          erro={erros.senha}
          dica={`Pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`}
        >
          <input
            id="senha"
            type="password"
            autoComplete="new-password"
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
          {vm.carregando ? 'Criando a conta…' : 'Criar conta'}
        </button>
      </form>
    </section>
  )
}
