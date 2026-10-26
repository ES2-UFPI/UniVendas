import type { SupabaseClient } from '@supabase/supabase-js'
import type { LatLng } from '../../../core/localizacaoService'
import { Falha } from '../../../core/falha'
import { SupabaseService } from '../../../core/supabaseService'
import type { Database } from '../../../types/database.types'
import { Presenca } from '../domain/Presenca'
import {
  ResultadoRegistro,
  type PresencaRepository,
  type Unsubscribe,
} from '../domain/PresencaRepository'

const MENSAGEM_PADRAO = 'Não foi possível ficar visível no mapa. Tente de novo.'
const MENSAGEM_LISTAR = 'Não foi possível carregar os vendedores do mapa. Tente de novo.'
const NOME_PADRAO = 'Vendedor'

/** Traduz os códigos de erro do PostgreSQL (da função `registrar_presenca`) para mensagens que o usuário entende. */
function paraFalha(erro: { code?: string }): Falha {
  if (erro.code === '42501') {
    return new Falha(
      'Só vendedores podem ficar visíveis no mapa. Crie seu perfil de vendedor.',
      'nao-e-vendedor',
    )
  }
  if (erro.code === '22023') {
    return new Falha(
      'Confira a localização e a referência (até 80 caracteres) e tente de novo.',
      'dados-invalidos',
    )
  }
  return new Falha(MENSAGEM_PADRAO, erro.code ?? 'desconhecido')
}

/** Colunas de `presenca` e o nome do vendedor, que o balão do marcador mostra. */
const COLUNAS =
  'vendedor_id, latitude, longitude, ponto_escolhido, referencia, ultimo_sinal_em, vendedores(nome_exibicao)'

export class SupabasePresencaRepository implements PresencaRepository {
  private readonly client: SupabaseClient<Database>
  private readonly agora: () => Date
  private canais = 0

  // O cliente e o relógio podem ser passados de fora para os testes; no app, usa o do Singleton e a hora real.
  constructor(
    client: SupabaseClient<Database> = SupabaseService.getInstance().client,
    agora: () => Date = () => new Date(),
  ) {
    this.client = client
    this.agora = agora
  }

  async registrar(
    real: LatLng,
    ponto: LatLng | null,
    referencia: string,
  ): Promise<ResultadoRegistro> {
    // As regras (perímetro, ponto escolhido, quem é o vendedor) ficam na função do banco; o app só a chama.
    const { data, error } = await this.client.rpc('registrar_presenca', {
      lat_real: real.latitude,
      lng_real: real.longitude,
      lat_ponto: ponto?.latitude,
      lng_ponto: ponto?.longitude,
      referencia: referencia.trim() || undefined,
    })

    if (error) throw paraFalha(error)

    // A função devolve 'ok', 'fora_do_campus' ou 'ponto_fora_do_campus'.
    switch (data) {
      case 'ok':
        return ResultadoRegistro.ATIVO
      case 'fora_do_campus':
        return ResultadoRegistro.FORA_DO_CAMPUS
      case 'ponto_fora_do_campus':
        throw new Falha('Escolha um ponto dentro do campus.', 'ponto-fora-do-campus')
      default:
        throw new Falha(MENSAGEM_PADRAO, 'resposta-inesperada')
    }
  }

  async listarAtivos(): Promise<Presenca[]> {
    // O RLS só deixa ler quem está logado (RN04). A presença e o nome do vendedor vêm numa consulta só.
    const { data, error } = await this.client.from('presenca').select(COLUNAS)
    if (error) throw new Falha(MENSAGEM_LISTAR, error.code ?? 'desconhecido')

    const agora = this.agora()
    return data
      .map(
        (linha) =>
          new Presenca(
            linha.vendedor_id,
            linha.vendedores?.nome_exibicao ?? NOME_PADRAO,
            { latitude: linha.latitude, longitude: linha.longitude },
            linha.ponto_escolhido,
            linha.referencia,
            new Date(linha.ultimo_sinal_em),
          ),
      )
      .filter((presenca) => presenca.estaAtiva(agora))
  }

  observarAtivos(callback: (ativos: Presenca[]) => void): Unsubscribe {
    let cancelado = false
    let ultimaBusca = 0

    // A cada evento, busca a lista completa de novo. Só a busca mais recente vale: se duas eventos
    // chegarem juntos, a resposta atrasada da primeira não pode sobrescrever a da segunda.
    const atualizar = () => {
      const busca = ++ultimaBusca
      this.listarAtivos()
        .then((ativos) => {
          if (!cancelado && busca === ultimaBusca) callback(ativos)
        })
        .catch(() => {
          // Mantém a lista anterior; o próximo evento tenta de novo.
        })
    }

    const canal = this.client
      .channel(`presenca-ativos-${++this.canais}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presenca' }, atualizar)
      .subscribe()

    return () => {
      cancelado = true
      void this.client.removeChannel(canal)
    }
  }
}
