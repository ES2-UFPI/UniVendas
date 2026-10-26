import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App, { AppRotas } from './App'
import { useSessaoStore } from './core/sessaoStore'
import { Usuario } from './features/auth/domain/Usuario'
import type { PresencaRepository } from './features/presenca/domain/PresencaRepository'

afterEach(() => {
  cleanup()
  useSessaoStore.setState({ usuario: null, carregando: true })
})

const ana = new Usuario('u1', 'Ana', 'ana@ufpi.edu.br')

// Repositório de presença falso: o mapa não pode abrir canal no Supabase de verdade durante os testes.
const presencaRepositorio = {
  registrar: vi.fn(),
  listarAtivos: vi.fn().mockResolvedValue([]),
  observarAtivos: vi.fn(() => () => {}),
} as PresencaRepository

/** Abre o app no endereço `url`, com a sessão já definida. */
function abrir(url: string, usuario: Usuario | null) {
  useSessaoStore.setState({ usuario, carregando: false })
  render(
    <MemoryRouter initialEntries={[url]}>
      <AppRotas presencaRepositorio={presencaRepositorio} />
    </MemoryRouter>,
  )
}

describe('App', () => {
  it('espera a sessão antes de decidir a tela', () => {
    render(<App />)
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…')
  })

  it('manda para o login quem não está logado (RN04)', () => {
    abrir('/', null)
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Mapa do campus')).not.toBeInTheDocument()
  })

  it('protege também a tela "Quero vender"', () => {
    abrir('/quero-vender', null)
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('o login tem link para criar conta, e o cadastro para entrar', () => {
    abrir('/login', null)
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro')
    cleanup()

    abrir('/cadastro', null)
    expect(screen.getByRole('heading', { name: 'Criar conta' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  })

  it('mostra o mapa, o nome e o botão de sair para quem está logado', () => {
    abrir('/', ana)
    expect(screen.getByLabelText('Mapa do campus')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('quem já está logado e abre o login vai para o mapa', () => {
    abrir('/login', ana)
    expect(screen.getByLabelText('Mapa do campus')).toBeInTheDocument()
  })

  it('abre a tela "Quero vender" com a conta logada', () => {
    abrir('/quero-vender', ana)
    expect(screen.getByRole('heading', { name: 'Quero vender' })).toBeInTheDocument()
  })

  it('protege também o painel do vendedor', () => {
    abrir('/painel', null)
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('o menu leva ao painel do vendedor, com o botão "Estou no campus" (US04)', () => {
    abrir('/', ana)
    expect(screen.getByRole('link', { name: 'Painel' })).toHaveAttribute('href', '/painel')
    cleanup()

    abrir('/painel', ana)
    expect(screen.getByRole('heading', { name: 'Painel do vendedor' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Estou no campus' })).toBeInTheDocument()
  })

  it('endereço desconhecido volta para o mapa', () => {
    abrir('/nao-existe', ana)
    expect(screen.getByLabelText('Mapa do campus')).toBeInTheDocument()
  })
})
