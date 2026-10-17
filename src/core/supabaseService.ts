import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

/**
 * Singleton que guarda o único cliente do Supabase do app.
 * Todo acesso ao banco, à autenticação e ao storage passa por aqui,
 * para não criar várias conexões nem espalhar as chaves pelo código.
 */
export class SupabaseService {
  private static client: SupabaseClient<Database> | null = null

  // Construtor privado: ninguém faz `new SupabaseService()`; use SupabaseService.getClient().
  private constructor() {}

  static getClient(): SupabaseClient<Database> {
    if (!SupabaseService.client) {
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      if (!url || !key) {
        throw new Error(
          'Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. Copie o .env.example para .env.local e preencha.',
        )
      }
      SupabaseService.client = createClient<Database>(url, key)
    }
    return SupabaseService.client
  }
}
