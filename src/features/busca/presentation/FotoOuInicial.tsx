/** Foto de um atalho ou item; sem foto, um bloco com a inicial, para o desenho não ficar vazio. */
export function FotoOuInicial({
  url,
  nome,
  className,
}: {
  url: string | null
  nome: string
  className: string
}) {
  // A foto é decorativa: o nome do item ou do tipo de produto sempre aparece escrito ao lado.
  if (url) return <img src={url} alt="" loading="lazy" className={`object-cover ${className}`} />
  return (
    <span
      aria-hidden="true"
      className={`flex items-center justify-center bg-marca-50 text-3xl font-bold text-marca-800 ${className}`}
    >
      {nome.charAt(0).toUpperCase()}
    </span>
  )
}
