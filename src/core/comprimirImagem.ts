import { Falha } from './falha'

/** Limite de uma foto depois de comprimida (RN10). O bucket `fotos` recusa acima disso. */
export const LIMITE_FOTO_BYTES = 2 * 1024 * 1024

/** Maior lado da foto, em pixels: nítida na tela do celular e leve para subir no 4G. */
export const LADO_MAXIMO = 1080

/** Reduz largura e altura na mesma proporção para o maior lado caber em `ladoMaximo`. Nunca aumenta. */
export function dimensoesReduzidas(
  largura: number,
  altura: number,
  ladoMaximo = LADO_MAXIMO,
): { largura: number; altura: number } {
  const escala = Math.min(1, ladoMaximo / Math.max(largura, altura))
  return { largura: Math.round(largura * escala), altura: Math.round(altura * escala) }
}

function paraBlob(canvas: HTMLCanvasElement, qualidade: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualidade))
}

/**
 * Comprime a foto no próprio celular antes de subir (RN10): reduz para no máximo 1080 px
 * e salva em JPEG, baixando a qualidade até ficar com 2 MB ou menos.
 * Lança `Falha` se o arquivo não for uma imagem que o navegador consiga abrir.
 */
export async function comprimirImagem(arquivo: Blob): Promise<Blob> {
  if (!arquivo.type.startsWith('image/')) {
    throw new Falha('Escolha uma foto (JPEG, PNG ou WebP).', 'foto-formato-invalido')
  }

  let imagem: ImageBitmap
  try {
    imagem = await createImageBitmap(arquivo)
  } catch {
    throw new Falha('Não foi possível abrir esta foto. Tente outra.', 'foto-ilegivel')
  }

  const { largura, altura } = dimensoesReduzidas(imagem.width, imagem.height)
  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  canvas.getContext('2d')?.drawImage(imagem, 0, 0, largura, altura)
  imagem.close()

  for (const qualidade of [0.82, 0.7, 0.55, 0.4]) {
    const blob = await paraBlob(canvas, qualidade)
    if (blob && blob.size <= LIMITE_FOTO_BYTES) return blob
  }
  throw new Falha('A foto ficou grande demais mesmo comprimida. Tente outra.', 'foto-grande')
}
