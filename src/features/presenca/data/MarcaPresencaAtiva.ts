import type { LatLng } from '../../../core/localizacaoService'

const PREFIXO = 'univendas:presenca-ativa:'

/** O que o aparelho lembra de uma presença ligada: a referência e o ponto fixo, para religar igual. */
export interface MarcaPresenca {
  referencia: string
  /** Ponto fixo escolhido no mapa (RN14), ou null para mostrar a posição real. */
  ponto: LatLng | null
}

function ehPonto(valor: unknown): valor is LatLng {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    typeof (valor as LatLng).latitude === 'number' &&
    typeof (valor as LatLng).longitude === 'number'
  )
}

/**
 * O app guarda no aparelho (localStorage) que o vendedor ligou a presença. Se o servidor apagar a
 * linha (30 minutos sem sinal ou saída do campus), a marca continua e permite religar sozinho ao
 * reabrir o app dentro do campus (RN16). Fica por usuário, para duas contas no mesmo aparelho não
 * se misturarem. Se o navegador bloquear o armazenamento, o app só deixa de religar sozinho.
 */
export function lembrarPresenca(
  usuarioId: string,
  referencia: string,
  ponto: LatLng | null = null,
): void {
  try {
    const marca: MarcaPresenca = { referencia, ponto }
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
      const ponto = 'ponto' in dado && ehPonto(dado.ponto) ? dado.ponto : null
      return { referencia: String(dado.referencia ?? ''), ponto }
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
