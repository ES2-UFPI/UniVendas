import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { LocalizacaoService } from '../../../core/localizacaoService'
import { Presenca } from '../domain/Presenca'
import { ResultadoRegistro, type PresencaRepository } from '../domain/PresencaRepository'
import { PainelVendedorPage } from './PainelVendedorPage'

afterEach(cleanup)

const posicao = { latitude: -5.0577, longitude: -42.7955 }

function falsos(
  registrar = vi.fn().mockResolvedValue(ResultadoRegistro.ATIVO),
  posicaoAtual = vi.fn().mockResolvedValue(posicao),
  desligar = vi.fn().mockResolvedValue(undefined),
  minhaPresenca = vi.fn().mockResolvedValue(null),
) {
  return {
    repositorio: { registrar, desligar, minhaPresenca } as unknown as PresencaRepository,
    localizacao: { posicaoAtual } as Pick<LocalizacaoService, 'posicaoAtual'>,
    registrar,
    desligar,
    minhaPresenca,
  }
}

const botao = () => screen.getByRole('button', { name: 'Estou no campus' })

describe('PainelVendedorPage', () => {
  it('começa com o botão desligado e a referência vazia', () => {
    render(<PainelVendedorPage {...falsos()} />)

    expect(botao()).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByLabelText('Referência (opcional)')).toHaveValue('')
    expect(screen.getByLabelText('Referência (opcional)')).toHaveAttribute('maxlength', '80')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
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
    expect(botao()).toHaveAttribute('aria-pressed', 'true')
    expect(botao()).toBeDisabled()
  })

  it('mostra a mensagem e o botão volta a desligado quando está fora do campus', async () => {
    const registrar = vi.fn().mockResolvedValue(ResultadoRegistro.FORA_DO_CAMPUS)
    render(<PainelVendedorPage {...falsos(registrar)} />)

    fireEvent.click(botao())

    expect(await screen.findByRole('alert')).toHaveTextContent('fora do campus')
    expect(botao()).toHaveAttribute('aria-pressed', 'false')
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
    expect(botao()).toHaveAttribute('aria-pressed', 'false')
  })

  it('só mostra o botão Desligar depois de ligar', async () => {
    render(<PainelVendedorPage {...falsos()} />)
    expect(screen.queryByRole('button', { name: 'Desligar' })).not.toBeInTheDocument()

    fireEvent.click(botao())

    expect(await screen.findByRole('button', { name: 'Desligar' })).toBeEnabled()
  })

  it('desliga e o painel volta ao estado inicial', async () => {
    const { repositorio, localizacao, desligar } = falsos()
    render(<PainelVendedorPage repositorio={repositorio} localizacao={localizacao} />)
    fireEvent.change(screen.getByLabelText('Referência (opcional)'), {
      target: { value: 'em frente ao RU' },
    })
    fireEvent.click(botao())
    fireEvent.click(await screen.findByRole('button', { name: 'Desligar' }))

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(desligar).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Desligar' })).not.toBeInTheDocument()
    expect(botao()).toHaveAttribute('aria-pressed', 'false')
    expect(botao()).toBeEnabled()
    expect(screen.getByLabelText('Referência (opcional)')).toHaveValue('')
  })

  it('mostra o erro e continua ativo quando não consegue desligar', async () => {
    const desligar = vi
      .fn()
      .mockRejectedValue(new Falha('Não foi possível desligar sua presença.', 'XX000'))
    render(<PainelVendedorPage {...falsos(undefined, undefined, desligar)} />)
    fireEvent.click(botao())
    fireEvent.click(await screen.findByRole('button', { name: 'Desligar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível desligar')
    expect(botao()).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Desligar' })).toBeEnabled()
  })

  it('volta ao painel já ativo, com o botão Desligar, quando o vendedor está ativo no servidor', async () => {
    const ativa = new Presenca('v1', 'Ana', posicao, false, 'em frente ao RU', new Date())
    const minhaPresenca = vi.fn().mockResolvedValue(ativa)

    render(<PainelVendedorPage {...falsos(undefined, undefined, undefined, minhaPresenca)} />)

    expect(await screen.findByRole('status')).toHaveTextContent('Você está visível no mapa.')
    expect(screen.getByRole('button', { name: 'Desligar' })).toBeEnabled()
    expect(botao()).toBeDisabled()
    expect(screen.getByLabelText('Referência (opcional)')).toHaveValue('em frente ao RU')
  })
})
