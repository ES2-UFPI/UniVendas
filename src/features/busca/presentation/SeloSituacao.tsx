import type { ResultadoBusca } from '../domain/BuscaRepository'
import { situacaoDoItem, type TomDaSituacao } from '../domain/situacaoDoItem'

const CORES: Record<TomDaSituacao, { texto: string; ponto: string }> = {
  agora: { texto: 'text-marca-600', ponto: 'bg-marca-600' },
  disponivel: { texto: 'text-tinta-suave', ponto: 'bg-tinta-suave' },
  esgotado: { texto: 'text-red-700', ponto: 'bg-red-700' },
}

/** "● Disponível agora", "● Disponível" ou "● Esgotado", em texto para o leitor de tela também ler. */
export function SeloSituacao({
  resultado,
  className = '',
}: {
  resultado: ResultadoBusca
  className?: string
}) {
  const { rotulo, tom } = situacaoDoItem(resultado)
  return (
    <span className={`inline-flex items-center gap-1.5 ${CORES[tom].texto} ${className}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${CORES[tom].ponto}`} />
      {rotulo}
    </span>
  )
}
