import { ICONES, type NomeIcone } from './icones'

/** Ícone só decorativo: quem usa sempre põe o texto ao lado (ou um rótulo no botão). */
export function Icone({ nome, className = 'h-5 w-5' }: { nome: NomeIcone; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONES[nome]} />
    </svg>
  )
}
