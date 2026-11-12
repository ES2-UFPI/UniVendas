import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Falha } from '../../../core/falha'
import { LocalizacaoService, type LatLng } from '../../../core/localizacaoService'
import type { CanalTipo } from '../../vendedores/domain/Contato'
import { CENTRO_DO_CAMPUS, ZOOM_INICIAL } from '../domain/campus'

/**
 * Vendedor ativo no mapa. A lista vem das presenças ativas (#72).
 * Tocar no marcador mostra o nome, a referência (US06) e os botões de contato (US07).
 */
export interface Marcador {
  id: string
  latitude: number
  longitude: number
  /** Nome de exibição do vendedor (`vendedores.nome_exibicao`). */
  nome: string
  /** Referência opcional, ex.: "em frente ao RU" (`presenca.referencia`, RN18). */
  referencia?: string | null
  /** Botões de contato, com o link já montado pelo `ContatoService`. Sem contato, sem botão. */
  contatos?: BotaoContato[]
}

export interface BotaoContato {
  canal: CanalTipo
  /** Texto do botão: "WhatsApp" ou "Ligar". */
  rotulo: string
  /** `https://wa.me/...` ou `tel:+55...`. */
  link: string
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
          <Marker key={m.id} position={[m.latitude, m.longitude]} icon={icone} title={m.nome}>
            <Popup>
              <p className="!m-0 font-semibold text-gray-900">{m.nome}</p>
              {m.referencia && <p className="!m-0 mt-1 text-sm text-gray-600">{m.referencia}</p>}
              {m.contatos && m.contatos.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {m.contatos.map((c) => (
                    // O WhatsApp abre em outra aba; o tel: abre o discador do celular.
                    <a
                      key={c.canal}
                      href={c.link}
                      {...(c.canal === 'whatsapp'
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                      className={`rounded-lg px-3 py-1 text-sm font-medium !text-white ${
                        c.canal === 'whatsapp' ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                    >
                      {c.rotulo}
                    </a>
                  ))}
                </div>
              )}
            </Popup>
          </Marker>
        ))}
        {minhaPosicao && (
          <CircleMarker center={[minhaPosicao.latitude, minhaPosicao.longitude]} radius={10} />
        )}
        <Recentralizar ponto={minhaPosicao} />
      </MapContainer>
    </section>
  )
}
