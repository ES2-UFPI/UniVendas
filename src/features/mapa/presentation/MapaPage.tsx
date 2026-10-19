import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { Falha } from '../../../core/falha'
import { LocalizacaoService, type LatLng } from '../../../core/localizacaoService'
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

// O "center" do MapContainer só vale na criação; para mover depois, usamos o objeto do mapa.
function Recentralizar({ ponto }: { ponto: LatLng | null }) {
  const mapa = useMap()
  useEffect(() => {
    if (ponto) mapa.setView([ponto.latitude, ponto.longitude], ZOOM_INICIAL)
  }, [ponto, mapa])
  return null
}

interface MapaPageProps {
  marcadores?: Marcador[]
  localizacao?: Pick<LocalizacaoService, 'posicaoAtual'>
}

const servicoPadrao = new LocalizacaoService()

export function MapaPage({ marcadores = [], localizacao = servicoPadrao }: MapaPageProps) {
  const [minhaPosicao, setMinhaPosicao] = useState<LatLng | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [localizando, setLocalizando] = useState(false)

  async function centralizarEmMim() {
    setLocalizando(true)
    setErro(null)
    try {
      setMinhaPosicao(await localizacao.posicaoAtual())
    } catch (e) {
      setErro(e instanceof Falha ? e.mensagem : 'Não foi possível descobrir sua posição agora.')
    } finally {
      setLocalizando(false)
    }
  }

  return (
    <section aria-label="Mapa do campus" className="flex w-full flex-1 flex-col gap-2">
      <button
        type="button"
        onClick={centralizarEmMim}
        disabled={localizando}
        className="self-end rounded-lg bg-green-600 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {localizando ? 'Localizando…' : 'Minha localização'}
      </button>
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
      {/* O contêiner do Leaflet precisa de altura, senão o mapa fica invisível. */}
      <MapContainer center={CENTRO_DO_CAMPUS} zoom={ZOOM_INICIAL} className="h-[70vh] w-full">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {marcadores.map((m) => (
          <Marker key={m.id} position={[m.latitude, m.longitude]} icon={icone} />
        ))}
        {minhaPosicao && (
          <CircleMarker center={[minhaPosicao.latitude, minhaPosicao.longitude]} radius={10} />
        )}
        <Recentralizar ponto={minhaPosicao} />
      </MapContainer>
    </section>
  )
}
