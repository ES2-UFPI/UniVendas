import type { ReactNode } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { Layout } from './core/Layout'
import { RotaProtegida, RotaSoVisitante } from './core/RotaProtegida'
import { ROTAS } from './core/routes'
import { useSessaoStore } from './core/sessaoStore'
import { CadastroPage } from './features/auth/presentation/CadastroPage'
import { LoginPage } from './features/auth/presentation/LoginPage'
import { MapaPage } from './features/mapa/presentation/MapaPage'
import { useMapaViewModel } from './features/mapa/presentation/useMapaViewModel'
import type { PresencaRepository } from './features/presenca/domain/PresencaRepository'
import { PainelVendedorPage } from './features/presenca/presentation/PainelVendedorPage'
import { QueroVenderPage } from './features/vendedores/presentation/QueroVenderPage'

/** Topo simples das telas de login e cadastro, com um link para a outra tela. */
function TelaVisitante({ children, rodape }: { children: ReactNode; rodape: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center bg-white p-4">
      <h1 className="mt-6 text-3xl font-bold text-green-700">UniVendas</h1>
      <p className="text-gray-600">Vendedores do campus, perto de você.</p>
      {children}
      <p className="text-sm text-gray-700">{rodape}</p>
    </main>
  )
}

function Login() {
  const navegar = useNavigate()
  const local = useLocation()
  // Volta para a tela que a pessoa tentou abrir antes de entrar (a rota protegida guarda em `de`).
  const destino = (local.state as { de?: string } | null)?.de ?? ROTAS.mapa

  return (
    <TelaVisitante
      rodape={
        <>
          Não tem conta?{' '}
          <Link to={ROTAS.cadastro} className="font-semibold text-green-700 underline">
            Criar conta
          </Link>
        </>
      }
    >
      <LoginPage aoEntrar={() => navegar(destino, { replace: true })} />
    </TelaVisitante>
  )
}

function Cadastro() {
  const navegar = useNavigate()

  return (
    <TelaVisitante
      rodape={
        <>
          Já tem conta?{' '}
          <Link to={ROTAS.login} className="font-semibold text-green-700 underline">
            Entrar
          </Link>
        </>
      }
    >
      {/* A conta já volta logada (RN01), então segue direto para o mapa. */}
      <CadastroPage aoCadastrar={() => navegar(ROTAS.mapa, { replace: true })} />
    </TelaVisitante>
  )
}

function QueroVender() {
  const usuario = useSessaoStore((s) => s.usuario)
  return <QueroVenderPage perfilId={usuario?.id ?? null} />
}

/** O mapa com os vendedores ativos, que aparecem e somem em tempo real (US06). */
function Mapa({ presencaRepositorio }: { presencaRepositorio?: PresencaRepository }) {
  const { marcadores, erro } = useMapaViewModel({ repositorio: presencaRepositorio })
  return (
    <>
      {erro && (
        <p role="alert" className="mb-2 w-full rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {erro}
        </p>
      )}
      <MapaPage marcadores={marcadores} />
    </>
  )
}

interface AppRotasProps {
  /** Só para os testes: repositório de presença falso (sem rede). */
  presencaRepositorio?: PresencaRepository
}

/** As rotas do app, sem o roteador (os testes usam um `MemoryRouter` em volta). */
export function AppRotas({ presencaRepositorio }: AppRotasProps = {}) {
  return (
    <Routes>
      <Route element={<RotaSoVisitante />}>
        <Route path={ROTAS.login} element={<Login />} />
        <Route path={ROTAS.cadastro} element={<Cadastro />} />
      </Route>
      <Route element={<RotaProtegida />}>
        <Route element={<Layout />}>
          <Route path={ROTAS.mapa} element={<Mapa presencaRepositorio={presencaRepositorio} />} />
          <Route path={ROTAS.queroVender} element={<QueroVender />} />
          <Route
            path={ROTAS.painel}
            element={<PainelVendedorPage repositorio={presencaRepositorio} />}
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={ROTAS.mapa} replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRotas />
    </BrowserRouter>
  )
}

export default App
