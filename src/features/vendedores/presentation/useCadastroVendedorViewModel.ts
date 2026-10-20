import { useState } from 'react'
import {
  validarCadastroVendedor,
  type DadosCadastroVendedor,
  type ErrosCadastroVendedor,
} from '../domain/validacoesVendedor'

const VAZIO: DadosCadastroVendedor = { nomeExibicao: '', descricao: '', whatsapp: '', telefone: '' }

/**
 * ViewModel da tela "Quero vender" (US03): guarda os campos e os erros de validação.
 * Salvar o perfil com o repositório fica na #61.
 */
export function useCadastroVendedorViewModel() {
  const [dados, setDados] = useState<DadosCadastroVendedor>(VAZIO)
  const [erros, setErros] = useState<ErrosCadastroVendedor>({})

  function alterar(campo: keyof DadosCadastroVendedor, valor: string) {
    setDados((atual) => ({ ...atual, [campo]: valor }))
  }

  /** Valida os campos, mostra os erros e devolve true se o formulário pode ser salvo. */
  function validar(): boolean {
    const novosErros = validarCadastroVendedor(dados)
    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  return { dados, erros, alterar, validar }
}
