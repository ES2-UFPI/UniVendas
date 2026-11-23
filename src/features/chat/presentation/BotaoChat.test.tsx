import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { ChatRepository } from '../domain/ChatRepository'
import { Conversa } from '../domain/Conversa'
import { BotaoChat } from './BotaoChat'

afterEach(cleanup)

function abrir(abrirConversa: ChatRepository['abrirConversa']) {
  const repositorio = { abrirConversa: vi.fn(abrirConversa) } as unknown as ChatRepository
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<BotaoChat vendedorId="v1" repositorio={repositorio} />} />
        <Route path="/conversa/:id" element={<p>Tela da conversa c1</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return repositorio
}

describe('BotaoChat (US18)', () => {
  it('abre (ou reabre) a conversa com o vendedor e leva para a tela dela', async () => {
    const repositorio = abrir(() =>
      Promise.resolve(new Conversa('c1', 'ana', 'Ana', 'v1', 'leo', 'Café do Leo', new Date())),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Chat' }))

    expect(await screen.findByText('Tela da conversa c1')).toBeInTheDocument()
    expect(repositorio.abrirConversa).toHaveBeenCalledWith('v1')
  })

  it('mostra o erro e continua na tela quando não consegue abrir', async () => {
    abrir(() =>
      Promise.reject(
        new Falha(
          'Você não pode abrir uma conversa com o seu próprio perfil de vendedor.',
          'conversa-consigo',
        ),
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Chat' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('próprio perfil de vendedor')
    expect(screen.getByRole('button', { name: 'Chat' })).toBeEnabled()
  })
})
