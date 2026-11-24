import type { ReactNode } from 'react'
import { formatarPreco } from '../../features/itens/domain/validacoesItem'
import { FotoOuInicial } from './FotoOuInicial'

interface CartaoItemProps {
  nome: string
  preco: number
  fotoUrl: string | null
  /** Quem vende (ex.: "Doces da Ana"). */
  vendedor?: string
  /** Onde achar (ex.: "Perto da Biblioteca"), embaixo do vendedor. */
  local?: string
  /** O selo de cima (ex.: `<Selo>Disponível agora</Selo>`). */
  selo?: ReactNode
  /** Esgotado: nome riscado e foto apagada (RN09). */
  esgotado?: boolean
  /** `linha`: foto ao lado (listas). `coluna`: foto em cima (vitrine do perfil). */
  formato?: 'linha' | 'coluna'
  /** Nível do título do item, para seguir os títulos da tela (padrão: h3). */
  nivelTitulo?: 3 | 4
  className?: string
}

/** Cartão de um item no tema (US21): foto, selo, nome, vendedor e preço. */
export function CartaoItem({
  nome,
  preco,
  fotoUrl,
  vendedor,
  local,
  selo,
  esgotado = false,
  formato = 'linha',
  nivelTitulo = 3,
  className = '',
}: CartaoItemProps) {
  const coluna = formato === 'coluna'
  const Titulo = nivelTitulo === 4 ? 'h4' : 'h3'
  return (
    <article
      className={`flex ${coluna ? 'flex-col gap-3' : 'items-center gap-[18px]'} ${className}`}
    >
      <FotoOuInicial
        url={fotoUrl}
        nome={nome}
        className={`${coluna ? 'aspect-[4/3] w-full text-4xl' : 'h-[120px] w-[120px] text-3xl'} rounded-2xl ${esgotado ? 'opacity-60' : ''}`}
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        {selo}
        <Titulo
          className={`text-lg leading-[25px] font-bold break-words ${esgotado ? 'text-tinta-suave line-through' : 'text-tinta'}`}
        >
          {nome}
        </Titulo>
        {vendedor && <p className="truncate text-sm text-tinta-suave">{vendedor}</p>}
        {local && <p className="truncate text-sm text-tinta-suave">{local}</p>}
        <p className="text-lg font-bold text-marca-900">{formatarPreco(preco)}</p>
      </div>
    </article>
  )
}
