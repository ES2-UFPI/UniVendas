import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BotaoSair } from '../features/auth/presentation/BotaoSair'
import { Logo } from './Logo'
import { guardarModo, lerModo, modoAtual, type Modo } from './modoDeUso'
import { ROTAS } from './routes'
import { iniciais } from './ui/iniciais'
import { useSessaoStore } from './sessaoStore'

/**
 * Uma aba da navegação. No celular, ícone e rótulo na barra de baixo; no computador, só o rótulo,
 * sublinhado quando é a tela atual (US21).
 */
const estiloAba = ({ isActive }: { isActive: boolean }, destaque = false) =>
  destaque
    ? `flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium md:my-auto md:h-[42px] md:flex-none md:flex-row md:rounded-controle md:border md:px-5 md:text-[15px] md:font-bold ${
        isActive
          ? 'text-marca-600 md:border-marca-600 md:bg-marca-600 md:text-white'
          : 'text-tinta-suave md:border-linha md:text-marca-600 md:hover:border-marca-600'
      }`
    : `flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium md:h-full md:flex-none md:flex-row md:border-b-2 md:px-0 md:py-0 md:text-[15px] ${
        isActive
          ? 'text-marca-600 md:border-marca-600 md:font-bold'
          : 'text-tinta-suave hover:text-tinta md:border-transparent'
      }`

