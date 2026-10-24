import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthRepository } from '../domain/AuthRepository'
import { BotaoSair } from './BotaoSair'

afterEach(cleanup)

function repositorioFalso(sair = vi.fn().mockResolvedValue(undefined)) {
  return { repositorio: { sair } as unknown as AuthRepository, sair }
}

describe('BotaoSair', () => {
  it('sai da conta e avisa quem chamou', async () => {
    const { repositorio, sair } = repositorioFalso()
    const aoSair = vi.fn()
    render(<BotaoSair repositorio={repositorio} aoSair={aoSair} />)

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    await vi.waitFor(() => expect(aoSair).toHaveBeenCalled())
    expect(sair).toHaveBeenCalled()
  })

  it('mostra o erro e não avisa quem chamou se não conseguir sair', async () => {
    const { repositorio } = repositorioFalso(vi.fn().mockRejectedValue(new Error('rede caiu')))
    const aoSair = vi.fn()
    render(<BotaoSair repositorio={repositorio} aoSair={aoSair} />)

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível sair. Tente de novo.',
    )
    expect(aoSair).not.toHaveBeenCalled()
  })
})
