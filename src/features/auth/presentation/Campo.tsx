import type { ReactNode } from 'react'

export const estiloCampo =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/30 aria-[invalid=true]:border-red-600'

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
