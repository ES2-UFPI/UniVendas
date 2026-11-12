import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Falha } from '../../../core/falha'
import { Item } from '../../itens/domain/Item'
import { Contato } from '../domain/Contato'
import { PerfilVendedor } from '../domain/PerfilVendedor'
import { VendedorAmbulante } from '../domain/Vendedor'
import type { VendedorRepository } from '../domain/VendedorRepository'
import { PerfilVendedorPage } from './PerfilVendedorPage'

afterEach(cleanup)

const ana = new VendedorAmbulante('v1', 'u1', 'Brownies da Ana', 'Brownie caseiro')

function perfil(ativoAgora: boolean, contatos = [new Contato('whatsapp', '5586999990000')]) {
  return new PerfilVendedor(
    ana,
    contatos,
    [new Item('i1', 'v1', 7, 'Brownie', 6.5), new Item('i2', 'v1', 7, 'Café', 3)],
    ativoAgora,
  )
}

function repositorio(buscarPerfil: VendedorRepository['buscarPerfil']) {
  return { criar: vi.fn(), buscarPerfil: vi.fn(buscarPerfil) } as VendedorRepository
}

describe('PerfilVendedorPage (US10)', () => {
  it('mostra nome, descrição, contatos e itens com o preço', async () => {
    const repo = repositorio(() => Promise.resolve(perfil(true)))
    render(<PerfilVendedorPage id="v1" repositorio={repo} />)

    expect(await screen.findByRole('heading', { name: 'Brownies da Ana' })).toBeInTheDocument()
    expect(repo.buscarPerfil).toHaveBeenCalledWith('v1')
    expect(screen.getByText('Brownie caseiro')).toBeInTheDocument()
    expect(screen.getByText('No campus agora')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/5586999990000?text=' + encodeURIComponent('Oi! Vi seu anúncio no UniVendas'),
    )
    expect(screen.getByText('Brownie')).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*6,50/)).toBeInTheDocument()
  })

  it('mostra "Fora do campus agora" quando o vendedor está desligado (RN19)', async () => {
    render(
      <PerfilVendedorPage
        id="v1"
        repositorio={repositorio(() => Promise.resolve(perfil(false)))}
      />,
    )

    expect(await screen.findByText('Fora do campus agora')).toBeInTheDocument()
    expect(screen.queryByText('No campus agora')).not.toBeInTheDocument()
  })

  it('não mostra o botão do contato que o vendedor não cadastrou', async () => {
    const soTelefone = perfil(true, [new Contato('telefone', '5586988880000')])
    render(
      <PerfilVendedorPage id="v1" repositorio={repositorio(() => Promise.resolve(soTelefone))} />,
    )

    expect(await screen.findByRole('link', { name: 'Ligar' })).toHaveAttribute(
      'href',
      'tel:+5586988880000',
    )
    expect(screen.queryByRole('link', { name: 'WhatsApp' })).not.toBeInTheDocument()
  })

  it('avisa quando o vendedor não existe', async () => {
    render(<PerfilVendedorPage id="x" repositorio={repositorio(() => Promise.resolve(null))} />)
    expect(await screen.findByText('Este vendedor não existe mais.')).toBeInTheDocument()
  })

  it('mostra o erro do repositório', async () => {
    const falha = new Falha('Não foi possível carregar o perfil. Tente de novo.', '500')
    render(<PerfilVendedorPage id="v1" repositorio={repositorio(() => Promise.reject(falha))} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o perfil')
  })
})
