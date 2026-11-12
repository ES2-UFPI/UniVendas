import { useEffect, useState } from 'react'
import { comprimirImagem } from '../../../core/comprimirImagem'
import { Falha } from '../../../core/falha'
import { SupabaseVendedorRepository } from '../../vendedores/data/SupabaseVendedorRepository'
import type { VendedorRepository } from '../../vendedores/domain/VendedorRepository'
import { SupabaseItemRepository } from '../data/SupabaseItemRepository'
import type { Categoria } from '../domain/Categoria'
import { Item } from '../domain/Item'
import type { ItemRepository } from '../domain/ItemRepository'
import { lerPreco, validarItem, type DadosItem, type ErrosItem } from '../domain/validacoesItem'

const VAZIO: DadosItem = { nome: '', descricao: '', preco: '', categoriaId: null }

interface Opcoes {
  /** Id da conta logada (= perfis.id). Sem ele, a lista não é carregada. */
  perfilId?: string | null
  /** Só para os testes: categorias fixas. No app, elas vêm do `ItemRepository` junto com a lista. */
  categorias?: Categoria[]
  /** Nos testes, repositórios falsos; no app, os do Supabase. */
  repositorio?: ItemRepository
  vendedores?: VendedorRepository
  /** Nos testes, uma compressão falsa (o jsdom não tem canvas); no app, a do `core`. */
  comprimir?: (foto: Blob) => Promise<Blob>
}

/** Preço do item no formato do campo: 5.5 vira "5,50". */
function precoNoCampo(preco: number): string {
  return preco.toFixed(2).replace('.', ',')
}

const porNome = (a: Item, b: Item) => a.nome.localeCompare(b.nome, 'pt-BR')

function mensagemDe(erro: unknown, padrao: string): string {
  return erro instanceof Falha ? erro.mensagem : padrao
}

/**
 * ViewModel dos itens do vendedor (US08): carrega a lista e as categorias da conta logada,
 * remove itens e cuida do formulário de criar e editar, com as validações de nome, preço e
 * categoria folha (RN07) e a foto comprimida no celular (RN10).
 */
export function useItensViewModel({
  perfilId = null,
  categorias: categoriasFixas,
  repositorio,
  vendedores,
  comprimir = comprimirImagem,
}: Opcoes = {}) {
  const [dados, setDados] = useState<DadosItem>(VAZIO)
  const [erros, setErros] = useState<ErrosItem>({})
  const [itens, setItens] = useState<Item[]>([])
  const [categoriasCarregadas, setCategoriasCarregadas] = useState<Categoria[]>([])
  const [vendedorId, setVendedorId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(perfilId !== null)
  const [semPerfil, setSemPerfil] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [formularioAberto, setFormularioAberto] = useState(false)
  const [editando, setEditando] = useState<Item | null>(null)
  const [fotoNova, setFotoNova] = useState<Blob | null>(null)
  const [previaNova, setPreviaNova] = useState<string | null>(null)
  const [erroFoto, setErroFoto] = useState<string | null>(null)
  const [preparandoFoto, setPreparandoFoto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)

  const categorias = categoriasFixas ?? categoriasCarregadas

  // Libera a prévia anterior da memória quando a foto muda ou a tela fecha.
  useEffect(() => {
    return () => {
      if (previaNova) URL.revokeObjectURL(previaNova)
    }
  }, [previaNova])

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
        const repo = repositorio ?? new SupabaseItemRepository()
        const [lista, arvore] = await Promise.all([
          repo.listar(vendedor.id),
          repo.listarCategorias(),
        ])
        if (ativo) {
          setVendedorId(vendedor.id)
          setItens(lista)
          setCategoriasCarregadas(arvore)
        }
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

  function abrirFormulario(item: Item | null) {
    setEditando(item)
    setDados(
      item
        ? {
            nome: item.nome,
            descricao: item.descricao,
            preco: precoNoCampo(item.preco),
            categoriaId: item.categoriaId,
          }
        : VAZIO,
    )
    setErros({})
    setFotoNova(null)
    setPreviaNova(null)
    setErroFoto(null)
    setErroFormulario(null)
    setFormularioAberto(true)
  }

  /** Abre o formulário vazio, para um item novo. */
  function novo() {
    abrirFormulario(null)
  }

  /** Abre o formulário com os dados de um item da lista. */
  function editar(item: Item) {
    abrirFormulario(item)
  }

  function cancelar() {
    setFormularioAberto(false)
    setEditando(null)
  }

  /** Comprime a foto escolhida no celular (RN10). `null` desfaz a escolha. */
  async function escolherFoto(arquivo: Blob | null) {
    setErroFoto(null)
    setFotoNova(null)
    setPreviaNova(null)
    if (!arquivo) return
    setPreparandoFoto(true)
    try {
      const comprimida = await comprimir(arquivo)
      setFotoNova(comprimida)
      setPreviaNova(
        typeof URL.createObjectURL === 'function' ? URL.createObjectURL(comprimida) : null,
      )
    } catch (e) {
      setErroFoto(mensagemDe(e, 'Não foi possível usar esta foto. Tente outra.'))
    } finally {
      setPreparandoFoto(false)
    }
  }

  /**
   * Cria ou edita o item do formulário. A foto nova sobe antes, para a pasta da conta.
   * Devolve true se deu certo (o formulário fecha e a lista é atualizada).
   */
  async function salvar(): Promise<boolean> {
    setErroFormulario(null)
    if (!validar() || preparandoFoto || !perfilId || !vendedorId) return false

    setSalvando(true)
    try {
      const repo = repositorio ?? new SupabaseItemRepository()
      const fotoUrl = fotoNova
        ? await repo.enviarFoto(perfilId, fotoNova)
        : (editando?.fotoUrl ?? null)
      const item = new Item(
        editando?.id ?? '',
        vendedorId,
        dados.categoriaId as number,
        dados.nome.trim(),
        lerPreco(dados.preco) as number,
        dados.descricao.trim(),
        fotoUrl,
        editando?.disponivel ?? true,
      )
      const salvo = editando ? await repo.editar(item) : await repo.criar(item)
      setItens((atual) => [...atual.filter((i) => i.id !== salvo.id), salvo].sort(porNome))
      setFormularioAberto(false)
      setEditando(null)
      return true
    } catch (e) {
      setErroFormulario(mensagemDe(e, 'Não foi possível salvar o item. Tente de novo.'))
      return false
    } finally {
      setSalvando(false)
    }
  }

  return {
    dados,
    erros,
    alterar,
    validar,
    itens,
    categorias,
    carregando,
    semPerfil,
    erro,
    remover,
    formularioAberto,
    editando,
    novo,
    editar,
    cancelar,
    previaFoto: previaNova ?? editando?.fotoUrl ?? null,
    erroFoto,
    preparandoFoto,
    escolherFoto,
    salvando,
    erroFormulario,
    salvar,
  }
}
