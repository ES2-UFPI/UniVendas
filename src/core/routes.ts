/** Endereços das telas. Use sempre estas constantes, nunca o texto solto, para os links não quebrarem. */
export const ROTAS = {
  mapa: '/',
  login: '/login',
  cadastro: '/cadastro',
  esqueciSenha: '/esqueci-senha',
  novaSenha: '/nova-senha',
  queroVender: '/quero-vender',
  painel: '/painel',
  perfilVendedor: '/vendedor/:id',
  meusItens: '/meus-itens',
  conversas: '/conversas',
  conversa: '/conversa/:id',
} as const

/** Endereço do perfil de um vendedor, ex.: `/vendedor/123` (US10). */
export function rotaPerfilVendedor(id: string): string {
  return ROTAS.perfilVendedor.replace(':id', encodeURIComponent(id))
}

/** Endereço da tela de uma conversa do chat, ex.: `/conversa/123` (US18). */
export function rotaConversa(id: string): string {
  return ROTAS.conversa.replace(':id', encodeURIComponent(id))
}
