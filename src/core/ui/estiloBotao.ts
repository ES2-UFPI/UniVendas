export type VarianteBotao = 'primario' | 'secundario' | 'texto' | 'perigo'

const VARIANTES: Record<VarianteBotao, string> = {
  primario: 'bg-marca-600 text-white hover:bg-marca-700',
  secundario: 'border border-linha bg-white text-marca-600 hover:border-marca-600',
  texto: 'text-marca-600 hover:bg-marca-50',
  perigo: 'bg-red-50 text-perigo hover:bg-red-100',
}

/**
 * Classes do botão do tema (US21). Serve também para links com cara de botão:
 * `<Link className={estiloBotao('secundario')}>`.
 */
export function estiloBotao(variante: VarianteBotao = 'primario', extra = ''): string {
  return `inline-flex h-[50px] items-center justify-center gap-2.5 rounded-controle px-5 text-base font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600 disabled:pointer-events-none disabled:opacity-45 ${VARIANTES[variante]} ${extra}`
}
