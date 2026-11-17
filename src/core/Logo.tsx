/** Marca do app: o marcador de mapa com a sacola, seguido do nome. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="73 50 34 43" className="h-[1.3em] w-auto shrink-0" aria-hidden="true">
        <path
          d="M90 51c-9.4 0-16.5 7-16.5 16.2 0 11 16.5 25 16.5 25s16.5-14 16.5-25C106.5 58 99.4 51 90 51Z"
          fill="#16a34a"
        />
        <path d="M83 65.8h14l1.1 11.6H82z" fill="#fff" />
        <path d="M87 66v-2.1a3 3 0 0 1 6 0V66" fill="none" stroke="#fff" strokeWidth="1.9" />
      </svg>
      <span className="font-bold tracking-tight text-marca-800">UniVendas</span>
    </span>
  )
}
