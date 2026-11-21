import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { rotaPerfilVendedor } from '../../../core/routes'
import { tempoDesdeSinal } from '../domain/tempoDesdeSinal'

/** Um vendedor que está no campus agora, como a lista mostra (US13). */
export interface VendedorNaLista {
  id: string
  nome: string
  referencia: string | null
  /** Quando o app do vendedor mandou o último sinal (RN13). */
  ultimoSinalEm: Date
}

/** De quanto em quanto tempo o "há N min" é recalculado, mesmo sem sinal novo. */
const ATUALIZACAO_MS = 30_000

interface ListaNoCampusProps {
  /** Já na ordem certa: o ViewModel entrega os mais recentes primeiro. */
  vendedores: VendedorNaLista[]
  carregando?: boolean
}

/**
 * Lista de quem está no campus agora (US13), com o nome, a referência, há quanto tempo mandou
 * o último sinal e o link para o perfil. Usa os mesmos dados do mapa, que vêm do `useMapaViewModel`.
 */
export function ListaNoCampus({ vendedores, carregando = false }: ListaNoCampusProps) {
  // O "há N min" muda com o tempo, não só quando chega um sinal; por isso a lista tem o próprio relógio.
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const relogio = setInterval(() => setAgora(new Date()), ATUALIZACAO_MS)
    return () => clearInterval(relogio)
  }, [])

  if (carregando) {
    return (
      <p role="status" className="p-4 text-gray-600">
        Carregando quem está no campus…
      </p>
    )
  }

  if (vendedores.length === 0) {
    return <p className="p-4 text-gray-700">Ninguém está no campus agora.</p>
  }

  return (
    <ul aria-label="Vendedores no campus agora" className="flex w-full max-w-md flex-col gap-2">
      {vendedores.map((v) => (
        <li key={v.id}>
          <Link
            to={rotaPerfilVendedor(v.id)}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
          >
            <span className="min-w-0">
              <span className="block break-words font-semibold text-gray-900">{v.nome}</span>
              {v.referencia && (
                <span className="block break-words text-sm text-gray-600">{v.referencia}</span>
              )}
            </span>
            <span className="shrink-0 text-xs text-gray-500">
              {tempoDesdeSinal(v.ultimoSinalEm, agora)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
