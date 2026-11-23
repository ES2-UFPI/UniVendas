import type { Item } from '../../itens/domain/Item'

/** O que a pessoa procura: um texto, uma categoria (US12) ou os dois juntos. */
export interface FiltroBusca {
  /** Nome do produto ou do vendedor; maiúsculas e acentos não importam. Com categoria, pode ficar vazio. */
  texto: string
  /** Traz os itens desta categoria e de todas as filhas (escolher Doces traz Brownie, Bolo...). */
  categoriaId?: number | null
}

/** Um item encontrado, com o vendedor dele e se ele está no mapa agora. */
export interface ResultadoBusca {
  item: Item
  vendedorNome: string
  /** O vendedor tem presença com sinal nos últimos 30 minutos (RN16). */
  noCampusAgora: boolean
}

/** Sem categoria, menos letras que isso devolveria quase tudo; a busca fica vazia. */
export const MINIMO_LETRAS_BUSCA = 2

/**
 * Padrão Repository: a tela de busca depende desta interface, não do Supabase.
 * `buscar` filtra pelo texto e, se houver, pela categoria e suas filhas.
 * Devolve os disponíveis primeiro e os esgotados depois (RN09). Lança `Falha` se não conseguir.
 */
export interface BuscaRepository {
  buscar(filtro: FiltroBusca): Promise<ResultadoBusca[]>
}
