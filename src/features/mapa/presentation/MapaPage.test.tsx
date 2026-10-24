import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import { MapaPage } from './MapaPage'

afterEach(cleanup)

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
