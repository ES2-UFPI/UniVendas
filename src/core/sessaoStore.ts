import { create } from 'zustand'
import type { AuthRepository } from '../features/auth/domain/AuthRepository'
import type { Usuario } from '../features/auth/domain/Usuario'

interface SessaoState {
  /** Quem está logado agora, ou null. */
  usuario: Usuario | null
  /** True até a primeira resposta do Supabase. Enquanto isso, ainda não se sabe se há sessão. */
  carregando: boolean
  definirUsuario: (usuario: Usuario | null) => void
}

/**
 * Sessão do usuário, compartilhada por todas as telas (Zustand).
 * Quem atualiza é o `iniciarSessao`; as telas só leem, por exemplo
 * `const usuario = useSessaoStore((s) => s.usuario)`.
 */
export const useSessaoStore = create<SessaoState>()((set) => ({
  usuario: null,
  carregando: true,
  definirUsuario: (usuario) => set({ usuario, carregando: false }),
}))

/**
 * Padrão Observer: inscreve a store no `aoMudarUsuario` do repositório. Assim ela muda sozinha
 * quando alguém entra, sai, ou quando o app é reaberto com uma sessão salva (o Supabase guarda a
 * sessão no navegador e avisa logo na inscrição). Chamado uma vez, ao abrir o app.
 * Devolve a função que cancela a inscrição.
 */
export function iniciarSessao(repositorio: AuthRepository): () => void {
  return repositorio.aoMudarUsuario((usuario) => useSessaoStore.getState().definirUsuario(usuario))
}
