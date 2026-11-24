import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import type { LatLng } from '../../../core/localizacaoService'
import { CENTRO_DO_CAMPUS, ZOOM_INICIAL } from '../../mapa/domain/campus'
import { iconeMarcador } from '../../mapa/presentation/iconeMarcador'

interface EscolherPontoNoMapaProps {
  ponto: LatLng | null
  /** Chamado com o ponto tocado no mapa. */
  aoEscolher: (ponto: LatLng) => void
  /** Com a presença ligada, o ponto não muda. */
  bloqueado: boolean
}

// Ouve o toque no mapa e devolve a coordenada; o Leaflet só entrega eventos a filhos do MapContainer.
function AoTocar({ aoEscolher, bloqueado }: Omit<EscolherPontoNoMapaProps, 'ponto'>) {
  useMapEvents({
    click(evento) {
      if (!bloqueado) aoEscolher({ latitude: evento.latlng.lat, longitude: evento.latlng.lng })
    },
  })
  return null
}

/**
 * Mapa pequeno do painel para o vendedor tocar onde quer que o marcador apareça (RN14).
 * Se o ponto estiver fora do campus, o servidor recusa ao ligar.
 */
export function EscolherPontoNoMapa({ ponto, aoEscolher, bloqueado }: EscolherPontoNoMapaProps) {
  return (
    // `isolate`: as camadas do Leaflet ficam presas aqui dentro, abaixo do cabeçalho.
    <div aria-label="Mapa para escolher o ponto" role="group" className="isolate">
      <MapContainer
        center={CENTRO_DO_CAMPUS}
        zoom={ZOOM_INICIAL}
        className="h-72 w-full rounded-cartao border border-linha md:h-[390px]"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <AoTocar aoEscolher={aoEscolher} bloqueado={bloqueado} />
        {ponto && (
          <Marker
            position={[ponto.latitude, ponto.longitude]}
            icon={iconeMarcador}
            title="Ponto escolhido"
          />
        )}
      </MapContainer>
    </div>
  )
}
