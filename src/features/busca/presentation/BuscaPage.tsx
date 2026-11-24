import { useEffect, useLayoutEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { rotaItem } from '../../../core/routes'
import type { Categoria } from '../../itens/domain/Categoria'
import type { Atalho } from '../domain/atalhos'
import type { BuscaRepository } from '../domain/BuscaRepository'
import type { FonteCategorias } from '../domain/navegacaoCategorias'
import { CartaoResultado } from './CartaoResultado'
import { FotoOuInicial } from './FotoOuInicial'
import { rolagemDaBusca } from './memoriaDaBusca'
import { useBuscaViewModel } from './useBuscaViewModel'

interface BuscaPageProps {
  /** Só para os testes: repositório falso. */
  repositorio?: BuscaRepository
  /** Só para os testes: árvore de categorias falsa. */
  categoriasRepositorio?: FonteCategorias
}

/** Ícone de traço, 24x24, só decorativo. */
function Icone({ d, className = 'h-5 w-5' }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

const LUPA = 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm10 18-4.3-4.3'
const SETA_DIAGONAL = 'M7 17 17 7M7 7h10v10'
const CHECK = 'm5 12 5 5L20 7'

interface AbasProps {
  abas: Categoria[]
  atual: Categoria | null
  aoTrocar: (id: number) => void
}

/**
 * Abas Alimentação / Outros produtos (padrão de abas do ARIA): as setas trocam de aba
 * e só a aba escolhida entra no Tab, para o teclado não passar por todas.
 */
function AbasDaBusca({ abas, atual, aoTrocar }: AbasProps) {
  const botoes = useRef<(HTMLButtonElement | null)[]>([])

  function teclar(evento: KeyboardEvent, indice: number) {
    const passo = { ArrowRight: 1, ArrowLeft: -1 }[evento.key]
    if (!passo) return
    evento.preventDefault()
    const proximo = (indice + passo + abas.length) % abas.length
    botoes.current[proximo]?.focus()
    aoTrocar(abas[proximo].id)
  }

  return (
    <div
      role="tablist"
      aria-label="Tipo de produto"
      className="mt-6 flex gap-8 border-b border-linha"
    >
      {abas.map((aba, indice) => {
        const escolhida = aba.id === atual?.id
        return (
          <button
            key={aba.id}
            ref={(el) => {
              botoes.current[indice] = el
            }}
            type="button"
            role="tab"
            id={`aba-${aba.id}`}
            aria-selected={escolhida}
            aria-controls="painel-da-busca"
            tabIndex={escolhida ? 0 : -1}
            onClick={() => aoTrocar(aba.id)}
            onKeyDown={(e) => teclar(e, indice)}
            className={`-mb-px border-b-[3px] pb-3 text-[15px] font-semibold focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-marca-600 ${
              escolhida
                ? 'border-marca-600 text-marca-600'
                : 'border-transparent text-tinta-suave hover:text-tinta'
            }`}
          >
            {aba.nome}
          </button>
        )
      })}
    </div>
  )
}

interface AtalhosProps {
  atalhos: Atalho[]
  escolhido: Categoria | null
  aoEscolher: (id: number) => void
}

/** Os tipos de produto à venda, em blocos com foto. Escolher um filtra a lista; de novo, tira o filtro. */
function AtalhosDaBusca({ atalhos, escolhido, aoEscolher }: AtalhosProps) {
  return (
    <section aria-labelledby="titulo-atalhos" className="mt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="titulo-atalhos" className="text-xl font-bold tracking-tight text-tinta">
          Para descobrir no campus
        </h3>
        <span className="hidden text-sm text-tinta-suave sm:inline">
          {atalhos.length === 1 ? '1 opção' : `${atalhos.length} opções`}
        </span>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {atalhos.map(({ categoria, fotoUrl }) => {
          const ativo = categoria.id === escolhido?.id
          return (
            <li key={categoria.id}>
              <button
                type="button"
                aria-pressed={ativo}
                onClick={() => aoEscolher(categoria.id)}
                className={`flex w-full flex-col overflow-hidden rounded-2xl border bg-cartao text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600 ${
                  ativo
                    ? 'border-marca-600 ring-2 ring-marca-600'
                    : 'border-linha hover:border-borda'
                }`}
              >
                <FotoOuInicial
                  url={fotoUrl}
                  nome={categoria.nome}
                  className="aspect-[232/202] w-full"
                />
                <span className="flex items-center justify-between gap-2 px-3 py-3.5 sm:px-4">
                  <span className="truncate text-[15px] font-semibold text-tinta">
                    {categoria.nome}
                  </span>
                  <span className="text-marca-600">
                    <Icone d={ativo ? CHECK : SETA_DIAGONAL} className="h-4 w-4" />
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Guarda até onde a pessoa rolou e, ao voltar com a lista na memória, rola para lá de novo. */
function useRolagemDaBusca(temLista: boolean) {
  const voltando = useRef(temLista)

  useLayoutEffect(() => {
    if (voltando.current) window.scrollTo?.({ top: rolagemDaBusca.y })
  }, [])

  useEffect(() => {
    const guardar = () => {
      rolagemDaBusca.y = window.scrollY
    }
    window.addEventListener('scroll', guardar, { passive: true })
    return () => window.removeEventListener('scroll', guardar)
  }, [])
}

/**
 * Tela de busca (US11, US12, visual da US21): campo de busca, abas por tipo de produto,
 * atalhos com foto dos tipos à venda e a lista dos itens, disponíveis primeiro (RN09).
 * Maiúsculas e acentos não importam na busca, mas a tela não precisa dizer isso.
 */
export function BuscaPage({ repositorio, categoriasRepositorio }: BuscaPageProps) {
  const vm = useBuscaViewModel({ repositorio, categoriasRepositorio })
  useRolagemDaBusca(vm.disponiveis.length + vm.esgotados.length > 0)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    await vm.buscar()
  }

  const aba = vm.abaAtual?.nome ?? ''
  const onde = vm.atalhoAtual?.nome ?? aba
  const vazio = vm.carregou && vm.disponiveis.length === 0 && vm.esgotados.length === 0
  const tituloLista = vm.buscado
    ? `Resultados para “${vm.buscado}”`
    : vm.atalhoAtual
      ? vm.atalhoAtual.nome
      : 'Disponíveis agora'

  return (
    <section className="w-full max-w-[976px] pt-1">
      <h2 className="sr-only">Buscar</h2>

      <form role="search" onSubmit={enviar}>
        <label htmlFor="busca" className="sr-only">
          Busque um produto ou vendedor
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-marca-600">
            <Icone d={LUPA} />
          </span>
          <input
            id="busca"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={vm.texto}
            onChange={(e) => vm.alterarTexto(e.target.value)}
            placeholder="Busque um produto ou vendedor"
            className="h-[54px] w-full rounded-xl border border-[#e2e8e2] bg-campo pr-4 pl-12 text-base text-tinta placeholder:text-[#6d7c72] focus:border-marca-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-marca-600/30"
          />
        </div>
      </form>

      {vm.erroCategorias && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {vm.erroCategorias}
        </p>
      )}

      {vm.abas.length > 0 && (
        <AbasDaBusca abas={vm.abas} atual={vm.abaAtual} aoTrocar={(id) => void vm.trocarAba(id)} />
      )}

      <div
        id="painel-da-busca"
        role="tabpanel"
        aria-labelledby={vm.abaAtual ? `aba-${vm.abaAtual.id}` : undefined}
        aria-busy={vm.carregando}
      >
        {vm.erro && (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-800">
            {vm.erro}
          </p>
        )}

        {vm.atalhos.length > 0 && (
          <AtalhosDaBusca
            atalhos={vm.atalhos}
            escolhido={vm.atalhoAtual}
            aoEscolher={vm.escolherAtalho}
          />
        )}

        {vm.carregando && !vm.carregou && (
          <p role="status" className="mt-8 text-tinta-suave">
            Carregando…
          </p>
        )}

        {vazio && !vm.erro && (
          <p role="status" className="mt-8 text-tinta-suave">
            {vm.buscado
              ? `Nada encontrado para “${vm.buscado}” em ${onde}.`
              : `Ainda não tem nada à venda em ${onde}.`}
          </p>
        )}

        {vm.disponiveis.length > 0 && (
          <section aria-labelledby="titulo-disponiveis" className="mt-10">
            <div className="flex items-baseline justify-between gap-3">
              <h3 id="titulo-disponiveis" className="text-xl font-bold tracking-tight text-tinta">
                {tituloLista}
              </h3>
              {vm.atalhoAtual && (
                <button
                  type="button"
                  onClick={() => vm.atalhoAtual && vm.escolherAtalho(vm.atalhoAtual.id)}
                  className="shrink-0 rounded-sm text-sm font-semibold text-marca-600 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600"
                >
                  Ver todos
                </button>
              )}
            </div>
            <ul
              aria-label="Itens disponíveis"
              className="mt-2 grid grid-cols-1 lg:grid-cols-2 lg:gap-x-7"
            >
              {vm.disponiveis.map((r) => (
                <li key={r.item.id}>
                  <Link
                    to={rotaItem(r.item.id)}
                    state={{ daBusca: true, resultado: r }}
                    className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600"
                  >
                    <CartaoResultado resultado={r} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {vm.esgotados.length > 0 && (
          <section aria-labelledby="titulo-esgotados" className="mt-10">
            <h3 id="titulo-esgotados" className="text-lg font-bold tracking-tight text-tinta">
              Esgotados
            </h3>
            <ul
              aria-label="Itens esgotados"
              className="mt-2 grid grid-cols-1 lg:grid-cols-2 lg:gap-x-7"
            >
              {vm.esgotados.map((r) => (
                <li key={r.item.id}>
                  <Link
                    to={rotaItem(r.item.id)}
                    state={{ daBusca: true, resultado: r }}
                    className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600"
                  >
                    <CartaoResultado resultado={r} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </section>
  )
}
