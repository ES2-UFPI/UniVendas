import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { ChatRepository } from '../domain/ChatRepository'
import { Conversa } from '../domain/Conversa'
import { Mensagem } from '../domain/Mensagem'
import { useConversasViewModel } from './useConversasViewModel'

const criada = new Date('2026-11-23T10:00:00Z')

// Ana (consumidora) conversa com o Café do Leo; o Leo também é consumidor na conversa com a Bia.
const comLeo = new Conversa(
  'c1',
  'ana',
  'Ana',
  'v-leo',
  'leo',
  'Café do Leo',
  criada,
  new Mensagem('m1', 'c1', 'leo', 'Tem sim!', new Date('2026-11-23T11:00:00Z')),
)
const comBia = new Conversa('c2', 'leo', 'Leo', 'v-bia', 'bia', 'Brownies da Bia', criada, null)

function repositorio(listarConversas = vi.fn().mockResolvedValue([comLeo, comBia])) {
  return {
    abrirConversa: vi.fn(),
    buscarConversa: vi.fn(),
    listarConversas,
    listarMensagens: vi.fn(),
    enviar: vi.fn(),
    observarMensagens: vi.fn(),
  } as ChatRepository
}

// Desmonta os hooks no fim de cada teste: sem isso, uma atualização pendente do React roda
// depois que o ambiente do jsdom já foi desmontado e quebra com "window is not defined".
afterEach(cleanup)

describe('useConversasViewModel (US18)', () => {
  it('mostra o nome da outra pessoa e a última mensagem, na ordem do repositório', async () => {
    const { result } = renderHook(() =>
      useConversasViewModel({ perfilId: 'leo', repositorio: repositorio() }),
    )

    expect(result.current.carregando).toBe(true)
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.conversas).toEqual([
      {
        id: 'c1',
        nome: 'Ana',
        ultimaMensagem: 'Você: Tem sim!',
        quando: new Date('2026-11-23T11:00:00Z'),
        link: '/conversa/c1',
      },
      {
        id: 'c2',
        nome: 'Brownies da Bia',
        ultimaMensagem: null,
        quando: criada,
        link: '/conversa/c2',
      },
    ])
  })

  it('para o consumidor, mostra o nome do vendedor e a mensagem dele sem "Você"', async () => {
    const { result } = renderHook(() =>
      useConversasViewModel({ perfilId: 'ana', repositorio: repositorio() }),
    )

    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.conversas[0]).toMatchObject({
      nome: 'Café do Leo',
      ultimaMensagem: 'Tem sim!',
    })
  })

  it('mostra o erro quando a lista não carrega', async () => {
    const falha = vi.fn().mockRejectedValue(new Falha('Sem internet.', 'rede'))
    const { result } = renderHook(() =>
      useConversasViewModel({ perfilId: 'ana', repositorio: repositorio(falha) }),
    )

    await waitFor(() => expect(result.current.erro).toBe('Sem internet.'))
    expect(result.current.conversas).toEqual([])
  })
})
