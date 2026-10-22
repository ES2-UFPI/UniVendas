import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { AuthRepository } from '../domain/AuthRepository'
import { Usuario } from '../domain/Usuario'
import { CadastroPage } from './CadastroPage'

afterEach(cleanup)

const ana = new Usuario('u1', 'Ana', 'ana@ufpi.edu.br')

function repositorioFalso(cadastrar = vi.fn().mockResolvedValue(ana)) {
  return { repositorio: { cadastrar } as AuthRepository, cadastrar }
}

function preencher(senha = '123456') {
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana' } })
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@ufpi.edu.br' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } })
}

const botao = () => screen.getByRole('button', { name: 'Criar conta' })

describe('CadastroPage', () => {
  it('mostra os erros de cada campo e não cria a conta', async () => {
    const { repositorio, cadastrar } = repositorioFalso()
    render(<CadastroPage repositorio={repositorio} />)

    fireEvent.click(botao())

    expect(await screen.findByText('Informe seu nome.')).toBeInTheDocument()
    expect(screen.getByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByText('A senha precisa ter 6 ou mais caracteres.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(cadastrar).not.toHaveBeenCalled()
  })

  it('recusa e-mail inválido', async () => {
    render(<CadastroPage repositorio={repositorioFalso().repositorio} />)
    preencher()
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@' } })

    fireEvent.click(botao())

    expect(await screen.findByText(/Digite um e-mail válido/)).toBeInTheDocument()
  })

  it('cria a conta, já entra no app e avisa quem chamou a tela (RN01)', async () => {
    const { repositorio, cadastrar } = repositorioFalso()
    const aoCadastrar = vi.fn()
    render(<CadastroPage repositorio={repositorio} aoCadastrar={aoCadastrar} />)
    preencher()

    fireEvent.click(botao())

    expect(await screen.findByText('Bem-vindo, Ana!')).toBeInTheDocument()
    expect(cadastrar).toHaveBeenCalledWith('Ana', 'ana@ufpi.edu.br', '123456')
    expect(aoCadastrar).toHaveBeenCalledWith(ana)
  })

  it('mostra o erro do servidor quando o e-mail já tem conta', async () => {
    const { repositorio } = repositorioFalso(
      vi
        .fn()
        .mockRejectedValue(
          new Falha('Este e-mail já tem uma conta. Tente entrar.', 'user_already_exists'),
        ),
    )
    const aoCadastrar = vi.fn()
    render(<CadastroPage repositorio={repositorio} aoCadastrar={aoCadastrar} />)
    preencher()

    fireEvent.click(botao())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este e-mail já tem uma conta. Tente entrar.',
    )
    expect(aoCadastrar).not.toHaveBeenCalled()
  })
})
