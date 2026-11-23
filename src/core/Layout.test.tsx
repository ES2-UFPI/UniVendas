import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { Usuario } from '../features/auth/domain/Usuario'
import { Layout } from './Layout'
import { lerModo } from './modoDeUso'
import { ROTAS } from './routes'
import { useSessaoStore } from './sessaoStore'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function abrir(usuario: Usuario, caminho: string = ROTAS.mapa) {
  useSessaoStore.setState({ usuario })
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="*" element={<p>conteúdo</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

const consumidor = new Usuario('u1', 'Ana', 'ana@x.com')
const vendedor = new Usuario('u2', 'Bia', 'bia@x.com', false, 'v1')

function abas() {
  const barra = screen.getByRole('navigation', { name: 'Navegação principal' })
  return within(barra)
    .getAllByRole('link')
    .map((a) => a.textContent)
}

describe('Layout (US20)', () => {
  it('põe o nome do app, quem está logado e o botão de sair no cabeçalho', () => {
    abrir(consumidor)
    const cabecalho = screen.getByRole('banner')
    expect(within(cabecalho).getByText('UniVendas')).toBeInTheDocument()
    expect(within(cabecalho).getByText('Ana')).toBeInTheDocument()
    expect(within(cabecalho).getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('leva os links na barra de baixo, não no cabeçalho', () => {
    abrir(consumidor)
    expect(within(screen.getByRole('banner')).queryAllByRole('link')).toHaveLength(0)
  })

  it('marca só a aba da tela atual', () => {
    abrir(consumidor, ROTAS.conversas)
    expect(screen.getByRole('link', { name: 'Conversas' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Mapa' })).not.toHaveAttribute('aria-current')
  })

  it('mostra a tela dentro do layout', () => {
    abrir(consumidor, ROTAS.painel)
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
  })
})

describe('abas por modo (US20, RN02)', () => {
  it('quem não tem perfil de vendedor vê as abas do consumidor, com "Quero vender", e sem troca de modo', () => {
    abrir(consumidor)
    expect(abas()).toEqual(['Mapa', 'Buscar', 'Conversas', 'Quero vender'])
    expect(screen.queryByRole('group', { name: 'Modo de uso' })).not.toBeInTheDocument()
  })

  it('o vendedor começa no modo vendedor, com as abas de vendedor', () => {
    abrir(vendedor)
    expect(abas()).toEqual(['Painel', 'Meus itens', 'Meu perfil', 'Conversas'])
    expect(screen.getByRole('button', { name: 'Vendedor' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('o vendedor troca para consumidor sem sair da conta, e o modo fica guardado', () => {
    abrir(vendedor)
    fireEvent.click(screen.getByRole('button', { name: 'Consumidor' }))
    expect(abas()).toEqual(['Mapa', 'Buscar', 'Conversas'])
    expect(screen.getByRole('button', { name: 'Consumidor' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(lerModo('u2')).toBe('consumidor')
  })

  it('reabre no modo que ficou guardado', () => {
    localStorage.setItem('univendas:modo:u2', 'consumidor')
    abrir(vendedor)
    expect(abas()).toEqual(['Mapa', 'Buscar', 'Conversas'])
  })

  it('voltar ao modo vendedor traz as abas de vendedor de volta', () => {
    localStorage.setItem('univendas:modo:u2', 'consumidor')
    abrir(vendedor)
    fireEvent.click(screen.getByRole('button', { name: 'Vendedor' }))
    expect(abas()).toEqual(['Painel', 'Meus itens', 'Meu perfil', 'Conversas'])
  })
})
