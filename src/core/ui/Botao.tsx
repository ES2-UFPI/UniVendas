import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { estiloBotao, type VarianteBotao } from './estiloBotao'
import { Icone } from './Icone'
import type { NomeIcone } from './icones'

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao
  icone?: NomeIcone
  children: ReactNode
}

/** Botão do tema: primário (ação principal), secundário, só texto ou de perigo (excluir). */
export function Botao({
  variante = 'primario',
  icone,
  className = '',
  type = 'button',
  children,
  ...resto
}: BotaoProps) {
  return (
    <button type={type} className={estiloBotao(variante, className)} {...resto}>
      {icone && <Icone nome={icone} className="h-[18px] w-[18px]" />}
      {children}
    </button>
  )
}
