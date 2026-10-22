import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { Database } from '../../../types/database.types'
import { ResultadoRegistro } from '../domain/PresencaRepository'
import { SupabasePresencaRepository } from './SupabasePresencaRepository'

const real = { latitude: -5.0577, longitude: -42.7955 }
const ponto = { latitude: -5.058, longitude: -42.795 }

// Cliente falso: só tem o que o repositório usa. Nenhum teste acessa o Supabase de verdade.
function clienteFalso(resposta: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(resposta)
  const repo = new SupabasePresencaRepository({ rpc } as unknown as SupabaseClient<Database>)
  return { repo, rpc }
}

async function falhaDe(promessa: Promise<unknown>) {
  const erro = await promessa.catch((e) => e)
  expect(erro).toBeInstanceOf(Falha)
  return erro as Falha
}

describe('SupabasePresencaRepository.registrar', () => {
  it('chama a função registrar_presenca e devolve ATIVO quando o servidor diz ok', async () => {
    const { repo, rpc } = clienteFalso({ data: 'ok', error: null })

    const resultado = await repo.registrar(real, ponto, ' em frente ao RU ')

    expect(resultado).toBe(ResultadoRegistro.ATIVO)
    expect(rpc).toHaveBeenCalledWith('registrar_presenca', {
      lat_real: -5.0577,
      lng_real: -42.7955,
      lat_ponto: -5.058,
      lng_ponto: -42.795,
      referencia: 'em frente ao RU',
    })
  })

  it('não manda ponto nem referência quando não há ponto escolhido nem texto', async () => {
    const { repo, rpc } = clienteFalso({ data: 'ok', error: null })

    await repo.registrar(real, null, '   ')

    expect(rpc).toHaveBeenCalledWith('registrar_presenca', {
      lat_real: -5.0577,
      lng_real: -42.7955,
      lat_ponto: undefined,
      lng_ponto: undefined,
      referencia: undefined,
    })
  })

  it('devolve FORA_DO_CAMPUS quando o servidor diz fora_do_campus', async () => {
    const { repo } = clienteFalso({ data: 'fora_do_campus', error: null })

    await expect(repo.registrar(real, null, '')).resolves.toBe(ResultadoRegistro.FORA_DO_CAMPUS)
  })

  it('lança Falha quando o ponto escolhido está fora do campus', async () => {
    const { repo } = clienteFalso({ data: 'ponto_fora_do_campus', error: null })

    const falha = await falhaDe(repo.registrar(real, ponto, ''))

    expect(falha.codigo).toBe('ponto-fora-do-campus')
    expect(falha.mensagem).toBe('Escolha um ponto dentro do campus.')
  })

  it('avisa quando quem chama não é vendedor', async () => {
    const { repo } = clienteFalso({
      data: null,
      error: { code: '42501', message: 'Só vendedores' },
    })

    const falha = await falhaDe(repo.registrar(real, null, ''))

    expect(falha.codigo).toBe('nao-e-vendedor')
  })

  it('avisa quando a localização ou a referência são inválidas', async () => {
    const { repo } = clienteFalso({
      data: null,
      error: { code: '22023', message: 'Coordenadas inválidas.' },
    })

    const falha = await falhaDe(repo.registrar(real, null, ''))

    expect(falha.codigo).toBe('dados-invalidos')
  })

  it('usa uma mensagem genérica para erros desconhecidos', async () => {
    const { repo } = clienteFalso({ data: null, error: { code: 'XX000', message: 'boom' } })

    const falha = await falhaDe(repo.registrar(real, null, ''))

    expect(falha.codigo).toBe('XX000')
    expect(falha.mensagem).toBe('Não foi possível ficar visível no mapa. Tente de novo.')
  })

  it('não confia numa resposta que o app não conhece', async () => {
    const { repo } = clienteFalso({ data: 'algo_novo', error: null })

    const falha = await falhaDe(repo.registrar(real, null, ''))

    expect(falha.codigo).toBe('resposta-inesperada')
  })
})
