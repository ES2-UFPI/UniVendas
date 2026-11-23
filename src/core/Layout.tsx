import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BotaoSair } from '../features/auth/presentation/BotaoSair'
import { guardarModo, lerModo, modoAtual, type Modo } from './modoDeUso'
import { ROTAS } from './routes'
import { useSessaoStore } from './sessaoStore'

const estiloAba = ({ isActive }: { isActive: boolean }) =>
  `flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium ${isActive ? 'text-green-700' : 'text-gray-600 hover:text-gray-900'}`

/** Ícone de uma aba: desenho simples de 24x24, só decorativo (o rótulo já diz o que é). */
function Icone({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

interface Aba {
  /** Identifica a aba, para cada modo escolher as suas. */
  id: string
  para: string
  rotulo: string
  /** O link do mapa (`/`) só fica ativo na raiz, senão acenderia em todas as telas. */
  exata?: boolean
  icone: ReactNode
}

const TODAS_AS_ABAS: Aba[] = [
  {
    para: ROTAS.mapa,
    id: 'mapa',
    rotulo: 'Mapa',
    exata: true,
    icone: (
      <>
        <path d="M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10Z" />
        <circle cx="12" cy="11" r="2" />
      </>
    ),
  },
  {
    para: ROTAS.queroVender,
    id: 'queroVender',
    rotulo: 'Quero vender',
    icone: (
      <>
        <path d="M4 9h16l-1.5 10h-13L4 9Z" />
        <path d="M8 9V7a4 4 0 0 1 8 0v2" />
      </>
    ),
  },
  {
    para: ROTAS.painel,
    id: 'painel',
    rotulo: 'Painel',
    icone: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1" />
        <rect x="13" y="4" width="7" height="7" rx="1" />
        <rect x="4" y="13" width="7" height="7" rx="1" />
        <rect x="13" y="13" width="7" height="7" rx="1" />
      </>
    ),
  },
  {
    para: ROTAS.meusItens,
    id: 'meusItens',
    rotulo: 'Meus itens',
    icone: (
      <>
        <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
        <path d="m4 7 8 4 8-4M12 11v10" />
      </>
    ),
  },
  {
    para: ROTAS.conversas,
    id: 'conversas',
    rotulo: 'Conversas',
    icone: <path d="M4 5h16v11H9l-5 4V5Z" />,
  },
  {
    para: ROTAS.meuPerfil,
    id: 'meuPerfil',
    rotulo: 'Meu perfil',
    icone: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  },
]

/** Ordem das abas de cada modo. O consumidor ainda ganha a aba "Buscar" quando a busca (US11) existir. */
const ABAS_DO_CONSUMIDOR = ['mapa', 'conversas']
const ABAS_DO_VENDEDOR = ['painel', 'meusItens', 'meuPerfil', 'conversas']

/**
 * As abas de cada modo (US20). Quem ainda não tem perfil de vendedor não tem a troca de modo, então
 * ganha a aba "Quero vender", o único caminho para virar vendedor.
 */
function abasDoModo(modo: Modo, ehVendedor: boolean): Aba[] {
  const ids =
    modo === 'vendedor'
      ? ABAS_DO_VENDEDOR
      : ehVendedor
        ? ABAS_DO_CONSUMIDOR
        : [...ABAS_DO_CONSUMIDOR, 'queroVender']
  return ids.map((id) => TODAS_AS_ABAS.find((aba) => aba.id === id)!)
}

/**
 * Layout das telas internas, no formato de aplicativo de celular (US20): cabeçalho fixo no topo,
 * com o nome do app, quem está logado e o botão de sair, e barra de abas fixa embaixo.
 */
export function Layout() {
  const usuario = useSessaoStore((s) => s.usuario)
  const navegar = useNavigate()
  const ehVendedor = usuario?.ehVendedor() ?? false
  const [escolhido, setEscolhido] = useState<Modo | null>(() =>
    usuario ? lerModo(usuario.id) : null,
  )
  const modo = modoAtual(ehVendedor, escolhido)

  function trocarModo(novo: Modo) {
    if (!usuario || novo === modo) return
    guardarModo(usuario.id, novo)
    setEscolhido(novo)
    navegar(novo === 'vendedor' ? ROTAS.painel : ROTAS.mapa)
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* z-[1100]: o mapa (Leaflet) usa camadas até 1000 e não pode ficar por cima das barras. */}
      <header className="fixed inset-x-0 top-0 z-[1100] flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="text-xl font-bold text-green-700">UniVendas</span>
        <div className="flex items-center gap-2">
          {usuario && <span className="text-sm text-gray-600">{usuario.nome}</span>}
          <BotaoSair aoSair={() => navegar(ROTAS.login, { replace: true })} />
        </div>
        {ehVendedor && (
          <div
            role="group"
            aria-label="Modo de uso"
            className="flex w-full rounded-lg bg-gray-100 p-1 text-sm font-medium"
          >
            {(['consumidor', 'vendedor'] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                aria-pressed={modo === opcao}
                onClick={() => trocarModo(opcao)}
                className={`flex-1 rounded-md px-3 py-1 ${modo === opcao ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600'}`}
              >
                {opcao === 'consumidor' ? 'Consumidor' : 'Vendedor'}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* As folgas em cima e embaixo são a altura das duas barras, para nada ficar escondido. */}
      <main
        className={`flex flex-1 flex-col items-center p-4 pb-28 ${ehVendedor ? 'pt-36' : 'pt-24'}`}
      >
        <Outlet />
      </main>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-[1100] flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]"
      >
        {abasDoModo(modo, ehVendedor).map((aba) => (
          <NavLink key={aba.para} to={aba.para} end={aba.exata} className={estiloAba}>
            <Icone>{aba.icone}</Icone>
            <span className="max-w-full truncate">{aba.rotulo}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
