import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { Falha } from '../../../core/falha'
import { LocalizacaoService, type LatLng } from '../../../core/localizacaoService'
import { rotaPerfilVendedor } from '../../../core/routes'
import { Avatar } from '../../../core/ui/Avatar'
import { Aviso } from '../../../core/ui/Aviso'
import { estiloBotao } from '../../../core/ui/estiloBotao'
import { Icone } from '../../../core/ui/Icone'
import { ICONES } from '../../../core/ui/icones'
import { Selo } from '../../../core/ui/Selo'
import { BotaoChat } from '../../chat/presentation/BotaoChat'
import type { ChatRepository } from '../../chat/domain/ChatRepository'
import type { CanalTipo } from '../../vendedores/domain/Contato'
import { CENTRO_DO_CAMPUS, ZOOM_INICIAL } from '../domain/campus'

/**
 * Vendedor ativo no mapa. A lista vem das presenças ativas (#72).
 * Tocar no marcador mostra o nome, a referência (US06), os botões de contato (US07)
 * e o link para o perfil do vendedor (US10).
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
  /** `true` quando o marcador é do próprio usuário: o balão não mostra "Chat" (RN22). */
  meu?: boolean
}

export interface BotaoContato {
  canal: CanalTipo
  /** Texto do botão: "WhatsApp" ou "Ligar". */
  rotulo: string
  /** `https://wa.me/...` ou `tel:+55...`. */
  link: string
}

// O pino verde do tema (US21), desenhado em SVG: não depende das imagens do Leaflet.
const icone = L.divIcon({
  className: '',
  html: `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path d="${ICONES.pino}" fill="#15803d" stroke="#ffffff" stroke-width="1.4" fill-rule="evenodd"/></svg>`,
  iconSize: [34, 34],
  iconAnchor: [17, 33],
  popupAnchor: [0, -30],
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
  /** Só para os testes: repositório do chat falso. */
  chatRepositorio?: ChatRepository
}

const servicoPadrao = new LocalizacaoService()

export function MapaPage({
  marcadores = [],
  localizacao = servicoPadrao,
  chatRepositorio,
}: MapaPageProps) {
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
    <section aria-label="Mapa do campus" className="flex w-full flex-1 flex-col gap-3">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div className="relative overflow-hidden rounded-cartao border border-linha">
        {/* O contêiner do Leaflet precisa de altura, senão o mapa fica invisível. */}
        <MapContainer
          center={CENTRO_DO_CAMPUS}
          zoom={ZOOM_INICIAL}
          className="h-[62vh] min-h-[360px] w-full md:h-[560px]"
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {marcadores.map((m) => (
            <Marker key={m.id} position={[m.latitude, m.longitude]} icon={icone} title={m.nome}>
              <Popup>
                <div className="flex w-[232px] max-w-full flex-col gap-3 font-sans">
                  <div className="flex items-center gap-3">
                    <Avatar nome={m.nome} fotoUrl={null} className="h-11 w-11 text-base" />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="!m-0 font-titulo text-lg leading-6 tracking-[-0.035em] break-words text-tinta">
                        {m.nome}
                      </p>
                      <Selo className="text-[13px]">No campus agora</Selo>
                    </div>
                  </div>
                  {m.referencia && (
                    <p className="!m-0 text-sm break-words text-tinta-suave">{m.referencia}</p>
                  )}
                  <div className="flex gap-2">
                    {/* Link do roteador: abre o perfil sem recarregar a página. O id do marcador é o do vendedor. */}
                    <Link
                      to={rotaPerfilVendedor(m.id)}
                      className={estiloBotao('primario', 'h-10 flex-1 px-4 text-sm !text-white')}
                    >
                      Ver perfil
                    </Link>
                    {/* "Chat" abre a conversa dentro do app (US18); não aparece no próprio marcador (RN22). */}
                    {!m.meu && (
                      <BotaoChat
                        vendedorId={m.id}
                        className="flex-1"
                        compacto
                        repositorio={chatRepositorio}
                      />
                    )}
                  </div>
                  {m.contatos && m.contatos.length > 0 && (
                    <div className="flex gap-2">
                      {m.contatos.map((c) => (
                        // O WhatsApp abre em outra aba; o tel: abre o discador do celular.
                        <a
                          key={c.canal}
                          href={c.link}
                          {...(c.canal === 'whatsapp'
                            ? { target: '_blank', rel: 'noopener noreferrer' }
                            : {})}
                          className={estiloBotao(
                            'secundario',
                            'h-10 flex-1 px-4 text-sm !text-marca-600',
                          )}
                        >
                          <Icone nome="telefone" className="h-4 w-4" />
                          {c.rotulo}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          {minhaPosicao && (
            <CircleMarker
              center={[minhaPosicao.latitude, minhaPosicao.longitude]}
              radius={10}
              pathOptions={{ color: '#1d4ed8' }}
            />
          )}
          <Recentralizar ponto={minhaPosicao} />
        </MapContainer>
        {/* Por cima do mapa (z 1000 do Leaflet), mas por baixo das barras do app (z 1100). */}
        <button
          type="button"
          onClick={centralizarEmMim}
          disabled={localizando}
          aria-label={localizando ? 'Localizando…' : 'Minha localização'}
          title="Minha localização"
          className="absolute top-3 right-3 z-[1000] flex h-11 w-11 items-center justify-center rounded-controle border border-linha bg-white text-marca-600 shadow-sm hover:border-marca-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600 disabled:opacity-60"
        >
          <Icone nome="localizacao" />
        </button>
      </div>
    </section>
  )
}
