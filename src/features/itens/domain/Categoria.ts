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

/** As categorias de cima da árvore (ex.: Alimentação, Outros produtos), em ordem alfabética. */
export function raizes(categorias: Categoria[]): Categoria[] {
  return categorias
    .filter((c) => c.categoriaPaiId === null)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/**
 * A raiz da árvore onde está a categoria `id` (ex.: Brownie fica em Alimentação). É o "tipo de
 * produto" do formulário do item. Devolve undefined se o id for nulo ou não estiver na lista.
 */
export function raizDe(id: number | null, categorias: Categoria[]): Categoria | undefined {
  const porId = new Map(categorias.map((c) => [c.id, c]))
  let atual = id === null ? undefined : porId.get(id)
  // O limite de voltas protege de uma árvore com ciclo, que não deveria existir.
  for (
    let voltas = 0;
    atual && atual.categoriaPaiId !== null && voltas < categorias.length;
    voltas++
  ) {
    atual = porId.get(atual.categoriaPaiId)
  }
  return atual
}
