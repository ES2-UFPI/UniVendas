/** Os dois jeitos de usar o app (US20): comprando ou vendendo. */
export type Modo = 'consumidor' | 'vendedor'

const PREFIXO = 'univendas:modo:'

/** Lê o modo guardado no aparelho para esta conta, ou null se nunca escolheu (ou se não dá para ler). */
export function lerModo(usuarioId: string): Modo | null {
  try {
    const valor = localStorage.getItem(PREFIXO + usuarioId)
    return valor === 'consumidor' || valor === 'vendedor' ? valor : null
  } catch {
    return null
  }
}

/** Guarda o modo no aparelho, por conta. Sem armazenamento, o modo só vale até fechar o app. */
export function guardarModo(usuarioId: string, modo: Modo): void {
  try {
    localStorage.setItem(PREFIXO + usuarioId, modo)
  } catch {
    // Sem armazenamento: segue sem guardar.
  }
}

/**
 * Qual modo vale agora (RN02). Quem não tem perfil de vendedor só usa como consumidor. Quem tem
 * troca de modo sem sair da conta; sem escolha guardada, começa como vendedor.
 */
export function modoAtual(ehVendedor: boolean, escolhido: Modo | null): Modo {
  if (!ehVendedor) return 'consumidor'
  return escolhido ?? 'vendedor'
}