/** Ícone de uma aba: desenho simples de 24x24, só decorativo (o rótulo já diz o que é). */
function Icone({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 shrink-0 md:hidden"
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
  /** No computador, aparece como botão de contorno (o "Quero vender" do Paper). */
  destaque?: boolean
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
    para: ROTAS.busca,
    id: 'busca',
    rotulo: 'Buscar',
    icone: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-4.5-4.5" />
      </>
    ),
  },
  {
    para: ROTAS.queroVender,
    id: 'queroVender',
    rotulo: 'Quero vender',
    destaque: true,
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

/** Ordem das abas de cada modo. */
const ABAS_DO_CONSUMIDOR = ['mapa', 'busca', 'conversas']
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

interface MenuDaContaProps {
  nome: string
  email: string
  aoSair: () => void
}

/** O círculo com as iniciais, no canto do cabeçalho: abre o nome da conta e o botão de sair. */
function MenuDaConta({ nome, email, aoSair }: MenuDaContaProps) {
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora ou ao apertar Esc.
  useEffect(() => {
    if (!aberto) return
    function fora(evento: MouseEvent) {
      if (!caixa.current?.contains(evento.target as Node)) setAberto(false)
    }
    function esc(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls="menu-da-conta"
        aria-label={`Conta de ${nome}`}
        onClick={() => setAberto((a) => !a)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-marca-50 text-sm font-bold text-marca-900 hover:bg-[#dcfce7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600"
      >
        {iniciais(nome)}
      </button>
      {aberto && (
        <div
          id="menu-da-conta"
          className="absolute top-12 right-0 flex w-64 flex-col gap-3 rounded-2xl border border-linha bg-white p-4 shadow-lg"
        >
          <div className="min-w-0">
            <p className="truncate font-bold text-tinta">{nome}</p>
            <p className="truncate text-sm text-tinta-suave">{email}</p>
          </div>
          <BotaoSair aoSair={aoSair} />
        </div>
      )}
    </div>
  )
}

interface SeletorDeModoProps {
  modo: Modo
  aoTrocar: (modo: Modo) => void
}

/** Troca entre comprar e vender (US20), só para quem já é vendedor. */
function SeletorDeModo({ modo, aoTrocar }: SeletorDeModoProps) {
  return (
    <div
      role="group"
      aria-label="Modo de uso"
      className="flex w-full rounded-controle bg-campo p-1 text-sm font-semibold md:w-auto"
    >
      {(['consumidor', 'vendedor'] as const).map((opcao) => (
        <button
          key={opcao}
          type="button"
          aria-pressed={modo === opcao}
          onClick={() => aoTrocar(opcao)}
          className={`flex-1 rounded-[9px] px-4 py-1.5 focus-visible:outline-2 focus-visible:outline-marca-600 md:flex-none ${
            modo === opcao ? 'bg-marca-600 text-white' : 'text-tinta-suave hover:text-tinta'
          }`}
        >
          {opcao === 'consumidor' ? 'Consumidor' : 'Vendedor'}
        </button>
      ))}
    </div>
  )
}

/**
 * Layout das telas internas (US20, visual da US21).
 * - Celular: cabeçalho no topo (marca, troca de modo e conta) e barra de abas fixa embaixo.
 * - Computador: as abas sobem para o cabeçalho; no modo vendedor, viram uma segunda linha
 *   ("Painel, Meus itens, Meu perfil, Conversas"), como no Paper.
 * É a mesma `<nav>` nos dois tamanhos, só muda de lugar, para o leitor de tela achar sempre uma só.
 */
export function Layout() {
  const usuario = useSessaoStore((s) => s.usuario)
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const ehVendedor = usuario?.ehVendedor() ?? false
  const [escolhido, setEscolhido] = useState<Modo | null>(() =>
    usuario ? lerModo(usuario.id) : null,
  )
  const modo = modoAtual(ehVendedor, escolhido)
  const segundaLinha = modo === 'vendedor'

  function trocarModo(novo: Modo) {
    if (!usuario || novo === modo) return
    guardarModo(usuario.id, novo)
    setEscolhido(novo)
    navegar(novo === 'vendedor' ? ROTAS.painel : ROTAS.mapa)
  }

  // Ao trocar de tela, começa do topo.
  useEffect(() => {
    window.scrollTo?.({ top: 0 })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-white text-tinta">
      {/* z-[1100]: o mapa (Leaflet) usa camadas até 1000 e não pode ficar por cima das barras. */}
      <header className="fixed inset-x-0 top-0 z-[1100] border-b border-linha bg-white pt-[env(safe-area-inset-top)]">
        {/* No celular, a troca de modo desce para uma segunda linha; no computador, fica ao lado da conta. */}
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-3 px-4 md:h-[72px] md:flex-nowrap md:px-6">
          <Logo className="flex h-16 items-center text-[22px] md:h-auto md:text-2xl" />
          {ehVendedor && (
            <div className="order-last w-full pb-3 md:order-none md:ml-auto md:w-auto md:pb-0">
              <SeletorDeModo modo={modo} aoTrocar={trocarModo} />
            </div>
          )}
          {usuario && (
            <MenuDaConta
              nome={usuario.nome}
              email={usuario.email}
              aoSair={() => navegar(ROTAS.login, { replace: true })}
            />
          )}
        </div>
      </header>

      {/* As folgas em cima e embaixo são a altura das barras, para nada ficar escondido. */}
      <main
        className={`mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center px-4 pb-28 md:px-6 md:pb-16 ${
          ehVendedor ? 'pt-[8.5rem]' : 'pt-24'
        } ${segundaLinha ? 'md:pt-[10.5rem]' : 'md:pt-28'}`}
      >
        <Outlet />
      </main>

      <nav
        aria-label="Navegação principal"
        className={`fixed inset-x-0 bottom-0 z-[1100] flex border-t border-linha bg-white pb-[env(safe-area-inset-bottom)] md:bottom-auto md:border-t-0 md:pb-0 ${
          segundaLinha
            ? 'md:top-[72px] md:h-[52px] md:justify-start md:gap-7 md:border-b md:px-[max(1.5rem,calc((100vw-1200px)/2+1.5rem))]'
            : 'md:inset-x-auto md:top-0 md:left-1/2 md:h-[72px] md:-translate-x-1/2 md:gap-7 md:bg-transparent'
        }`}
      >
        {abasDoModo(modo, ehVendedor).map((aba) => (
          <NavLink
            key={aba.para}
            to={aba.para}
            end={aba.exata}
            className={(estado) => estiloAba(estado, aba.destaque)}
          >
            <Icone>{aba.icone}</Icone>
            <span className="max-w-full truncate">{aba.rotulo}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
