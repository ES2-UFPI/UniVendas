import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSessaoStore } from '../../../core/sessaoStore'
import { Usuario } from '../../auth/domain/Usuario'
import { VendedorAmbulante } from '../../vendedores/domain/Vendedor'
import type { VendedorRepository } from '../../vendedores/domain/VendedorRepository'
import { Falha } from '../../../core/falha'
import type { LocalizacaoService } from '../../../core/localizacaoService'
import { Presenca } from '../domain/Presenca'
import { ResultadoRegistro, type PresencaRepository } from '../domain/PresencaRepository'
import { PainelVendedorPage as Painel } from './PainelVendedorPage'

afterEach(() => {
  cleanup()
  useSessaoStore.setState({ usuario: null, carregando: true })
})

// O atalho "Seus itens" é um link, então o painel precisa de um roteador em volta.
function PainelVendedorPage(props: ComponentProps<typeof Painel>) {
  return (
    <MemoryRouter>
      <Painel {...props} />
    </MemoryRouter>
  )
}

const posicao = { latitude: -5.0577, longitude: -42.7955 }

function falsos(
  registrar = vi.fn().mockResolvedValue(ResultadoRegistro.ATIVO),
  posicaoAtual = vi.fn().mockResolvedValue(posicao),
  desligar = vi.fn().mockResolvedValue(undefined),
  minhaPresenca = vi.fn().mockResolvedValue(null),
) {
  return {
    repositorio: {
      registrar,
      desligar,
      minhaPresenca,
      observarAtivos: vi.fn(() => () => {}),
    } as unknown as PresencaRepository,
    localizacao: { posicaoAtual, acompanhar: vi.fn(() => () => {}) } as Pick<
      LocalizacaoService,
      'posicaoAtual' | 'acompanhar'
    >,
    registrar,
    desligar,
    minhaPresenca,
  }
}

const botao = () => screen.getByRole('switch', { name: 'Estou no campus' })
const visivel = () => screen.queryByText('Você está visível no mapa.')

