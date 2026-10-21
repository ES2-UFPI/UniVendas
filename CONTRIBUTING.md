# Como contribuir

## Branches

Uma tarefa, uma branch, um pull request. Sempre a partir do `main` atualizado:

```bash
git checkout main
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

- **Título:** igual ao da tarefa no quadro.
- **Descrição:** o que mudou e `Closes #N` (N = número da tarefa), para a tarefa ir para Done no merge.
- Antes de abrir, rode `npm run lint`, `npm run format:check`, `npm test` e `npm run build`.
- Revisão em rodízio: João revisa Antonio, Duda revisa João, Antonio revisa Duda. Quem revisa roda o projeto na própria máquina antes de aprovar.
- Merge só com aprovação e CI verde.

## Definition of Done

Uma **tarefa** está pronta quando:

1. Faz o que pede o "Pronto quando" da issue.
2. Está numa branch própria com pull request para o `main`, título igual ao da tarefa e `Closes #N` na descrição.
3. `npm run lint`, `npm run format:check`, `npm test` e `npm run build` passam, na máquina de quem fez e no CI.
4. Regras de negócio novas (pastas `domain` e view models) têm testes no Vitest.
5. Se mexeu no banco, tem uma migração nova em `supabase/migrations` e os tipos foram gerados de novo com `npm run db:types`.
6. Não tem chave nem segredo no código.
7. Outro membro revisou, rodou o projeto na própria máquina e aprovou.
8. Foi feito o merge no `main` e a tarefa foi para Done.

Uma **história** está pronta quando todas as sub-issues estão em Done e os critérios de aceitação do [Product Backlog](https://github.com/ES2-UFPI/UniVendas/wiki/Product-Backlog) foram conferidos no app publicado no Netlify. Aí quem é dono da história a fecha no GitHub.

O checklist do pull request (`.github/pull_request_template.md`) repete esses itens. A versão completa, com as regras do quadro, está na página [Definition of Done](https://github.com/ES2-UFPI/UniVendas/wiki/Definition-of-Done) da wiki.

## Segredos

As chaves do Supabase ficam no `.env.local`, que não vai para o Git. Nunca coloque chaves em código, commits ou issues.
