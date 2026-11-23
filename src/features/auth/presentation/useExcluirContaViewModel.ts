import { useRef, useState } from 'react'
import { Falha } from '../../../core/falha'
import { SupabaseAuthRepository } from '../data/SupabaseAuthRepository'
import type { AuthRepository } from '../domain/AuthRepository'

interface Opcoes {
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: AuthRepository
}

/**
 * ViewModel do "Excluir minha conta" (US17): controla a confirmação e a exclusão.
 * A tela só mostra o botão de confirmar depois que a pessoa pede para excluir.
 */
export function useExcluirContaViewModel({ repositorio }: Opcoes = {}) {
  const [confirmando, setConfirmando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // O estado `excluindo` só muda no próximo render; a ref barra o segundo toque que chega antes disso.
  const emAndamento = useRef(false)

  function pedir() {
    setErro(null)
    setConfirmando(true)
  }

  function cancelar() {
    if (emAndamento.current) return
    setConfirmando(false)
  }

  /** Exclui a conta. Devolve true se excluiu; senão, o motivo fica em `erro` e a conta continua. */
  async function excluir(): Promise<boolean> {
    if (emAndamento.current) return false
    emAndamento.current = true
    setErro(null)
    setExcluindo(true)
    try {
      await (repositorio ?? new SupabaseAuthRepository()).excluirConta()
      return true
    } catch (e) {
      setErro(e instanceof Falha ? e.mensagem : 'Não foi possível excluir a conta. Tente de novo.')
      return false
    } finally {
      emAndamento.current = false
      setExcluindo(false)
    }
  }

  return { confirmando, excluindo, erro, pedir, cancelar, excluir }
}
