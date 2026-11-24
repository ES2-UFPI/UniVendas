import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import { Presenca } from '../../presenca/domain/Presenca'
import type { PresencaRepository } from '../../presenca/domain/PresencaRepository'
import { Contato } from '../../vendedores/domain/Contato'
import { useMapaViewModel } from './useMapaViewModel'

const agora = new Date('2026-10-24T12:00:00Z')

function presenca(id: string, nome: string, referencia: string | null = null) {
  return new Presenca(
    id,
    nome,
    { latitude: -5.0577, longitude: -42.7955 },
    false,
    referencia,
    agora,
  )
}

const ana = presenca('v1', 'Brownies da Ana', 'em frente ao RU')
const leo = presenca('v2', 'Café do Leo')

/** Repositório falso: guarda o callback do Observer para o teste poder "disparar um evento". */
function repositorioFalso(listarAtivos = vi.fn().mockResolvedValue([ana])) {
  const cancelar = vi.fn()
  let avisar: (ativos: Presenca[]) => void = () => {}
  const observarAtivos = vi.fn((callback: (ativos: Presenca[]) => void) => {
    avisar = callback
    return cancelar
  })
  return {
    repositorio: { listarAtivos, observarAtivos } as unknown as PresencaRepository,
    cancelar,
    observarAtivos,
    emitir: (ativos: Presenca[]) => act(() => avisar(ativos)),
  }
}

