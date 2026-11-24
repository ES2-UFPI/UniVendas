import { CartaoItem } from '../../../core/ui/CartaoItem'
import type { ResultadoBusca } from '../domain/BuscaRepository'
import { ondeEncontrar } from '../domain/situacaoDoItem'
import { SeloSituacao } from './SeloSituacao'

/**
 * Um item da lista da busca: foto, situação, nome, vendedor, onde achar e preço.
 * Esgotado fica riscado e mais apagado, depois dos disponíveis (RN09).
 */
export function CartaoResultado({ resultado }: { resultado: ResultadoBusca }) {
  const { item } = resultado
  return (
    <CartaoItem
      nome={item.nome}
      preco={item.preco}
      fotoUrl={item.fotoUrl}
      vendedor={resultado.vendedorNome}
      local={ondeEncontrar(resultado)}
      selo={<SeloSituacao resultado={resultado} />}
      esgotado={!item.disponivel}
      nivelTitulo={4}
      className="border-b border-linha py-4"
    />
  )
}
