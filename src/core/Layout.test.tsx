import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { Layout } from './Layout'
import { ROTAS } from './routes'
import { useSessaoStore } from './sessaoStore'

function abrir(caminho: string) {
  useSessaoStore.setState({ usuario: { id: 'u1', nome: 'Ana', email: 'ana@x.com' } as never })
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

afterEach(cleanup)

describe('Layout (US20)', () => {
  it('põe o nome do app, quem está logado e o botão de sair no cabeçalho', () => {
    abrir(ROTAS.mapa)
    const cabecalho = screen.getByRole('banner')
    expect(within(cabecalho).getByText('UniVendas')).toBeInTheDocument()
    expect(within(cabecalho).getByText('Ana')).toBeInTheDocument()
    expect(within(cabecalho).getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('leva os links na barra de baixo, não no cabeçalho', () => {
    abrir(ROTAS.mapa)
    const barra = screen.getByRole('navigation', { name: 'Navegação principal' })
    const rotulos = within(barra)
      .getAllByRole('link')
      .map((a) => a.textContent)
    expect(rotulos).toEqual([
      'Mapa',
      'Quero vender',
      'Painel',
      'Meus itens',
      'Conversas',
      'Meu perfil',
    ])
    expect(within(screen.getByRole('banner')).queryAllByRole('link')).toHaveLength(0)
  })

  it('marca só a aba da tela atual', () => {
    abrir(ROTAS.conversas)
    expect(screen.getByRole('link', { name: 'Conversas' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Mapa' })).not.toHaveAttribute('aria-current')
  })

  it('mostra a tela dentro do layout', () => {
    abrir(ROTAS.painel)
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
  })
})
