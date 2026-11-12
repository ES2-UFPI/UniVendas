/** Endereços das telas. Use sempre estas constantes, nunca o texto solto, para os links não quebrarem. */
export const ROTAS = {
  mapa: '/',
  login: '/login',
  cadastro: '/cadastro',
  queroVender: '/quero-vender',
  painel: '/painel',
  perfilVendedor: '/vendedor/:id',
} as const

/** Endereço do perfil de um vendedor, ex.: `/vendedor/123` (US10). */
export function rotaPerfilVendedor(id: string): string {
  return ROTAS.perfilVendedor.replace(':id', encodeURIComponent(id))
}
