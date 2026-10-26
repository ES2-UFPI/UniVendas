import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BotaoSair } from '../features/auth/presentation/BotaoSair'
import { ROTAS } from './routes'
import { useSessaoStore } from './sessaoStore'

const estiloLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1 text-sm font-medium ${isActive ? 'bg-green-100 text-green-800' : 'text-gray-700 hover:bg-gray-100'}`

/** Layout das telas internas: topo com o nome do app, o menu, quem está logado e o botão de sair. */
export function Layout() {
  const usuario = useSessaoStore((s) => s.usuario)
  const navegar = useNavigate()

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 p-3">
        <span className="text-xl font-bold text-green-700">UniVendas</span>
        <nav className="flex gap-1">
          <NavLink to={ROTAS.mapa} end className={estiloLink}>
            Mapa
          </NavLink>
          <NavLink to={ROTAS.queroVender} className={estiloLink}>
            Quero vender
          </NavLink>
          <NavLink to={ROTAS.painel} className={estiloLink}>
            Painel
          </NavLink>
        </nav>
        <div className="flex items-center gap-2">
          {usuario && <span className="text-sm text-gray-600">{usuario.nome}</span>}
          <BotaoSair aoSair={() => navegar(ROTAS.login, { replace: true })} />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center p-4">
        <Outlet />
      </main>
    </div>
  )
}
