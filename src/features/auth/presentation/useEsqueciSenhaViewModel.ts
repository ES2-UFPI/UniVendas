import { useState } from 'react'
import { Falha } from '../../../core/falha'
import { SupabaseAuthRepository } from '../data/SupabaseAuthRepository'
import type { AuthRepository } from '../domain/AuthRepository'
import { validarEsqueciSenha, type ErrosCadastro } from '../domain/validadorCredenciais'

interface Opcoes {
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: AuthRepository
}

/**
 * ViewModel da tela "Esqueci a senha" (US15): valida o e-mail e pede o link de recuperação.
 * Depois de enviar, a tela mostra o mesmo aviso com ou sem conta, para não revelar quem tem conta.
 */
export function useEsqueciSenhaViewModel({ repositorio }: Opcoes = {}) {
  const [email, setEmail] = useState('')
  const [erros, setErros] = useState<ErrosCadastro>({})
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

  /** Valida o e-mail e pede o link. Devolve true se o pedido foi enviado; o motivo da falha fica em `erro`. */
  async function enviar(): Promise<boolean> {
    setErro(null)
    const novosErros = validarEsqueciSenha({ email })
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0 || carregando) return false

    setCarregando(true)
    try {
      await (repositorio ?? new SupabaseAuthRepository()).enviarLinkDeRecuperacao(email)
      setEnviado(true)
      return true
    } catch (e) {
      setErro(e instanceof Falha ? e.mensagem : 'Não foi possível enviar o e-mail. Tente de novo.')
      return false
    } finally {
      setCarregando(false)
    }
  }

  return { email, alterarEmail: setEmail, erros, carregando, erro, enviado, enviar }
}
