import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthRepository } from '../features/auth/domain/AuthRepository'
import { Usuario } from '../features/auth/domain/Usuario'
import { iniciarSessao, useSessaoStore } from './sessaoStore'

const ana = new Usuario('u1', 'Ana', 'ana@ufpi.edu.br')

// Repositório falso que guarda o ouvinte, para o teste avisar as mudanças como o Supabase faria.
function repositorioFalso() {
  let ouvinte: (usuario: Usuario | null) => void = () => {}
  const cancelar = vi.fn()
  const aoMudarUsuario = vi.fn((cb: typeof ouvinte) => {
    ouvinte = cb
    return cancelar
  })
  return {
    repositorio: { aoMudarUsuario } as unknown as AuthRepository,
    avisar: (usuario: Usuario | null) => ouvinte(usuario),
    cancelar,
  }
}

describe('useSessaoStore', () => {
  beforeEach(() => {
    useSessaoStore.setState({ usuario: null, carregando: true })
  })

  it('começa carregando e sem usuário', () => {
    expect(useSessaoStore.getState().usuario).toBeNull()
    expect(useSessaoStore.getState().carregando).toBe(true)
  })

  it('restaura o usuário quando o app abre com uma sessão salva', () => {
    const { repositorio, avisar } = repositorioFalso()

    iniciarSessao(repositorio)
    avisar(ana)

    expect(useSessaoStore.getState().usuario).toBe(ana)
    expect(useSessaoStore.getState().carregando).toBe(false)
  })

  it('termina de carregar sem usuário quando não há sessão', () => {
    const { repositorio, avisar } = repositorioFalso()

    iniciarSessao(repositorio)
    avisar(null)

    expect(useSessaoStore.getState().usuario).toBeNull()
    expect(useSessaoStore.getState().carregando).toBe(false)
  })

  it('acompanha quem entra e quem sai', () => {
    const { repositorio, avisar } = repositorioFalso()
    iniciarSessao(repositorio)

    avisar(ana)
    expect(useSessaoStore.getState().usuario).toBe(ana)

    avisar(null)
    expect(useSessaoStore.getState().usuario).toBeNull()
  })

  it('devolve a função que cancela a inscrição', () => {
    const { repositorio, cancelar } = repositorioFalso()

    const parar = iniciarSessao(repositorio)
    parar()

    expect(cancelar).toHaveBeenCalled()
  })
})
