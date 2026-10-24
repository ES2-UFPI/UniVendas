import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ROTAS } from './routes'
import { useSessaoStore } from './sessaoStore'

/** Espera enquanto o Supabase ainda não respondeu se há sessão salva. */
function Carregando() {
  return (
    <p role="status" className="p-8 text-center text-gray-600">
      Carregando…
    </p>
  )
}

/**
 * Rota protegida (RN04: só usuários logados usam o app). Quem não está logado vai para o login,
 * levando junto o endereço que tentou abrir, para voltar a ele depois de entrar.
 */
export function RotaProtegida() {
  const { usuario, carregando } = useSessaoStore()
  const local = useLocation()

  if (carregando) return <Carregando />
  if (!usuario) return <Navigate to={ROTAS.login} replace state={{ de: local.pathname }} />
  return <Outlet />
}

/** O contrário: login e cadastro são só para quem ainda não entrou. Quem já entrou vai ao mapa. */
export function RotaSoVisitante() {
  const { usuario, carregando } = useSessaoStore()

  if (carregando) return <Carregando />
  if (usuario) return <Navigate to={ROTAS.mapa} replace />
  return <Outlet />
}
