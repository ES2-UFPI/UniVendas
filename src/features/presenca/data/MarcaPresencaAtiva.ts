const PREFIXO = 'univendas:presenca-ativa:'

/** O que o aparelho lembra de uma presença ligada: a referência, para religar igual. */
export interface MarcaPresenca {
  referencia: string
}

/**
 * O app guarda no aparelho (localStorage) que o vendedor ligou a presença. Se o servidor apagar a
 * linha (30 minutos sem sinal ou saída do campus), a marca continua e permite religar sozinho ao
 * reabrir o app dentro do campus (RN16). Fica por usuário, para duas contas no mesmo aparelho não
 * se misturarem. Se o navegador bloquear o armazenamento, o app só deixa de religar sozinho.
 */
export function lembrarPresenca(usuarioId: string, referencia: string): void {
  try {
    const marca: MarcaPresenca = { referencia }
    localStorage.setItem(PREFIXO + usuarioId, JSON.stringify(marca))
  } catch {
    // Sem armazenamento: segue sem a marca.
  }
}

/** Devolve a marca do usuário, ou null se ele não ligou (ou desligou de propósito). */
export function lerMarcaPresenca(usuarioId: string): MarcaPresenca | null {
  try {
    const texto = localStorage.getItem(PREFIXO + usuarioId)
    if (!texto) return null
    const dado: unknown = JSON.parse(texto)
    if (typeof dado === 'object' && dado !== null && 'referencia' in dado) {
      return { referencia: String(dado.referencia ?? '') }
    }
    return null
  } catch {
    return null
  }
}

/** Apaga a marca: o vendedor desligou de propósito, ou o app não pode mais religar por ele. */
export function esquecerPresenca(usuarioId: string): void {
  try {
    localStorage.removeItem(PREFIXO + usuarioId)
  } catch {
    // Sem armazenamento: não há o que apagar.
  }
}
