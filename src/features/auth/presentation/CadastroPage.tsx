import type { FormEvent } from 'react'
import type { AuthRepository } from '../domain/AuthRepository'
import type { Usuario } from '../domain/Usuario'
import { TAMANHO_MINIMO_SENHA } from '../domain/validadorCredenciais'
import { Campo, estiloBotao, estiloCampo, estiloInstrucao, estiloTitulo } from './Campo'
import { useAuthViewModel } from './useAuthViewModel'

interface CadastroPageProps {
  /** Chamado com o usuário já logado quando a conta é criada. A #58 usa para ir ao mapa. */
  aoCadastrar?: (usuario: Usuario) => void
  /** Só para os testes: repositório falso. */
  repositorio?: AuthRepository
}

/** Tela de cadastro (US01): cria a conta com nome, e-mail e senha e já entra no app (RN01). */
export function CadastroPage({ aoCadastrar, repositorio }: CadastroPageProps) {
  const vm = useAuthViewModel({ repositorio })
  const { dados, erros } = vm

  if (vm.usuario) {
    return (
      <section className="mx-auto w-full max-w-md p-4 text-center" role="status">
        <h2 className="text-xl font-bold text-marca-700">Bem-vindo, {vm.usuario.nome}!</h2>
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
    <section className="w-full">
      <h2 className={estiloTitulo}>Criar conta</h2>
      <p className={estiloInstrucao}>
        Use qualquer e-mail. Toda conta já pode comprar, e você cria seu perfil de vendedor depois,
        se quiser.
      </p>

      <form onSubmit={enviar} noValidate className="mt-10 flex flex-col gap-6">
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

        <button type="submit" disabled={vm.carregando} className={estiloBotao}>
          {vm.carregando ? 'Criando a conta…' : 'Criar conta'}
        </button>
      </form>
    </section>
  )
}
