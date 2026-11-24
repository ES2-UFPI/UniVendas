import { useEffect, useMemo, useState } from 'react'
import { Falha } from '../../../core/falha'
import { SupabaseBuscaRepository } from '../data/SupabaseBuscaRepository'
import type { BuscaRepository, ResultadoBusca } from '../domain/BuscaRepository'

interface Opcoes {
  itemId: string
  /** O item como veio da lista da busca, para a tela abrir na hora, sem esperar a rede. */
  inicial?: ResultadoBusca | null
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: BuscaRepository
}

/**
 * ViewModel do detalhe de um item (US21). Mostra o que veio da busca e, em seguida, relê o item,
 * para a disponibilidade e o lugar do vendedor estarem em dia. Quem abre o endereço direto
 * (sem passar pela busca) só espera a leitura.
 */
export function useItemDetalheViewModel({ itemId, inicial = null, repositorio }: Opcoes) {
  const valeInicial = inicial?.item.id === itemId ? inicial : null
  const [resultado, setResultado] = useState<ResultadoBusca | null>(valeInicial)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const busca = useMemo(() => repositorio ?? new SupabaseBuscaRepository(), [repositorio])

  useEffect(() => {
    let ativo = true
    async function ler() {
      setCarregando(true)
      setErro(null)
      try {
        const lido = await busca.detalhar(itemId)
        if (ativo) setResultado(lido)
      } catch (e) {
        if (ativo) {
          setErro(e instanceof Falha ? e.mensagem : 'Não foi possível abrir o item agora.')
        }
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    void ler()
    return () => {
      ativo = false
    }
  }, [busca, itemId])

  return {
    resultado,
    carregando,
    erro,
    /** A leitura terminou e o item não existe mais (o vendedor apagou, por exemplo). */
    naoEncontrado: !carregando && !erro && resultado === null,
  }
}
