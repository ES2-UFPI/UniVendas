import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { iniciarSessao } from './core/sessaoStore'
import { SupabaseAuthRepository } from './features/auth/data/SupabaseAuthRepository'

// Liga a sessão antes de desenhar o app, para restaurar quem já estava logado.
iniciarSessao(new SupabaseAuthRepository())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
