import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { AuthRepository } from '../domain/AuthRepository'
import { NovaSenhaPage } from './NovaSenhaPage'

afterEach(cleanup)

function falso(definirNovaSenha = vi.fn().mockResolvedValue(undefined)) {
  return {
    repositorio: { definirNovaSenha } as unknown as AuthRepository,
    definirNovaSenha,
  }
}

function preencher(senha: string, confirmacao: string) {
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: senha } })
  fireEvent.change(screen.getByLabelText('Repita a nova senha'), { target: { value: confirmacao } })
}

const botao = () => screen.getByRole('button', { name: 'Salvar a nova senha' })

describe('NovaSenhaPage (US15)', () => {
  it('troca a senha e avisa quem chamou', async () => {
    const { repositorio, definirNovaSenha } = falso()
    const aoTrocar = vi.fn()
    render(<NovaSenhaPage repositorio={repositorio} aoTrocar={aoTrocar} />)
    preencher('nova123', 'nova123')

    fireEvent.click(botao())

    await vi.waitFor(() => expect(aoTrocar).toHaveBeenCalledTimes(1))
    expect(definirNovaSenha).toHaveBeenCalledWith('nova123')
  })

  it('mostra os erros de senha curta e de confirmação diferente, sem trocar nada', async () => {
    const { repositorio, definirNovaSenha } = falso()
    render(<NovaSenhaPage repositorio={repositorio} />)
    preencher('123', '456')

    fireEvent.click(botao())

    expect(await screen.findByText('A senha precisa ter 6 ou mais caracteres.')).toBeInTheDocument()
    expect(screen.getByText('As senhas não são iguais.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute('aria-invalid', 'true')
    expect(definirNovaSenha).not.toHaveBeenCalled()
  })

  it('mostra o erro do repositório e não avisa que trocou', async () => {
    const { repositorio } = falso(
      vi.fn().mockRejectedValue(new Falha('O link expirou. Peça um novo.', 'session_not_found')),
    )
    const aoTrocar = vi.fn()
    render(<NovaSenhaPage repositorio={repositorio} aoTrocar={aoTrocar} />)
    preencher('nova123', 'nova123')

    fireEvent.click(botao())

    expect(await screen.findByRole('alert')).toHaveTextContent('O link expirou. Peça um novo.')
    expect(aoTrocar).not.toHaveBeenCalled()
  })
})
