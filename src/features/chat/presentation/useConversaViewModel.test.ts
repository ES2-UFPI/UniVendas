import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import type { ChatRepository } from '../domain/ChatRepository'
import { Conversa } from '../domain/Conversa'
import { Mensagem } from '../domain/Mensagem'
import { useConversaViewModel } from './useConversaViewModel'

const conversa = new Conversa(
  'c1',
  'ana',
  'Ana',
  'v1',
  'leo',
  'Café do Leo',
  new Date('2026-11-23T10:00:00Z'),
)
const as = (minuto: number) => new Date(`2026-11-23T10:${String(minuto).padStart(2, '0')}:00Z`)
const oi = new Mensagem('m1', 'c1', 'ana', 'Oi, tem café?', as(1))
const tem = new Mensagem('m2', 'c1', 'leo', 'Tem sim!', as(2))

/** Repositório falso: guarda o callback do Observer para o teste poder "receber" uma mensagem. */
function repositorioFalso(mudar: Partial<ChatRepository> = {}) {
  const cancelar = vi.fn()
  let avisar: (m: Mensagem) => void = () => {}
  const repositorio = {
    abrirConversa: vi.fn(),
    buscarConversa: vi.fn().mockResolvedValue(conversa),
    listarConversas: vi.fn(),
    listarMensagens: vi.fn().mockResolvedValue([oi, tem]),
    enviar: vi.fn(),
    observarMensagens: vi.fn((_id: string, callback: (m: Mensagem) => void) => {
      avisar = callback
      return cancelar
    }),
    ...mudar,
  } as ChatRepository
  return { repositorio, cancelar, receber: (m: Mensagem) => act(() => avisar(m)) }
}

function abrir(repositorio: ChatRepository, perfilId: string | null = 'ana') {
  return renderHook(() => useConversaViewModel({ conversaId: 'c1', perfilId, repositorio }))
}

// Desmonta os hooks no fim de cada teste: sem isso, uma atualização pendente do React roda
// depois que o ambiente do jsdom já foi desmontado e quebra com "window is not defined".
afterEach(cleanup)

describe('useConversaViewModel (US18)', () => {
  it('carrega a conversa e as mensagens, marcando quais são de quem está logado', async () => {
    const { repositorio } = repositorioFalso()
    const { result } = abrir(repositorio)

    expect(result.current.carregando).toBe(true)
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.nomeDaOutraPessoa).toBe('Café do Leo')
    expect(result.current.mensagens.map((m) => [m.texto, m.minha])).toEqual([
      ['Oi, tem café?', true],
      ['Tem sim!', false],
    ])
  })

  it('assina as mensagens novas da conversa e cancela ao sair da tela', async () => {
    const { repositorio, cancelar } = repositorioFalso()
    const { result, unmount } = abrir(repositorio)
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(repositorio.observarMensagens).toHaveBeenCalledWith('c1', expect.any(Function))
    unmount()
    expect(cancelar).toHaveBeenCalledTimes(1)
  })

  it('mostra a mensagem que chega pelo Realtime, sem recarregar', async () => {
    const { repositorio, receber } = repositorioFalso()
    const { result } = abrir(repositorio)
    await waitFor(() => expect(result.current.carregando).toBe(false))

    receber(new Mensagem('m3', 'c1', 'leo', 'Quer quantos?', as(3)))

    expect(result.current.mensagens.map((m) => m.texto)).toEqual([
      'Oi, tem café?',
      'Tem sim!',
      'Quer quantos?',
    ])
  })

  it('envia o texto, limpa o campo e não repete a mensagem quando o Realtime a devolve', async () => {
    const enviada = new Mensagem('m3', 'c1', 'ana', 'Dois, por favor', as(3))
    const { repositorio, receber } = repositorioFalso({
      enviar: vi.fn().mockResolvedValue(enviada),
    })
    const { result } = abrir(repositorio)
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => result.current.setTexto('Dois, por favor'))
    await act(() => result.current.enviar())
    receber(enviada)

    expect(repositorio.enviar).toHaveBeenCalledWith('c1', 'Dois, por favor')
    expect(result.current.texto).toBe('')
    expect(result.current.mensagens.filter((m) => m.id === 'm3')).toHaveLength(1)
    expect(result.current.mensagens.at(-1)?.minha).toBe(true)
  })

  it('não envia texto vazio e mostra o motivo (RN23)', async () => {
    const { repositorio } = repositorioFalso()
    const { result } = abrir(repositorio)
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => result.current.setTexto('   '))
    await act(() => result.current.enviar())

    expect(repositorio.enviar).not.toHaveBeenCalled()
    expect(result.current.erroEnvio).toBe('Escreva uma mensagem.')
  })

  it('mantém o texto no campo e mostra o erro quando o envio falha', async () => {
    const { repositorio } = repositorioFalso({
      enviar: vi
        .fn()
        .mockRejectedValue(new Falha('Você não pode conversar aqui.', 'sem-permissao')),
    })
    const { result } = abrir(repositorio)
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => result.current.setTexto('Oi'))
    await act(() => result.current.enviar())

    expect(result.current.texto).toBe('Oi')
    expect(result.current.erroEnvio).toBe('Você não pode conversar aqui.')
    expect(result.current.enviando).toBe(false)
  })

  it('conta quantos caracteres ainda cabem', () => {
    const { repositorio } = repositorioFalso()
    const { result } = abrir(repositorio)

    act(() => result.current.setTexto('a'.repeat(950)))

    expect(result.current.restantes).toBe(50)
  })

  it('avisa quando a conversa não existe ou não é de quem está logado', async () => {
    const { repositorio } = repositorioFalso({ buscarConversa: vi.fn().mockResolvedValue(null) })
    const { result } = abrir(repositorio)

    await waitFor(() => expect(result.current.naoEncontrada).toBe(true))
  })

  it('mostra o erro quando a carga falha', async () => {
    const { repositorio } = repositorioFalso({
      listarMensagens: vi.fn().mockRejectedValue(new Error('rede')),
    })
    const { result } = abrir(repositorio)

    await waitFor(() =>
      expect(result.current.erro).toBe('Não foi possível carregar a conversa. Tente de novo.'),
    )
  })
})
