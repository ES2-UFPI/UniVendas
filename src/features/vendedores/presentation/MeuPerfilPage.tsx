import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ROTAS } from '../../../core/routes'
import type { AuthRepository } from '../../auth/domain/AuthRepository'
import { ExcluirContaSecao } from '../../auth/presentation/ExcluirContaSecao'
import type { CanalTipo } from '../domain/Contato'
import type { VendedorRepository } from '../domain/VendedorRepository'
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

const estiloCampo =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/30 aria-[invalid=true]:border-red-600'

function Campo({
  id,
  rotulo,
  erro,
  children,
}: {
  id: string
  rotulo: string
  erro?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-800">
        {rotulo}
      </label>
      {children}
      {erro && (
        <p id={`${id}-erro`} className="text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  )
}

/** Interruptor "Mostrar" de um número (US19): desligado, o número fica oculto para os outros. */
function Mostrar({
  canal,
  rotulo,
  ligado,
  aoMudar,
}: {
  canal: CanalTipo
  rotulo: string
  ligado: boolean
  aoMudar: (canal: CanalTipo, mostrar: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        role="switch"
        className="h-4 w-4 accent-green-600"
        checked={ligado}
        onChange={(e) => aoMudar(canal, e.target.checked)}
        aria-label={`Mostrar ${rotulo}`}
      />
      {ligado ? 'Mostrar no meu perfil e no mapa' : 'Oculto: só você vê este número'}
    </label>
  )
}

/** Tela "Meu perfil" (US14): o vendedor edita nome, descrição, foto e contatos do próprio perfil. */
export function MeuPerfilPage({
  perfilId,
  repositorio,
  comprimir,
  aoExcluirConta,
  authRepositorio,
}: MeuPerfilPageProps) {
  const vm = useMeuPerfilViewModel({ perfilId, repositorio, comprimir })
  const { dados, erros } = vm
  const ocupado = vm.salvando || vm.preparandoFoto

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    await vm.salvar()
  }

  return (
    <section className="mx-auto w-full max-w-md p-4">
      <h2 className="text-xl font-bold text-gray-900">Meu perfil</h2>
      <p className="mt-1 text-sm text-gray-600">
        Mude o que os compradores veem: nome, descrição, foto e contatos.
      </p>

      {vm.carregando ? (
        <p role="status" className="mt-4 text-gray-600">
          Carregando seu perfil…
        </p>
      ) : vm.erroCarga ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {vm.erroCarga}
        </p>
      ) : vm.semPerfil ? (
        <p className="mt-4 text-gray-700">
          Você ainda não tem perfil de vendedor. Crie o seu em{' '}
          <Link to={ROTAS.queroVender} className="font-semibold text-green-700 underline">
            Quero vender
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={enviar} noValidate className="mt-4 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs text-gray-500">
              {vm.previaFoto ? (
                <img
                  src={vm.previaFoto}
                  alt="Sua foto de perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                'Sem foto'
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="foto"
                className="cursor-pointer text-sm font-medium text-green-700 underline-offset-2 hover:underline"
              >
                {vm.preparandoFoto
                  ? 'Preparando a foto…'
                  : vm.temFoto
                    ? 'Trocar foto'
                    : 'Escolher foto'}
              </label>
              <input
                id="foto"
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={ocupado}
                aria-describedby={vm.erroFoto ? 'foto-erro' : undefined}
                onChange={(e) => vm.escolherFoto(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-gray-500">
                Opcional. Comprimida no celular antes de enviar.
              </p>
              {vm.erroFoto && (
                <p id="foto-erro" className="text-sm text-red-700">
                  {vm.erroFoto}
                </p>
              )}
            </div>
          </div>

          <Campo
            id="nomeExibicao"
            rotulo="Nome que os compradores vão ver"
            erro={erros.nomeExibicao}
          >
            <input
              id="nomeExibicao"
              className={estiloCampo}
              value={dados.nomeExibicao}
              onChange={(e) => vm.alterar('nomeExibicao', e.target.value)}
              aria-invalid={!!erros.nomeExibicao}
              aria-describedby={erros.nomeExibicao ? 'nomeExibicao-erro' : undefined}
              placeholder="Ex.: Brownies da Ana"
            />
          </Campo>

          <Campo id="descricao" rotulo="O que você vende (opcional)">
            <textarea
              id="descricao"
              className={estiloCampo}
              rows={3}
              value={dados.descricao}
              onChange={(e) => vm.alterar('descricao', e.target.value)}
              placeholder="Ex.: Brownie, bolo de pote e café"
            />
          </Campo>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm font-medium text-gray-800">
              Contato (informe ao menos um)
            </legend>
            <Campo id="whatsapp" rotulo="WhatsApp" erro={erros.whatsapp}>
              <input
                id="whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className={estiloCampo}
                value={dados.whatsapp}
                onChange={(e) => vm.alterar('whatsapp', e.target.value)}
                aria-invalid={!!erros.whatsapp}
                aria-describedby={erros.whatsapp ? 'whatsapp-erro' : undefined}
                placeholder="(86) 99999-8888"
              />
              <Mostrar
                canal="whatsapp"
                rotulo="WhatsApp"
                ligado={vm.visiveis.whatsapp}
                aoMudar={vm.mostrarContato}
              />
            </Campo>
            <Campo id="telefone" rotulo="Telefone" erro={erros.telefone}>
              <input
                id="telefone"
                type="tel"
                inputMode="tel"
                className={estiloCampo}
                value={dados.telefone}
                onChange={(e) => vm.alterar('telefone', e.target.value)}
                aria-invalid={!!erros.telefone}
                aria-describedby={erros.telefone ? 'telefone-erro' : undefined}
                placeholder="(86) 3215-1234"
              />
              <Mostrar
                canal="telefone"
                rotulo="Telefone"
                ligado={vm.visiveis.telefone}
                aoMudar={vm.mostrarContato}
              />
            </Campo>
            {erros.contato && <p className="text-sm text-red-700">{erros.contato}</p>}
            {vm.todosOcultos && (
              <p role="note" className="rounded-lg bg-purple-50 p-3 text-sm text-purple-800">
                Todos os seus números estão ocultos. Quem compra só vai falar com você pelo Chat.
              </p>
            )}
          </fieldset>

          {vm.erroGeral && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {vm.erroGeral}
            </p>
          )}
          {vm.salvo && (
            <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              Perfil atualizado.
            </p>
          )}

          <button
            type="submit"
            disabled={ocupado}
            className="rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {vm.salvando ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </form>
      )}

      <ExcluirContaSecao aoExcluir={aoExcluirConta} repositorio={authRepositorio} />
    </section>
  )
}
