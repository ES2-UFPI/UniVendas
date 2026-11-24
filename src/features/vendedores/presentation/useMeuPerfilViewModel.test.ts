import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import { Contato } from '../domain/Contato'
import { PerfilVendedor } from '../domain/PerfilVendedor'
import { VendedorAmbulante } from '../domain/Vendedor'
import type { VendedorRepository } from '../domain/VendedorRepository'
import { useMeuPerfilViewModel } from './useMeuPerfilViewModel'

afterEach(cleanup)

const ana = new VendedorAmbulante('v1', 'u1', 'Brownies da Ana', 'Brownie e café')
const contatos = [new Contato('whatsapp', '5586999998888'), new Contato('telefone', '558632151234')]
const foto = new Blob(['jpeg'], { type: 'image/jpeg' })

function falsos({
  doUsuario = vi.fn().mockResolvedValue(ana),
  buscarPerfil = vi.fn().mockResolvedValue(new PerfilVendedor(ana, contatos, [], false)),
  atualizarPerfil = vi.fn((vendedor: VendedorAmbulante) => Promise.resolve(vendedor)),
  comprimir = vi.fn().mockResolvedValue(foto),
} = {}) {
  return {
    repositorio: {
      buscarDoUsuario: doUsuario,
      buscarPerfil,
      atualizarPerfil,
    } as unknown as VendedorRepository,
    comprimir,
    doUsuario,
    buscarPerfil,
    atualizarPerfil,
  }
}

async function aberto(f = falsos()) {
  const hook = renderHook(() => useMeuPerfilViewModel({ perfilId: 'u1', ...f }))
  await waitFor(() => expect(hook.result.current.carregando).toBe(false))
  return { ...hook, f }
}

describe('useMeuPerfilViewModel: carregar', () => {
  it('sem conta logada, não busca nada', () => {
    const f = falsos()
    renderHook(() => useMeuPerfilViewModel({ ...f }))
    expect(f.doUsuario).not.toHaveBeenCalled()
  })

  it('preenche o formulário com o perfil e os contatos da conta', async () => {
    const { result, f } = await aberto()

    expect(f.doUsuario).toHaveBeenCalledWith('u1')
    expect(f.buscarPerfil).toHaveBeenCalledWith('v1')
    expect(result.current.dados).toEqual({
      nomeExibicao: 'Brownies da Ana',
      descricao: 'Brownie e café',
      whatsapp: '(86) 99999-8888',
      telefone: '(86) 3215-1234',
    })
    expect(result.current.semPerfil).toBe(false)
  })

  it('deixa em branco o canal que o vendedor não cadastrou', async () => {
    const soTelefone = new PerfilVendedor(ana, [contatos[1]], [], false)
    const { result } = await aberto(falsos({ buscarPerfil: vi.fn().mockResolvedValue(soTelefone) }))

    expect(result.current.dados.whatsapp).toBe('')
    expect(result.current.dados.telefone).toBe('(86) 3215-1234')
  })

  it('avisa quando a conta ainda não tem perfil de vendedor', async () => {
    const { result, f } = await aberto(falsos({ doUsuario: vi.fn().mockResolvedValue(null) }))

    expect(result.current.semPerfil).toBe(true)
    expect(f.buscarPerfil).not.toHaveBeenCalled()
  })

  it('mostra o erro do repositório', async () => {
    const falha = new Falha('Não foi possível carregar seu perfil de vendedor.', '500')
    const { result } = await aberto(falsos({ doUsuario: vi.fn().mockRejectedValue(falha) }))

    expect(result.current.erroCarga).toBe('Não foi possível carregar seu perfil de vendedor.')
  })
})

describe('useMeuPerfilViewModel: salvar', () => {
  it('manda o perfil editado, com o id do vendedor e os telefones no formato 55 + DDD', async () => {
    const { result, f } = await aberto()
    act(() => result.current.alterar('nomeExibicao', '  Doces da Ana '))
    act(() => result.current.alterar('whatsapp', '(86) 98888-7777'))

    let deuCerto = false
    await act(async () => {
      deuCerto = await result.current.salvar()
    })

    expect(deuCerto).toBe(true)
    const [vendedor, enviados, fotoEnviada] = f.atualizarPerfil.mock.calls[0] as unknown as [
      VendedorAmbulante,
      Contato[],
      Blob | undefined,
    ]
    expect(vendedor.id).toBe('v1')
    expect(vendedor.perfilId).toBe('u1')
    expect(vendedor.nomeExibicao).toBe('Doces da Ana')
    expect(enviados).toEqual([
      { canal: 'whatsapp', valor: '5586988887777', visivel: true },
      { canal: 'telefone', valor: '558632151234', visivel: true },
    ])
    expect(fotoEnviada).toBeUndefined()
    expect(result.current.salvo).toBe(true)
    expect(result.current.erroGeral).toBeNull()
  })

  it('tirar o texto de um canal apaga esse contato', async () => {
    const { result, f } = await aberto()
    act(() => result.current.alterar('telefone', ''))

    await act(() => result.current.salvar())

    const [, enviados] = f.atualizarPerfil.mock.calls[0] as unknown as [unknown, Contato[]]
    expect(enviados.map((c) => c.canal)).toEqual(['whatsapp'])
  })

  it('mostra os erros de nome e contato e não salva (RN06)', async () => {
    const { result, f } = await aberto()
    act(() => result.current.alterar('nomeExibicao', ''))
    act(() => result.current.alterar('whatsapp', ''))
    act(() => result.current.alterar('telefone', ''))

    let deuCerto = true
    await act(async () => {
      deuCerto = await result.current.salvar()
    })

    expect(deuCerto).toBe(false)
    expect(result.current.erros.nomeExibicao).toBeDefined()
    expect(result.current.erros.contato).toBeDefined()
    expect(f.atualizarPerfil).not.toHaveBeenCalled()
  })

  it('recusa telefone sem DDD (RN21)', async () => {
    const { result, f } = await aberto()
    act(() => result.current.alterar('whatsapp', '99999-8888'))

    await act(() => result.current.salvar())

    expect(result.current.erros.whatsapp).toBeDefined()
    expect(f.atualizarPerfil).not.toHaveBeenCalled()
  })

  it('mostra o erro do repositório e não marca como salvo', async () => {
    const falha = new Falha('Este perfil não existe ou não é seu.', 'perfil-nao-encontrado')
    const { result } = await aberto(falsos({ atualizarPerfil: vi.fn().mockRejectedValue(falha) }))

    let deuCerto = true
    await act(async () => {
      deuCerto = await result.current.salvar()
    })

    expect(deuCerto).toBe(false)
    expect(result.current.erroGeral).toBe('Este perfil não existe ou não é seu.')
    expect(result.current.salvo).toBe(false)
  })

  it('mostra uma mensagem genérica para erros inesperados', async () => {
    const { result } = await aberto(
      falsos({ atualizarPerfil: vi.fn().mockRejectedValue(new Error('rede caiu')) }),
    )

    await act(() => result.current.salvar())

    expect(result.current.erroGeral).toBe('Não foi possível salvar o perfil. Tente de novo.')
  })

  it('tirar o aviso de salvo quando a pessoa volta a editar', async () => {
    const { result } = await aberto()
    await act(() => result.current.salvar())
    expect(result.current.salvo).toBe(true)

    act(() => result.current.alterar('descricao', 'Outra descrição'))

    expect(result.current.salvo).toBe(false)
  })
})

