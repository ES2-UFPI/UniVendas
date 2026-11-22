import { useState } from 'react'
import { Falha } from '../../../core/falha'
import { SupabaseAuthRepository } from '../data/SupabaseAuthRepository'
import type { AuthRepository } from '../domain/AuthRepository'
import { validarNovaSenha, type ErrosNovaSenha } from '../domain/validadorCredenciais'

interface Opcoes {
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: AuthRepository
}

/**
 * ViewModel da tela "Nova senha" (US15): guarda a senha e a confirmação, valida e troca a senha
 * de quem abriu o link de recuperação.
 */
export function useNovaSenhaViewModel({ repositorio }: Opcoes = {}) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erros, setErros] = useState<ErrosNovaSenha>({})
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  /** Valida os campos e troca a senha. Devolve true se trocou; o motivo da falha fica em `erro`. */
  async function salvar(): Promise<boolean> {
    setErro(null)
    const novosErros = validarNovaSenha({ senha, confirmacao })
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0 || carregando) return false

    setCarregando(true)
    try {
      await (repositorio ?? new SupabaseAuthRepository()).definirNovaSenha(senha)
      return true
    } catch (e) {
      setErro(e instanceof Falha ? e.mensagem : 'Não foi possível trocar a senha. Tente de novo.')
      return false
    } finally {
      setCarregando(false)
    }
  }

  return {
    senha,
    alterarSenha: setSenha,
    confirmacao,
    alterarConfirmacao: setConfirmacao,
    erros,
    carregando,
    erro,
    salvar,
  }
}
