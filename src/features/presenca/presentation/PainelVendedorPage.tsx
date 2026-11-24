import { Link } from 'react-router-dom'
import type { LocalizacaoService } from '../../../core/localizacaoService'
import { ROTAS } from '../../../core/routes'
import { useSessaoStore } from '../../../core/sessaoStore'
import { Avatar } from '../../../core/ui/Avatar'
import { Aviso } from '../../../core/ui/Aviso'
import { Botao } from '../../../core/ui/Botao'
import { CampoFormulario, estiloEntrada } from '../../../core/ui/CampoFormulario'
import { Icone } from '../../../core/ui/Icone'
import { Interruptor } from '../../../core/ui/Interruptor'
import { Selo } from '../../../core/ui/Selo'
import { TituloTela } from '../../../core/ui/TituloTela'
import type { VendedorRepository } from '../../vendedores/domain/VendedorRepository'
import { useVendedorDoUsuario } from '../../vendedores/presentation/useVendedorDoUsuario'
import type { PresencaRepository } from '../domain/PresencaRepository'
import { EscolherPontoNoMapa } from './EscolherPontoNoMapa'
import { LIMITE_REFERENCIA, usePainelVendedorViewModel } from './usePainelVendedorViewModel'

interface PainelVendedorPageProps {
  /** Só para os testes: repositório falso. */
  repositorio?: PresencaRepository
  /** Só para os testes: localização falsa. */
  localizacao?: Pick<LocalizacaoService, 'posicaoAtual' | 'acompanhar'>
  /** Só para os testes: de onde vêm o nome e a foto do negócio. */
  vendedores?: VendedorRepository
}

/**
 * Painel do vendedor (US04, US05; visual da US21): o cartão do negócio com o interruptor
 * "Estou no campus", a referência e o ponto fixo opcionais no mapa, e o atalho para os itens.
 * No celular fica tudo em uma coluna; no computador, o mapa vai para a direita.
 */
export function PainelVendedorPage({
  repositorio,
  localizacao,
  vendedores,
}: PainelVendedorPageProps) {
  const vm = usePainelVendedorViewModel({ repositorio, localizacao })
  const usuario = useSessaoStore((s) => s.usuario)
  const vendedor = useVendedorDoUsuario(usuario?.id ?? null, vendedores)
  const nome = vendedor?.nomeExibicao ?? usuario?.nome ?? 'Seu negócio'
  const bloqueado = vm.carregando || vm.ativo

  const situacao = vm.carregando
    ? vm.ativo
      ? 'Desligando…'
      : 'Ligando…'
    : vm.ativo
      ? 'Você aparece no mapa agora.'
      : 'Ative para aparecer no mapa.'

  return (
    <section className="flex w-full flex-col gap-8">
      <TituloTela
        titulo="Seu ponto de venda no campus"
        apoio="Gerencie sua presença e ajude os compradores a encontrar você."
      />

      <div className="flex w-full max-w-[600px] flex-wrap items-center justify-between gap-x-6 gap-y-5 rounded-cartao border border-linha bg-cartao p-5 md:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar nome={nome} fotoUrl={vendedor?.fotoUrl ?? null} className="h-16 w-16 text-2xl" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-titulo text-xl leading-tight tracking-[-0.035em] break-words text-tinta md:text-2xl">
              {nome}
            </p>
            {vm.ativo ? (
              <Selo tom="ativo">No campus agora</Selo>
            ) : (
              <Selo tom="neutro">Fora do mapa</Selo>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="font-bold text-tinta" aria-hidden="true">
              Estou no campus
            </p>
            <p id="situacao-presenca" className="text-sm text-tinta-suave">
              {situacao}
            </p>
          </div>
          <Interruptor
            ligado={vm.ativo}
            aoMudar={(ligar) => void (ligar ? vm.ligar() : vm.desligar())}
            rotulo="Estou no campus"
            desabilitado={vm.carregando}
            descritoPor="situacao-presenca"
          />
        </div>
      </div>

      <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-x-11">
        <div className="lg:col-start-1 lg:row-start-1">
          <CampoFormulario
            id="referencia"
            rotulo="Referência"
            opcional
            ajuda={`Uma indicação curta para quem está chegando (${vm.referencia.length}/${LIMITE_REFERENCIA}).`}
          >
            <input
              id="referencia"
              maxLength={LIMITE_REFERENCIA}
              className={estiloEntrada}
              value={vm.referencia}
              onChange={(e) => vm.alterarReferencia(e.target.value)}
              disabled={bloqueado}
              aria-describedby="referencia-ajuda"
              placeholder="Perto da Biblioteca Central"
            />
          </CampoFormulario>
        </div>

        <div className="flex flex-col gap-3 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <div className="flex flex-col gap-1">
            <h3 className="font-titulo text-xl tracking-[-0.035em] text-tinta">Ponto no mapa</h3>
            <p className="text-sm text-tinta-suave">
              Toque no mapa para definir onde seu marcador aparece. Sem ponto, o mapa mostra onde
              você está.
            </p>
          </div>
          <EscolherPontoNoMapa
            ponto={vm.ponto}
            aoEscolher={vm.escolherPonto}
            bloqueado={bloqueado}
          />
          {vm.ponto && !vm.ativo && (
            <Botao
              variante="texto"
              icone="localizacao"
              onClick={() => vm.escolherPonto(null)}
              disabled={vm.carregando}
              className="self-start"
            >
              Usar minha posição real
            </Botao>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-2">
          {vm.erro && <Aviso tipo="erro">{vm.erro}</Aviso>}
          {vm.ativo ? (
            <Aviso tipo="sucesso">Você está visível no mapa.</Aviso>
          ) : (
            !vm.erro && (
              <Aviso tipo="info">
                {vm.ponto
                  ? 'Seu marcador vai ficar no ponto escolhido, dentro do campus.'
                  : 'Escolha um ponto no mapa ou use sua localização ao ativar a presença.'}
              </Aviso>
            )
          )}
        </div>

        <div className="lg:col-start-1 lg:row-start-3">
          <Link
            to={ROTAS.meusItens}
            className="flex max-w-[340px] items-center gap-4 rounded-cartao border border-linha bg-white p-5 hover:border-marca-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-controle bg-marca-50 text-marca-600">
              <Icone nome="sacola" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-bold text-tinta">Seus itens</span>
              <span className="text-sm text-tinta-suave">Revise preços e disponibilidade.</span>
            </span>
            <Icone nome="avancar" className="h-5 w-5 text-marca-600" />
          </Link>
        </div>
      </div>
    </section>
  )
}
