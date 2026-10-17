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

## Segredos

As chaves do Supabase ficam no `.env.local`, que não vai para o Git. Nunca coloque chaves em código, commits ou issues.
