import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { rotaPerfilVendedor } from '../../../core/routes'
import { formatarPreco } from '../../itens/domain/validacoesItem'
import type { BuscaRepository, ResultadoBusca } from '../domain/BuscaRepository'
import { useBuscaViewModel } from './useBuscaViewModel'

interface BuscaPageProps {
  /** Só para os testes: repositório falso. */
  repositorio?: BuscaRepository
}

/**
 * Um resultado: o item, o preço e o vendedor, com link para o perfil dele.
 * Esgotado aparece riscado e com a marca "Esgotado" em texto, para o leitor de tela também saber (RN09).
 */
function LinhaResultado({ resultado }: { resultado: ResultadoBusca }) {
  const { item } = resultado
  return (
    <li className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`break-words font-semibold ${item.disponivel ? 'text-gray-900' : 'text-gray-500 line-through'}`}
        >
          {item.nome}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {!item.disponivel && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
              Esgotado
            </span>
          )}
          <span className="text-gray-700">{formatarPreco(item.preco)}</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          to={rotaPerfilVendedor(item.vendedorId)}
          className="font-medium text-green-700 underline-offset-2 hover:underline"
        >
          {resultado.vendedorNome}
        </Link>
        {resultado.noCampusAgora && (
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
            No campus agora
          </span>
        )}
      </div>
    </li>
  )
}

/** Tela de busca (US11): procura por nome de produto ou de vendedor, sem ligar para maiúsculas e acentos. */
export function BuscaPage({ repositorio }: BuscaPageProps) {
  const vm = useBuscaViewModel({ repositorio })

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    await vm.buscar()
  }

  return (
    <section className="mx-auto w-full max-w-md p-4">
      <h2 className="text-xl font-bold text-gray-900">Buscar</h2>
      <p className="mt-1 text-sm text-gray-600">
        Procure um produto ou um vendedor. Não precisa acertar acento nem maiúscula.
      </p>

      <form role="search" onSubmit={enviar} className="mt-4 flex gap-2">
        <label htmlFor="busca" className="sr-only">
          Produto ou vendedor
        </label>
        <input
          id="busca"
          type="search"
          value={vm.texto}
          onChange={(e) => vm.alterarTexto(e.target.value)}
          placeholder="brownie, café, Doces da Ana…"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/30"
        />
        <button
          type="submit"
          disabled={vm.buscando}
          className="shrink-0 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {vm.buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {vm.erro && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {vm.erro}
        </p>
      )}

      {vm.buscou && !vm.erro && vm.resultados.length === 0 && (
        <p role="status" className="mt-4 text-gray-700">
          Nada encontrado para “{vm.texto.trim()}”.
        </p>
      )}

      {vm.resultados.length > 0 && (
        <ul aria-label="Resultados da busca" className="mt-4 flex flex-col gap-3">
          {vm.resultados.map((r) => (
            <LinhaResultado key={r.item.id} resultado={r} />
          ))}
        </ul>
      )}
    </section>
  )
}
