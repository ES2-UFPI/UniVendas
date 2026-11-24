/** "2 vendedores no campus agora", com o número de verdade (US21). */
export function contagemNoCampus(quantos: number): string {
  if (quantos === 0) return 'Nenhum vendedor no campus agora'
  if (quantos === 1) return '1 vendedor no campus agora'
  return `${quantos} vendedores no campus agora`
}
