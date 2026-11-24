import { FotoOuInicial } from './FotoOuInicial'

/** Foto redonda de uma pessoa ou negócio; sem foto, a inicial. */
export function Avatar({
  nome,
  fotoUrl,
  className = 'h-12 w-12 text-lg',
}: {
  nome: string
  fotoUrl: string | null
  className?: string
}) {
  return <FotoOuInicial url={fotoUrl} nome={nome} className={`rounded-full ${className}`} />
}
