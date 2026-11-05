import { useState } from 'react'
import type { Categoria } from '../domain/Categoria'
import { validarItem, type DadosItem, type ErrosItem } from '../domain/validacoesItem'

const VAZIO: DadosItem = { nome: '', descricao: '', preco: '', categoriaId: null }

interface Opcoes {
  /** Categorias da tabela `categorias`; só as folhas são aceitas no item (RN07). */
  categorias?: Categoria[]
}

/**
 * ViewModel dos itens do vendedor (US08). Por enquanto guarda os campos do item
 * e valida nome, preço e categoria folha (RN07).
 */
export function useItensViewModel({ categorias = [] }: Opcoes = {}) {
  const [dados, setDados] = useState<DadosItem>(VAZIO)
  const [erros, setErros] = useState<ErrosItem>({})

  function alterar<C extends keyof DadosItem>(campo: C, valor: DadosItem[C]) {
    setDados((atual) => ({ ...atual, [campo]: valor }))
  }

  /** Valida os campos, mostra os erros e devolve true se o item pode ser salvo. */
  function validar(): boolean {
    const novosErros = validarItem(dados, categorias)
    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  return { dados, erros, alterar, validar }
}
