import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { LocalizacaoService } from '../../../core/localizacaoService'
import { ResultadoRegistro, type PresencaRepository } from '../domain/PresencaRepository'
import { LIMITE_REFERENCIA, usePainelVendedorViewModel } from './usePainelVendedorViewModel'

const posicao = { latitude: -5.0577, longitude: -42.7955 }

function falsos(
  registrar = vi.fn().mockResolvedValue(ResultadoRegistro.ATIVO),
  posicaoAtual = vi.fn().mockResolvedValue(posicao),
) {
  return {
    repositorio: { registrar } as PresencaRepository,
    localizacao: { posicaoAtual } as Pick<LocalizacaoService, 'posicaoAtual'>,
    registrar,
    posicaoAtual,
  }
}

describe('usePainelVendedorViewModel', () => {
  it('começa desligado, sem erro e sem referência', () => {
    const { repositorio, localizacao } = falsos()
    const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))

    expect(result.current.ativo).toBe(false)
    expect(result.current.carregando).toBe(false)
    expect(result.current.erro).toBeNull()
    expect(result.current.referencia).toBe('')
  })

  it('lê a posição, registra a presença e fica ativo', async () => {
    const { repositorio, localizacao, registrar } = falsos()
    const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))
    act(() => result.current.alterarReferencia('em frente ao RU'))

    let ligou = false
    await act(async () => {
      ligou = await result.current.ligar()
    })

    expect(ligou).toBe(true)
    expect(registrar).toHaveBeenCalledWith(posicao, null, 'em frente ao RU')
    expect(result.current.ativo).toBe(true)
    expect(result.current.erro).toBeNull()
    expect(result.current.carregando).toBe(false)
  })

  it('mostra a mensagem e continua desligado quando está fora do campus (RN15)', async () => {
    const registrar = vi.fn().mockResolvedValue(ResultadoRegistro.FORA_DO_CAMPUS)
    const { repositorio, localizacao } = falsos(registrar)
    const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))

    let ligou = true
    await act(async () => {
      ligou = await result.current.ligar()
    })

    expect(ligou).toBe(false)
    expect(result.current.ativo).toBe(false)
    expect(result.current.erro).toContain('fora do campus')
  })

  it('não registra nada e explica o motivo quando a permissão é negada (RN12)', async () => {
    const negada = new Falha('Sem a permissão de localização.', 'permissao-negada')
    const { repositorio, localizacao, registrar } = falsos(
      undefined,
      vi.fn().mockRejectedValue(negada),
    )
    const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))

    await act(() => result.current.ligar())

    expect(registrar).not.toHaveBeenCalled()
    expect(result.current.ativo).toBe(false)
    expect(result.current.erro).toBe('Sem a permissão de localização.')
  })

  it('mostra a mensagem da Falha quando o repositório recusa', async () => {
    const registrar = vi
      .fn()
      .mockRejectedValue(new Falha('Só vendedores podem ficar visíveis no mapa.', 'nao-e-vendedor'))
    const { repositorio, localizacao } = falsos(registrar)
    const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))

    await act(() => result.current.ligar())

    expect(result.current.ativo).toBe(false)
    expect(result.current.erro).toBe('Só vendedores podem ficar visíveis no mapa.')
  })

  it('mostra uma mensagem genérica para erros inesperados', async () => {
    const registrar = vi.fn().mockRejectedValue(new Error('rede caiu'))
    const { repositorio, localizacao } = falsos(registrar)
    const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))

    await act(() => result.current.ligar())

    expect(result.current.erro).toBe('Não foi possível ficar visível no mapa. Tente de novo.')
  })

  it('recusa referência com mais de 80 caracteres (RN18) sem ler a posição', async () => {
    const { repositorio, localizacao, posicaoAtual, registrar } = falsos()
    const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))
    act(() => result.current.alterarReferencia('x'.repeat(LIMITE_REFERENCIA + 1)))

    await act(() => result.current.ligar())

    expect(result.current.erro).toBe('A referência pode ter até 80 caracteres.')
    expect(posicaoAtual).not.toHaveBeenCalled()
    expect(registrar).not.toHaveBeenCalled()
  })

  it('ignora o segundo toque enquanto o primeiro ainda está ligando', async () => {
    let terminar: (resultado: string) => void = () => {}
    const registrar = vi.fn(
      () =>
        new Promise<string>((resolver) => {
          terminar = resolver
        }),
    )
    const { repositorio, localizacao } = falsos(registrar)
    const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))

    let primeiro: Promise<boolean> = Promise.resolve(false)
    let segundo = true
    await act(async () => {
      primeiro = result.current.ligar()
      segundo = await result.current.ligar()
    })
    expect(segundo).toBe(false)
    expect(result.current.carregando).toBe(true)

    await act(async () => {
      terminar(ResultadoRegistro.ATIVO)
      await primeiro
    })

    expect(registrar).toHaveBeenCalledTimes(1)
    expect(result.current.ativo).toBe(true)
  })
})
