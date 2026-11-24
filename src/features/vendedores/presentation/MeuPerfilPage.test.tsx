import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { AuthRepository } from '../../auth/domain/AuthRepository'
import { Contato } from '../domain/Contato'
import { PerfilVendedor } from '../domain/PerfilVendedor'
import { VendedorAmbulante } from '../domain/Vendedor'
import type { VendedorRepository } from '../domain/VendedorRepository'
import { MeuPerfilPage } from './MeuPerfilPage'

afterEach(cleanup)

const ana = new VendedorAmbulante('v1', 'u1', 'Brownies da Ana', 'Brownie e café')
const contatos = [new Contato('whatsapp', '5586999998888')]

function abrir({
  doUsuario = vi.fn().mockResolvedValue(ana),
  atualizarPerfil = vi.fn((vendedor: VendedorAmbulante) => Promise.resolve(vendedor)),
} = {}) {
  render(
    <MemoryRouter>
      <MeuPerfilPage
        perfilId="u1"
        repositorio={
          {
            buscarDoUsuario: doUsuario,
            buscarPerfil: vi.fn().mockResolvedValue(new PerfilVendedor(ana, contatos, [], false)),
            atualizarPerfil,
          } as unknown as VendedorRepository
        }
        comprimir={vi.fn()}
      />
    </MemoryRouter>,
  )
  return { atualizarPerfil }
}

const botao = () => screen.getByRole('button', { name: 'Salvar alterações' })
const nome = () => screen.findByLabelText('Nome que os compradores vão ver')

describe('MeuPerfilPage: excluir a conta (US17)', () => {
  it('mostra o "Excluir minha conta" mesmo para quem ainda não tem perfil de vendedor', async () => {
    abrir({ doUsuario: vi.fn().mockResolvedValue(null) })

    expect(await screen.findByRole('link', { name: 'Quero vender' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Excluir minha conta' })).toBeInTheDocument()
  })

  it('avisa quem chamou depois de excluir a conta', async () => {
    const excluirConta = vi.fn().mockResolvedValue(undefined)
    const aoExcluirConta = vi.fn()
    render(
      <MemoryRouter>
        <MeuPerfilPage
          perfilId="u1"
          repositorio={
            {
              buscarDoUsuario: vi.fn().mockResolvedValue(ana),
              buscarPerfil: vi.fn().mockResolvedValue(new PerfilVendedor(ana, contatos, [], false)),
            } as unknown as VendedorRepository
          }
          authRepositorio={{ excluirConta } as unknown as AuthRepository}
          aoExcluirConta={aoExcluirConta}
        />
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Excluir minha conta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sim, excluir minha conta' }))

    await waitFor(() => expect(aoExcluirConta).toHaveBeenCalledTimes(1))
    expect(excluirConta).toHaveBeenCalledTimes(1)
  })
})

describe('MeuPerfilPage (US14)', () => {
  it('mostra o perfil atual nos campos, com o telefone como a pessoa digita', async () => {
    abrir()

    expect(await nome()).toHaveValue('Brownies da Ana')
    expect(screen.getByLabelText('O que você vende (opcional)')).toHaveValue('Brownie e café')
    expect(screen.getByLabelText('WhatsApp')).toHaveValue('(86) 99999-8888')
    expect(screen.getByLabelText('Telefone')).toHaveValue('')
  })

  it('salva as mudanças e avisa que o perfil foi atualizado', async () => {
    const { atualizarPerfil } = abrir()
    fireEvent.change(await nome(), { target: { value: 'Doces da Ana' } })
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '(86) 3215-1234' } })

    fireEvent.click(botao())

    expect(await screen.findByRole('status')).toHaveTextContent('Perfil atualizado.')
    const [vendedor, enviados] = atualizarPerfil.mock.calls[0] as unknown as [
      VendedorAmbulante,
      Contato[],
    ]
    expect(vendedor.id).toBe('v1')
    expect(vendedor.nomeExibicao).toBe('Doces da Ana')
    expect(enviados.map((c) => `${c.canal}:${c.valor}`)).toEqual([
      'whatsapp:5586999998888',
      'telefone:558632151234',
    ])
  })

  it('mostra os erros de nome e contato e não salva (RN06)', async () => {
    const { atualizarPerfil } = abrir()
    fireEvent.change(await nome(), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('WhatsApp'), { target: { value: '' } })

    fireEvent.click(botao())

    expect(
      await screen.findByText('Informe o nome que os compradores vão ver.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Informe ao menos um contato: WhatsApp ou telefone.'),
    ).toBeInTheDocument()
    expect(atualizarPerfil).not.toHaveBeenCalled()
  })

  it('mostra o erro do repositório e continua com os dados na tela', async () => {
    abrir({
      atualizarPerfil: vi
        .fn()
        .mockRejectedValue(
          new Falha('Este perfil não existe ou não é seu.', 'perfil-nao-encontrado'),
        ),
    })
    await nome()

    fireEvent.click(botao())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este perfil não existe ou não é seu.',
    )
    expect(screen.getByLabelText('Nome que os compradores vão ver')).toHaveValue('Brownies da Ana')
    expect(screen.queryByText('Perfil atualizado.')).not.toBeInTheDocument()
  })

  it('manda criar o perfil de vendedor quando a conta não tem um', async () => {
    abrir({ doUsuario: vi.fn().mockResolvedValue(null) })

    expect(await screen.findByRole('link', { name: 'Quero vender' })).toHaveAttribute(
      'href',
      '/quero-vender',
    )
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument()
  })

  it('mostra o erro de carregamento', async () => {
    abrir({
      doUsuario: vi.fn().mockRejectedValue(new Falha('Não foi possível carregar o perfil.', '500')),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar o perfil.',
    )
  })

  it('desabilita o botão enquanto salva', async () => {
    let terminar: (vendedor: VendedorAmbulante) => void = () => {}
    const { atualizarPerfil } = abrir({
      atualizarPerfil: vi.fn(
        () =>
          new Promise<VendedorAmbulante>((resolver) => {
            terminar = resolver
          }),
      ),
    })
    await nome()

    fireEvent.click(botao())

    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled())
    terminar(ana)
    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(atualizarPerfil).toHaveBeenCalledTimes(1)
  })
})

