import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { AuthRepository } from '../domain/AuthRepository'
import { EsqueciSenhaPage } from './EsqueciSenhaPage'

afterEach(cleanup)

function falso(enviarLinkDeRecuperacao = vi.fn().mockResolvedValue(undefined)) {
  return {
    repositorio: { enviarLinkDeRecuperacao } as unknown as AuthRepository,
    enviarLinkDeRecuperacao,
  }
}

const botao = () => screen.getByRole('button', { name: 'Enviar o link' })

describe('EsqueciSenhaPage (US15)', () => {
  it('pede o e-mail e não chama o repositório', async () => {
    const { repositorio, enviarLinkDeRecuperacao } = falso()
    render(<EsqueciSenhaPage repositorio={repositorio} />)

    fireEvent.click(botao())

    expect(await screen.findByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(enviarLinkDeRecuperacao).not.toHaveBeenCalled()
  })

  it('manda o link e mostra o aviso, que não diz se o e-mail tem conta', async () => {
    const { repositorio, enviarLinkDeRecuperacao } = falso()
    render(<EsqueciSenhaPage repositorio={repositorio} />)
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@ufpi.edu.br' } })

    fireEvent.click(botao())

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Se existir uma conta com o e-mail ana@ufpi.edu.br',
    )
    expect(enviarLinkDeRecuperacao).toHaveBeenCalledWith('ana@ufpi.edu.br')
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
  })

  it('mostra o erro do repositório e mantém o formulário', async () => {
    const { repositorio } = falso(
      vi.fn().mockRejectedValue(new Falha('Muitos e-mails pedidos.', 'limite')),
    )
    render(<EsqueciSenhaPage repositorio={repositorio} />)
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@ufpi.edu.br' } })

    fireEvent.click(botao())

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitos e-mails pedidos.')
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@ufpi.edu.br')
  })
})
