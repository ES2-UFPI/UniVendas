import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { LatLng, LocalizacaoService } from '../../../core/localizacaoService'
import { useSessaoStore } from '../../../core/sessaoStore'
import { Usuario } from '../../auth/domain/Usuario'
import { lembrarPresenca, lerMarcaPresenca } from '../data/MarcaPresencaAtiva'
import { Presenca } from '../domain/Presenca'
import { ResultadoRegistro, type PresencaRepository } from '../domain/PresencaRepository'
import { LIMITE_REFERENCIA, usePainelVendedorViewModel } from './usePainelVendedorViewModel'

const posicao = { latitude: -5.0577, longitude: -42.7955 }
const jaAtiva = new Presenca('v1', 'Ana', posicao, false, 'em frente ao RU', new Date())

function falsos(
  registrar = vi.fn().mockResolvedValue(ResultadoRegistro.ATIVO),
  posicaoAtual = vi.fn().mockResolvedValue(posicao),
  desligar = vi.fn().mockResolvedValue(undefined),
  minhaPresenca = vi.fn().mockResolvedValue(null),
  enviarSinal = vi.fn().mockResolvedValue(ResultadoRegistro.ATIVO),
) {
  // `observarAtivos` guarda a função que recebe a lista, para o teste simular o servidor desligando alguém.
  const lista = { mudou: vi.fn<(ativos: Presenca[]) => void>() }
  const observarAtivos = vi.fn((aoMudar: (ativos: Presenca[]) => void) => {
    lista.mudou = aoMudar as typeof lista.mudou
    return () => {}
  })
  // `acompanhar` guarda a função que recebe as leituras do GPS, para o teste simular o vendedor andando.
  const leituras = { nova: vi.fn<(posicao: LatLng) => void>(), parou: vi.fn() }
  const acompanhar = vi.fn((aoReceber: (p: LatLng) => void) => {
    leituras.nova = aoReceber as typeof leituras.nova
    return leituras.parou
  })
  return {
    repositorio: {
      registrar,
      desligar,
      minhaPresenca,
      enviarSinal,
      observarAtivos,
    } as unknown as PresencaRepository,
    localizacao: { posicaoAtual, acompanhar } as Pick<
      LocalizacaoService,
      'posicaoAtual' | 'acompanhar'
    >,
    enviarSinal,
    lista,
    leituras,
    registrar,
    posicaoAtual,
    desligar,
    minhaPresenca,
  }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
  useSessaoStore.setState({ usuario: null })
})

function entrarComo(id: string) {
  useSessaoStore.setState({ usuario: new Usuario(id, 'Ana', 'ana@ufpi.edu.br') })
}

