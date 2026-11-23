import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { Layout } from './core/Layout'
import { RotaProtegida, RotaSoVisitante } from './core/RotaProtegida'
import { ROTAS } from './core/routes'
import { useSessaoStore } from './core/sessaoStore'
import { CadastroPage } from './features/auth/presentation/CadastroPage'
import { EsqueciSenhaPage } from './features/auth/presentation/EsqueciSenhaPage'
import { LoginPage } from './features/auth/presentation/LoginPage'
import { NovaSenhaPage } from './features/auth/presentation/NovaSenhaPage'
import type { ChatRepository } from './features/chat/domain/ChatRepository'
import { ConversaPage } from './features/chat/presentation/ConversaPage'
import { MeusItensPage } from './features/itens/presentation/MeusItensPage'
import { TelaVisitante } from './features/auth/presentation/TelaVisitante'
import { VisaoDoCampus } from './features/mapa/presentation/VisaoDoCampus'
import { useMapaViewModel } from './features/mapa/presentation/useMapaViewModel'
import type { PresencaRepository } from './features/presenca/domain/PresencaRepository'
import { PainelVendedorPage } from './features/presenca/presentation/PainelVendedorPage'
import type { VendedorRepository } from './features/vendedores/domain/VendedorRepository'
import { MeuPerfilPage } from './features/vendedores/presentation/MeuPerfilPage'
import { PerfilVendedorPage } from './features/vendedores/presentation/PerfilVendedorPage'
import { QueroVenderPage } from './features/vendedores/presentation/QueroVenderPage'

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
          <Link
            to={ROTAS.cadastro}
            className="font-bold text-marca-700 underline underline-offset-2 hover:text-marca-800"
          >
            Criar conta
          </Link>
          <span className="mt-3 block">
            Esqueceu a senha?{' '}
            <Link
              to={ROTAS.esqueciSenha}
              className="font-bold text-marca-700 underline underline-offset-2 hover:text-marca-800"
            >
              Recuperar
            </Link>
          </span>
        </>
      }
    >
      <LoginPage aoEntrar={() => navegar(destino, { replace: true })} />
    </TelaVisitante>
  )
}

/** "Esqueci a senha" (US15): pede o e-mail e manda o link de recuperação. */
function EsqueciSenha() {
  return (
    <TelaVisitante
      rodape={
        <>
          Lembrou da senha?{' '}
          <Link
            to={ROTAS.login}
            className="font-bold text-marca-700 underline underline-offset-2 hover:text-marca-800"
          >
            Entrar
          </Link>
        </>
      }
    >
      <EsqueciSenhaPage />
    </TelaVisitante>
  )
}

/**
 * "Nova senha" (US15): quem abre o link do e-mail volta ao app já logado, com uma sessão de
 * recuperação. Por isso esta rota não é só para visitantes (eles seriam mandados ao mapa) nem
 * exige login antes: sem sessão, o link expirou ou nunca foi aberto.
 */
