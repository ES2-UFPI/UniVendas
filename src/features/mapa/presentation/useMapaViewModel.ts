import { useEffect, useMemo, useState } from 'react'
import { Falha } from '../../../core/falha'
import { SupabasePresencaRepository } from '../../presenca/data/SupabasePresencaRepository'
import type { Presenca } from '../../presenca/domain/Presenca'
import type { PresencaRepository } from '../../presenca/domain/PresencaRepository'
import type { Marcador } from './MapaPage'

const MENSAGEM_PADRAO = 'Não foi possível carregar os vendedores do mapa. Tente de novo.'

interface Opcoes {
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: PresencaRepository
}

function paraMarcador(presenca: Presenca): Marcador {
  return {
    id: presenca.vendedorId,
    latitude: presenca.posicao.latitude,
    longitude: presenca.posicao.longitude,
    nome: presenca.nomeVendedor,
    referencia: presenca.referencia,
  }
}

/**
 * ViewModel do mapa (US06) e observador do padrão Observer: faz a carga inicial dos vendedores
 * ativos e se inscreve no `PresencaRepository.observarAtivos`. Cada lista nova atualiza o estado,
 * e o React redesenha os marcadores, que aparecem e somem sem recarregar a página.
 */
export function useMapaViewModel({ repositorio }: Opcoes = {}) {
  const [presencas, setPresencas] = useState<Presenca[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroDaBusca, setErroDaBusca] = useState<string | null>(null)

  // Criar o repositório fica fora do efeito: se o Singleton recusar (sem as chaves do Supabase),
  // o erro é calculado aqui, sem chamar setState dentro do efeito.
  const repo = useMemo<PresencaRepository | null>(() => {
    try {
      return repositorio ?? new SupabasePresencaRepository()
    } catch {
      return null
    }
  }, [repositorio])

  useEffect(() => {
    if (!repo) return

    let montado = true
    // Se um evento chegar antes da carga inicial terminar, a lista do evento é mais nova e vale mais.
    let recebeuEvento = false

    repo
      .listarAtivos()
      .then((ativos) => {
        if (montado && !recebeuEvento) setPresencas(ativos)
      })
      .catch((e) => {
        if (montado) setErroDaBusca(e instanceof Falha ? e.mensagem : MENSAGEM_PADRAO)
      })
      .finally(() => {
        if (montado) setCarregando(false)
      })

    const cancelar = repo.observarAtivos((ativos) => {
      if (!montado) return
      recebeuEvento = true
      setPresencas(ativos)
      setErroDaBusca(null)
    })

    // Cancela a inscrição quando a tela é desmontada, para não deixar o canal aberto.
    return () => {
      montado = false
      cancelar()
    }
  }, [repo])

  const marcadores = useMemo(() => presencas.map(paraMarcador), [presencas])

  return {
    marcadores,
    carregando: repo !== null && carregando,
    erro: repo === null ? MENSAGEM_PADRAO : erroDaBusca,
  }
}
