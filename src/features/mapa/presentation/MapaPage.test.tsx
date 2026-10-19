import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MapaPage } from './MapaPage'

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
          { id: 'a', latitude: -5.0577, longitude: -42.7955 },
          { id: 'b', latitude: -5.058, longitude: -42.796 },
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
