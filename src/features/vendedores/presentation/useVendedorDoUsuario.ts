import { useEffect, useState } from 'react'
import { SupabaseVendedorRepository } from '../data/SupabaseVendedorRepository'
import type { Vendedor } from '../domain/Vendedor'
import type { VendedorRepository } from '../domain/VendedorRepository'

/**
 * O perfil de vendedor da conta `perfilId` (nome e foto do negócio), para as telas do modo
 * vendedor mostrarem de quem é o painel (US21). Enquanto carrega, se a conta não tem perfil ou se
 * a busca falhar, devolve null: quem usa mostra o nome da conta no lugar.
 */
export function useVendedorDoUsuario(
  perfilId: string | null,
  repositorio?: VendedorRepository,
): Vendedor | null {
  const [vendedor, setVendedor] = useState<Vendedor | null>(null)

  useEffect(() => {
    if (!perfilId) return
    let ativo = true

    async function buscar(id: string) {
      try {
        const encontrado = await (repositorio ?? new SupabaseVendedorRepository()).buscarDoUsuario(
          id,
        )
        if (ativo) setVendedor(encontrado ?? null)
      } catch {
        // Sem o nome do negócio, a tela continua funcionando com o nome da conta.
      }
    }

    void buscar(perfilId)
    return () => {
      ativo = false
    }
  }, [perfilId, repositorio])

  return vendedor
}
