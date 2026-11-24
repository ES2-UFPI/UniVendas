import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { rotaPerfilVendedor } from '../../../core/routes'
import { Icone } from '../../../core/ui/Icone'
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
      <p role="status" className="py-4 text-tinta-suave">
        Carregando quem está no campus…
      </p>
    )
  }

  if (vendedores.length === 0) {
    return <p className="py-4 text-tinta-suave">Ninguém está no campus agora.</p>
  }

  return (
    <ul
      aria-label="Vendedores no campus agora"
      className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
    >
      {vendedores.map((v) => (
        <li key={v.id}>
          <Link
            to={rotaPerfilVendedor(v.id)}
            className="flex h-full items-center gap-4 rounded-cartao border border-linha bg-white p-4 transition-colors hover:border-marca-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-marca-50 text-marca-600">
              <Icone nome="pino" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold break-words text-tinta">{v.nome}</span>
              {v.referencia && (
                <span className="block text-sm break-words text-tinta-suave">{v.referencia}</span>
              )}
            </span>
            <span className="shrink-0 text-xs text-tinta-suave">
              {tempoDesdeSinal(v.ultimoSinalEm, agora)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
