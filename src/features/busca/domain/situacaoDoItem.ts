import type { ResultadoBusca } from './BuscaRepository'

export type TomDaSituacao = 'agora' | 'disponivel' | 'esgotado'

/** O selo do item na busca e no detalhe. */
export interface Situacao {
  rotulo: string
  tom: TomDaSituacao
}

/**
 * "Disponível agora" só quando o item está disponível e o vendedor está no mapa (RN16);
 * disponível com o vendedor fora do mapa é só "Disponível"; o resto é "Esgotado" (RN08).
 */
export function situacaoDoItem({ item, noCampusAgora }: ResultadoBusca): Situacao {
  if (!item.disponivel) return { rotulo: 'Esgotado', tom: 'esgotado' }
  if (noCampusAgora) return { rotulo: 'Disponível agora', tom: 'agora' }
  return { rotulo: 'Disponível', tom: 'disponivel' }
}

/** Onde achar o vendedor: a referência dele (RN18), ou se está ou não no campus agora. */
export function ondeEncontrar({ noCampusAgora, referencia }: ResultadoBusca): string {
  if (!noCampusAgora) return 'Fora do campus agora'
  return referencia ?? 'No campus agora'
}
