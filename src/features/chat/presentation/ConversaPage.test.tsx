import { cleanup, fireEvent, render as renderizar, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatRepository } from '../domain/ChatRepository'
import { Conversa } from '../domain/Conversa'
import { Mensagem } from '../domain/Mensagem'
import { ConversaPage } from './ConversaPage'

const conversa = new Conversa('c1', 'ana', 'Ana', 'v1', 'leo', 'Café do Leo', new Date())

function repositorio(mensagens: Mensagem[] = [], enviar = vi.fn()) {
  return {
    abrirConversa: vi.fn(),
    buscarConversa: vi.fn().mockResolvedValue(conversa),
    listarConversas: vi.fn(),
    listarMensagens: vi.fn().mockResolvedValue(mensagens),
    enviar,
    observarMensagens: vi.fn(() => () => {}),
  } as ChatRepository
}

afterEach(cleanup)

// O topo tem os links "Ver perfil" e "Voltar às conversas", então a tela precisa de um roteador.
const render = (tela: ReactElement) => renderizar(<MemoryRouter>{tela}</MemoryRouter>)

describe('ConversaPage (US18)', () => {
  it('mostra o nome do vendedor e as mensagens, com as de quem está logado marcadas', async () => {
    const msgs = [
      new Mensagem('m1', 'c1', 'ana', 'Oi, tem café?', new Date('2026-11-23T10:01:00Z')),
      new Mensagem('m2', 'c1', 'leo', 'Tem sim!', new Date('2026-11-23T10:02:00Z')),
    ]
    render(<ConversaPage conversaId="c1" perfilId="ana" repositorio={repositorio(msgs)} />)

    expect(await screen.findByRole('heading', { name: 'Café do Leo' })).toBeInTheDocument()
    const itens = within(screen.getByRole('list', { name: 'Mensagens' })).getAllByRole('listitem')
    expect(itens[0]).toHaveTextContent('Você: Oi, tem café?')
    expect(itens[1]).toHaveTextContent('Café do Leo: Tem sim!')
  })

  it('convida a mandar a primeira mensagem quando a conversa está vazia', async () => {
    render(<ConversaPage conversaId="c1" perfilId="ana" repositorio={repositorio()} />)

    expect(await screen.findByText('Nenhuma mensagem ainda. Mande a primeira!')).toBeInTheDocument()
  })

  it('envia o que foi digitado ao clicar em Enviar', async () => {
    const enviar = vi
      .fn()
      .mockResolvedValue(new Mensagem('m9', 'c1', 'ana', 'Quero dois', new Date()))
    render(<ConversaPage conversaId="c1" perfilId="ana" repositorio={repositorio([], enviar)} />)

    const campo = await screen.findByLabelText('Mensagem')
    fireEvent.change(campo, { target: { value: 'Quero dois' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Quero dois')).toBeInTheDocument()
    expect(enviar).toHaveBeenCalledWith('c1', 'Quero dois')
    expect(campo).toHaveValue('')
  })

  it('o campo aceita no máximo 1000 caracteres (RN23)', async () => {
    render(<ConversaPage conversaId="c1" perfilId="ana" repositorio={repositorio()} />)

    expect(await screen.findByLabelText('Mensagem')).toHaveAttribute('maxLength', '1000')
  })

  it('para o consumidor, o topo leva ao perfil do vendedor e há o caminho de volta à lista (US21)', async () => {
    render(<ConversaPage conversaId="c1" perfilId="ana" repositorio={repositorio()} />)

    expect(await screen.findByRole('link', { name: 'Ver perfil' })).toHaveAttribute(
      'href',
      '/vendedor/v1',
    )
    expect(screen.getByRole('link', { name: 'Voltar às conversas' })).toHaveAttribute(
      'href',
      '/conversas',
    )
    expect(screen.getByPlaceholderText('Escreva sua mensagem')).toBeInTheDocument()
  })

  it('para o vendedor, que fala com um consumidor, não há "Ver perfil"', async () => {
    render(<ConversaPage conversaId="c1" perfilId="leo" repositorio={repositorio()} />)

    expect(await screen.findByRole('heading', { name: 'Ana' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver perfil' })).not.toBeInTheDocument()
  })

  it('separa as mensagens por dia, com "Hoje" nas de hoje', async () => {
    const msgs = [
      new Mensagem('m1', 'c1', 'ana', 'De ontem', new Date(Date.now() - 86_400_000)),
      new Mensagem('m2', 'c1', 'leo', 'De agora', new Date()),
    ]
    render(<ConversaPage conversaId="c1" perfilId="ana" repositorio={repositorio(msgs)} />)

    const itens = within(await screen.findByRole('list', { name: 'Mensagens' })).getAllByRole(
      'listitem',
    )
    expect(itens[0]).toHaveTextContent('Ontem')
    expect(itens[1]).toHaveTextContent('Hoje')
  })
})
