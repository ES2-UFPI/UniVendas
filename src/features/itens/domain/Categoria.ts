/** Uma categoria da árvore (ex.: Alimentação > Doces > Brownie). Só a folha classifica um item (RN07). */
export interface Categoria {
  id: number
  nome: string
  /** Nulo na raiz. */
  categoriaPaiId: number | null
  folha: boolean
}

/** Um grupo do campo de categoria: o caminho da categoria pai e as folhas dentro dela. */
export interface GrupoDeFolhas {
  grupo: string
  folhas: Categoria[]
}

/**
 * Prepara a escolha da categoria do item: só as folhas (RN07), agrupadas pelo caminho
 * da categoria pai (ex.: "Alimentação › Doces" com Bolo e Brownie), tudo em ordem alfabética.
 */
export function agruparFolhas(categorias: Categoria[]): GrupoDeFolhas[] {
  const porId = new Map(categorias.map((c) => [c.id, c]))

  function caminho(id: number | null): string {
    const nomes: string[] = []
    for (let atual = id === null ? undefined : porId.get(id); atual;) {
      nomes.unshift(atual.nome)
      atual = atual.categoriaPaiId === null ? undefined : porId.get(atual.categoriaPaiId)
    }
    return nomes.join(' › ')
  }

  const grupos = new Map<string, Categoria[]>()
  for (const folha of categorias.filter((c) => c.folha)) {
    const nome = caminho(folha.categoriaPaiId)
    grupos.set(nome, [...(grupos.get(nome) ?? []), folha])
  }

  const ordem = (a: string, b: string) => a.localeCompare(b, 'pt-BR')
  return [...grupos]
    .sort(([a], [b]) => ordem(a, b))
    .map(([grupo, folhas]) => ({ grupo, folhas: folhas.sort((a, b) => ordem(a.nome, b.nome)) }))
}
