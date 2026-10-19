import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { CENTRO_DO_CAMPUS, ZOOM_INICIAL } from '../domain/campus'

/** Ponto no mapa. Os marcadores vêm das presenças ativas (#72). */
export interface Marcador {
  id: string
  latitude: number
  longitude: number
}

// No Vite os ícones padrão do Leaflet quebram; apontamos para as imagens importadas.
const icone = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface MapaPageProps {
  marcadores?: Marcador[]
}

export function MapaPage({ marcadores = [] }: MapaPageProps) {
  return (
    <section aria-label="Mapa do campus" className="flex w-full flex-1 flex-col">
      {/* O contêiner do Leaflet precisa de altura, senão o mapa fica invisível. */}
      <MapContainer center={CENTRO_DO_CAMPUS} zoom={ZOOM_INICIAL} className="h-[70vh] w-full">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {marcadores.map((m) => (
          <Marker key={m.id} position={[m.latitude, m.longitude]} icon={icone} />
        ))}
      </MapContainer>
    </section>
  )
}
