import { useEffect, useState } from 'react'
import { comprimirImagem } from '../../../core/comprimirImagem'
import { Falha } from '../../../core/falha'
import { SupabaseVendedorRepository } from '../data/SupabaseVendedorRepository'
import type { Vendedor } from '../domain/Vendedor'
import { VendedorFactory } from '../domain/VendedorFactory'
import type { VendedorRepository } from '../domain/VendedorRepository'
import {
  validarCadastroVendedor,
  type DadosCadastroVendedor,
  type ErrosCadastroVendedor,
} from '../domain/validacoesVendedor'

const VAZIO: DadosCadastroVendedor = { nomeExibicao: '', descricao: '', whatsapp: '', telefone: '' }

interface Opcoes {
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: VendedorRepository
  /** Nos testes, uma compressão falsa (o jsdom não tem canvas); no app, a do `core`. */
  comprimir?: (foto: Blob) => Promise<Blob>
}

function mensagemDe(erro: unknown, padrao: string): string {
  return erro instanceof Falha ? erro.mensagem : padrao
}

/**
 * ViewModel da tela "Quero vender" (US03): guarda os campos, a foto já comprimida,
 * os erros e salva o perfil com o `VendedorRepository`.
 */
export function useCadastroVendedorViewModel({
  repositorio,
  comprimir = comprimirImagem,
}: Opcoes = {}) {
  const [dados, setDados] = useState<DadosCadastroVendedor>(VAZIO)
  const [erros, setErros] = useState<ErrosCadastroVendedor>({})
  const [foto, setFoto] = useState<Blob | null>(null)
  const [previaFoto, setPreviaFoto] = useState<string | null>(null)
  const [erroFoto, setErroFoto] = useState<string | null>(null)
  const [preparandoFoto, setPreparandoFoto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [vendedorSalvo, setVendedorSalvo] = useState<Vendedor | null>(null)

  // Libera a prévia anterior da memória quando a foto muda ou a tela fecha.
  useEffect(() => {
    return () => {
      if (previaFoto) URL.revokeObjectURL(previaFoto)
    }
  }, [previaFoto])

  function alterar(campo: keyof DadosCadastroVendedor, valor: string) {
    setDados((atual) => ({ ...atual, [campo]: valor }))
  }

  /** Valida os campos, mostra os erros e devolve true se o formulário pode ser salvo. */
  function validar(): boolean {
    const novosErros = validarCadastroVendedor(dados)
    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  /** Comprime a foto escolhida no celular (RN10). `null` tira a foto (ela é opcional, RN06). */
  async function escolherFoto(arquivo: Blob | null) {
    setErroFoto(null)
    if (!arquivo) {
      setFoto(null)
      setPreviaFoto(null)
      return
    }
    setPreparandoFoto(true)
    try {
      const comprimida = await comprimir(arquivo)
      setFoto(comprimida)
      setPreviaFoto(
        typeof URL.createObjectURL === 'function' ? URL.createObjectURL(comprimida) : null,
      )
    } catch (erro) {
      setFoto(null)
      setPreviaFoto(null)
      setErroFoto(mensagemDe(erro, 'Não foi possível usar esta foto. Tente outra.'))
    } finally {
      setPreparandoFoto(false)
    }
  }

  /** Salva o perfil de vendedor da conta `perfilId`. Devolve true se deu certo. */
  async function salvar(perfilId: string): Promise<boolean> {
    setErroGeral(null)
    if (!validar() || preparandoFoto) return false

    setSalvando(true)
    try {
      const { vendedor, contatos } = VendedorFactory.doFormulario(perfilId, dados)
      const repo = repositorio ?? new SupabaseVendedorRepository()
      setVendedorSalvo(await repo.criar(vendedor, contatos, foto ?? undefined))
      return true
    } catch (erro) {
      setErroGeral(mensagemDe(erro, 'Não foi possível salvar o perfil. Tente de novo.'))
      return false
    } finally {
      setSalvando(false)
    }
  }

  return {
    dados,
    erros,
    alterar,
    validar,
    foto,
    previaFoto,
    erroFoto,
    preparandoFoto,
    escolherFoto,
    salvando,
    erroGeral,
    vendedorSalvo,
    salvar,
  }
}