describe('PainelVendedorPage', () => {
  it('começa com o interruptor desligado, a referência vazia e "Fora do mapa"', () => {
    render(<PainelVendedorPage {...falsos()} />)

    expect(botao()).toHaveAttribute('aria-checked', 'false')
    expect(botao()).toHaveAccessibleDescription('Ative para aparecer no mapa.')
    expect(screen.getByText('Fora do mapa')).toBeInTheDocument()
    expect(screen.getByLabelText('Referência (opcional)')).toHaveValue('')
    expect(screen.getByLabelText('Referência (opcional)')).toHaveAttribute('maxlength', '80')
    expect(screen.getByRole('status')).toHaveTextContent('Escolha um ponto no mapa')
    expect(visivel()).not.toBeInTheDocument()
  })

  it('mostra o nome do negócio e o atalho para os itens', async () => {
    useSessaoStore.setState({
      usuario: new Usuario('u1', 'Ana', 'ana@ufpi.edu.br', false, 'v1'),
      carregando: false,
    })
    const vendedores = {
      buscarDoUsuario: vi.fn().mockResolvedValue(new VendedorAmbulante('v1', 'u1', 'Doces da Ana')),
    } as unknown as VendedorRepository

    render(<PainelVendedorPage {...falsos()} vendedores={vendedores} />)

    expect(
      screen.getByRole('heading', { name: 'Seu ponto de venda no campus' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Doces da Ana')).toBeInTheDocument()
    expect(vendedores.buscarDoUsuario).toHaveBeenCalledWith('u1')
    expect(screen.getByRole('link', { name: /Seus itens/ })).toHaveAttribute('href', '/meus-itens')
  })

  it('liga a presença com a referência e mostra que está visível no mapa', async () => {
    const { repositorio, localizacao, registrar } = falsos()
    render(<PainelVendedorPage repositorio={repositorio} localizacao={localizacao} />)
    fireEvent.change(screen.getByLabelText('Referência (opcional)'), {
      target: { value: 'em frente ao RU' },
    })

    fireEvent.click(botao())

    expect(await screen.findByRole('status')).toHaveTextContent('Você está visível no mapa.')
    expect(registrar).toHaveBeenCalledWith(posicao, null, 'em frente ao RU')
    expect(botao()).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('No campus agora')).toBeInTheDocument()
    expect(screen.getByLabelText('Referência (opcional)')).toBeDisabled()
  })

  it('mostra a mensagem e o interruptor volta a desligado quando está fora do campus', async () => {
    const registrar = vi.fn().mockResolvedValue(ResultadoRegistro.FORA_DO_CAMPUS)
    render(<PainelVendedorPage {...falsos(registrar)} />)

    fireEvent.click(botao())

    expect(await screen.findByRole('alert')).toHaveTextContent('fora do campus')
    expect(botao()).toHaveAttribute('aria-checked', 'false')
    expect(botao()).toBeEnabled()
  })

  it('explica o motivo quando a permissão de localização é negada (RN12)', async () => {
    const negada = new Falha('Libere a localização nas configurações.', 'permissao-negada')
    const { repositorio, localizacao, registrar } = falsos(
      undefined,
      vi.fn().mockRejectedValue(negada),
    )
    render(<PainelVendedorPage repositorio={repositorio} localizacao={localizacao} />)

    fireEvent.click(botao())

    expect(await screen.findByRole('alert')).toHaveTextContent('Libere a localização')
    expect(registrar).not.toHaveBeenCalled()
    expect(botao()).toHaveAttribute('aria-checked', 'false')
  })

  it('desliga ao tocar de novo no interruptor e o painel volta ao estado inicial', async () => {
    const { repositorio, localizacao, desligar } = falsos()
    render(<PainelVendedorPage repositorio={repositorio} localizacao={localizacao} />)
    fireEvent.change(screen.getByLabelText('Referência (opcional)'), {
      target: { value: 'em frente ao RU' },
    })
    fireEvent.click(botao())
    await screen.findByText('Você está visível no mapa.')

    fireEvent.click(botao())

    await waitFor(() => expect(visivel()).not.toBeInTheDocument())
    expect(desligar).toHaveBeenCalledTimes(1)
    expect(botao()).toHaveAttribute('aria-checked', 'false')
    expect(botao()).toBeEnabled()
    expect(screen.getByText('Fora do mapa')).toBeInTheDocument()
    expect(screen.getByLabelText('Referência (opcional)')).toHaveValue('')
  })

  it('mostra o erro e continua ativo quando não consegue desligar', async () => {
    const desligar = vi
      .fn()
      .mockRejectedValue(new Falha('Não foi possível desligar sua presença.', 'XX000'))
    render(<PainelVendedorPage {...falsos(undefined, undefined, desligar)} />)
    fireEvent.click(botao())
    await screen.findByText('Você está visível no mapa.')

    fireEvent.click(botao())

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível desligar')
    expect(botao()).toHaveAttribute('aria-checked', 'true')
    expect(botao()).toBeEnabled()
  })

  it('volta ao painel já ativo quando o vendedor está ativo no servidor', async () => {
    const ativa = new Presenca('v1', 'Ana', posicao, false, 'em frente ao RU', new Date())
    const minhaPresenca = vi.fn().mockResolvedValue(ativa)

    render(<PainelVendedorPage {...falsos(undefined, undefined, undefined, minhaPresenca)} />)

    expect(await screen.findByText('Você está visível no mapa.')).toBeInTheDocument()
    expect(botao()).toHaveAttribute('aria-checked', 'true')
    expect(botao()).toBeEnabled()
    expect(screen.getByLabelText('Referência (opcional)')).toHaveValue('em frente ao RU')
  })
})

describe('PainelVendedorPage: ponto fixo no mapa (RN14)', () => {
  it('tocar no mapa escolhe o ponto, e ligar manda esse ponto', async () => {
    const { repositorio, localizacao, registrar } = falsos()
    const { container } = render(
      <PainelVendedorPage repositorio={repositorio} localizacao={localizacao} />,
    )
    expect(screen.queryByTitle('Ponto escolhido')).not.toBeInTheDocument()

    fireEvent.click(container.querySelector('.leaflet-container')!)

    expect(await screen.findByTitle('Ponto escolhido')).toBeInTheDocument()
    fireEvent.click(botao())
    await screen.findByText('Você está visível no mapa.')
    expect(registrar).toHaveBeenCalledWith(
      posicao,
      expect.objectContaining({ latitude: expect.any(Number), longitude: expect.any(Number) }),
      '',
    )
  })

  it('"Usar minha posição real" tira o ponto', async () => {
    const { repositorio, localizacao, registrar } = falsos()
    const { container } = render(
      <PainelVendedorPage repositorio={repositorio} localizacao={localizacao} />,
    )
    fireEvent.click(container.querySelector('.leaflet-container')!)

    fireEvent.click(await screen.findByRole('button', { name: 'Usar minha posição real' }))

    expect(screen.queryByTitle('Ponto escolhido')).not.toBeInTheDocument()
    fireEvent.click(botao())
    await screen.findByText('Você está visível no mapa.')
    expect(registrar).toHaveBeenCalledWith(posicao, null, '')
  })
})