describe('useMeuPerfilViewModel: foto', () => {
  it('mostra a foto atual do perfil enquanto não há foto nova', async () => {
    const comFoto = new VendedorAmbulante('v1', 'u1', 'Ana', '', 'https://exemplo.com/ana.jpg')
    const { result } = await aberto(falsos({ doUsuario: vi.fn().mockResolvedValue(comFoto) }))

    expect(result.current.previaFoto).toBe('https://exemplo.com/ana.jpg')
    expect(result.current.temFoto).toBe(true)
  })

  it('comprime a foto escolhida (RN10) e a envia ao salvar', async () => {
    const { result, f } = await aberto()
    const original = new Blob(['grande'], { type: 'image/png' })

    await act(() => result.current.escolherFoto(original))
    await act(() => result.current.salvar())

    expect(f.comprimir).toHaveBeenCalledWith(original)
    const [, , fotoEnviada] = f.atualizarPerfil.mock.calls[0] as unknown as [
      unknown,
      unknown,
      Blob | undefined,
    ]
    expect(fotoEnviada).toBe(foto)
  })

  it('mostra o erro quando a foto não pode ser usada e não a envia', async () => {
    const comprimir = vi.fn().mockRejectedValue(new Falha('A foto é grande demais.', 'foto'))
    const { result, f } = await aberto(falsos({ comprimir }))

    await act(() => result.current.escolherFoto(new Blob(['x'])))
    await act(() => result.current.salvar())

    expect(result.current.erroFoto).toBe('A foto é grande demais.')
    const [, , fotoEnviada] = f.atualizarPerfil.mock.calls[0] as unknown as [
      unknown,
      unknown,
      Blob | undefined,
    ]
    expect(fotoEnviada).toBeUndefined()
  })

  it('depois de salvar, a foto nova não é enviada de novo', async () => {
    const { result, f } = await aberto()
    await act(() => result.current.escolherFoto(new Blob(['x'], { type: 'image/png' })))
    await act(() => result.current.salvar())

    await act(() => result.current.salvar())

    const [, , segunda] = f.atualizarPerfil.mock.calls[1] as unknown as [
      unknown,
      unknown,
      Blob | undefined,
    ]
    expect(segunda).toBeUndefined()
  })
})

describe('useMeuPerfilViewModel: ocultar números (US19)', () => {
  it('começa com o que está salvo: o telefone oculto aparece desligado', async () => {
    const telefoneOculto = new Contato('telefone', '558632151234', false)
    const perfil = new PerfilVendedor(ana, [contatos[0], telefoneOculto], [], false)
    const { result } = await aberto(falsos({ buscarPerfil: vi.fn().mockResolvedValue(perfil) }))

    expect(result.current.visiveis).toEqual({ whatsapp: true, telefone: false })
    expect(result.current.todosOcultos).toBe(false)
  })

  it('manda o número oculto junto, marcado como oculto (o contato continua salvo, RN06)', async () => {
    const { result, f } = await aberto()
    act(() => result.current.mostrarContato('telefone', false))

    await act(() => result.current.salvar())

    const [, enviados] = f.atualizarPerfil.mock.calls[0] as unknown as [unknown, Contato[]]
    expect(enviados).toEqual([
      new Contato('whatsapp', '5586999998888', true),
      new Contato('telefone', '558632151234', false),
    ])
  })

  it('avisa quando todos os números ficam ocultos', async () => {
    const { result } = await aberto()

    act(() => result.current.mostrarContato('whatsapp', false))
    expect(result.current.todosOcultos).toBe(false)

    act(() => result.current.mostrarContato('telefone', false))
    expect(result.current.todosOcultos).toBe(true)
  })

  it('canal em branco não conta como visível', async () => {
    const { result } = await aberto()
    act(() => result.current.alterar('telefone', ''))

    act(() => result.current.mostrarContato('whatsapp', false))

    expect(result.current.todosOcultos).toBe(true)
  })
})
