import type { LatLng } from '../../../core/localizacaoService'

/** Como terminou o pedido para ficar ativo no mapa. */
export const ResultadoRegistro = {
  ATIVO: 'ativo',
  FORA_DO_CAMPUS: 'fora-do-campus',
} as const

export type ResultadoRegistro = (typeof ResultadoRegistro)[keyof typeof ResultadoRegistro]

/**
 * Padrão Repository: o resto do app depende desta interface, não do Supabase.
 * Desativar, listar os ativos e observar as mudanças entram nas tarefas da US04 e da US06.
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
}
