import { Link } from 'react-router-dom'
import { ROTAS, rotaPerfilVendedor } from '../../../core/routes'
import { Aviso } from '../../../core/ui/Aviso'
import { estiloBotao } from '../../../core/ui/estiloBotao'
import { FotoOuInicial } from '../../../core/ui/FotoOuInicial'
import { Icone } from '../../../core/ui/Icone'
import { formatarPreco } from '../../itens/domain/validacoesItem'
import type { BuscaRepository, ResultadoBusca } from '../domain/BuscaRepository'
import { ondeEncontrar } from '../domain/situacaoDoItem'
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

const LINK = 'font-semibold text-marca-600 underline-offset-2 hover:underline'

/** Detalhe de um item aberto pela busca (US21), com o caminho de volta para a busca como estava. */
export function ItemDetalhePage({ itemId, inicial, aoVoltar, repositorio }: ItemDetalhePageProps) {
  const vm = useItemDetalheViewModel({ itemId, inicial, repositorio })
  const r = vm.resultado

  return (
    <section className="w-full">
      <button
        type="button"
        onClick={aoVoltar}
        className="inline-flex items-center gap-2 rounded-controle py-1 text-[15px] font-bold text-marca-600 hover:text-marca-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600"
      >
        <Icone nome="voltar" />
        Voltar à busca
      </button>

      {vm.erro && !r && (
        <Aviso tipo="erro" className="mt-6">
          {vm.erro}
        </Aviso>
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
            className="aspect-square w-full rounded-cartao text-6xl"
          />
          <div className="flex min-w-0 flex-col">
            <SeloSituacao resultado={r} className="text-[13px]" />
            <h2 className="mt-3 font-titulo text-[28px] leading-[34px] tracking-[-0.035em] break-words text-tinta md:text-4xl md:leading-[43px]">
              {r.item.nome}
            </h2>
            <p className="mt-2 text-[15px] text-tinta-suave">
              <Link to={rotaPerfilVendedor(r.item.vendedorId)} className={LINK}>
                {r.vendedorNome}
              </Link>
            </p>
            <p className="mt-4 text-2xl font-bold text-marca-900">{formatarPreco(r.item.preco)}</p>
            {r.item.descricao && (
              <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-line text-tinta-suave">
                {r.item.descricao}
              </p>
            )}

            <div className="mt-6 flex gap-3 border-t border-linha pt-5">
              <span className="text-marca-600">
                <Icone nome="pino" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="text-[15px] font-bold text-tinta">Onde encontrar</h3>
                <p className="text-[15px] text-tinta-suave">{ondeEncontrar(r)}</p>
                {r.noCampusAgora && (
                  <Link to={ROTAS.mapa} className={`text-sm ${LINK}`}>
                    Ver no mapa
                  </Link>
                )}
              </div>
            </div>

            <Link
              to={rotaPerfilVendedor(r.item.vendedorId)}
              className={estiloBotao('primario', 'mt-6 md:self-start')}
            >
              Ver perfil e falar com o vendedor
            </Link>
          </div>
        </article>
      )}
    </section>
  )
}
