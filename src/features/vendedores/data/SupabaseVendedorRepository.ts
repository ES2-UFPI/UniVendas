import type { SupabaseClient } from '@supabase/supabase-js'
import { Falha } from '../../../core/falha'
import { SupabaseService } from '../../../core/supabaseService'
import type { Database } from '../../../types/database.types'
import type { Contato } from '../domain/Contato'
import type { Vendedor } from '../domain/Vendedor'
import { VendedorFactory } from '../domain/VendedorFactory'
import type { VendedorRepository } from '../domain/VendedorRepository'

const BUCKET_FOTOS = 'fotos'

const EXTENSOES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/** Traduz os códigos de erro do PostgreSQL para mensagens que o usuário entende. */
function paraFalha(erro: { code?: string }): Falha {
  if (erro.code === '23505') {
    return new Falha('Você já tem um perfil de vendedor.', 'perfil-ja-existe')
  }
  if (erro.code === '23514') {
    return new Falha('Confira o nome e os contatos e tente de novo.', 'dados-invalidos')
  }
  return new Falha('Não foi possível salvar o perfil. Tente de novo.', erro.code ?? 'desconhecido')
}

export class SupabaseVendedorRepository implements VendedorRepository {
  private readonly client: SupabaseClient<Database>

  // O cliente pode ser passado de fora para os testes; no app, usa o do Singleton.
  constructor(client: SupabaseClient<Database> = SupabaseService.getInstance().client) {
    this.client = client
  }

  async criar(vendedor: Vendedor, contatos: Contato[], foto?: Blob): Promise<Vendedor> {
    const caminhoFoto = foto ? await this.enviarFoto(vendedor.perfilId, foto) : null
    const fotoUrl = caminhoFoto
      ? this.client.storage.from(BUCKET_FOTOS).getPublicUrl(caminhoFoto).data.publicUrl
      : null

    const { data: linha, error } = await this.client
      .from('vendedores')
      .insert({
        perfil_id: vendedor.perfilId,
        tipo: vendedor.tipo,
        nome_exibicao: vendedor.nomeExibicao,
        descricao: vendedor.descricao || null,
        foto_url: fotoUrl,
      })
      .select()
      .single()

    if (error || !linha) {
      await this.apagarFoto(caminhoFoto)
      throw paraFalha(error ?? {})
    }

    const { error: erroContatos } = await this.client
      .from('contatos')
      .insert(contatos.map((c) => ({ vendedor_id: linha.id, canal: c.canal, valor: c.valor })))

    if (erroContatos) {
      // Desfaz o perfil: sem contato ele não vale (RN06), e o perfil_id único impediria tentar de novo.
      await this.client.from('vendedores').delete().eq('id', linha.id)
      await this.apagarFoto(caminhoFoto)
      throw paraFalha(erroContatos)
    }

    return VendedorFactory.criar(linha)
  }

  /** Envia a foto para a pasta do usuário no bucket (fotos/<perfilId>/...) e devolve o caminho. */
  private async enviarFoto(perfilId: string, foto: Blob): Promise<string> {
    const extensao = EXTENSOES[foto.type]
    if (!extensao) {
      throw new Falha('A foto precisa ser JPEG, PNG ou WebP.', 'foto-formato-invalido')
    }
    // Nome com a hora: trocar a foto gera uma URL nova, sem a antiga presa no cache do celular.
    const caminho = `${perfilId}/perfil-${Date.now()}.${extensao}`
    const { error } = await this.client.storage
      .from(BUCKET_FOTOS)
      .upload(caminho, foto, { contentType: foto.type })
    if (error) {
      throw new Falha('Não foi possível enviar a foto. Tente outra imagem.', 'foto-nao-enviada')
    }
    return caminho
  }

  private async apagarFoto(caminho: string | null): Promise<void> {
    if (caminho) await this.client.storage.from(BUCKET_FOTOS).remove([caminho])
  }
}
