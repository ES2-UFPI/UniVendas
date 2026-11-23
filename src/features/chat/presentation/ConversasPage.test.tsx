import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatRepository } from '../domain/ChatRepository'
import { Conversa } from '../domain/Conversa'
import { Mensagem } from '../domain/Mensagem'
import { ConversasPage } from './ConversasPage'

afterEach(cleanup)

function abrir(conversas: Conversa[]) {
  const repositorio = {
    abrirConversa: vi.fn(),
    buscarConversa: vi.fn(),
    listarConversas: vi.fn().mockResolvedValue(conversas),
    listarMensagens: vi.fn(),
    enviar: vi.fn(),
    observarMensagens: vi.fn(),
  } as ChatRepository
  render(
    <MemoryRouter>
      <ConversasPage perfilId="ana" repositorio={repositorio} />
    </MemoryRouter>,
  )
}

describe('ConversasPage (US18)', () => {
  it('cada conversa é um link para a tela dela, com o nome e a última mensagem', async () => {
    const ultima = new Mensagem('m1', 'c1', 'leo', 'Tem sim!', new Date())
    abrir([new Conversa('c1', 'ana', 'Ana', 'v1', 'leo', 'Café do Leo', new Date(), ultima)])

    const link = await screen.findByRole('link', { name: /Café do Leo/ })
    expect(link).toHaveAttribute('href', '/conversa/c1')
    expect(link).toHaveTextContent('Tem sim!')
  })

  it('avisa quando ainda não há conversas', async () => {
    abrir([])

    expect(await screen.findByText(/Você ainda não tem conversas/)).toBeInTheDocument()
  })
})
