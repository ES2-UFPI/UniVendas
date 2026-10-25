import type { LatLng } from '../../../core/localizacaoService'
import type { Presenca } from './Presenca'

/** Como terminou o pedido para ficar ativo no mapa. */
export const ResultadoRegistro = {
  ATIVO: 'ativo',
  FORA_DO_CAMPUS: 'fora-do-campus',
} as const

export type ResultadoRegistro = (typeof ResultadoRegistro)[keyof typeof ResultadoRegistro]

/** Função que cancela uma inscrição quando é chamada (padrão Observer). */
export type Unsubscribe = () => void

/**
 * Padrão Repository: o resto do app depende desta interface, não do Supabase.
 * `observarAtivos` é o sujeito do padrão Observer: quem se inscreve recebe a lista nova a cada mudança.
 * Desativar a presença entra numa tarefa futura.
 */
export interface PresencaRepository {
  /**
   * Liga a presença do vendedor logado, ou renova o sinal se ele já estiver ativo (RN13).
   * `real` é a posição do celular e só serve para o servidor conferir o perímetro do campus (RN15);
   * `ponto` é o ponto fixo escolhido no mapa (RN14), ou `null` para mostrar a posição real.
   * `referencia` é opcional, com até 80 caracteres (RN18); texto vazio é o mesmo que não ter.
   * Devolve `FORA_DO_CAMPUS` (e o servidor apaga a presença) se a posição real estiver fora do campus.
   * Lança `Falha` se não conseguir, inclusive quando o ponto escolhido está fora do campus.
   */
  registrar(real: LatLng, ponto: LatLng | null, referencia: string): Promise<ResultadoRegistro>

  /** Lista os vendedores ativos agora (com sinal há menos de 30 minutos). Lança `Falha` se não conseguir. */
  listarAtivos(): Promise<Presenca[]>

  /**
   * Observer: chama `callback` com a lista completa de ativos toda vez que alguém liga, renova
   * ou desliga a presença. Devolve a função que cancela a inscrição; quem se inscreve deve chamá-la
   * ao sair da tela. Se uma atualização falhar, a lista anterior continua valendo até o próximo evento.
   */
  observarAtivos(callback: (ativos: Presenca[]) => void): Unsubscribe
}
