import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { LocalizacaoService } from '../../../core/localizacaoService'
import { ResultadoRegistro, type PresencaRepository } from '../domain/PresencaRepository'
import { PainelVendedorPage } from './PainelVendedorPage'

afterEach(cleanup)

const posicao = { latitude: -5.0577, longitude: -42.7955 }

function falsos(
  registrar = vi.fn().mockResolvedValue(ResultadoRegistro.ATIVO),
  posicaoAtual = vi.fn().mockResolvedValue(posicao),
) {
  return {
    repositorio: { registrar } as unknown as PresencaRepository,
    localizacao: { posicaoAtual } as Pick<LocalizacaoService, 'posicaoAtual'>,
    registrar,
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
})
