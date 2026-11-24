import { Link } from 'react-router-dom'
import { ROTAS } from '../../../core/routes'
import { Aviso } from '../../../core/ui/Aviso'
import { Interruptor } from '../../../core/ui/Interruptor'
import { TituloTela } from '../../../core/ui/TituloTela'
import type { AuthRepository } from '../../auth/domain/AuthRepository'
import { ExcluirContaSecao } from '../../auth/presentation/ExcluirContaSecao'
import type { VendedorRepository } from '../domain/VendedorRepository'
import { FormularioPerfilVendedor, PreviaPerfilVendedor } from './FormularioPerfilVendedor'
import { useMeuPerfilViewModel } from './useMeuPerfilViewModel'

interface MeuPerfilPageProps {
  /** Id da conta logada (= perfis.id). A rota protegida passa o da sessão. */
  perfilId: string | null
  /** Só para os testes: repositório e compressão falsos. */
  repositorio?: VendedorRepository
  comprimir?: (foto: Blob) => Promise<Blob>
  /** Chamado depois que a conta foi excluída (US17). O App usa para voltar ao login. */
  aoExcluirConta?: () => void
  /** Só para os testes: repositório de autenticação falso, usado para excluir a conta. */
  authRepositorio?: AuthRepository
}

/**
 * Tela "Meu perfil" (US14; visual da US21): o vendedor edita nome, descrição, foto e contatos do
 * próprio perfil, com o mesmo formulário e a mesma prévia do "Quero vender", escolhe quais números
 * ficam ocultos (US19) e pode excluir a conta (US17).
 */
export function MeuPerfilPage({
  perfilId,
  repositorio,
  comprimir,
  aoExcluirConta,
  authRepositorio,
}: MeuPerfilPageProps) {
  const vm = useMeuPerfilViewModel({ perfilId, repositorio, comprimir })
  const { dados } = vm
  // Carregando, com erro ou sem perfil, não há formulário, mas a exclusão da conta continua à mão.
  const semFormulario = vm.carregando || vm.erroCarga !== null || vm.semPerfil

  return (
    <section className="flex w-full flex-col gap-8">
      <TituloTela
        titulo="Meu perfil"
        apoio="Edite as informações que os compradores veem sobre seu negócio."
      />
      <div className="grid w-full items-start gap-10 lg:grid-cols-[minmax(0,620px)_minmax(0,1fr)] lg:gap-16">
        {semFormulario ? (
          <div>
            {vm.carregando ? (
              <p role="status" className="text-tinta-suave">
                Carregando seu perfil…
              </p>
            ) : vm.erroCarga ? (
              <Aviso tipo="erro">{vm.erroCarga}</Aviso>
            ) : (
              <p className="text-tinta">
                Você ainda não tem perfil de vendedor. Crie o seu em{' '}
                <Link
                  to={ROTAS.queroVender}
                  className="font-bold text-marca-600 underline underline-offset-2"
                >
                  Quero vender
                </Link>
                .
              </p>
            )}
          </div>
        ) : (
          <FormularioPerfilVendedor
            dados={dados}
            erros={vm.erros}
            alterar={vm.alterar}
            previaFoto={vm.previaFoto}
            temFoto={vm.temFoto}
            preparandoFoto={vm.preparandoFoto}
            erroFoto={vm.erroFoto}
            escolherFoto={(arquivo) => void vm.escolherFoto(arquivo)}
            salvando={vm.salvando}
            erroGeral={vm.erroGeral}
            textoBotao="Salvar alterações"
            iconeBotao="check"
            aoEnviar={vm.salvar}
            extraDoContato={(canal, rotulo) => (
              // O interruptor "Mostrar" de cada número (US19): desligado, só o dono vê.
              <div className="flex items-center gap-3 text-sm text-tinta-suave">
                <Interruptor
                  ligado={vm.visiveis[canal]}
                  aoMudar={(mostrar) => vm.mostrarContato(canal, mostrar)}
                  rotulo={`Mostrar ${rotulo}`}
                />
                <span>
                  {vm.visiveis[canal]
                    ? 'Mostrar no meu perfil e no mapa'
                    : 'Oculto: só você vê este número'}
                </span>
              </div>
            )}
            depoisDosContatos={
              vm.todosOcultos && (
                <p
                  role="note"
                  className="flex items-start gap-3 rounded-controle bg-blue-50 p-4 text-[15px] leading-[21px] text-info"
                >
                  Todos os seus números estão ocultos. Quem compra só vai falar com você pelo Chat.
                </p>
              )
            }
            antesDoBotao={vm.salvo && <Aviso tipo="sucesso">Perfil atualizado.</Aviso>}
          />
        )}
        {/* A exclusão fica sempre no mesmo lugar, para a confirmação não sumir quando o perfil carrega. */}
        <div className="flex min-w-0 flex-col gap-6">
          {!semFormulario && (
            <PreviaPerfilVendedor
              nome={dados.nomeExibicao}
              descricao={dados.descricao}
              fotoUrl={vm.previaFoto}
              whatsapp={dados.whatsapp.trim() !== '' && vm.visiveis.whatsapp}
              telefone={dados.telefone.trim() !== '' && vm.visiveis.telefone}
            />
          )}
          <ExcluirContaSecao aoExcluir={aoExcluirConta} repositorio={authRepositorio} />
        </div>
      </div>
    </section>
  )
}
