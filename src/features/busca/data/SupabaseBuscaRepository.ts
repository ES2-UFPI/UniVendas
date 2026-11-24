import type { SupabaseClient } from '@supabase/supabase-js'
import { Falha } from '../../../core/falha'
import { SupabaseService } from '../../../core/supabaseService'
import type { Database } from '../../../types/database.types'
import { Item } from '../../itens/domain/Item'
import {
  MINIMO_LETRAS_BUSCA,
  type BuscaRepository,
  type FiltroBusca,
  type ResultadoBusca,
} from '../domain/BuscaRepository'

type LinhaBusca = Database['public']['Functions']['buscar_itens']['Returns'][number]

function paraResultado(linha: LinhaBusca): ResultadoBusca {
  return {
    item: new Item(
      linha.id,
      linha.vendedor_id,
      linha.categoria_id,
      linha.nome,
      linha.preco,
      // O tipo gerado não marca, mas descrição e foto podem vir nulas.
      linha.descricao ?? '',
      linha.foto_url ?? null,
      linha.disponivel,
    ),
    vendedorNome: linha.vendedor_nome,
    noCampusAgora: linha.no_campus_agora,
    referencia: linha.referencia || null,
  }
}

export class SupabaseBuscaRepository implements BuscaRepository {
  private readonly client: SupabaseClient<Database>

  // O cliente pode ser passado de fora para os testes; no app, usa o do Singleton.
  constructor(client: SupabaseClient<Database> = SupabaseService.getInstance().client) {
    this.client = client
  }

  async buscar(filtro: FiltroBusca): Promise<ResultadoBusca[]> {
    const texto = filtro.texto.trim()
    const categoria = filtro.categoriaId ?? null
    // Sem categoria, o texto curto traria quase tudo. O servidor também devolve vazio, mas assim nem gasta a chamada.
    if (categoria === null && texto.length < MINIMO_LETRAS_BUSCA) return []

    // A função ignora maiúsculas e acentos, desce pelas categorias filhas e já ordena:
    // disponíveis primeiro, esgotados depois (RN09).
    const { data, error } = await this.client.rpc(
      'buscar_itens',
      categoria === null ? { texto } : { texto, categoria },
    )

    if (error || !data) {
      throw new Falha(
        'Não foi possível buscar agora. Tente de novo.',
        error?.code ?? 'desconhecido',
      )
    }
    return data.map(paraResultado)
  }

  async detalhar(itemId: string): Promise<ResultadoBusca | null> {
    const { data, error } = await this.client.rpc('buscar_itens', { item: itemId })

    if (error || !data) {
      throw new Falha(
        'Não foi possível abrir o item agora. Tente de novo.',
        error?.code ?? 'desconhecido',
      )
    }
    return data.length > 0 ? paraResultado(data[0]) : null
  }
}
