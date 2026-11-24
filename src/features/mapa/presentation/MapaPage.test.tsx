import { cleanup, fireEvent, render as renderizar, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import { MapaPage } from './MapaPage'

afterEach(cleanup)

// O link "Ver perfil" usa o roteador, então a tela precisa de um em volta nos testes.
function render(tela: ReactElement) {
  return renderizar(<MemoryRouter>{tela}</MemoryRouter>)
}

describe('MapaPage', () => {
  it('mostra o mapa com a atribuição do OpenStreetMap', () => {
    render(<MapaPage />)
    expect(screen.getByLabelText('Mapa do campus')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'OpenStreetMap' })).toBeInTheDocument()
  })

  it('desenha um marcador para cada ponto recebido', () => {
    const { container } = render(
      <MapaPage
        marcadores={[
          { id: 'a', latitude: -5.0577, longitude: -42.7955, nome: 'Brownies da Ana' },
          { id: 'b', latitude: -5.058, longitude: -42.796, nome: 'Café do Leo' },
        ]}
      />,
    )
    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(2)
  })

  it('não desenha marcadores quando ninguém está no campus', () => {
    const { container } = render(<MapaPage />)
    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(0)
  })
})

describe('MapaPage: botão Minha localização', () => {
  it('pede a posição ao serviço de localização e não mostra erro', async () => {
    const posicaoAtual = vi.fn().mockResolvedValue({ latitude: -5.0577, longitude: -42.7955 })
    render(<MapaPage localizacao={{ posicaoAtual }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Minha localização' }))

    await waitFor(() => expect(posicaoAtual).toHaveBeenCalledOnce())
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Minha localização' })).toBeEnabled(),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('mostra a mensagem do serviço quando a permissão é negada (RN12)', async () => {
    const posicaoAtual = vi
      .fn()
      .mockRejectedValue(new Falha('Sem a permissão de localização…', 'permissao-negada'))
    render(<MapaPage localizacao={{ posicaoAtual }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Minha localização' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Sem a permissão de localização…')
  })
})

describe('MapaPage: balão do marcador (US06)', () => {
  it('mostra o nome e a referência ao tocar no marcador', async () => {
    render(
      <MapaPage
        marcadores={[
          {
            id: 'a',
            latitude: -5.0577,
            longitude: -42.7955,
            nome: 'Brownies da Ana',
            referencia: 'em frente ao RU',
          },
        ]}
      />,
    )
    expect(screen.queryByText('em frente ao RU')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Brownies da Ana'))

    expect(await screen.findByText('em frente ao RU')).toBeInTheDocument()
    expect(screen.getByText('Brownies da Ana', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('No campus agora')).toBeInTheDocument()
  })

  it('mostra só o nome quando o vendedor não informou referência', async () => {
    const { container } = render(
      <MapaPage
        marcadores={[
          {
            id: 'a',
            latitude: -5.0577,
            longitude: -42.7955,
            nome: 'Café do Leo',
            referencia: null,
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByTitle('Café do Leo'))

    expect(await screen.findByText('Café do Leo', { selector: 'p' })).toBeInTheDocument()
    expect(container.querySelectorAll('.leaflet-popup-content p')).toHaveLength(1)
  })
})

describe('MapaPage: botões de contato no balão (US07)', () => {
  const linkWhatsApp =
    'https://wa.me/5586999990000?text=Oi!%20Vi%20seu%20an%C3%BAncio%20no%20UniVendas'

  it('mostra WhatsApp e Ligar com os links do vendedor', async () => {
    render(
      <MapaPage
        marcadores={[
          {
            id: 'a',
            latitude: -5.0577,
            longitude: -42.7955,
            nome: 'Brownies da Ana',
            contatos: [
              { canal: 'whatsapp', rotulo: 'WhatsApp', link: linkWhatsApp },
              { canal: 'telefone', rotulo: 'Ligar', link: 'tel:+5586988880000' },
            ],
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByTitle('Brownies da Ana'))

    const whatsapp = await screen.findByRole('link', { name: 'WhatsApp' })
    expect(whatsapp).toHaveAttribute('href', linkWhatsApp)
    expect(whatsapp).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: 'Ligar' })).toHaveAttribute(
      'href',
      'tel:+5586988880000',
    )
  })

  it('esconde o botão do contato que o vendedor não cadastrou', async () => {
    render(
      <MapaPage
        marcadores={[
          {
            id: 'a',
            latitude: -5.0577,
            longitude: -42.7955,
            nome: 'Café do Leo',
            contatos: [{ canal: 'telefone', rotulo: 'Ligar', link: 'tel:+5586988880000' }],
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByTitle('Café do Leo'))

    expect(await screen.findByRole('link', { name: 'Ligar' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'WhatsApp' })).not.toBeInTheDocument()
  })
})

describe('MapaPage: link para o perfil (US10)', () => {
  it('o balão tem o link "Ver perfil" para o vendedor certo', async () => {
    render(
      <MapaPage
        marcadores={[
          { id: 'v1', latitude: -5.0577, longitude: -42.7955, nome: 'Brownies da Ana' },
          { id: 'v2', latitude: -5.058, longitude: -42.796, nome: 'Café do Leo' },
        ]}
      />,
    )

    fireEvent.click(screen.getByTitle('Café do Leo'))

    expect(await screen.findByRole('link', { name: 'Ver perfil' })).toHaveAttribute(
      'href',
      '/vendedor/v2',
    )
  })
})

describe('MapaPage: botão "Chat" no balão (US18)', () => {
  it('mostra "Chat" no balão de outro vendedor, mesmo sem contatos', async () => {
    render(
      <MapaPage
        marcadores={[{ id: 'v1', latitude: -5.0577, longitude: -42.7955, nome: 'Brownies da Ana' }]}
      />,
    )

    fireEvent.click(screen.getByTitle('Brownies da Ana'))

    expect(await screen.findByRole('button', { name: 'Chat' })).toBeInTheDocument()
  })

  it('não mostra "Chat" no balão do próprio usuário (RN22)', async () => {
    render(
      <MapaPage
        marcadores={[
          { id: 'v9', latitude: -5.0577, longitude: -42.7955, nome: 'Minha banca', meu: true },
        ]}
      />,
    )

    fireEvent.click(screen.getByTitle('Minha banca'))

    expect(await screen.findByRole('link', { name: 'Ver perfil' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Chat' })).not.toBeInTheDocument()
  })
})
