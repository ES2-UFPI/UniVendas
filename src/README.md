# Estrutura de pastas

Segue a página [Arquitetura - Detalhamento dos Módulos](https://github.com/ES2-UFPI/UniVendas/wiki/Arquitetura-Detalhamento-dos-M%C3%B3dulos) da wiki.

```
src/
├── core/        # serviços compartilhados: supabaseService.ts (Singleton), rotas, layout, erros, sessaoStore.ts (Zustand)
├── features/    # um módulo por funcionalidade: auth, vendedores, presenca, mapa, busca, contato
│   └── <modulo>/
│       ├── presentation/  # telas (Page.tsx) e view models (useXxxViewModel.ts)
│       ├── domain/        # entidades e interfaces de repositório
│       └── data/          # implementações que falam com o Supabase
├── types/       # database.types.ts, gerado com `supabase gen types typescript`
├── App.tsx
└── main.tsx
```

Uma camada só é criada quando tem algo dentro. As migrações do banco ficam em `supabase/migrations`, na raiz do repositório.
