/**
 * Símbolo da marca, a "sacola dobrada": um mapa dobrado em três que ganha alça e vira sacola.
 * Só decorativo; quem precisa do nome usa a `Logo`.
 */
export function SimboloMarca({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path
        d="M33 31V23C33 2 67 2 67 23V31"
        fill="none"
        stroke="var(--color-marca-500)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path d="M15 34L36 26V82L15 91Z" fill="var(--color-marca-500)" />
      <path d="M41 27L61 36V92L41 83Z" fill="var(--color-ouro)" />
      <path d="M66 36L87 27V83L66 92Z" fill="var(--color-marca-500)" />
    </svg>
  )
}

/** Marca do app: a sacola dobrada seguida do nome. O tamanho acompanha o texto em volta. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.3em] ${className}`}>
      <SimboloMarca className="h-[1.35em] w-auto shrink-0" />
      <span className="font-bold tracking-[-0.04em] text-marca-900">UniVendas</span>
    </span>
  )
}
