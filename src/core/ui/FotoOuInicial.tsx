/** Foto de um item, vendedor ou atalho; sem foto, um bloco com a inicial, para o desenho não ficar vazio. */
export function FotoOuInicial({
  url,
  nome,
  className,
}: {
  url: string | null
  nome: string
  className: string
}) {
  // A foto é decorativa: o nome sempre aparece escrito ao lado.
  if (url) return <img src={url} alt="" loading="lazy" className={`object-cover ${className}`} />
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-marca-50 font-bold text-marca-800 ${className}`}
    >
      {nome.trim().charAt(0).toUpperCase()}
    </span>
  )
}
