import type { LocalizacaoService } from '../../../core/localizacaoService'
import type { PresencaRepository } from '../domain/PresencaRepository'
import { EscolherPontoNoMapa } from './EscolherPontoNoMapa'
import { LIMITE_REFERENCIA, usePainelVendedorViewModel } from './usePainelVendedorViewModel'

interface PainelVendedorPageProps {
  /** Só para os testes: repositório falso. */
  repositorio?: PresencaRepository
  /** Só para os testes: localização falsa. */
  localizacao?: Pick<LocalizacaoService, 'posicaoAtual' | 'acompanhar'>
}

/** Painel do vendedor (US04, US05): o botão "Estou no campus", a referência e o ponto fixo opcionais. */
export function PainelVendedorPage({ repositorio, localizacao }: PainelVendedorPageProps) {
  const vm = usePainelVendedorViewModel({ repositorio, localizacao })

  return (
    <section className="mx-auto w-full max-w-md p-4">
      <h2 className="text-xl font-bold text-gray-900">Painel do vendedor</h2>
      <p className="mt-1 text-sm text-gray-600">
        Ligue o botão quando estiver no campus para aparecer no mapa para os estudantes.
      </p>

      <div className="mt-4 flex flex-col gap-1">
        <label htmlFor="referencia" className="text-sm font-medium text-gray-800">
          Referência (opcional)
        </label>
        <input
          id="referencia"
          maxLength={LIMITE_REFERENCIA}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/30 disabled:opacity-60"
          value={vm.referencia}
          onChange={(e) => vm.alterarReferencia(e.target.value)}
          disabled={vm.carregando || vm.ativo}
          placeholder="em frente ao RU"
        />
        <p className="text-xs text-gray-500">
          {vm.referencia.length}/{LIMITE_REFERENCIA}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <p className="text-sm font-medium text-gray-800">Ponto no mapa (opcional)</p>
        <p className="text-xs text-gray-500">
          {vm.ponto
            ? 'Seu marcador vai ficar no ponto escolhido, dentro do campus.'
            : 'Toque no mapa para fixar onde seu marcador aparece. Sem ponto, o mapa mostra onde você está.'}
        </p>
        <EscolherPontoNoMapa
          ponto={vm.ponto}
          aoEscolher={vm.escolherPonto}
          bloqueado={vm.carregando || vm.ativo}
        />
        {vm.ponto && !vm.ativo && (
          <button
            type="button"
            onClick={() => vm.escolherPonto(null)}
            disabled={vm.carregando}
            className="self-start text-sm font-medium text-green-700 underline disabled:opacity-60"
          >
            Usar minha posição real
          </button>
        )}
      </div>

      {vm.erro && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {vm.erro}
        </p>
      )}
      {vm.ativo && (
        <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          Você está visível no mapa.
        </p>
      )}

      <button
        type="button"
        onClick={() => void vm.ligar()}
        disabled={vm.carregando || vm.ativo}
        aria-pressed={vm.ativo}
        className="mt-4 w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
      >
        {vm.carregando && !vm.ativo ? 'Ligando…' : 'Estou no campus'}
      </button>
      {vm.ativo && (
        <button
          type="button"
          onClick={() => void vm.desligar()}
          disabled={vm.carregando}
          className="mt-2 w-full rounded-lg border border-red-600 px-4 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {vm.carregando ? 'Desligando…' : 'Desligar'}
        </button>
      )}
    </section>
  )
}
