import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Usuario } from '../features/auth/domain/Usuario'
import { useMemoriaDaBusca } from '../features/busca/presentation/memoriaDaBusca'
import { Layout } from './Layout'
import { lerModo } from './modoDeUso'
import { ROTAS } from './routes'
import { useSessaoStore } from './sessaoStore'

// O botão de sair de verdade fala com o Supabase; aqui ele só avisa que saiu.
vi.mock('../features/auth/presentation/BotaoSair', () => ({
  BotaoSair: ({ aoSair }: { aoSair?: () => void }) => (
    <button type="button" onClick={aoSair}>
      Sair
    </button>
  ),
}))

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
  it('põe a marca e as iniciais de quem está logado no cabeçalho; o menu da conta tem o botão de sair', () => {
    abrir(new Usuario('u1', 'Maria Eduarda', 'duda@x.com'))
    const cabecalho = screen.getByRole('banner')
    expect(within(cabecalho).getByText('UniVendas')).toBeInTheDocument()
    const conta = within(cabecalho).getByRole('button', { name: 'Conta de Maria Eduarda' })
    expect(conta).toHaveTextContent('ME')
    expect(conta).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()

    fireEvent.click(conta)

    expect(conta).toHaveAttribute('aria-expanded', 'true')
    expect(within(cabecalho).getByText('duda@x.com')).toBeInTheDocument()
    expect(within(cabecalho).getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('ao sair, esquece a busca de quem saiu (a próxima pessoa no aparelho não a herda)', () => {
    useMemoriaDaBusca.setState({ texto: 'brownie' })
    abrir(consumidor)
    fireEvent.click(screen.getByRole('button', { name: 'Conta de Ana' }))

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(useMemoriaDaBusca.getState().texto).toBe('')
  })

  it('o menu da conta fecha com Esc', () => {
    abrir(consumidor)
    const conta = screen.getByRole('button', { name: 'Conta de Ana' })
    fireEvent.click(conta)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(conta).toHaveAttribute('aria-expanded', 'false')
  })

  it('as abas ficam numa navegação só, fora do cabeçalho (no computador ela sobe para o topo)', () => {
    abrir(consumidor)
    expect(screen.getAllByRole('navigation')).toHaveLength(1)
    expect(within(screen.getByRole('banner')).queryAllByRole('link')).toHaveLength(0)
  })

  it('marca só a aba da tela atual', () => {
    abrir(consumidor, ROTAS.conversas)
    expect(screen.getByRole('link', { name: 'Conversas' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Mapa' })).not.toHaveAttribute('aria-current')
  })

  it('o detalhe de um item acende a aba Buscar', () => {
    abrir(consumidor, '/item/i1')
    expect(screen.getByRole('link', { name: 'Buscar' })).toHaveClass('text-marca-600')
    expect(screen.getByRole('link', { name: 'Mapa' })).not.toHaveClass('text-marca-600')
  })

  it('uma conversa acende a aba Conversas, e o perfil de um vendedor, a aba Mapa', () => {
    abrir(consumidor, '/conversa/c1')
    expect(screen.getByRole('link', { name: 'Conversas' })).toHaveClass('text-marca-600')
    cleanup()

    abrir(consumidor, '/vendedor/v1')
    expect(screen.getByRole('link', { name: 'Mapa' })).toHaveClass('text-marca-600')
    expect(screen.getByRole('link', { name: 'Conversas' })).not.toHaveClass('text-marca-600')
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