describe('useMapaViewModel', () => {
  it('começa carregando e sem marcadores', () => {
    const { repositorio } = repositorioFalso(vi.fn(() => new Promise<Presenca[]>(() => {})))
    const { result } = renderHook(() => useMapaViewModel({ repositorio }))

    expect(result.current.carregando).toBe(true)
    expect(result.current.marcadores).toEqual([])
    expect(result.current.erro).toBeNull()
  })

  it('faz a carga inicial e entrega os marcadores com nome e referência', async () => {
    const { repositorio } = repositorioFalso()
    const { result } = renderHook(() => useMapaViewModel({ repositorio }))

    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.marcadores).toEqual([
      {
        id: 'v1',
        latitude: -5.0577,
        longitude: -42.7955,
        nome: 'Brownies da Ana',
        referencia: 'em frente ao RU',
        contatos: [],
        meu: false,
      },
    ])
  })

  it('marca o marcador do próprio usuário, para o balão não mostrar "Chat" (RN22)', async () => {
    const minha = new Presenca(
      'v9',
      'Minha banca',
      { latitude: -5.0577, longitude: -42.7955 },
      false,
      null,
      agora,
      [],
      'eu',
    )
    const { repositorio } = repositorioFalso(vi.fn().mockResolvedValue([ana, minha]))
    const { result } = renderHook(() => useMapaViewModel({ repositorio, perfilId: 'eu' }))

    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.marcadores.map((m) => [m.id, m.meu])).toEqual([
      ['v1', false],
      ['v9', true],
    ])
  })

  it('entrega os botões de contato com o rótulo e o link prontos (US07)', async () => {
    const comContatos = new Presenca(
      'v1',
      'Brownies da Ana',
      { latitude: -5.0577, longitude: -42.7955 },
      false,
      null,
      agora,
      [new Contato('whatsapp', '5586999990000'), new Contato('telefone', '5586988880000')],
    )
    const { repositorio } = repositorioFalso(vi.fn().mockResolvedValue([comContatos]))
    const { result } = renderHook(() => useMapaViewModel({ repositorio }))

    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.marcadores[0].contatos).toEqual([
      {
        canal: 'whatsapp',
        rotulo: 'WhatsApp',
        link:
          'https://wa.me/5586999990000?text=' +
          encodeURIComponent('Oi! Vi seu anúncio no UniVendas'),
      },
      { canal: 'telefone', rotulo: 'Ligar', link: 'tel:+5586988880000' },
    ])
  })

  it('não cria botão para o número oculto (US19)', async () => {
    const comOculto = new Presenca(
      'v1',
      'Brownies da Ana',
      { latitude: -5.0577, longitude: -42.7955 },
      false,
      null,
      agora,
      [new Contato('whatsapp', '5586999990000', false), new Contato('telefone', '5586988880000')],
    )
    const { repositorio } = repositorioFalso(vi.fn().mockResolvedValue([comOculto]))
    const { result } = renderHook(() => useMapaViewModel({ repositorio }))

    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.marcadores[0].contatos?.map((c) => c.canal)).toEqual(['telefone'])
  })

  it('atualiza os marcadores quando o repositório avisa que algo mudou (Observer)', async () => {
    const { repositorio, emitir } = repositorioFalso()
    const { result } = renderHook(() => useMapaViewModel({ repositorio }))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    emitir([ana, leo])
    expect(result.current.marcadores.map((m) => m.nome)).toEqual(['Brownies da Ana', 'Café do Leo'])

    emitir([])
    expect(result.current.marcadores).toEqual([])
  })

  it('cancela a inscrição quando a tela é desmontada', async () => {
    const { repositorio, cancelar, observarAtivos } = repositorioFalso()
    const { result, unmount } = renderHook(() => useMapaViewModel({ repositorio }))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(observarAtivos).toHaveBeenCalledTimes(1)
    expect(cancelar).not.toHaveBeenCalled()

    unmount()

    expect(cancelar).toHaveBeenCalledTimes(1)
  })

  it('uma lista de evento que chega antes da carga inicial não é sobrescrita por ela', async () => {
    let terminarCarga: (ativos: Presenca[]) => void = () => {}
    const listarAtivos = vi.fn(
      () =>
        new Promise<Presenca[]>((resolver) => {
          terminarCarga = resolver
        }),
    )
    const { repositorio, emitir } = repositorioFalso(listarAtivos)
    const { result } = renderHook(() => useMapaViewModel({ repositorio }))

    emitir([ana, leo])
    await act(async () => terminarCarga([ana]))

    expect(result.current.marcadores.map((m) => m.id)).toEqual(['v1', 'v2'])
    expect(result.current.carregando).toBe(false)
  })

  it('mostra a mensagem da Falha quando a carga inicial não funciona', async () => {
    const listarAtivos = vi.fn().mockRejectedValue(new Falha('Sem conexão com o servidor.', 'rede'))
    const { repositorio } = repositorioFalso(listarAtivos)
    const { result } = renderHook(() => useMapaViewModel({ repositorio }))

    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.erro).toBe('Sem conexão com o servidor.')
    expect(result.current.marcadores).toEqual([])
  })

  it('limpa o erro quando chega uma lista nova', async () => {
    const listarAtivos = vi.fn().mockRejectedValue(new Falha('Sem conexão.', 'rede'))
    const { repositorio, emitir } = repositorioFalso(listarAtivos)
    const { result } = renderHook(() => useMapaViewModel({ repositorio }))
    await waitFor(() => expect(result.current.erro).toBe('Sem conexão.'))

    emitir([ana])

    expect(result.current.erro).toBeNull()
    expect(result.current.marcadores).toHaveLength(1)
  })

  it('mostra uma mensagem genérica se o repositório padrão não puder ser criado', async () => {
    // Sem o repositório injetado e sem as chaves do Supabase (VITE_SUPABASE_*), o Singleton recusa.
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    try {
      const { result } = renderHook(() => useMapaViewModel())

      await waitFor(() => expect(result.current.carregando).toBe(false))

      expect(result.current.erro).toBe(
        'Não foi possível carregar os vendedores do mapa. Tente de novo.',
      )
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe('useMapaViewModel: lista de quem está no campus (US13)', () => {
  function presencaEm(id: string, nome: string, minutosAtras: number, referencia: string | null) {
    return new Presenca(
      id,
      nome,
      { latitude: -5.0577, longitude: -42.7955 },
      false,
      referencia,
      new Date(agora.getTime() - minutosAtras * 60_000),
    )
  }

  const antiga = presencaEm('v1', 'Brownies da Ana', 10, 'em frente ao RU')
  const nova = presencaEm('v2', 'Café do Leo', 1, null)
  const media = presencaEm('v3', 'Pão de queijo da Bia', 5, 'na biblioteca')

  it('entrega os vendedores com os de sinal mais recente primeiro', async () => {
    const { repositorio } = repositorioFalso(vi.fn().mockResolvedValue([antiga, nova, media]))
    const { result } = renderHook(() => useMapaViewModel({ repositorio }))

    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.vendedores.map((v) => v.id)).toEqual(['v2', 'v3', 'v1'])
  })

  it('cada item traz o nome, a referência e o horário do último sinal', async () => {
    const { repositorio } = repositorioFalso(vi.fn().mockResolvedValue([antiga]))
    const { result } = renderHook(() => useMapaViewModel({ repositorio }))

    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.vendedores).toEqual([
      {
        id: 'v1',
        nome: 'Brownies da Ana',
        referencia: 'em frente ao RU',
        ultimoSinalEm: antiga.ultimoSinalEm,
      },
    ])
  })

  it('usa a mesma lista do mapa: o evento do Observer atualiza o mapa e a lista juntos', async () => {
    const { repositorio, emitir } = repositorioFalso(vi.fn().mockResolvedValue([antiga]))
    const { result } = renderHook(() => useMapaViewModel({ repositorio }))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    emitir([antiga, nova])

    expect(result.current.vendedores.map((v) => v.id)).toEqual(['v2', 'v1'])
    expect(result.current.marcadores.map((m) => m.id)).toEqual(['v1', 'v2'])
  })

  it('não muda a ordem da lista original (o mapa continua na ordem recebida)', async () => {
    const { repositorio } = repositorioFalso(vi.fn().mockResolvedValue([antiga, nova]))
    const { result } = renderHook(() => useMapaViewModel({ repositorio }))

    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.marcadores.map((m) => m.id)).toEqual(['v1', 'v2'])
  })
})
