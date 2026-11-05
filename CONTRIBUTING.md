# Como contribuir

## Branches

O repositório tem duas branches fixas:

| Branch | Para que serve                                                                            |
| ------ | ----------------------------------------------------------------------------------------- |
| `dev`  | Branch padrão. Recebe o merge de todo pull request de tarefa. É onde a sprint acontece.   |
| `main` | Só recebe o merge de uma release (`dev` → `main`). O Netlify publica o app a partir dela. |

Uma tarefa, uma branch, um pull request para a `dev`. Sempre a partir da `dev` atualizada:

```bash
git checkout dev
git pull
git checkout -b feat/52-tela-cadastro
```

Nome: `tipo/numero-da-issue-descricao-curta`, em minúsculas e com hífens.

| Tipo    | Quando usar                    |
| ------- | ------------------------------ |
| `feat`  | Funcionalidade nova            |
| `fix`   | Correção de bug                |
| `chore` | Configuração, dependências, CI |
| `docs`  | Só documentação                |
| `test`  | Só testes                      |

## Commits

Mensagem curta no imperativo, com o tipo na frente: `feat: cria a tela de cadastro`, `fix: corrige validação da senha`.

## Pull requests

- **Base:** `dev`. O GitHub já sugere a `dev` porque ela é a branch padrão.
- **Título:** igual ao da tarefa no quadro.
- **Descrição:** o que mudou e `Closes #N` (N = número da tarefa), para a tarefa ir para Done no merge.
- Antes de abrir, rode `npm run lint`, `npm run format:check`, `npm test` e `npm run build`.
- Revisão em rodízio: João revisa Antonio, Duda revisa João, Antonio revisa Duda. Quem revisa roda o projeto na própria máquina antes de aprovar.
- Merge só com aprovação e CI verde.

## Releases

No fim da sprint, quando tudo o que entrou na `dev` foi conferido:

1. Abra um pull request da `dev` para a `main` com o título `Release vX.Y.Z` e as histórias da sprint na descrição.
2. Outro membro revisa e o CI precisa estar verde. Faça o merge com **Create a merge commit**.
3. O Netlify publica a `main` sozinho. Confira o app publicado.
4. Crie a tag e a release `vX.Y.Z` no commit de merge da `main` e atualize a `version` do `package.json` na `dev`.

Ninguém faz push nem abre pull request de tarefa direto na `main`.

## Definition of Done

Uma **tarefa** está pronta quando:

1. Faz o que pede o "Pronto quando" da issue.
2. Está numa branch própria com pull request para a `dev`, título igual ao da tarefa e `Closes #N` na descrição.
3. `npm run lint`, `npm run format:check`, `npm test` e `npm run build` passam, na máquina de quem fez e no CI.
4. Regras de negócio novas (pastas `domain` e view models) têm testes no Vitest.
5. Se mexeu no banco, tem uma migração nova em `supabase/migrations` e os tipos foram gerados de novo com `npm run db:types`.
6. Não tem chave nem segredo no código.
7. Outro membro revisou, rodou o projeto na própria máquina e aprovou.
8. Foi feito o merge na `dev` e a tarefa foi para Done.

Uma **história** está pronta quando todas as sub-issues estão em Done e os critérios de aceitação do [Product Backlog](https://github.com/ES2-UFPI/UniVendas/wiki/Product-Backlog) foram conferidos no app rodando a partir da `dev` (`npm run build` e `npm run preview`) e, depois da release, de novo no app publicado no Netlify. Aí quem é dono da história a fecha no GitHub.

O checklist do pull request (`.github/pull_request_template.md`) repete esses itens. A versão completa, com as regras do quadro, está na página [Definition of Done](https://github.com/ES2-UFPI/UniVendas/wiki/Definition-of-Done) da wiki.

## Segredos

As chaves do Supabase ficam no `.env.local`, que não vai para o Git. Nunca coloque chaves em código, commits ou issues.
