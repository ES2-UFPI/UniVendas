import { formatarPreco } from '../../itens/domain/validacoesItem'
import type { ResultadoBusca } from '../domain/BuscaRepository'
import { ondeEncontrar } from '../domain/situacaoDoItem'
import { FotoOuInicial } from './FotoOuInicial'
import { SeloSituacao } from './SeloSituacao'

/**
 * Um item da lista da busca: foto, situação, nome, vendedor, onde achar e preço.
 * Esgotado fica riscado e mais apagado, depois dos disponíveis (RN09).
 */
export function CartaoResultado({ resultado }: { resultado: ResultadoBusca }) {
  const { item } = resultado
  return (
    <article className="flex gap-4 border-b border-[#e7ece8] py-4">
      <FotoOuInicial
        url={item.fotoUrl}
        nome={item.nome}
        className={`h-[82px] w-[82px] shrink-0 rounded-2xl sm:h-[94px] sm:w-[94px] ${item.disponivel ? '' : 'opacity-60'}`}
      />
      <div className="flex min-w-0 flex-col">
        <SeloSituacao resultado={resultado} className="text-xs" />
        <h4
          className={`mt-1 text-[15px] leading-snug font-bold break-words sm:text-base ${item.disponivel ? 'text-tinta' : 'text-tinta-suave line-through'}`}
        >
          {item.nome}
        </h4>
        <p className="mt-0.5 truncate text-[13px] text-tinta-suave">{resultado.vendedorNome}</p>
        <p className="truncate text-xs text-tinta-suave sm:text-[13px]">
          {ondeEncontrar(resultado)}
        </p>
        <p className="mt-1 text-[15px] font-bold text-[#233f2c]">{formatarPreco(item.preco)}</p>
      </div>
    </article>
  )
}
