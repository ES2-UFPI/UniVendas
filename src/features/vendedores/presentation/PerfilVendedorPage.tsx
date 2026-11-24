import { Link } from 'react-router-dom'
import { ROTAS } from '../../../core/routes'
import { Avatar } from '../../../core/ui/Avatar'
import { Aviso } from '../../../core/ui/Aviso'
import { Cartao } from '../../../core/ui/Cartao'
import { estiloBotao } from '../../../core/ui/estiloBotao'
import { Icone } from '../../../core/ui/Icone'
import { Selo } from '../../../core/ui/Selo'
import type { ChatRepository } from '../../chat/domain/ChatRepository'
import { BotaoChat } from '../../chat/presentation/BotaoChat'
import { ItemDoPerfil } from '../../itens/presentation/ItemDoPerfil'
import type { VendedorRepository } from '../domain/VendedorRepository'
import { usePerfilVendedorViewModel } from './usePerfilVendedorViewModel'

interface PerfilVendedorPageProps {
  /** Id do vendedor, vindo da rota `/vendedor/:id`. */
  id: string
  /** Perfil de quem está logado: no próprio perfil não aparece o botão "Chat" (RN22). */
  meuPerfilId?: string | null
  /** Só para os testes: repositório falso. */
  repositorio?: VendedorRepository
  /** Só para os testes: repositório do chat falso. */
  chatRepositorio?: ChatRepository
}

/** O campus do app (por enquanto, um só). */
const CAMPUS = 'UFPI · Campus Ministro Petrônio Portella'

function VoltarAoMapa() {
  return (
    <Link
      to={ROTAS.mapa}
      className="inline-flex items-center gap-2 self-start rounded-controle py-1 text-[15px] font-bold text-marca-600 hover:text-marca-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600"
    >
      <Icone nome="voltar" />
      Voltar ao mapa
    </Link>
  )
}

/**
 * Tela do perfil do vendedor (US10, visual da US21): foto, nome, descrição, onde achar,
 * contatos e a vitrine dos itens. Se ele não está no campus agora, mostra "fora do campus agora" (RN19).
 */
export function PerfilVendedorPage({
  id,
  meuPerfilId = null,
  repositorio,
  chatRepositorio,
}: PerfilVendedorPageProps) {
  const vm = usePerfilVendedorViewModel({ id, repositorio })

  if (vm.carregando) {
    return (
      <p role="status" className="w-full py-4 text-tinta-suave">
        Carregando o perfil…
      </p>
    )
  }

  if (vm.erro) {
    return (
      <section className="flex w-full flex-col gap-6">
        <VoltarAoMapa />
        <Aviso tipo="erro">{vm.erro}</Aviso>
      </section>
    )
  }

  if (vm.naoEncontrado || !vm.perfil) {
    return (
      <section className="flex w-full flex-col gap-6">
        <VoltarAoMapa />
        <p className="text-tinta-suave">Este vendedor não existe mais.</p>
      </section>
    )
  }

  const { vendedor, itens, ativoAgora, referencia } = vm.perfil
  const mostrarChat = vendedor.perfilId !== meuPerfilId
  const onde = !ativoAgora
    ? 'Aparece no mapa quando estiver no campus'
    : (referencia ?? 'No mapa do campus')

  return (
    <section className="flex w-full flex-col">
      <VoltarAoMapa />

      <header className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
        <Avatar
          nome={vendedor.nomeExibicao}
          fotoUrl={vendedor.fotoUrl}
          className="h-24 w-24 text-3xl md:h-[116px] md:w-[116px] md:text-4xl"
        />
        <div className="flex min-w-0 flex-col gap-2">
          <Selo tom={ativoAgora ? 'ativo' : 'neutro'}>
            {ativoAgora ? 'No campus agora' : 'Fora do campus agora'}
          </Selo>
          <h2 className="font-titulo text-[28px] leading-[34px] tracking-[-0.035em] break-words text-tinta md:text-4xl md:leading-[43px]">
            {vendedor.nomeExibicao}
          </h2>
          {vendedor.descricao && (
            <p className="text-base break-words text-tinta-suave md:text-[17px]">
              {vendedor.descricao}
            </p>
          )}
        </div>
      </header>

      <Cartao className="mt-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between lg:max-w-[668px]">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 text-marca-600">
            <Icone nome="pino" />
          </span>
          <div className="min-w-0">
            <p className="font-bold break-words text-tinta">{onde}</p>
            <p className="text-sm text-tinta-suave">{CAMPUS}</p>
          </div>
        </div>
        {(mostrarChat || vm.botoesContato.length > 0) && (
          <div className="flex flex-wrap gap-3">
            {/* "Chat" abre a conversa dentro do app (US18); não aparece no próprio perfil (RN22). */}
            {mostrarChat && (
              <BotaoChat
                vendedorId={vendedor.id}
                variante="primario"
                className="min-w-[120px] flex-1 md:flex-none"
                repositorio={chatRepositorio}
              />
            )}
            {/* Só os contatos que o vendedor deixou visíveis (US19). */}
            {vm.botoesContato.map((botao) => (
              <a
                key={botao.canal}
                href={botao.link}
                {...(botao.canal === 'whatsapp'
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className={estiloBotao('secundario', 'min-w-[120px] flex-1 md:flex-none')}
              >
                <Icone nome="telefone" className="h-[18px] w-[18px]" />
                {botao.rotulo}
              </a>
            ))}
          </div>
        )}
      </Cartao>

      <section aria-labelledby="titulo-vitrine" className="mt-12">
        <h3
          id="titulo-vitrine"
          className="font-titulo text-xl tracking-[-0.035em] text-tinta md:text-2xl"
        >
          O que você encontra por aqui
        </h3>
        {itens.length === 0 ? (
          <p className="mt-4 text-tinta-suave">Este vendedor ainda não cadastrou itens.</p>
        ) : (
          // Os esgotados já vêm depois dos disponíveis (RN09); o `ItemDoPerfil` risca e marca "Esgotado".
          <ul
            aria-label={`Itens de ${vendedor.nomeExibicao}`}
            className="mt-5 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6"
          >
            {itens.map((item) => (
              <ItemDoPerfil key={item.id} item={item} ativoAgora={ativoAgora} />
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
