import type { SupabaseClient } from '@supabase/supabase-js'
import { Falha } from '../../../core/falha'
import { SupabaseService } from '../../../core/supabaseService'
import type { Database } from '../../../types/database.types'
import { Item } from '../domain/Item'
import type { ItemRepository } from '../domain/ItemRepository'

type ItemRow = Database['public']['Tables']['itens']['Row']

const BUCKET_FOTOS = 'fotos'

const EXTENSOES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function paraItem(linha: ItemRow): Item {
  return new Item(
    linha.id,
    linha.vendedor_id,
    linha.categoria_id,
    linha.nome,
    linha.preco,
    linha.descricao ?? '',
    linha.foto_url,
    linha.disponivel,
  )
}

/** Colunas que o dono pode mudar; são as mesmas que o banco libera no update. */
function dadosEditaveis(item: Item) {
  return {
    categoria_id: item.categoriaId,
    nome: item.nome,
    descricao: item.descricao || null,
    preco: item.preco,
    foto_url: item.fotoUrl,
    disponivel: item.disponivel,
  }
}

const ITEM_NAO_ENCONTRADO = new Falha(
  'Este item não existe mais ou não é seu.',
  'item-nao-encontrado',
)

/** Traduz os códigos de erro do banco para mensagens que o usuário entende. */
function paraFalha(erro: { code?: string }): Falha {
  if (erro.code === '23514') {
    return new Falha(
      'Confira o nome, o preço e a categoria (escolha a mais específica, como Brownie).',
      'dados-invalidos',
    )
  }
  if (erro.code === '42501') {
    return new Falha('Só o dono pode mudar os itens deste vendedor.', 'sem-permissao')
  }
  // PGRST116 = o update não achou a linha: não existe ou a RLS escondeu (item de outro vendedor).
  if (erro.code === 'PGRST116') return ITEM_NAO_ENCONTRADO
  return new Falha('Não foi possível salvar o item. Tente de novo.', erro.code ?? 'desconhecido')
}

export class SupabaseItemRepository implements ItemRepository {
  private readonly client: SupabaseClient<Database>

  // O cliente pode ser passado de fora para os testes; no app, usa o do Singleton.
  constructor(client: SupabaseClient<Database> = SupabaseService.getInstance().client) {
    this.client = client
  }

  async listar(vendedorId: string): Promise<Item[]> {
    const { data, error } = await this.client
      .from('itens')
      .select('*')
      .eq('vendedor_id', vendedorId)
      .order('nome')

    if (error || !data) {
      throw new Falha(
        'Não foi possível carregar os itens. Tente de novo.',
        error?.code ?? 'desconhecido',
      )
    }
    return data.map(paraItem)
  }

  async criar(item: Item): Promise<Item> {
    // id e criado_em ficam com o padrão do banco, que nem libera essas colunas no insert.
    const { data, error } = await this.client
      .from('itens')
      .insert({ vendedor_id: item.vendedorId, ...dadosEditaveis(item) })
      .select()
      .single()

    if (error || !data) throw paraFalha(error ?? {})
    return paraItem(data)
  }

  async editar(item: Item): Promise<Item> {
    const { data, error } = await this.client
      .from('itens')
      .update(dadosEditaveis(item))
      .eq('id', item.id)
      .select()
      .single()

    if (error || !data) throw paraFalha(error ?? {})
    return paraItem(data)
  }

  async remover(itemId: string): Promise<void> {
    // O select devolve as linhas apagadas: a RLS não dá erro com item de outro vendedor, só apaga zero linhas.
    const { data, error } = await this.client.from('itens').delete().eq('id', itemId).select('id')

    if (error) {
      throw new Falha(
        'Não foi possível remover o item. Tente de novo.',
        error.code ?? 'desconhecido',
      )
    }
    if (!data || data.length === 0) throw ITEM_NAO_ENCONTRADO
  }

  async enviarFoto(perfilId: string, foto: Blob): Promise<string> {
    const extensao = EXTENSOES[foto.type]
    if (!extensao) {
      throw new Falha('A foto precisa ser JPEG, PNG ou WebP.', 'foto-formato-invalido')
    }
    // A pasta é a da conta (regra do bucket). Nome com a hora: trocar a foto gera uma URL nova.
    const caminho = `${perfilId}/item-${Date.now()}.${extensao}`
    const { error } = await this.client.storage
      .from(BUCKET_FOTOS)
      .upload(caminho, foto, { contentType: foto.type })
    if (error) {
      throw new Falha('Não foi possível enviar a foto. Tente outra imagem.', 'foto-nao-enviada')
    }
    return this.client.storage.from(BUCKET_FOTOS).getPublicUrl(caminho).data.publicUrl
  }
}
