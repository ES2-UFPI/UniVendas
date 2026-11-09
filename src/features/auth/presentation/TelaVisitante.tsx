import type { ReactNode } from 'react'
import { Logo } from '../../../core/Logo'

/**
 * Envelope das telas de login e cadastro: a marca no topo, o formulário à esquerda e,
 * no computador, o painel verde com a ilustração à direita. No celular o painel some.
 */
export function TelaVisitante({ children, rodape }: { children: ReactNode; rodape: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white lg:p-6">
      <main className="flex flex-1 flex-col px-5 py-6 sm:px-10 lg:px-12 lg:py-5">
        <header>
          <h1 className="text-[1.75rem] lg:text-[2rem]">
            <Logo />
          </h1>
          <p className="mt-1 text-tinta-suave lg:hidden">Vendedores do campus, perto de você.</p>
        </header>

        <div className="flex flex-1 flex-col pt-10 pb-6 lg:justify-center lg:py-10 lg:pl-12">
          <div className="w-full max-w-[440px]">
            {children}
            <p className="mt-10 text-center text-tinta-suave">{rodape}</p>
          </div>
        </div>
      </main>

      <aside className="hidden w-1/2 flex-col items-center justify-center gap-10 rounded-[28px] bg-marca-50 px-10 py-12 lg:flex">
        <img
          src="/login-ilustracao.jpg"
          alt=""
          width={1100}
          height={1375}
          className="h-auto max-h-[75vh] w-auto max-w-full object-contain"
        />
        <p className="text-center text-xl font-semibold tracking-tight text-marca-900">
          Vendedores do campus, perto de você.
        </p>
      </aside>
    </div>
  )
}
