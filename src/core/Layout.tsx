import type { ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BotaoSair } from '../features/auth/presentation/BotaoSair'
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
  para: string
  rotulo: string
  /** O link do mapa (`/`) só fica ativo na raiz, senão acenderia em todas as telas. */
  exata?: boolean
  icone: ReactNode
}

const ABAS: Aba[] = [
  {
    para: ROTAS.mapa,
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
    rotulo: 'Conversas',
    icone: <path d="M4 5h16v11H9l-5 4V5Z" />,
  },
  {
    para: ROTAS.meuPerfil,
    rotulo: 'Meu perfil',
    icone: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  },
]

/**
 * Layout das telas internas, no formato de aplicativo de celular (US20): cabeçalho fixo no topo,
 * com o nome do app, quem está logado e o botão de sair, e barra de abas fixa embaixo.
 */
export function Layout() {
  const usuario = useSessaoStore((s) => s.usuario)
  const navegar = useNavigate()

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* z-[1100]: o mapa (Leaflet) usa camadas até 1000 e não pode ficar por cima das barras. */}
      <header className="fixed inset-x-0 top-0 z-[1100] flex items-center justify-between gap-2 border-b border-gray-200 bg-white p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="text-xl font-bold text-green-700">UniVendas</span>
        <div className="flex items-center gap-2">
          {usuario && <span className="text-sm text-gray-600">{usuario.nome}</span>}
          <BotaoSair aoSair={() => navegar(ROTAS.login, { replace: true })} />
        </div>
      </header>

      {/* As folgas em cima e embaixo são a altura das duas barras, para nada ficar escondido. */}
      <main className="flex flex-1 flex-col items-center p-4 pt-24 pb-28">
        <Outlet />
      </main>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-[1100] flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]"
      >
        {ABAS.map((aba) => (
          <NavLink key={aba.para} to={aba.para} end={aba.exata} className={estiloAba}>
            <Icone>{aba.icone}</Icone>
            <span className="max-w-full truncate">{aba.rotulo}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
