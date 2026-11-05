/** Uma categoria da árvore (ex.: Alimentação > Doces > Brownie). Só a folha classifica um item (RN07). */
export interface Categoria {
  id: number
  nome: string
  /** Nulo na raiz. */
  categoriaPaiId: number | null
  folha: boolean
}
