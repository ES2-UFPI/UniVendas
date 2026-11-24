import { Link } from 'react-router-dom'
import { ROTAS, rotaPerfilVendedor } from '../../../core/routes'
import { formatarPreco } from '../../itens/domain/validacoesItem'
import type { BuscaRepository, ResultadoBusca } from '../domain/BuscaRepository'
import { ondeEncontrar } from '../domain/situacaoDoItem'
import { FotoOuInicial } from './FotoOuInicial'
import { SeloSituacao } from './SeloSituacao'
import { useItemDetalheViewModel } from './useItemDetalheViewModel'

interface ItemDetalhePageProps {
  itemId: string
  /** O item como veio da lista da busca, para abrir na hora. */
  inicial?: ResultadoBusca | null
  /** "Voltar à busca": volta no histórico, ou abre a busca se a pessoa chegou direto aqui. */
  aoVoltar: () => void
  /** Só para os testes: repositório falso. */
  repositorio?: BuscaRepository
}

function Icone({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
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

const SETA_VOLTAR = 'm12 19-7-7 7-7M5 12h14'
const PINO = 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Zm-8-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'

const LINK = 'font-semibold text-marca-600 underline-offset-2 hover:underline'

/** Detalhe de um item aberto pela busca (US21), com o caminho de volta para a busca como estava. */
export function ItemDetalhePage({ itemId, inicial, aoVoltar, repositorio }: ItemDetalhePageProps) {
  const vm = useItemDetalheViewModel({ itemId, inicial, repositorio })
  const r = vm.resultado

  return (
    <section className="w-full max-w-[976px] pt-1">
      <button
        type="button"
        onClick={aoVoltar}
        className="inline-flex items-center gap-2 rounded-lg py-1 text-[15px] font-semibold text-marca-600 hover:text-marca-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600"
      >
        <Icone d={SETA_VOLTAR} />
        Voltar à busca
      </button>

      {vm.erro && !r && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {vm.erro}
        </p>
      )}
      {vm.carregando && !r && (
        <p role="status" className="mt-6 text-tinta-suave">
          Carregando…
        </p>
      )}
      {vm.naoEncontrado && (
        <p role="status" className="mt-6 text-tinta-suave">
          Este item não está mais à venda.
        </p>
      )}

      {r && (
        <article className="mt-6 grid gap-6 md:grid-cols-[minmax(0,476px)_1fr] md:gap-8">
          <FotoOuInicial
            url={r.item.fotoUrl}
            nome={r.item.nome}
            className="aspect-square w-full rounded-2xl text-6xl"
          />
          <div className="flex min-w-0 flex-col">
            <SeloSituacao resultado={r} className="text-[13px]" />
            <h2 className="mt-3 text-[1.75rem] leading-tight font-bold tracking-tight break-words text-tinta md:text-3xl">
              {r.item.nome}
            </h2>
            <p className="mt-2 text-[15px] text-tinta-suave">
              <Link to={rotaPerfilVendedor(r.item.vendedorId)} className={LINK}>
                {r.vendedorNome}
              </Link>
            </p>
            <p className="mt-4 text-2xl font-bold text-[#233f2c]">{formatarPreco(r.item.preco)}</p>
            {r.item.descricao && (
              <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-line text-[#52675a]">
                {r.item.descricao}
              </p>
            )}

            <div className="mt-6 flex gap-3 border-t border-linha pt-5">
              <span className="text-marca-600">
                <Icone d={PINO} />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="text-[15px] font-bold text-tinta">Onde encontrar</h3>
                <p className="text-[15px] text-[#52675a]">{ondeEncontrar(r)}</p>
                {r.noCampusAgora && (
                  <Link to={ROTAS.mapa} className={`text-sm ${LINK}`}>
                    Ver no mapa
                  </Link>
                )}
              </div>
            </div>

            <Link
              to={rotaPerfilVendedor(r.item.vendedorId)}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-marca-600 px-5 py-3 font-semibold text-white hover:bg-marca-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600 md:self-start"
            >
              Ver perfil e falar com o vendedor
            </Link>
          </div>
        </article>
      )}
    </section>
  )
}
