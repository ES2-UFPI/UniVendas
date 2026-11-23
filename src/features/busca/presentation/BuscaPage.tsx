import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { rotaPerfilVendedor } from '../../../core/routes'
import { formatarPreco } from '../../itens/domain/validacoesItem'
import type { Categoria } from '../../itens/domain/Categoria'
import type { BuscaRepository, ResultadoBusca } from '../domain/BuscaRepository'
import type { FonteCategorias } from '../domain/navegacaoCategorias'
import { useBuscaViewModel, type FiltroBuscado } from './useBuscaViewModel'

interface BuscaPageProps {
  /** Só para os testes: repositório falso. */
  repositorio?: BuscaRepository
  /** Só para os testes: árvore de categorias falsa. */
  categoriasRepositorio?: FonteCategorias
}

/** Mensagem de quando a busca não acha nada, conforme o que foi buscado. */
function nadaEncontrado({ texto, categoria }: FiltroBuscado): string {
  if (categoria && texto) return `Nada encontrado para “${texto}” em ${categoria.nome}.`
  if (categoria) return `Nenhum item em ${categoria.nome} por enquanto.`
  return `Nada encontrado para “${texto}”.`
}

interface NavegacaoProps {
  caminho: Categoria[]
  subcategorias: Categoria[]
  desabilitado: boolean
  aoEscolher: (id: number | null) => void
}

/**
 * Navegação pela árvore de categorias (US12): a trilha de onde a pessoa está
 * ("Todas › Alimentação › Doces") e as categorias de baixo. Cada nível já mostra os itens dele.
 */
function NavegacaoCategorias({ caminho, subcategorias, desabilitado, aoEscolher }: NavegacaoProps) {
  const atual = caminho.at(-1)
  const botao =
    'rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-800 hover:border-green-600 hover:text-green-700 disabled:opacity-60'

  return (
    <nav aria-label="Categorias" className="mt-4 flex flex-col gap-2">
      {atual && (
        <ol className="flex flex-wrap items-center gap-1 text-sm">
          <li>
            <button
              type="button"
              disabled={desabilitado}
              onClick={() => aoEscolher(null)}
              className="text-green-700 underline-offset-2 hover:underline disabled:opacity-60"
            >
              Todas
            </button>
          </li>
          {caminho.map((c) => (
            <li key={c.id} className="flex items-center gap-1">
              <span aria-hidden="true" className="text-gray-400">
                ›
              </span>
              {c === atual ? (
                <span aria-current="page" className="font-semibold text-gray-900">
                  {c.nome}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={desabilitado}
                  onClick={() => aoEscolher(c.id)}
                  className="text-green-700 underline-offset-2 hover:underline disabled:opacity-60"
                >
                  {c.nome}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
      {subcategorias.length > 0 && (
        <ul
          aria-label={atual ? `Categorias dentro de ${atual.nome}` : 'Categorias'}
          className="flex flex-wrap gap-2"
        >
          {subcategorias.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={desabilitado}
                onClick={() => aoEscolher(c.id)}
                className={botao}
              >
                {c.nome}
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
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

/**
 * Tela de busca: procura por nome de produto ou de vendedor, sem ligar para maiúsculas e acentos (US11),
 * e navega pelas categorias, vendo os itens de cada nível (US12).
 */
export function BuscaPage({ repositorio, categoriasRepositorio }: BuscaPageProps) {
  const vm = useBuscaViewModel({ repositorio, categoriasRepositorio })

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    await vm.buscar()
  }

  return (
    <section className="mx-auto w-full max-w-md p-4">
      <h2 className="text-xl font-bold text-gray-900">Buscar</h2>
      <p className="mt-1 text-sm text-gray-600">
        Procure um produto ou um vendedor, ou escolha uma categoria. Não precisa acertar acento nem
        maiúscula.
      </p>

      <form role="search" onSubmit={enviar} className="mt-4 flex gap-2">
        <label htmlFor="busca" className="sr-only">
          {vm.categoriaAtual
            ? `Produto ou vendedor em ${vm.categoriaAtual.nome}`
            : 'Produto ou vendedor'}
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

      {vm.erroCategorias ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {vm.erroCategorias}
        </p>
      ) : (
        <NavegacaoCategorias
          caminho={vm.caminho}
          subcategorias={vm.subcategorias}
          desabilitado={vm.buscando}
          aoEscolher={(id) => void vm.escolherCategoria(id)}
        />
      )}

      {vm.erro && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {vm.erro}
        </p>
      )}

      {vm.buscado && !vm.erro && vm.resultados.length === 0 && (
        <p role="status" className="mt-4 text-gray-700">
          {nadaEncontrado(vm.buscado)}
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
