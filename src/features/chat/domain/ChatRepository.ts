import type { Unsubscribe } from '../../presenca/domain/PresencaRepository'
import type { Conversa } from './Conversa'
import type { Mensagem } from './Mensagem'

/**
 * Padrão Repository: as telas do chat dependem desta interface, não do Supabase (US18).
 * `observarMensagens` é o sujeito do padrão Observer, como o `observarAtivos` do mapa.
 * Todos os métodos usam a conta logada; as regras de quem lê e escreve ficam no servidor (RN22, RN23).
 */
export interface ChatRepository {
  /**
   * Abre a conversa do consumidor logado com o vendedor, ou devolve a que já existe (uma por par, RN22).
   * Lança `Falha` se não conseguir, inclusive quando o vendedor é o próprio usuário.
   */
  abrirConversa(vendedorId: string): Promise<Conversa>

  /**
   * Busca uma conversa pelo id, com o nome dos dois lados, para o topo da tela da conversa.
   * É `null` se ela não existe ou se quem está logado não participa dela (a RLS esconde, RN23).
   */
  buscarConversa(conversaId: string): Promise<Conversa | null>

  /** Lista as conversas de quem está logado, como consumidor e como vendedor, as mais recentes primeiro. */
  listarConversas(): Promise<Conversa[]>

  /** Lista as mensagens da conversa, da mais antiga para a mais nova. Lança `Falha` se não conseguir. */
  listarMensagens(conversaId: string): Promise<Mensagem[]>

  /**
   * Envia uma mensagem de texto em nome de quem está logado. Valida o texto antes (RN23) e devolve
   * a mensagem gravada, com a hora do servidor. Lança `Falha` se o texto for inválido ou o envio falhar.
   */
  enviar(conversaId: string, texto: string): Promise<Mensagem>

  /**
   * Observer: chama `aoReceber` a cada mensagem nova da conversa, inclusive as de quem está logado.
   * Devolve a função que cancela a inscrição; quem se inscreve deve chamá-la ao sair da tela.
   */
  observarMensagens(conversaId: string, aoReceber: (mensagem: Mensagem) => void): Unsubscribe
}
