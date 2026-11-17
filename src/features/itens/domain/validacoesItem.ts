import type { Categoria } from './Categoria'

/** Campos do formulário de item (US08). O preço fica como texto até salvar. */
export interface DadosItem {
  nome: string
  descricao: string
  preco: string
  categoriaId: number | null
}

export type ErrosItem = Partial<Record<'nome' | 'preco' | 'categoria', string>>

// Reais com até dois centavos, com vírgula ou ponto: "5", "5,50", "5.5". O sinal entra para avisar do negativo.
const FORMATO_PRECO = /^-?\d+([.,]\d{1,2})?$/

/**
 * Lê o preço digitado. Aceita "R$" e espaços. Devolve null quando o texto não é um preço.
 * Ex.: "R$ 5,50" vira 5.5.
 */
export function lerPreco(texto: string): number | null {
  const limpo = texto.replace(/R\$/i, '').replace(/\s/g, '')
  if (!FORMATO_PRECO.test(limpo)) return null
  return Number(limpo.replace(',', '.'))
}

const REAIS = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Mostra o preço em reais. Ex.: 5.5 vira "R$ 5,50". */
export function formatarPreco(valor: number): string {
  return REAIS.format(valor)
}

/** Valida os dados do item (RN07). Sem erros, devolve um objeto vazio. */
export function validarItem(dados: DadosItem, categorias: Categoria[]): ErrosItem {
  const erros: ErrosItem = {}

  if (dados.nome.trim() === '') {
    erros.nome = 'Informe o nome do item.'
  }

  if (dados.preco.trim() === '') {
    erros.preco = 'Informe o preço.'
  } else {
    const preco = lerPreco(dados.preco)
    if (preco === null) erros.preco = 'Use um valor como 5 ou 5,50.'
    else if (preco < 0) erros.preco = 'O preço não pode ser negativo.'
  }

  if (dados.categoriaId === null) {
    erros.categoria = 'Escolha a categoria.'
  } else {
    const categoria = categorias.find((c) => c.id === dados.categoriaId)
    if (!categoria?.folha) {
      erros.categoria = 'Escolha a categoria mais específica, por exemplo Brownie, e não Doces.'
    }
  }

  return erros
}
