/**
 * Diz há quanto tempo foi o último sinal do vendedor, para a lista de quem está no campus (US13).
 * Menos de 1 minuto é "agora"; depois, "há N min". Um relógio adiantado não vira tempo negativo.
 */
export function tempoDesdeSinal(ultimoSinalEm: Date, agora: Date): string {
  const minutos = Math.floor((agora.getTime() - ultimoSinalEm.getTime()) / 60_000)
  if (minutos < 1) return 'agora'
  return `há ${minutos} min`
}
