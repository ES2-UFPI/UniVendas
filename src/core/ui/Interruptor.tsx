interface InterruptorProps {
  ligado: boolean
  aoMudar: (ligado: boolean) => void
  /** Nome que o leitor de tela lê (ex.: "Brownie disponível"). */
  rotulo: string
  /** Mostra o rótulo ao lado; sem isso, ele fica só para o leitor de tela. */
  rotuloVisivel?: boolean
  desabilitado?: boolean
  /** Id do texto que explica o interruptor (ex.: "Ative para aparecer no mapa."). */
  descritoPor?: string
}

/** Liga e desliga (US21), como "Item disponível" e "Estou no campus". É um `role="switch"`. */
export function Interruptor({
  ligado,
  aoMudar,
  rotulo,
  rotuloVisivel = false,
  desabilitado = false,
  descritoPor,
}: InterruptorProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotuloVisivel ? undefined : rotulo}
      aria-describedby={descritoPor}
      disabled={desabilitado}
      onClick={() => aoMudar(!ligado)}
      className="inline-flex items-center gap-4 rounded-full text-[15px] text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600 disabled:opacity-45"
    >
      <span
        aria-hidden="true"
        className={`flex h-7 w-12 shrink-0 items-center rounded-full p-[3px] transition-colors ${ligado ? 'justify-end bg-marca-600' : 'justify-start bg-[#cbd5cc]'}`}
      >
        <span className="h-[22px] w-[22px] rounded-full bg-white shadow-sm" />
      </span>
      {rotuloVisivel && rotulo}
    </button>
  )
}
