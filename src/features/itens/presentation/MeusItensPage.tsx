import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ROTAS } from '../../../core/routes'
import type { VendedorRepository } from '../../vendedores/domain/VendedorRepository'
import { agruparFolhas } from '../domain/Categoria'
import type { Item } from '../domain/Item'
import type { ItemRepository } from '../domain/ItemRepository'
import { formatarPreco } from '../domain/validacoesItem'
import { useItensViewModel } from './useItensViewModel'

interface MeusItensPageProps {
  /** Id da conta logada (= perfis.id). A rota protegida passa o da sessão. */
  perfilId: string | null
  /** Só para os testes: repositórios falsos. */
  repositorio?: ItemRepository
  vendedores?: VendedorRepository
  comprimir?: (foto: Blob) => Promise<Blob>
}

type ViewModel = ReturnType<typeof useItensViewModel>

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

/** Formulário de criar e editar item (US08): nome, preço, categoria folha e foto opcional. */
function FormularioItem({ vm }: { vm: ViewModel }) {
  const { dados, erros } = vm
  const grupos = agruparFolhas(vm.categorias)
  const ocupado = vm.salvando || vm.preparandoFoto

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    await vm.salvar()
  }

  return (
    <form onSubmit={enviar} noValidate className="mt-4 flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-gray-900">
        {vm.editando ? 'Editar item' : 'Novo item'}
      </h3>

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-xs text-gray-500">
          {vm.previaFoto ? (
            <img
              src={vm.previaFoto}
              alt="Prévia da foto do item"
              className="h-full w-full object-cover"
            />
          ) : (
            'Sem foto'
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="foto-item"
            className="cursor-pointer text-sm font-medium text-green-700 underline-offset-2 hover:underline"
          >
            {vm.preparandoFoto
              ? 'Preparando a foto…'
              : vm.previaFoto
                ? 'Trocar foto'
                : 'Escolher foto'}
          </label>
          <input
            id="foto-item"
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={ocupado}
            aria-describedby={vm.erroFoto ? 'foto-item-erro' : undefined}
            onChange={(e) => vm.escolherFoto(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-gray-500">Opcional. Comprimida no celular até 2 MB.</p>
          {vm.erroFoto && (
            <p id="foto-item-erro" className="text-sm text-red-700">
              {vm.erroFoto}
            </p>
          )}
        </div>
      </div>

      <Campo id="nome-item" rotulo="Nome" erro={erros.nome}>
        <input
          id="nome-item"
          className={estiloCampo}
          value={dados.nome}
          onChange={(e) => vm.alterar('nome', e.target.value)}
          aria-invalid={erros.nome ? true : undefined}
          aria-describedby={erros.nome ? 'nome-item-erro' : undefined}
          placeholder="Brownie de chocolate"
        />
      </Campo>

      <Campo id="preco-item" rotulo="Preço (R$)" erro={erros.preco}>
        <input
          id="preco-item"
          inputMode="decimal"
          className={estiloCampo}
          value={dados.preco}
          onChange={(e) => vm.alterar('preco', e.target.value)}
          aria-invalid={erros.preco ? true : undefined}
          aria-describedby={erros.preco ? 'preco-item-erro' : undefined}
          placeholder="5,50"
        />
      </Campo>

      <Campo id="categoria-item" rotulo="Categoria" erro={erros.categoria}>
        <select
          id="categoria-item"
          className={estiloCampo}
          value={dados.categoriaId ?? ''}
          onChange={(e) =>
            vm.alterar('categoriaId', e.target.value === '' ? null : Number(e.target.value))
          }
          aria-invalid={erros.categoria ? true : undefined}
          aria-describedby={erros.categoria ? 'categoria-item-erro' : undefined}
        >
          <option value="">Escolha a categoria</option>
          {grupos.map((g) => (
            <optgroup key={g.grupo} label={g.grupo}>
              {g.folhas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Campo>

      <Campo id="descricao-item" rotulo="Descrição (opcional)">
        <textarea
          id="descricao-item"
          rows={2}
          className={estiloCampo}
          value={dados.descricao}
          onChange={(e) => vm.alterar('descricao', e.target.value)}
          placeholder="Com nozes, fatia grande"
        />
      </Campo>

      {vm.erroFormulario && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {vm.erroFormulario}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={vm.cancelar}
          disabled={vm.salvando}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={ocupado}
          className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {vm.salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

/** Uma linha da lista: foto, nome, preço, o botão de editar e o de remover, que pede confirmação. */
function LinhaItem({
  item,
  aoEditar,
  aoRemover,
}: {
  item: Item
  aoEditar: () => void
  aoRemover: () => Promise<boolean>
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [removendo, setRemovendo] = useState(false)

  async function confirmar() {
    setRemovendo(true)
    // Se deu certo, a linha some da lista; se não, volta ao normal e o erro aparece no topo.
    if (!(await aoRemover())) {
      setRemovendo(false)
      setConfirmando(false)
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-xs text-gray-500">
          {item.fotoUrl ? (
            <img src={item.fotoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            'Sem foto'
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold text-gray-900">{item.nome}</p>
          <p className="text-sm text-gray-700">{formatarPreco(item.preco)}</p>
        </div>
        {!confirmando && (
          <div className="flex shrink-0 flex-col">
            <button
              type="button"
              onClick={aoEditar}
              aria-label={`Editar ${item.nome}`}
              className="rounded-lg px-3 py-1 text-sm font-medium text-green-700 hover:bg-green-50"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              aria-label={`Remover ${item.nome}`}
              className="rounded-lg px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Remover
            </button>
          </div>
        )}
      </div>

      {confirmando && (
        <div
          role="alertdialog"
          aria-label={`Remover ${item.nome}?`}
          className="flex flex-col gap-2"
        >
          <p className="text-sm text-gray-800">
            Remover <strong>{item.nome}</strong>? Isso não pode ser desfeito.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={removendo}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirmar()}
              disabled={removendo}
              className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {removendo ? 'Removendo…' : 'Sim, remover'}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

/**
 * Tela "Meus itens" (US08): a lista dos itens do vendedor logado, com editar e remover,
 * e o formulário de criar e editar item no lugar da lista enquanto está aberto.
 */
export function MeusItensPage({
  perfilId,
  repositorio,
  vendedores,
  comprimir,
}: MeusItensPageProps) {
  const vm = useItensViewModel({ perfilId, repositorio, vendedores, comprimir })
  const podeCadastrar = !vm.carregando && !vm.semPerfil && !vm.formularioAberto

  return (
    <section className="mx-auto w-full max-w-md p-4">
      <h2 className="text-xl font-bold text-gray-900">Meus itens</h2>
      <p className="mt-1 text-sm text-gray-600">O que você vende, com o preço de cada item.</p>

      {podeCadastrar && (
        <button
          type="button"
          onClick={vm.novo}
          className="mt-4 w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
        >
          Novo item
        </button>
      )}

      {vm.erro && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {vm.erro}
        </p>
      )}

      {vm.carregando ? (
        <p role="status" className="mt-4 text-gray-600">
          Carregando seus itens…
        </p>
      ) : vm.semPerfil ? (
        <p className="mt-4 text-gray-700">
          Para cadastrar itens, crie primeiro seu{' '}
          <Link to={ROTAS.queroVender} className="font-semibold text-green-700 underline">
            perfil de vendedor
          </Link>
          .
        </p>
      ) : vm.formularioAberto ? (
        <FormularioItem vm={vm} />
      ) : vm.itens.length === 0 && !vm.erro ? (
        <p className="mt-4 text-gray-700">Você ainda não cadastrou nenhum item.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {vm.itens.map((item) => (
            <LinhaItem
              key={item.id}
              item={item}
              aoEditar={() => vm.editar(item)}
              aoRemover={() => vm.remover(item.id)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