/** A posição `metros` ao norte de `posicao` (1 grau de latitude ≈ 111,19 km). */
function aoNorte(metros: number): LatLng {
  return { latitude: posicao.latitude + metros / 111_195, longitude: posicao.longitude }
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

  it('desliga a presença e volta ao estado inicial', async () => {
    const { repositorio, localizacao, desligar } = falsos()
    const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))
    act(() => result.current.alterarReferencia('em frente ao RU'))
    await act(() => result.current.ligar())

    let desligou = false
    await act(async () => {
      desligou = await result.current.desligar()
    })

    expect(desligou).toBe(true)
    expect(desligar).toHaveBeenCalledTimes(1)
    expect(result.current.ativo).toBe(false)
    expect(result.current.referencia).toBe('')
    expect(result.current.erro).toBeNull()
    expect(result.current.carregando).toBe(false)
  })

  it('continua ativo e mostra a mensagem da Falha quando não consegue desligar', async () => {
    const desligar = vi
      .fn()
      .mockRejectedValue(new Falha('Só vendedores podem ficar visíveis no mapa.', 'nao-e-vendedor'))
    const { repositorio, localizacao } = falsos(undefined, undefined, desligar)
    const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))
    await act(() => result.current.ligar())

    let desligou = true
    await act(async () => {
      desligou = await result.current.desligar()
    })

    expect(desligou).toBe(false)
    expect(result.current.ativo).toBe(true)
    expect(result.current.erro).toBe('Só vendedores podem ficar visíveis no mapa.')
  })

  it('mostra uma mensagem genérica quando desligar falha por erro inesperado', async () => {
    const desligar = vi.fn().mockRejectedValue(new Error('rede caiu'))
    const { repositorio, localizacao } = falsos(undefined, undefined, desligar)
    const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))
    await act(() => result.current.ligar())

    await act(() => result.current.desligar())

    expect(result.current.ativo).toBe(true)
    expect(result.current.erro).toBe('Não foi possível desligar sua presença. Tente de novo.')
  })

  it('já abre ativo, com a referência, quando o vendedor está ativo no servidor', async () => {
    const minhaPresenca = vi.fn().mockResolvedValue(jaAtiva)
    const { repositorio, localizacao } = falsos(undefined, undefined, undefined, minhaPresenca)

    const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))

    await waitFor(() => expect(result.current.ativo).toBe(true))
    expect(result.current.referencia).toBe('em frente ao RU')
  })

  it('continua desligado quando não consegue saber se está ativo', async () => {
    const minhaPresenca = vi.fn().mockRejectedValue(new Error('rede caiu'))
    const { repositorio, localizacao } = falsos(undefined, undefined, undefined, minhaPresenca)

    const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))
    await act(async () => {})

    expect(result.current.ativo).toBe(false)
    expect(result.current.erro).toBeNull()
  })
  describe('sinal periódico (RN13)', () => {
    async function ligado() {
      vi.useFakeTimers()
      const f = falsos()
      const { result, unmount } = renderHook(() =>
        usePainelVendedorViewModel({ repositorio: f.repositorio, localizacao: f.localizacao }),
      )
      await act(() => result.current.ligar())
      return { ...f, result, unmount }
    }

    it('só acompanha o GPS enquanto está ativo', async () => {
      vi.useFakeTimers()
      const f = falsos()
      const { result } = renderHook(() =>
        usePainelVendedorViewModel({ repositorio: f.repositorio, localizacao: f.localizacao }),
      )
      expect(f.localizacao.acompanhar).not.toHaveBeenCalled()

      await act(() => result.current.ligar())
      expect(f.localizacao.acompanhar).toHaveBeenCalledTimes(1)

      await act(() => result.current.desligar())
      expect(f.leituras.parou).toHaveBeenCalled()
    })

    it('não envia sinal logo depois de ligar nem com o vendedor quase parado', async () => {
      const { enviarSinal, leituras } = await ligado()

      await act(async () => leituras.nova(aoNorte(10)))

      expect(enviarSinal).not.toHaveBeenCalled()
    })

    it('envia um sinal quando o vendedor se move mais de 25 m', async () => {
      const { enviarSinal, leituras } = await ligado()
      const nova = aoNorte(30)

      await act(async () => leituras.nova(nova))

      expect(enviarSinal).toHaveBeenCalledWith(nova, null, '')
    })

    it('envia um sinal quando passam 2 minutos, mesmo parado', async () => {
      const { enviarSinal, leituras } = await ligado()
      await act(async () => leituras.nova(posicao))
      expect(enviarSinal).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(120_000)
      })

      expect(enviarSinal).toHaveBeenCalledTimes(1)
      expect(enviarSinal).toHaveBeenCalledWith(posicao, null, '')
    })

    it('desliga quando o servidor diz que saiu do campus (RN15)', async () => {
      const { result, enviarSinal, leituras } = await ligado()
      enviarSinal.mockResolvedValue(ResultadoRegistro.FORA_DO_CAMPUS)

      await act(async () => leituras.nova(aoNorte(50)))

      expect(result.current.ativo).toBe(false)
      expect(result.current.erro).toContain('fora do campus')
    })

    it('continua ativo e tenta de novo quando o envio falha', async () => {
      const { result, enviarSinal, leituras } = await ligado()
      enviarSinal.mockRejectedValueOnce(new Error('rede caiu'))

      await act(async () => leituras.nova(aoNorte(30)))
      await act(async () => leituras.nova(aoNorte(31)))

      expect(result.current.ativo).toBe(true)
      expect(enviarSinal).toHaveBeenCalledTimes(2)
    })

    it('para de acompanhar quando a tela é fechada', async () => {
      const { leituras, unmount } = await ligado()

      unmount()

      expect(leituras.parou).toHaveBeenCalled()
    })
  })
  describe('religar sozinho e avisar (RN15, RN16)', () => {
    it('liga de novo sozinho ao reabrir dentro do campus, se não desligou de propósito', async () => {
      entrarComo('u1')
      lembrarPresenca('u1', 'em frente ao RU')
      const { repositorio, localizacao, registrar } = falsos()

      const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))

      await waitFor(() => expect(result.current.ativo).toBe(true))
      expect(registrar).toHaveBeenCalledWith(posicao, null, 'em frente ao RU')
      expect(result.current.referencia).toBe('em frente ao RU')
      expect(result.current.erro).toBeNull()
    })

    it('não religa quando o vendedor nunca ligou ou desligou de propósito', async () => {
      entrarComo('u1')
      const { repositorio, localizacao, registrar, posicaoAtual } = falsos()

      const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))
      await act(async () => {})

      expect(result.current.ativo).toBe(false)
      expect(posicaoAtual).not.toHaveBeenCalled()
      expect(registrar).not.toHaveBeenCalled()
    })

    it('não religa quando já está ativo no servidor', async () => {
      entrarComo('u1')
      lembrarPresenca('u1', 'RU')
      const minhaPresenca = vi.fn().mockResolvedValue(jaAtiva)
      const { repositorio, localizacao, registrar } = falsos(
        undefined,
        undefined,
        undefined,
        minhaPresenca,
      )

      const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))

      await waitFor(() => expect(result.current.ativo).toBe(true))
      expect(registrar).not.toHaveBeenCalled()
    })

    it('avisa e esquece a marca quando reabre fora do campus', async () => {
      entrarComo('u1')
      lembrarPresenca('u1', 'RU')
      const registrar = vi.fn().mockResolvedValue(ResultadoRegistro.FORA_DO_CAMPUS)
      const { repositorio, localizacao } = falsos(registrar)

      const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))

      await waitFor(() => expect(result.current.erro).toContain('fora do campus'))
      expect(result.current.ativo).toBe(false)
      expect(lerMarcaPresenca('u1')).toBeNull()
    })

    it('mantém a marca e fica quieto quando o GPS não responde ao reabrir', async () => {
      entrarComo('u1')
      lembrarPresenca('u1', 'RU')
      const posicaoAtual = vi
        .fn()
        .mockRejectedValue(new Falha('Sem permissão.', 'permissao-negada'))
      const { repositorio, localizacao } = falsos(undefined, posicaoAtual)

      const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))
      await act(async () => {})

      expect(result.current.ativo).toBe(false)
      expect(result.current.erro).toBeNull()
      expect(lerMarcaPresenca('u1')).not.toBeNull()
    })

    it('guarda a marca ao ligar e a apaga ao desligar de propósito', async () => {
      entrarComo('u1')
      const { repositorio, localizacao } = falsos()
      const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))
      act(() => result.current.alterarReferencia('RU'))

      await act(() => result.current.ligar())
      expect(lerMarcaPresenca('u1')).toEqual({ referencia: 'RU' })

      await act(() => result.current.desligar())
      expect(lerMarcaPresenca('u1')).toBeNull()
    })

    it('mostra o aviso quando o servidor desliga o vendedor com o painel aberto', async () => {
      const minhaPresenca = vi.fn().mockResolvedValue(jaAtiva)
      const { repositorio, localizacao, lista } = falsos(
        undefined,
        undefined,
        undefined,
        minhaPresenca,
      )
      const { result } = renderHook(() => usePainelVendedorViewModel({ repositorio, localizacao }))
      await waitFor(() => expect(result.current.ativo).toBe(true))

      act(() => lista.mudou([jaAtiva]))
      expect(result.current.ativo).toBe(true)

      act(() => lista.mudou([]))
      expect(result.current.ativo).toBe(false)
      expect(result.current.erro).toContain('desligada')
    })
  })
})
