import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Aviso } from './Aviso'
import { Botao } from './Botao'
import { estiloBotao } from './estiloBotao'
import { iniciais } from './iniciais'
import { CampoFormulario, estiloEntrada } from './CampoFormulario'
import { CartaoItem } from './CartaoItem'
import { Interruptor } from './Interruptor'
import { Selo } from './Selo'
import { TituloTela } from './TituloTela'

afterEach(cleanup)

describe('Botao', () => {
  it('é um botão comum por padrão (não envia formulário sem querer) e chama o clique', () => {
    const aoClicar = vi.fn()
    render(<Botao onClick={aoClicar}>Salvar alterações</Botao>)

    const botao = screen.getByRole('button', { name: 'Salvar alterações' })
    fireEvent.click(botao)

    expect(botao).toHaveAttribute('type', 'button')
    expect(aoClicar).toHaveBeenCalledOnce()
  })

  it('cada variante tem a sua cor', () => {
    expect(estiloBotao('primario')).toContain('bg-marca-600')
    expect(estiloBotao('secundario')).toContain('border-linha')
    expect(estiloBotao('perigo')).toContain('text-perigo')
  })

  it('desabilitado fica apagado e não clica', () => {
    const aoClicar = vi.fn()
    render(
      <Botao disabled onClick={aoClicar} icone="mais">
        Criar perfil
      </Botao>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Criar perfil' }))
    expect(aoClicar).not.toHaveBeenCalled()
  })
})

describe('CampoFormulario', () => {
  it('liga o rótulo ao campo e mostra "(opcional)" e a ajuda', () => {
    render(
      <CampoFormulario id="ref" rotulo="Referência" opcional ajuda="Uma indicação curta.">
        <input id="ref" className={estiloEntrada} />
      </CampoFormulario>,
    )
    expect(screen.getByLabelText('Referência (opcional)')).toBeInTheDocument()
    expect(screen.getByText('Uma indicação curta.')).toBeInTheDocument()
  })

  it('com erro, mostra a mensagem no lugar da ajuda', () => {
    render(
      <CampoFormulario
        id="nome"
        rotulo="Nome do negócio"
        ajuda="Como aparece no mapa."
        erro="Informe um nome."
      >
        <input id="nome" aria-invalid aria-describedby="nome-erro" />
      </CampoFormulario>,
    )
    expect(screen.getByLabelText('Nome do negócio')).toHaveAccessibleDescription('Informe um nome.')
    expect(screen.queryByText('Como aparece no mapa.')).not.toBeInTheDocument()
  })
})

describe('Aviso', () => {
  it('erro é anunciado na hora (alert); os outros, como status', () => {
    render(
      <>
        <Aviso tipo="erro">Não foi possível salvar.</Aviso>
        <Aviso tipo="sucesso">Perfil atualizado.</Aviso>
      </>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar.')
    expect(screen.getByRole('status')).toHaveTextContent('Perfil atualizado.')
  })
})

describe('Interruptor', () => {
  it('é um switch que avisa o novo estado', () => {
    const aoMudar = vi.fn()
    render(<Interruptor ligado={false} aoMudar={aoMudar} rotulo="Item disponível" />)

    const chave = screen.getByRole('switch', { name: 'Item disponível' })
    expect(chave).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(chave)

    expect(aoMudar).toHaveBeenCalledWith(true)
  })

  it('com rótulo visível, o texto aparece ao lado e dá o nome', () => {
    render(<Interruptor ligado aoMudar={vi.fn()} rotulo="Estou no campus" rotuloVisivel />)
    expect(screen.getByRole('switch', { name: 'Estou no campus' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})

describe('CartaoItem e Selo', () => {
  it('mostra o selo, o nome, o vendedor e o preço em reais', () => {
    render(
      <CartaoItem
        nome="Brownie de chocolate"
        preco={5}
        fotoUrl={null}
        vendedor="Doces da Ana"
        selo={<Selo>Disponível agora</Selo>}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Brownie de chocolate' })).toBeInTheDocument()
    expect(screen.getByText('Disponível agora')).toBeInTheDocument()
    expect(screen.getByText('Doces da Ana')).toBeInTheDocument()
    expect(screen.getByText('R$ 5,00')).toBeInTheDocument()
  })

  it('esgotado fica riscado (RN09)', () => {
    render(<CartaoItem nome="Ecobag" preco={25} fotoUrl={null} esgotado />)
    expect(screen.getByRole('heading', { name: 'Ecobag' })).toHaveClass('line-through')
  })
})

describe('TituloTela e iniciais', () => {
  it('o título é o h2 da tela, com a linha de apoio', () => {
    render(<TituloTela titulo="Meus itens" apoio="Seus produtos em um só lugar." />)
    expect(screen.getByRole('heading', { level: 2, name: 'Meus itens' })).toBeInTheDocument()
    expect(screen.getByText('Seus produtos em um só lugar.')).toBeInTheDocument()
  })

  it('iniciais: primeira e última palavra, ou as duas primeiras letras', () => {
    expect(iniciais('Maria Eduarda Gomes')).toBe('MG')
    expect(iniciais('Ana')).toBe('AN')
    expect(iniciais('  ')).toBe('?')
  })
})
