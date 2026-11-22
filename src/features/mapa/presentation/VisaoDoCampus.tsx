import { useState } from 'react'
import { ListaNoCampus, type VendedorNaLista } from './ListaNoCampus'
import { MapaPage, type Marcador } from './MapaPage'

interface VisaoDoCampusProps {
  marcadores: Marcador[]
  vendedores: VendedorNaLista[]
  carregando?: boolean
}

type Visao = 'mapa' | 'lista'

const estiloBotao = (ativo: boolean) =>
  `rounded-lg px-4 py-1 text-sm font-medium ${ativo ? 'bg-green-100 text-green-800' : 'text-gray-700 hover:bg-gray-100'}`

/**
 * O campus em duas visões dos mesmos vendedores ativos (US06 e US13): o mapa e a lista.
 * Os dados vêm de uma inscrição só, feita fora daqui, então trocar de visão não abre outro canal.
 */
export function VisaoDoCampus({ marcadores, vendedores, carregando = false }: VisaoDoCampusProps) {
  const [visao, setVisao] = useState<Visao>('mapa')

  return (
    <>
      <div role="group" aria-label="Como ver quem está no campus" className="mb-2 flex gap-1">
        <button
          type="button"
          aria-pressed={visao === 'mapa'}
          onClick={() => setVisao('mapa')}
          className={estiloBotao(visao === 'mapa')}
        >
          Mapa
        </button>
        <button
          type="button"
          aria-pressed={visao === 'lista'}
          onClick={() => setVisao('lista')}
          className={estiloBotao(visao === 'lista')}
        >
          Lista
        </button>
      </div>
      {visao === 'mapa' ? (
        <MapaPage marcadores={marcadores} />
      ) : (
        <ListaNoCampus vendedores={vendedores} carregando={carregando} />
      )}
    </>
  )
}
