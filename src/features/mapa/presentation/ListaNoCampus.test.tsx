import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ListaNoCampus, type VendedorNaLista } from './ListaNoCampus'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const agora = new Date('2026-11-21T12:00:00Z')

function vendedor(
  id: string,
  nome: string,
  minutosAtras: number,
  referencia: string | null = null,
) {
  return {
    id,
    nome,
    referencia,
    ultimoSinalEm: new Date(agora.getTime() - minutosAtras * 60_000),
  } satisfies VendedorNaLista
}

function mostrar(vendedores: VendedorNaLista[], carregando = false) {
  vi.useFakeTimers({ now: agora })
  render(
    <MemoryRouter>
      <ListaNoCampus vendedores={vendedores} carregando={carregando} />
    </MemoryRouter>,
  )
}

describe('ListaNoCampus (US13)', () => {
  it('mostra o nome, a referência e há quanto tempo foi o último sinal', () => {
    mostrar([vendedor('v1', 'Brownies da Ana', 3, 'em frente ao RU')])

    expect(screen.getByText('Brownies da Ana')).toBeInTheDocument()
    expect(screen.getByText('em frente ao RU')).toBeInTheDocument()
    expect(screen.getByText('há 3 min')).toBeInTheDocument()
  })

  it('cada vendedor é um link para o perfil dele', () => {
    mostrar([vendedor('v1', 'Brownies da Ana', 1), vendedor('v2', 'Café do Leo', 2)])

    expect(screen.getByRole('link', { name: /Café do Leo/ })).toHaveAttribute(
      'href',
      '/vendedor/v2',
    )
    expect(screen.getByRole('link', { name: /Brownies da Ana/ })).toHaveAttribute(
      'href',
      '/vendedor/v1',
    )
  })

  it('mostra os vendedores na ordem recebida (o ViewModel já ordena)', () => {
    mostrar([vendedor('v2', 'Café do Leo', 1), vendedor('v1', 'Brownies da Ana', 8)])

    const nomes = screen.getAllByRole('link').map((l) => l.textContent)
    expect(nomes[0]).toContain('Café do Leo')
    expect(nomes[1]).toContain('Brownies da Ana')
  })

  it('não mostra a referência de quem não colocou uma', () => {
    mostrar([vendedor('v1', 'Brownies da Ana', 1)])

    expect(screen.getByRole('link').textContent).toBe('Brownies da Anahá 1 min')
  })

  it('avisa quando ninguém está no campus', () => {
    mostrar([])

    expect(screen.getByText('Ninguém está no campus agora.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('mostra o aviso de carregando em vez da lista', () => {
    mostrar([vendedor('v1', 'Brownies da Ana', 1)], true)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando quem está no campus…')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('atualiza o "há N min" com o tempo, mesmo sem sinal novo', () => {
    mostrar([vendedor('v1', 'Brownies da Ana', 1)])
    expect(screen.getByText('há 1 min')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5 * 60_000)
    })

    expect(screen.getByText('há 6 min')).toBeInTheDocument()
  })
})
