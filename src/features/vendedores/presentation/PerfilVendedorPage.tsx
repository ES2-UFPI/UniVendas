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

/**
 * Tela do perfil do vendedor (US10): foto, nome, descrição, contatos e itens.
 * Se ele não está no campus agora, mostra "fora do campus agora" (RN19).
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
      <p role="status" className="p-4 text-gray-600">
        Carregando o perfil…
      </p>
    )
  }

  if (vm.erro) {
    return (
      <p role="alert" className="w-full max-w-md rounded-lg bg-red-50 p-3 text-sm text-red-800">
        {vm.erro}
      </p>
    )
  }

  if (vm.naoEncontrado || !vm.perfil) {
    return <p className="p-4 text-gray-700">Este vendedor não existe mais.</p>
  }

  const { vendedor, itens, ativoAgora } = vm.perfil

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center gap-3">
        {vendedor.fotoUrl ? (
          <img
            src={vendedor.fotoUrl}
            alt={`Foto de ${vendedor.nomeExibicao}`}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-700"
          >
            {vendedor.nomeExibicao.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-gray-900">{vendedor.nomeExibicao}</h2>
          {ativoAgora ? (
            <span className="text-sm font-medium text-green-700">No campus agora</span>
          ) : (
            <span className="text-sm font-medium text-gray-500">Fora do campus agora</span>
          )}
        </div>
      </header>

      {vendedor.descricao && <p className="text-gray-700">{vendedor.descricao}</p>}

      {(vm.botoesContato.length > 0 || vendedor.perfilId !== meuPerfilId) && (
        <div className="flex gap-2">
          {/* "Chat" abre a conversa dentro do app (US18); não aparece no próprio perfil (RN22). */}
          {vendedor.perfilId !== meuPerfilId && (
            <BotaoChat vendedorId={vendedor.id} repositorio={chatRepositorio} />
          )}
          {vm.botoesContato.map((botao) => (
            <a
              key={botao.canal}
              href={botao.link}
              {...(botao.canal === 'whatsapp'
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
              className={`rounded-lg px-4 py-2 font-medium text-white ${
                botao.canal === 'whatsapp' ? 'bg-green-600' : 'bg-blue-600'
              }`}
            >
              {botao.rotulo}
            </a>
          ))}
        </div>
      )}

      <div>
        <h3 className="mb-2 font-semibold text-gray-900">Itens</h3>
        {itens.length === 0 ? (
          <p className="text-sm text-gray-600">Este vendedor ainda não cadastrou itens.</p>
        ) : (
          // Os esgotados já vêm depois dos disponíveis (RN09); o `ItemDoPerfil` risca e marca "Esgotado".
          <ul className="flex flex-col divide-y divide-gray-200">
            {itens.map((item) => (
              <ItemDoPerfil key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