describe('MeuPerfilPage: ocultar números (US19)', () => {
  it('cada número tem o interruptor "Mostrar", ligado por padrão', async () => {
    abrir()
    await nome()

    expect(screen.getByRole('switch', { name: 'Mostrar WhatsApp' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Mostrar Telefone' })).toBeChecked()
  })

  it('desligar o WhatsApp salva o número como oculto e avisa que só sobra o Chat', async () => {
    const { atualizarPerfil } = abrir()
    await nome()

    fireEvent.click(screen.getByRole('switch', { name: 'Mostrar WhatsApp' }))

    expect(screen.getByText('Oculto: só você vê este número')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('só vai falar com você pelo Chat')

    fireEvent.click(botao())

    expect(await screen.findByRole('status')).toHaveTextContent('Perfil atualizado.')
    const [, enviados] = atualizarPerfil.mock.calls[0] as unknown as [unknown, Contato[]]
    expect(enviados).toEqual([new Contato('whatsapp', '5586999998888', false)])
  })
})

describe('MeuPerfilPage: visual novo (US21)', () => {
  const previa = () => screen.getByRole('complementary', { name: 'Como seu perfil vai aparecer' })

  it('mostra o título, o "Trocar foto do perfil" e a prévia com os dados salvos', async () => {
    const comFoto = new VendedorAmbulante(
      'v1',
      'u1',
      'Brownies da Ana',
      'Brownie e café',
      'https://exemplo.test/ana.jpg',
    )
    abrir({ doUsuario: vi.fn().mockResolvedValue(comFoto) })
    await nome()

    expect(screen.getByRole('heading', { level: 2, name: 'Meu perfil' })).toBeInTheDocument()
    expect(screen.getByLabelText('Trocar foto do perfil')).toHaveAttribute('type', 'file')
    expect(previa().querySelector('img')).toHaveAttribute('src', 'https://exemplo.test/ana.jpg')
    expect(within(previa()).getByText('Brownies da Ana')).toBeInTheDocument()
    expect(within(previa()).getByText('Brownie e café')).toBeInTheDocument()
    expect(within(previa()).getByText('WhatsApp')).toBeInTheDocument()
  })

  it('a prévia acompanha o que a pessoa digita e esconde o número oculto', async () => {
    abrir()
    fireEvent.change(await nome(), { target: { value: 'Doces da Ana' } })

    expect(within(previa()).getByText('Doces da Ana')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: 'Mostrar WhatsApp' }))
    expect(within(previa()).queryByText('WhatsApp')).not.toBeInTheDocument()
    expect(within(previa()).getByText('Chat')).toBeInTheDocument()
  })
})
