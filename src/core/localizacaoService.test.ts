import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from './falha'
import { LocalizacaoService } from './localizacaoService'

type ComSucesso = (posicao: GeolocationPosition) => void
type ComErro = (erro: GeolocationPositionError) => void

function simularGeolocalizacao(getCurrentPosition: (ok: ComSucesso, erro: ComErro) => void) {
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
}

function simularPosicao(latitude: number, longitude: number) {
  simularGeolocalizacao((ok) => ok({ coords: { latitude, longitude } } as GeolocationPosition))
}

function simularErro(code: number) {
  simularGeolocalizacao((_, erro) => erro({ code } as GeolocationPositionError))
}

afterEach(() => vi.unstubAllGlobals())

describe('LocalizacaoService.posicaoAtual', () => {
  it('devolve latitude e longitude quando há permissão', async () => {
    simularPosicao(-5.05, -42.79)
    await expect(new LocalizacaoService().posicaoAtual()).resolves.toEqual({
      latitude: -5.05,
      longitude: -42.79,
    })
  })

  it.each([
    [1, 'permissao-negada'],
    [2, 'indisponivel'],
    [3, 'tempo-esgotado'],
  ])('traduz o código de erro %i para "%s"', async (code, codigo) => {
    simularErro(code)
    const falha = await new LocalizacaoService().posicaoAtual().catch((e) => e)
    expect(falha).toBeInstanceOf(Falha)
    expect(falha.codigo).toBe(codigo)
  })

  it('rejeita com "nao-suportado" se o navegador não tem geolocalização', async () => {
    vi.stubGlobal('navigator', {})
    await expect(new LocalizacaoService().posicaoAtual()).rejects.toMatchObject({
      codigo: 'nao-suportado',
    })
  })
})

describe('LocalizacaoService.acompanhar', () => {
  it('entrega cada posição nova e para de acompanhar quando cancelado', () => {
    let ok: ComSucesso = () => {}
    const clearWatch = vi.fn()
    const watchPosition = vi.fn((sucesso: ComSucesso) => {
      ok = sucesso
      return 7
    })
    vi.stubGlobal('navigator', { geolocation: { watchPosition, clearWatch } })
    const recebidas: unknown[] = []

    const parar = new LocalizacaoService().acompanhar((p) => recebidas.push(p), vi.fn())
    ok({ coords: { latitude: -5.05, longitude: -42.79 } } as GeolocationPosition)
    parar()

    expect(recebidas).toEqual([{ latitude: -5.05, longitude: -42.79 }])
    expect(clearWatch).toHaveBeenCalledWith(7)
  })

  it('traduz o erro do navegador para Falha', () => {
    let erro: ComErro = () => {}
    const watchPosition = vi.fn((_: ComSucesso, falhou: ComErro) => {
      erro = falhou
      return 1
    })
    vi.stubGlobal('navigator', { geolocation: { watchPosition, clearWatch: vi.fn() } })
    const aoFalhar = vi.fn()

    new LocalizacaoService().acompanhar(vi.fn(), aoFalhar)
    erro({ code: 1 } as GeolocationPositionError)

    expect(aoFalhar.mock.calls[0][0]).toMatchObject({ codigo: 'permissao-negada' })
  })

  it('avisa "nao-suportado" se o navegador não tem geolocalização', () => {
    vi.stubGlobal('navigator', {})
    const aoFalhar = vi.fn()

    new LocalizacaoService().acompanhar(vi.fn(), aoFalhar)

    expect(aoFalhar.mock.calls[0][0]).toMatchObject({ codigo: 'nao-suportado' })
  })
})

describe('LocalizacaoService.pedirPermissao', () => {
  it('devolve true quando o usuário permite', async () => {
    simularPosicao(-5.05, -42.79)
    await expect(new LocalizacaoService().pedirPermissao()).resolves.toBe(true)
  })

  it('devolve false quando o usuário nega (RN12)', async () => {
    simularErro(1)
    await expect(new LocalizacaoService().pedirPermissao()).resolves.toBe(false)
  })

  it('devolve false quando o aparelho não tem localização', async () => {
    vi.stubGlobal('navigator', {})
    await expect(new LocalizacaoService().pedirPermissao()).resolves.toBe(false)
  })

  it.each([2, 3])('devolve true se a falha não é de permissão (código %i)', async (code) => {
    simularErro(code)
    await expect(new LocalizacaoService().pedirPermissao()).resolves.toBe(true)
  })
})
