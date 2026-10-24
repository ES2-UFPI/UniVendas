import { useState } from 'react'
import { Falha } from '../../../core/falha'
import { SupabaseAuthRepository } from '../data/SupabaseAuthRepository'
import type { AuthRepository } from '../domain/AuthRepository'
import type { Usuario } from '../domain/Usuario'
import {
  validarCadastro,
  validarLogin,
  type DadosCadastro,
  type ErrosCadastro,
} from '../domain/validadorCredenciais'

const VAZIO: DadosCadastro = { nome: '', email: '', senha: '' }

interface Opcoes {
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: AuthRepository
}

/**
 * ViewModel da autenticação: guarda os campos, os erros de cada campo e o erro geral,
 * e usa o `AuthRepository` para criar a conta (US01), entrar e sair (US02).
 */
export function useAuthViewModel({ repositorio }: Opcoes = {}) {
  const [dados, setDados] = useState<DadosCadastro>(VAZIO)
  const [erros, setErros] = useState<ErrosCadastro>({})
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  function alterar(campo: keyof DadosCadastro, valor: string) {
    setDados((atual) => ({ ...atual, [campo]: valor }))
  }

  /** Valida os campos, mostra os erros e devolve true se o formulário pode ser enviado. */
  function validar(): boolean {
    const novosErros = validarCadastro(dados)
    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  /**
   * Cria a conta. Com o "Confirm email" desligado, ela já volta logada (RN01).
   * Devolve o usuário criado, ou null se algo falhou (os erros ficam no estado).
   */
  async function cadastrar(): Promise<Usuario | null> {
    setErro(null)
    if (!validar() || carregando) return null

    setCarregando(true)
    try {
      const repo = repositorio ?? new SupabaseAuthRepository()
      const criado = await repo.cadastrar(dados.nome, dados.email, dados.senha)
      setUsuario(criado)
      return criado
    } catch (e) {
      setErro(e instanceof Falha ? e.mensagem : 'Não foi possível criar a conta. Tente de novo.')
      return null
    } finally {
      setCarregando(false)
    }
  }

  /**
   * Entra com e-mail e senha. Com senha errada, mostra a mensagem do repositório (RN04).
   * Devolve o usuário logado, ou null se algo falhou (os erros ficam no estado).
   */
  async function entrar(): Promise<Usuario | null> {
    setErro(null)
    const novosErros = validarLogin(dados)
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0 || carregando) return null

    setCarregando(true)
    try {
      const repo = repositorio ?? new SupabaseAuthRepository()
      const logado = await repo.entrar(dados.email, dados.senha)
      setUsuario(logado)
      return logado
    } catch (e) {
      setErro(e instanceof Falha ? e.mensagem : 'Não foi possível entrar. Tente de novo.')
      return null
    } finally {
      setCarregando(false)
    }
  }

  /** Sai da conta. Devolve true se saiu; se falhar, a mensagem fica em `erro`. */
  async function sair(): Promise<boolean> {
    setErro(null)
    setCarregando(true)
    try {
      const repo = repositorio ?? new SupabaseAuthRepository()
      await repo.sair()
      setUsuario(null)
      setDados(VAZIO)
      return true
    } catch (e) {
      setErro(e instanceof Falha ? e.mensagem : 'Não foi possível sair. Tente de novo.')
      return false
    } finally {
      setCarregando(false)
    }
  }

  return { dados, erros, alterar, validar, carregando, erro, usuario, cadastrar, entrar, sair }
}
