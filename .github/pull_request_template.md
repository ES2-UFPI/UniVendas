<!-- A base deste PR deve ser a dev. Só o PR de release (dev -> main) aponta para a main. -->

## O que mudou

<!-- Explique em poucas linhas o que este pull request faz. -->

Closes #

## Definition of Done

- [ ] Atende ao "Pronto quando" da tarefa
- [ ] A base do PR é a `dev` (não a `main`)
- [ ] `npm run lint`, `npm run format:check`, `npm test` e `npm run build` passam na minha máquina
- [ ] Regras novas (domain e view model) têm testes no Vitest
- [ ] Se mexeu no banco: migração nova em `supabase/migrations` e `npm run db:types` rodado
- [ ] Nenhuma chave ou segredo no código
- [ ] Tarefa movida para **In Review** no quadro

Quem revisa: rode o projeto na sua máquina antes de aprovar.
