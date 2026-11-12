import { useEffect, useState } from 'react'
import { Falha } from '../../../core/falha'
import { SupabaseVendedorRepository } from '../../vendedores/data/SupabaseVendedorRepository'
import type { VendedorRepository } from '../../vendedores/domain/VendedorRepository'
import { SupabaseItemRepository } from '../data/SupabaseItemRepository'
import type { Categoria } from '../domain/Categoria'
import type { Item } from '../domain/Item'
import type { ItemRepository } from '../domain/ItemRepository'
import { validarItem, type DadosItem, type ErrosItem } from '../domain/validacoesItem'

const VAZIO: DadosItem = { nome: '', descricao: '', preco: '', categoriaId: null }

interface Opcoes {
  /** Id da conta logada (= perfis.id). Sem ele, a lista não é carregada. */
  perfilId?: string | null
  /** Categorias da tabela `categorias`; só as folhas são aceitas no item (RN07). */
  categorias?: Categoria[]
  /** Nos testes, repositórios falsos; no app, os do Supabase. */
  repositorio?: ItemRepository
  vendedores?: VendedorRepository
}

function mensagemDe(erro: unknown, padrao: string): string {
  return erro instanceof Falha ? erro.mensagem : padrao
}

/**
 * ViewModel dos itens do vendedor (US08): carrega a lista da conta logada, remove itens
 * e guarda os campos do item com as validações de nome, preço e categoria folha (RN07).
 */
export function useItensViewModel({
  perfilId = null,
  categorias = [],
  repositorio,
  vendedores,
}: Opcoes = {}) {
  const [dados, setDados] = useState<DadosItem>(VAZIO)
  const [erros, setErros] = useState<ErrosItem>({})
  const [itens, setItens] = useState<Item[]>([])
  const [carregando, setCarregando] = useState(perfilId !== null)
  const [semPerfil, setSemPerfil] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!perfilId) return
    let ativo = true

    async function carregar(id: string) {
      try {
        const vendedor = await (vendedores ?? new SupabaseVendedorRepository()).buscarDoUsuario(id)
        if (!vendedor) {
          if (ativo) setSemPerfil(true)
          return
        }
        const lista = await (repositorio ?? new SupabaseItemRepository()).listar(vendedor.id)
        if (ativo) setItens(lista)
      } catch (e) {
        if (ativo) setErro(mensagemDe(e, 'Não foi possível carregar seus itens. Tente de novo.'))
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    void carregar(perfilId)
    // Se a tela fechar antes de a busca terminar, a resposta é descartada.
    return () => {
      ativo = false
    }
  }, [perfilId, repositorio, vendedores])

  function alterar<C extends keyof DadosItem>(campo: C, valor: DadosItem[C]) {
    setDados((atual) => ({ ...atual, [campo]: valor }))
  }

  /** Valida os campos, mostra os erros e devolve true se o item pode ser salvo. */
  function validar(): boolean {
    const novosErros = validarItem(dados, categorias)
    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  /** Remove o item e tira ele da lista. Devolve true se deu certo; senão, o motivo fica em `erro`. */
  async function remover(itemId: string): Promise<boolean> {
    setErro(null)
    try {
      await (repositorio ?? new SupabaseItemRepository()).remover(itemId)
      setItens((atual) => atual.filter((item) => item.id !== itemId))
      return true
    } catch (e) {
      setErro(mensagemDe(e, 'Não foi possível remover o item. Tente de novo.'))
      return false
    }
  }

  return { dados, erros, alterar, validar, itens, carregando, semPerfil, erro, remover }
}
