import { afterEach, describe, expect, it, vi } from 'vitest'

// Cada teste importa o módulo de novo, para começar sem instância criada.
async function importarServico() {
  vi.resetModules()
  return (await import('./supabaseService')).SupabaseService
}

describe('SupabaseService', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('devolve sempre a mesma instância e o mesmo cliente (Singleton)', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')
    const SupabaseService = await importarServico()

    expect(SupabaseService.getInstance()).toBe(SupabaseService.getInstance())
    expect(SupabaseService.getInstance().client).toBe(SupabaseService.getInstance().client)
  })

  it('avisa quando as variáveis de ambiente não foram configuradas', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    const SupabaseService = await importarServico()

    expect(() => SupabaseService.getInstance()).toThrow('VITE_SUPABASE_URL')
  })
})
