import type { ReactNode } from 'react'
import { Icone } from './Icone'
import type { NomeIcone } from './icones'

export type TipoAviso = 'sucesso' | 'info' | 'alerta' | 'erro'

const TIPOS: Record<TipoAviso, { classes: string; icone: NomeIcone }> = {
  sucesso: { classes: 'bg-marca-50 text-marca-600', icone: 'check' },
  info: { classes: 'bg-blue-50 text-info', icone: 'info' },
  alerta: { classes: 'bg-amber-50 text-alerta', icone: 'alerta' },
  erro: { classes: 'bg-red-50 text-perigo', icone: 'alerta' },
}

/**
 * Aviso do tema (US21): sucesso, informação, alerta ou erro. O erro usa `role="alert"`, para o
 * leitor de tela anunciar na hora; os outros, `role="status"`.
 */
export function Aviso({
  tipo = 'info',
  className = '',
  children,
}: {
  tipo?: TipoAviso
  className?: string
  children: ReactNode
}) {
  const { classes, icone } = TIPOS[tipo]
  return (
    <div
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-controle p-4 text-[15px] leading-[21px] ${classes} ${className}`}
    >
      <Icone nome={icone} className="mt-px h-5 w-5" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
