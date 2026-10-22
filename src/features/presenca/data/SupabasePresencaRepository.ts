import type { SupabaseClient } from '@supabase/supabase-js'
import type { LatLng } from '../../../core/localizacaoService'
import { Falha } from '../../../core/falha'
import { SupabaseService } from '../../../core/supabaseService'
import type { Database } from '../../../types/database.types'
import { ResultadoRegistro, type PresencaRepository } from '../domain/PresencaRepository'

const MENSAGEM_PADRAO = 'Não foi possível ficar visível no mapa. Tente de novo.'

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

export class SupabasePresencaRepository implements PresencaRepository {
  private readonly client: SupabaseClient<Database>

  // O cliente pode ser passado de fora para os testes; no app, usa o do Singleton.
  constructor(client: SupabaseClient<Database> = SupabaseService.getInstance().client) {
    this.client = client
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
}
