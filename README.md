# UniVendas

Plataforma que conecta estudantes universitários a vendedores locais — quiosques, ambulantes e prestadores de serviço — facilitando o comércio dentro e ao redor do campus.

Projeto da disciplina Engenharia de Software II (Ciência da Computação, UFPI). Documentação na [wiki](https://github.com/ES2-UFPI/UniVendas/wiki).

## Tecnologias

TypeScript, React, Vite (PWA com `vite-plugin-pwa`), Tailwind CSS, Zustand, Vitest, Supabase e Leaflet/OpenStreetMap. Publicação no Netlify.

## Como rodar

Precisa do Node.js 20.19 ou mais novo (recomendado: 22 LTS).

```bash
npm install
npm run dev
```

O app abre em http://localhost:5173.

## Comandos

| Comando                | O que faz                                               |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Sobe o app em modo de desenvolvimento                   |
| `npm run build`        | Confere os tipos e gera a versão de produção em `dist/` |
| `npm run preview`      | Serve a versão de produção localmente                   |
| `npm run lint`         | Roda o ESLint                                           |
| `npm run format`       | Formata o código com o Prettier                         |
| `npm run format:check` | Só confere a formatação (usado no CI)                   |
| `npm test`             | Roda os testes com o Vitest                             |

## Estrutura

Veja [src/README.md](src/README.md). Como trabalhar com branches e pull requests: [CONTRIBUTING.md](CONTRIBUTING.md).
