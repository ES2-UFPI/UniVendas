import { Selo, type TomSelo } from '../../../core/ui/Selo'
import type { ResultadoBusca } from '../domain/BuscaRepository'
import { situacaoDoItem, type TomDaSituacao } from '../domain/situacaoDoItem'

const TONS: Record<TomDaSituacao, TomSelo> = {
  agora: 'ativo',
  disponivel: 'neutro',
  esgotado: 'perigo',
}

/** "● Disponível agora", "● Disponível" ou "● Esgotado", em texto para o leitor de tela também ler. */
export function SeloSituacao({
  resultado,
  className = 'text-[13px]',
}: {
  resultado: ResultadoBusca
  className?: string
}) {
  const { rotulo, tom } = situacaoDoItem(resultado)
  return (
    <Selo tom={TONS[tom]} className={className}>
      {rotulo}
    </Selo>
  )
}
