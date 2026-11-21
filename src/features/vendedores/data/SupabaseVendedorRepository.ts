import type { SupabaseClient } from '@supabase/supabase-js'
import { Falha } from '../../../core/falha'
import { SupabaseService } from '../../../core/supabaseService'
import type { Database } from '../../../types/database.types'
import { paraItem } from '../../itens/data/SupabaseItemRepository'
import { LIMITE_SEM_SINAL_MS } from '../../presenca/domain/Presenca'
import { Contato, type CanalTipo } from '../domain/Contato'
import { PerfilVendedor } from '../domain/PerfilVendedor'
import type { Vendedor } from '../domain/Vendedor'
import { VendedorFactory } from '../domain/VendedorFactory'
import type { VendedorRepository } from '../domain/VendedorRepository'

const BUCKET_FOTOS = 'fotos'

/** O vendedor, os contatos, os itens e a presença, numa consulta só. */
const COLUNAS_PERFIL = '*, contatos(canal, valor), itens(*), presenca(ultimo_sinal_em)'

const CANAIS: readonly string[] = ['whatsapp', 'telefone'] satisfies CanalTipo[]

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
  private readonly agora: () => Date

  // O cliente e o relógio podem ser passados de fora para os testes; no app, usa o do Singleton e a hora real.
  constructor(
    client: SupabaseClient<Database> = SupabaseService.getInstance().client,
    agora: () => Date = () => new Date(),
  ) {
    this.client = client
    this.agora = agora
  }

  async buscarPerfil(id: string): Promise<PerfilVendedor | null> {
    // O RLS só deixa ler quem está logado (RN04). maybeSingle: sem linha vira null, não erro.
    const { data: linha, error } = await this.client
      .from('vendedores')
      .select(COLUNAS_PERFIL)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new Falha(
        'Não foi possível carregar o perfil. Tente de novo.',
        error.code ?? 'desconhecido',
      )
    }
    if (!linha) return null

    const { contatos, itens, presenca, ...dadosVendedor } = linha
    // Mesma regra do mapa: ativo é quem mandou sinal há menos de 30 minutos (RN16).
    const ativoAgora =
      presenca !== null &&
      this.agora().getTime() - new Date(presenca.ultimo_sinal_em).getTime() < LIMITE_SEM_SINAL_MS

    return new PerfilVendedor(
      VendedorFactory.criar(dadosVendedor),
      contatos
        .filter((c) => CANAIS.includes(c.canal))
        .map((c) => new Contato(c.canal as CanalTipo, c.valor)),
      itens.map(paraItem),
      ativoAgora,
    )
  }

  async criar(vendedor: Vendedor, contatos: Contato[], foto?: Blob): Promise<Vendedor> {
    const caminhoFoto = foto ? await this.enviarFoto(vendedor.perfilId, foto) : null
    const fotoUrl = caminhoFoto
      ? this.client.storage.from(BUCKET_FOTOS).getPublicUrl(caminhoFoto).data.publicUrl
      : null

    // Só as colunas do formulário: o banco só libera estas no insert, e o tipo fica 'ambulante' por padrão.
    const { data: linha, error } = await this.client
      .from('vendedores')
      .insert({
        perfil_id: vendedor.perfilId,
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

  async atualizarPerfil(vendedor: Vendedor, contatos: Contato[], foto?: Blob): Promise<Vendedor> {
    // Sem contato o perfil não vale (RN06); apagar todos pela lista vazia seria um erro.
    if (contatos.length === 0) {
      throw new Falha('Informe ao menos um contato.', 'sem-contatos')
    }

    const caminhoFoto = foto ? await this.enviarFoto(vendedor.perfilId, foto) : null
    // Só as colunas que o dono pode mudar. Sem foto nova, a foto_url nem entra no update.
    const dados = {
      nome_exibicao: vendedor.nomeExibicao,
      descricao: vendedor.descricao || null,
      ...(caminhoFoto && {
        foto_url: this.client.storage.from(BUCKET_FOTOS).getPublicUrl(caminhoFoto).data.publicUrl,
      }),
    }

    const { data: linha, error } = await this.client
      .from('vendedores')
      .update(dados)
      .eq('id', vendedor.id)
      .select()
      .single()

    if (error || !linha) {
      await this.apagarFoto(caminhoFoto)
      // PGRST116: o update não achou a linha, porque não existe ou a RLS escondeu (perfil de outra pessoa).
      if (error?.code === 'PGRST116') {
        throw new Falha('Este perfil não existe ou não é seu.', 'perfil-nao-encontrado')
      }
      throw paraFalha(error ?? {})
    }

    await this.salvarContatos(linha.id, contatos)
    return VendedorFactory.criar(linha)
  }

  async buscarDoUsuario(perfilId: string): Promise<Vendedor | null> {
    const { data, error } = await this.client
      .from('vendedores')
      .select('*')
      .eq('perfil_id', perfilId)
      .maybeSingle()

    if (error) {
      throw new Falha(
        'Não foi possível carregar seu perfil de vendedor. Tente de novo.',
        error.code ?? 'desconhecido',
      )
    }
    return data ? VendedorFactory.criar(data) : null
  }

  /**
   * Deixa os contatos do vendedor iguais à lista. O banco só deixa mudar o `valor` de um contato
   * (trocar o canal é apagar e criar), então cada canal é atualizado ou, se não existe, criado.
   * Os canais que saíram da lista são apagados por último, para nunca ficar sem contato (RN06).
   */
  private async salvarContatos(vendedorId: string, contatos: Contato[]): Promise<void> {
    for (const contato of contatos) {
      const { data: atualizados, error } = await this.client
        .from('contatos')
        .update({ valor: contato.valor })
        .eq('vendedor_id', vendedorId)
        .eq('canal', contato.canal)
        .select('id')
      if (error) throw paraFalha(error)

      if (atualizados.length === 0) {
        const { error: erroCriar } = await this.client
          .from('contatos')
          .insert({ vendedor_id: vendedorId, canal: contato.canal, valor: contato.valor })
        if (erroCriar) throw paraFalha(erroCriar)
      }
    }

    const { error: erroApagar } = await this.client
      .from('contatos')
      .delete()
      .eq('vendedor_id', vendedorId)
      .not('canal', 'in', `(${contatos.map((c) => c.canal).join(',')})`)
    if (erroApagar) throw paraFalha(erroApagar)
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
