import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { AuthRepository } from '../domain/AuthRepository'
import { ExcluirContaSecao } from './ExcluirContaSecao'

afterEach(cleanup)

function falso(excluirConta = vi.fn().mockResolvedValue(undefined)) {
  return { repositorio: { excluirConta } as unknown as AuthRepository, excluirConta }
}

const pedir = () => screen.getByRole('button', { name: 'Excluir minha conta' })

describe('ExcluirContaSecao (US17)', () => {
  it('mostra o aviso do que será apagado e só o botão de pedir', () => {
    render(<ExcluirContaSecao repositorio={falso().repositorio} />)

    expect(
      screen.getByText(/perfil, fotos, itens, contatos, presença e conversas/),
    ).toBeInTheDocument()
    expect(pedir()).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('pede confirmação antes de excluir, e cancelar mantém a conta', () => {
    const { repositorio, excluirConta } = falso()
    render(<ExcluirContaSecao repositorio={repositorio} />)

    fireEvent.click(pedir())

    const confirmacao = screen.getByRole('alertdialog', { name: 'Excluir minha conta?' })
    expect(confirmacao).toHaveTextContent('Isso não pode ser desfeito.')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(excluirConta).not.toHaveBeenCalled()
  })

  it('exclui a conta ao confirmar e avisa quem chamou', async () => {
    const { repositorio, excluirConta } = falso()
    const aoExcluir = vi.fn()
    render(<ExcluirContaSecao repositorio={repositorio} aoExcluir={aoExcluir} />)

    fireEvent.click(pedir())
    fireEvent.click(screen.getByRole('button', { name: 'Sim, excluir minha conta' }))

    await vi.waitFor(() => expect(aoExcluir).toHaveBeenCalledTimes(1))
    expect(excluirConta).toHaveBeenCalledTimes(1)
  })

  it('mostra o erro e não avisa que excluiu quando falha', async () => {
    const { repositorio } = falso(
      vi.fn().mockRejectedValue(new Falha('Não foi possível excluir a conta.', '42501')),
    )
    const aoExcluir = vi.fn()
    render(<ExcluirContaSecao repositorio={repositorio} aoExcluir={aoExcluir} />)

    fireEvent.click(pedir())
    fireEvent.click(screen.getByRole('button', { name: 'Sim, excluir minha conta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível excluir a conta.')
    expect(aoExcluir).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})
