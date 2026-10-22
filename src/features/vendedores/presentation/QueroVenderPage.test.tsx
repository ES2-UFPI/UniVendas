import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import { VendedorAmbulante } from '../domain/Vendedor'
import type { VendedorRepository } from '../domain/VendedorRepository'
import { QueroVenderPage } from './QueroVenderPage'

afterEach(cleanup)

function repositorioFalso(
  criar = vi.fn().mockResolvedValue(new VendedorAmbulante('v1', 'u1', 'Brownies da Ana')),
) {
  return { repositorio: { criar } as VendedorRepository, criar }
}

function preencher() {
  fireEvent.change(screen.getByLabelText('Nome que os compradores vão ver'), {
    target: { value: 'Brownies da Ana' },
  })
  fireEvent.change(screen.getByLabelText('WhatsApp'), { target: { value: '(86) 99999-8888' } })
}

const botao = () => screen.getByRole('button', { name: 'Criar meu perfil de vendedor' })

describe('QueroVenderPage', () => {
  it('pede para entrar na conta quando não há usuário logado', () => {
    render(<QueroVenderPage perfilId={null} />)
    expect(
      screen.getByText('Entre na sua conta para criar seu perfil de vendedor.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('mostra os erros de nome e contato e não salva (RN06)', async () => {
    const { repositorio, criar } = repositorioFalso()
    render(<QueroVenderPage perfilId="u1" repositorio={repositorio} />)

    fireEvent.click(botao())

    expect(
      await screen.findByText('Informe o nome que os compradores vão ver.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Informe ao menos um contato: WhatsApp ou telefone.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nome que os compradores vão ver')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(criar).not.toHaveBeenCalled()
  })

  it('mostra o erro de telefone sem DDD (RN21)', async () => {
    render(<QueroVenderPage perfilId="u1" repositorio={repositorioFalso().repositorio} />)
    fireEvent.change(screen.getByLabelText('Nome que os compradores vão ver'), {
      target: { value: 'Ana' },
    })
    fireEvent.change(screen.getByLabelText('WhatsApp'), { target: { value: '99999-8888' } })

    fireEvent.click(botao())

    expect(await screen.findByText(/Use o DDD e o número/)).toBeInTheDocument()
  })

  it('cria o perfil e mostra a confirmação', async () => {
    const { repositorio, criar } = repositorioFalso()
    render(<QueroVenderPage perfilId="u1" repositorio={repositorio} />)
    preencher()

    fireEvent.click(botao())

    expect(await screen.findByText('Pronto, Brownies da Ana!')).toBeInTheDocument()
    expect(criar).toHaveBeenCalledOnce()
  })

  it('envia a foto comprimida junto com o perfil (RN10)', async () => {
    const { repositorio, criar } = repositorioFalso()
    const comprimida = new Blob(['pequena'], { type: 'image/jpeg' })
    const comprimir = vi.fn().mockResolvedValue(comprimida)
    render(<QueroVenderPage perfilId="u1" repositorio={repositorio} comprimir={comprimir} />)
    preencher()

    const arquivo = new File(['original'], 'foto.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Escolher foto'), { target: { files: [arquivo] } })
    expect(await screen.findByText('Trocar foto')).toBeInTheDocument()

    fireEvent.click(botao())

    await screen.findByText('Pronto, Brownies da Ana!')
    expect(comprimir).toHaveBeenCalledWith(arquivo)
    expect(criar.mock.calls[0][2]).toBe(comprimida)
  })

  it('mostra a mensagem do servidor quando não consegue salvar', async () => {
    const { repositorio } = repositorioFalso(
      vi
        .fn()
        .mockRejectedValue(new Falha('Você já tem um perfil de vendedor.', 'perfil-ja-existe')),
    )
    render(<QueroVenderPage perfilId="u1" repositorio={repositorio} />)
    preencher()

    fireEvent.click(botao())

    expect(await screen.findByRole('alert')).toHaveTextContent('Você já tem um perfil de vendedor.')
  })
})