function NovaSenha() {
  const navegar = useNavigate()
  const { usuario, carregando } = useSessaoStore()

  if (carregando) {
    return (
      <p role="status" className="p-8 text-center text-gray-600">
        Carregando…
      </p>
    )
  }

  return (
    <TelaVisitante
      rodape={
        <Link
          to={ROTAS.login}
          className="font-bold text-marca-700 underline underline-offset-2 hover:text-marca-800"
        >
          Voltar para entrar
        </Link>
      }
    >
      {usuario ? (
        <NovaSenhaPage aoTrocar={() => navegar(ROTAS.mapa, { replace: true })} />
      ) : (
        <section className="w-full" role="alert">
          <h2 className="text-4xl font-bold tracking-tight text-tinta lg:text-[3.5rem]">
            Link vencido
          </h2>
          <p className="mt-2 text-base text-tinta-suave lg:text-lg">
            Este link de recuperação expirou ou já foi usado.{' '}
            <Link
              to={ROTAS.esqueciSenha}
              className="font-bold text-marca-700 underline underline-offset-2 hover:text-marca-800"
            >
              Peça um novo
            </Link>
            .
          </p>
        </section>
      )}
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
          <Link
            to={ROTAS.login}
            className="font-bold text-marca-700 underline underline-offset-2 hover:text-marca-800"
          >
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

/** "Meu perfil" (US14): o vendedor edita o próprio perfil. */
function MeuPerfil({ repositorio }: { repositorio?: VendedorRepository }) {
  const usuario = useSessaoStore((s) => s.usuario)
  return <MeuPerfilPage perfilId={usuario?.id ?? null} repositorio={repositorio} />
}

/** Perfil do vendedor (US10): o id vem do endereço `/vendedor/:id`. */
function PerfilVendedor({ repositorio }: { repositorio?: VendedorRepository }) {
  const { id = '' } = useParams()
  return <PerfilVendedorPage id={id} repositorio={repositorio} />
}

/** Tela da conversa (US18): o id vem do endereço `/conversa/:id`. */
function Conversa({ repositorio }: { repositorio?: ChatRepository }) {
  const { id = '' } = useParams()
  const usuario = useSessaoStore((s) => s.usuario)
  return <ConversaPage conversaId={id} perfilId={usuario?.id ?? null} repositorio={repositorio} />
}

function MeusItens() {
  const usuario = useSessaoStore((s) => s.usuario)
  return <MeusItensPage perfilId={usuario?.id ?? null} />
}

/** O mapa com os vendedores ativos, que aparecem e somem em tempo real (US06). */
function Mapa({ presencaRepositorio }: { presencaRepositorio?: PresencaRepository }) {
  const { marcadores, vendedores, carregando, erro } = useMapaViewModel({
    repositorio: presencaRepositorio,
  })
  return (
    <>
      {erro && (
        <p role="alert" className="mb-2 w-full rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {erro}
        </p>
      )}
      <VisaoDoCampus marcadores={marcadores} vendedores={vendedores} carregando={carregando} />
    </>
  )
}

interface AppRotasProps {
  /** Só para os testes: repositório de presença falso (sem rede). */
  presencaRepositorio?: PresencaRepository
  /** Só para os testes: repositório de vendedores falso (sem rede). */
  vendedorRepositorio?: VendedorRepository
  /** Só para os testes: repositório do chat falso (sem rede). */
  chatRepositorio?: ChatRepository
}

/** As rotas do app, sem o roteador (os testes usam um `MemoryRouter` em volta). */
export function AppRotas({
  presencaRepositorio,
  vendedorRepositorio,
  chatRepositorio,
}: AppRotasProps = {}) {
  return (
    <Routes>
      <Route element={<RotaSoVisitante />}>
        <Route path={ROTAS.login} element={<Login />} />
        <Route path={ROTAS.cadastro} element={<Cadastro />} />
        <Route path={ROTAS.esqueciSenha} element={<EsqueciSenha />} />
      </Route>
      <Route path={ROTAS.novaSenha} element={<NovaSenha />} />
      <Route element={<RotaProtegida />}>
        <Route element={<Layout />}>
          <Route path={ROTAS.mapa} element={<Mapa presencaRepositorio={presencaRepositorio} />} />
          <Route path={ROTAS.queroVender} element={<QueroVender />} />
          <Route
            path={ROTAS.painel}
            element={<PainelVendedorPage repositorio={presencaRepositorio} />}
          />
          <Route path={ROTAS.meuPerfil} element={<MeuPerfil repositorio={vendedorRepositorio} />} />
          <Route
            path={ROTAS.perfilVendedor}
            element={<PerfilVendedor repositorio={vendedorRepositorio} />}
          />
          <Route path={ROTAS.meusItens} element={<MeusItens />} />
          <Route path={ROTAS.conversa} element={<Conversa repositorio={chatRepositorio} />} />
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
