import type { HTMLAttributes } from 'react'

/** Caixa branca com borda leve e cantos de 20 px, onde ficam formulários e listas (US21). */
export function Cartao({ className = '', ...resto }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-cartao border border-linha bg-white p-5 md:p-6 ${className}`}
      {...resto}
    />
  )
}
