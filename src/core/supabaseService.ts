import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

/**
 * Singleton que guarda o único cliente do Supabase do app.
 * Todo acesso ao banco, à autenticação e ao storage passa por aqui,
 * para não abrir várias conexões nem espalhar as chaves pelo código.
 * Uso: SupabaseService.getInstance().client
 */
export class SupabaseService {
  private static instancia: SupabaseService | null = null
  private readonly _client: SupabaseClient<Database>

  // Construtor privado: ninguém faz `new SupabaseService()`; use getInstance().
  private constructor(url: string, publishableKey: string) {
    this._client = createClient<Database>(url, publishableKey)
  }

  static getInstance(): SupabaseService {
    if (!SupabaseService.instancia) {
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      if (!url || !key) {
        throw new Error(
          'Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. Copie o .env.example para .env.local e preencha.',
        )
      }
      SupabaseService.instancia = new SupabaseService(url, key)
    }
    return SupabaseService.instancia
  }

  get client(): SupabaseClient<Database> {
    return this._client
  }
}
