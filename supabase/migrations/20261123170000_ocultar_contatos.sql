-- #157 [US19] O vendedor escolhe quais contatos ficam ocultos (RN24).
-- Todo contato começa visível. Um contato oculto só é entregue ao dono do vendedor:
-- a regra fica no banco (RLS), então nenhum outro usuário recebe o número, nem pela API.

alter table public.contatos
  add column visivel boolean not null default true;

comment on column public.contatos.visivel is 'false = só o dono vê o contato (RN24). O contato continua obrigatório no cadastro (RN06).';

-- Antes qualquer usuário logado lia todos os contatos. Agora: os visíveis, para quem está logado (RN04),
-- e todos, para o dono do vendedor.
drop policy "contatos: logados leem" on public.contatos;

create policy "contatos: logados leem os visíveis e o dono lê todos"
  on public.contatos for select
  to authenticated
  using (
    visivel
    or exists (
      select 1 from public.vendedores v
      where v.id = vendedor_id and v.perfil_id = (select auth.uid())
    )
  );

-- O dono passa a poder mudar também o visivel (a política de update já limita ao dono).
revoke update on public.contatos from authenticated;
grant update (valor, visivel) on public.contatos to authenticated;
