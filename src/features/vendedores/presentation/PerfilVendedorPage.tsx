import type { VendedorRepository } from '../domain/VendedorRepository'
import { usePerfilVendedorViewModel } from './usePerfilVendedorViewModel'

const formatoPreco = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

interface PerfilVendedorPageProps {
  /** Id do vendedor, vindo da rota `/vendedor/:id`. */
  id: string
  /** Só para os testes: repositório falso. */
  repositorio?: VendedorRepository
}

/**
 * Tela do perfil do vendedor (US10): foto, nome, descrição, contatos e itens.
 * Se ele não está no campus agora, mostra "fora do campus agora" (RN19).
 */
export function PerfilVendedorPage({ id, repositorio }: PerfilVendedorPageProps) {
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

      {vm.botoesContato.length > 0 && (
        <div className="flex gap-2">
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
          // O jeito de mostrar o item esgotado (riscado e com a marca) vem na #119.
          <ul className="flex flex-col divide-y divide-gray-200">
            {itens.map((item) => (
              <li key={item.id} className="flex justify-between py-2">
                <span className="text-gray-900">{item.nome}</span>
                <span className="text-gray-700">{formatoPreco.format(item.preco)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
