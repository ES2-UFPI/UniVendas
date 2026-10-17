/// <reference types="vite/client" />

// Variáveis do .env.local que o app lê. O prefixo VITE_ é o que deixa o Vite expor a variável no navegador.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
