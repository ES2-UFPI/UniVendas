import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { AuthRepository } from '../domain/AuthRepository'
import { Usuario } from '../domain/Usuario'
import { LoginPage } from './LoginPage'

afterEach(cleanup)

const ana = new Usuario('u1', 'Ana', 'ana@ufpi.edu.br')

function repositorioFalso(
  entrar = vi.fn().mockResolvedValue(ana),
  sair = vi.fn().mockResolvedValue(undefined),
) {
  return { repositorio: { entrar, sair } as unknown as AuthRepository, entrar, sair }
}

function preencher(senha = '123456') {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@ufpi.edu.br' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } })
}

const botaoEntrar = () => screen.getByRole('button', { name: 'Entrar' })

describe('LoginPage', () => {
  it('pede e-mail e senha e não chama o repositório', async () => {
    const { repositorio, entrar } = repositorioFalso()
    render(<LoginPage repositorio={repositorio} />)

    fireEvent.click(botaoEntrar())

    expect(await screen.findByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true')
    expect(entrar).not.toHaveBeenCalled()
  })

  it('entra, avisa quem chamou e mostra o botão de sair', async () => {
    const { repositorio, entrar } = repositorioFalso()
    const aoEntrar = vi.fn()
    render(<LoginPage repositorio={repositorio} aoEntrar={aoEntrar} />)
    preencher()

    fireEvent.click(botaoEntrar())

    expect(await screen.findByText('Olá, Ana!')).toBeInTheDocument()
    expect(entrar).toHaveBeenCalledWith('ana@ufpi.edu.br', '123456')
    expect(aoEntrar).toHaveBeenCalledWith(ana)
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('mostra mensagem clara quando a senha está errada (RN04)', async () => {
    const { repositorio } = repositorioFalso(
      vi.fn().mockRejectedValue(new Falha('E-mail ou senha incorretos.', 'invalid_credentials')),
    )
    render(<LoginPage repositorio={repositorio} />)
    preencher('errada')

    fireEvent.click(botaoEntrar())

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
    expect(screen.queryByText('Olá, Ana!')).not.toBeInTheDocument()
  })

  it('volta para o formulário depois de sair', async () => {
    const { repositorio, sair } = repositorioFalso()
    render(<LoginPage repositorio={repositorio} />)
    preencher()
    fireEvent.click(botaoEntrar())

    fireEvent.click(await screen.findByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(sair).toHaveBeenCalled()
    expect(screen.getByLabelText('Senha')).toHaveValue('')
  })
})
