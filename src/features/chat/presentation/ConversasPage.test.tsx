import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatRepository } from '../domain/ChatRepository'
import { Conversa } from '../domain/Conversa'
import { Mensagem } from '../domain/Mensagem'
import { ConversasPage } from './ConversasPage'

afterEach(cleanup)

function abrir(conversas: Conversa[], conversaAbertaId?: string) {
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
      <ConversasPage perfilId="ana" repositorio={repositorio} conversaAbertaId={conversaAbertaId}>
        {conversaAbertaId && <p>conversa aberta</p>}
      </ConversasPage>
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

  it('tem o título da tela e, sem conversa aberta, convida a escolher uma (US21)', async () => {
    abrir([])

    expect(screen.getByRole('heading', { level: 2, name: 'Conversas' })).toBeInTheDocument()
    expect(screen.getByText('Fale com os vendedores e combine onde encontrar.')).toBeInTheDocument()
    expect(screen.getByText('Escolha uma conversa para ler e responder.')).toBeInTheDocument()
  })

  it('com uma conversa aberta, mostra ela ao lado e marca a linha dela na lista', async () => {
    abrir(
      [
        new Conversa('c1', 'ana', 'Ana', 'v1', 'leo', 'Café do Leo', new Date()),
        new Conversa('c2', 'ana', 'Ana', 'v2', 'bia', 'Doces da Bia', new Date()),
      ],
      'c2',
    )

    expect(await screen.findByRole('link', { name: /Doces da Bia/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: /Café do Leo/ })).not.toHaveAttribute('aria-current')
    expect(screen.getByText('conversa aberta')).toBeInTheDocument()
    expect(screen.queryByText('Escolha uma conversa para ler e responder.')).not.toBeInTheDocument()
  })

  it('avisa quando ainda não há conversas', async () => {
    abrir([])

    expect(await screen.findByText(/Você ainda não tem conversas/)).toBeInTheDocument()
  })
})
