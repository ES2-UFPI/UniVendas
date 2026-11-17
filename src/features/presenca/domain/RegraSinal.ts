import type { LatLng } from '../../../core/localizacaoService'

/** Tempo máximo entre dois sinais, mesmo com o vendedor parado (RN13). */
export const INTERVALO_SINAL_MS = 2 * 60 * 1000

/** Deslocamento que, sozinho, já pede um sinal novo (RN13). */
export const LIMITE_DESLOCAMENTO_M = 25

const RAIO_DA_TERRA_M = 6_371_000

/** Último sinal enviado: onde o vendedor estava e quando. */
export interface UltimoSinal {
  posicao: LatLng
  em: Date
}

/** Distância em metros entre dois pontos (fórmula de Haversine). */
export function distanciaEmMetros(a: LatLng, b: LatLng): number {
  const rad = (graus: number) => (graus * Math.PI) / 180
  const dLat = rad(b.latitude - a.latitude)
  const dLng = rad(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * RAIO_DA_TERRA_M * Math.asin(Math.sqrt(h))
}

/**
 * Regra de decisão do sinal (RN13): envia quando passaram 2 minutos desde o último
 * ou quando o vendedor se moveu mais de 25 m. Sem sinal anterior, envia.
 */
export function deveEnviarSinal(
  ultimo: UltimoSinal | null,
  posicaoAtual: LatLng,
  agora: Date,
): boolean {
  if (!ultimo) return true
  if (agora.getTime() - ultimo.em.getTime() >= INTERVALO_SINAL_MS) return true
  return distanciaEmMetros(ultimo.posicao, posicaoAtual) > LIMITE_DESLOCAMENTO_M
}
