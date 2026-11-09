import type { ReactNode } from 'react'

export const estiloCampo =
  'h-14 w-full rounded-[10px] border border-borda bg-white px-4 text-base text-tinta placeholder:text-tinta-suave/80 focus:border-marca-700 focus:outline-none focus:ring-2 focus:ring-marca-500/30 aria-[invalid=true]:border-red-600'

/** Título grande das telas de login e cadastro. */
export const estiloTitulo = 'text-4xl font-bold tracking-tight text-tinta lg:text-[3.5rem]'

/** Texto de apoio logo abaixo do título. */
export const estiloInstrucao = 'mt-2 text-base text-tinta-suave lg:text-lg'

/** Botão principal (Entrar, Criar conta). */
export const estiloBotao =
  'mt-2 h-14 rounded-[10px] bg-marca-700 px-4 text-lg font-bold text-white hover:bg-marca-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-700 disabled:opacity-60'

/** Rótulo, campo e mensagem de erro, no mesmo visual em todas as telas da autenticação. */
export function Campo({
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
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-semibold text-tinta">
        {rotulo}
      </label>
      {children}
      {dica && !erro && <p className="text-sm text-tinta-suave">{dica}</p>}
      {erro && (
        <p id={`${id}-erro`} className="text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  )
}
