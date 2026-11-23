import type { Item } from '../../itens/domain/Item'

/** O que a pessoa procura. O filtro por categoria entra com a US12. */
export interface FiltroBusca {
  /** Nome do produto ou do vendedor; maiúsculas e acentos não importam. */
  texto: string
}

/** Um item encontrado, com o vendedor dele e se ele está no mapa agora. */
export interface ResultadoBusca {
  item: Item
  vendedorNome: string
  /** O vendedor tem presença com sinal nos últimos 30 minutos (RN16). */
  noCampusAgora: boolean
}

/** Menos letras que isso devolveria quase tudo; a busca fica vazia. */
export const MINIMO_LETRAS_BUSCA = 2

/**
 * Padrão Repository: a tela de busca depende desta interface, não do Supabase.
 * `buscar` devolve os disponíveis primeiro e os esgotados depois (RN09). Lança `Falha` se não conseguir.
 */
export interface BuscaRepository {
  buscar(filtro: FiltroBusca): Promise<ResultadoBusca[]>
}
