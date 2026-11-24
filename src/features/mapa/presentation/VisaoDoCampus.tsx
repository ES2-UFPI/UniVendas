import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROTAS } from '../../../core/routes'
import { Aviso } from '../../../core/ui/Aviso'
import { estiloEntrada } from '../../../core/ui/CampoFormulario'
import { estiloBotao } from '../../../core/ui/estiloBotao'
import { Icone } from '../../../core/ui/Icone'
import { TituloTela } from '../../../core/ui/TituloTela'
import { contagemNoCampus } from '../domain/contagemNoCampus'
import { prepararBusca } from '../../busca/presentation/memoriaDaBusca'
import { ListaNoCampus, type VendedorNaLista } from './ListaNoCampus'
import { MapaPage, type Marcador } from './MapaPage'

interface VisaoDoCampusProps {
  marcadores: Marcador[]
  vendedores: VendedorNaLista[]
  carregando?: boolean
  /** Falha ao ler quem está no campus. */
  erro?: string | null
}

type Visao = 'mapa' | 'lista'

/** O campo do Paper no topo do mapa: buscar leva à tela de busca, já com o texto. */
function BuscaDoMapa() {
  const [texto, setTexto] = useState('')
  const navegar = useNavigate()

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    prepararBusca(texto)
    navegar(ROTAS.busca)
  }

  return (
    <form role="search" onSubmit={enviar} className="mt-6">
      <label htmlFor="busca-do-mapa" className="sr-only">
        Busque um produto ou vendedor
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-marca-600">
          <Icone nome="lupa" />
        </span>
        <input
          id="busca-do-mapa"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Busque um produto ou vendedor"
          className={`${estiloEntrada.replace('bg-white', 'bg-campo')} pl-12`}
        />
      </div>
    </form>
  )
}

/**
 * Tela do mapa (US06, US13, visual da US21): o campus em duas visões dos mesmos vendedores ativos,
 * o mapa e a lista. Os dados vêm de uma inscrição só, feita fora daqui, então trocar de visão
 * não abre outro canal.
 */
export function VisaoDoCampus({
  marcadores,
  vendedores,
  carregando = false,
  erro = null,
}: VisaoDoCampusProps) {
  const [visao, setVisao] = useState<Visao>('mapa')

  return (
    <section className="flex w-full flex-1 flex-col">
      <TituloTela
        titulo="Encontre quem está por perto"
        apoio="UFPI · Campus Ministro Petrônio Portella"
      />

      <BuscaDoMapa />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Como ver quem está no campus" className="flex gap-3">
          <button
            type="button"
            aria-pressed={visao === 'mapa'}
            onClick={() => setVisao('mapa')}
            className={estiloBotao(visao === 'mapa' ? 'primario' : 'secundario', 'h-11 px-4')}
          >
            <Icone nome="pino" className="h-[18px] w-[18px]" />
            Mapa
          </button>
          <button
            type="button"
            aria-pressed={visao === 'lista'}
            onClick={() => setVisao('lista')}
            className={estiloBotao(visao === 'lista' ? 'primario' : 'secundario', 'h-11 px-4')}
          >
            <Icone nome="grade" className="h-[18px] w-[18px]" />
            Lista
          </button>
        </div>
        {!carregando && (
          <p className="text-sm text-tinta-suave">{contagemNoCampus(vendedores.length)}</p>
        )}
      </div>

      {erro && (
        <Aviso tipo="erro" className="mt-4">
          {erro}
        </Aviso>
      )}

      <div className="mt-5 flex flex-1 flex-col">
        {visao === 'mapa' ? (
          <MapaPage marcadores={marcadores} />
        ) : (
          <ListaNoCampus vendedores={vendedores} carregando={carregando} />
        )}
      </div>
    </section>
  )
}
