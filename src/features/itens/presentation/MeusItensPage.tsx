import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROTAS } from '../../../core/routes'
import type { VendedorRepository } from '../../vendedores/domain/VendedorRepository'
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
}

/** Uma linha da lista: foto, nome, preço e o botão de remover, que pede confirmação antes. */
function LinhaItem({ item, aoRemover }: { item: Item; aoRemover: () => Promise<boolean> }) {
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
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            aria-label={`Remover ${item.nome}`}
            className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Remover
          </button>
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

/** Tela "Meus itens" (US08): a lista dos itens do vendedor logado, com o botão de remover. */
export function MeusItensPage({ perfilId, repositorio, vendedores }: MeusItensPageProps) {
  const vm = useItensViewModel({ perfilId, repositorio, vendedores })

  return (
    <section className="mx-auto w-full max-w-md p-4">
      <h2 className="text-xl font-bold text-gray-900">Meus itens</h2>
      <p className="mt-1 text-sm text-gray-600">O que você vende, com o preço de cada item.</p>

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
      ) : vm.itens.length === 0 && !vm.erro ? (
        <p className="mt-4 text-gray-700">Você ainda não cadastrou nenhum item.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {vm.itens.map((item) => (
            <LinhaItem key={item.id} item={item} aoRemover={() => vm.remover(item.id)} />
          ))}
        </ul>
      )}
    </section>
  )
}
