import type { ReactNode } from 'react'

/** Classes do campo de texto do tema: borda clara, verde ao focar e vermelha com erro. */
export const estiloEntrada =
  'h-[52px] w-full rounded-controle border border-borda bg-white px-4 text-base text-tinta placeholder:text-tinta-suave/80 focus:border-marca-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-marca-600/25 aria-[invalid=true]:border-perigo disabled:opacity-45'

/** O mesmo campo, em várias linhas (descrição do item, "O que você vende"). */
export const estiloAreaTexto = `${estiloEntrada.replace('h-[52px]', 'min-h-[110px]')} py-3 leading-relaxed`

interface CampoFormularioProps {
  id: string
  rotulo: string
  /** Mostra "(opcional)" ao lado do rótulo. */
  opcional?: boolean
  /** Explicação curta embaixo do campo; some quando há erro. */
  ajuda?: string
  erro?: string
  children: ReactNode
}

/**
 * Rótulo, campo e mensagem do tema (US21). O campo vem em `children`, com `id={id}`,
 * `aria-invalid` e `aria-describedby={`${id}-erro`}` quando houver erro.
 */
export function CampoFormulario({
  id,
  rotulo,
  opcional,
  ajuda,
  erro,
  children,
}: CampoFormularioProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-titulo text-sm tracking-[-0.035em] text-tinta">
        {rotulo}
        {opcional && (
          <span className="font-sans font-normal tracking-normal text-tinta-suave">
            {' '}
            (opcional)
          </span>
        )}
      </label>
      {children}
      {ajuda && !erro && (
        <p id={`${id}-ajuda`} className="text-sm text-tinta-suave">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className="text-sm text-perigo">
          {erro}
        </p>
      )}
    </div>
  )
}
