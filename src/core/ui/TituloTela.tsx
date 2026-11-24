import type { ReactNode } from 'react'

/** Título de uma tela no tema (US21): Archivo Black grande e uma linha de apoio. */
export function TituloTela({
  titulo,
  apoio,
  children,
}: {
  titulo: string
  apoio?: string
  children?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-2">
      <h2 className="font-titulo text-[28px] leading-[34px] tracking-[-0.035em] text-tinta md:text-4xl md:leading-[43px]">
        {titulo}
      </h2>
      {apoio && <p className="text-base text-tinta-suave md:text-[17px]">{apoio}</p>}
      {children}
    </header>
  )
}
