export type TomSelo = 'ativo' | 'neutro' | 'perigo'

const TONS: Record<TomSelo, { texto: string; ponto: string }> = {
  ativo: { texto: 'text-marca-600', ponto: 'bg-marca-600' },
  neutro: { texto: 'text-tinta-suave', ponto: 'bg-tinta-suave' },
  perigo: { texto: 'text-perigo', ponto: 'bg-perigo' },
}

/** "● No campus agora", "● Fora do mapa", "● Esgotado": o ponto colorido e o texto, que o leitor de tela lê. */
export function Selo({
  tom = 'ativo',
  className = 'text-sm',
  children,
}: {
  tom?: TomSelo
  className?: string
  children: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-[7px] font-medium ${TONS[tom].texto} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`h-[7px] w-[7px] shrink-0 rounded-full ${TONS[tom].ponto}`}
      />
      {children}
    </span>
  )
}
