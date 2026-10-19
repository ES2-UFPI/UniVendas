-- #59 [US03] Tabelas vendedores e contatos, com as regras de acesso.
-- Ser vendedor = ter uma linha em vendedores (RN02). Contatos ficam numa tabela à parte (um por canal).

create table public.vendedores (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null unique references public.perfis (id) on delete cascade, -- um perfil de vendedor por conta (RN02); apagar a conta apaga o vendedor (RN05)
  tipo text not null default 'ambulante' check (tipo in ('ambulante', 'quiosque', 'prestador')),
  nome_exibicao text not null check (char_length(btrim(nome_exibicao)) > 0), -- obrigatório (RN06)
  descricao text,
  foto_url text,
  latitude double precision, -- só quiosque (incremento 2)
  longitude double precision, -- só quiosque (incremento 2)
  criado_em timestamptz not null default now()
);

comment on table public.vendedores is 'Perfil de vendedor. No MVP, só ambulante. perfil_id = auth.uid() do dono.';

create table public.contatos (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references public.vendedores (id) on delete cascade, -- apagar o vendedor apaga os contatos (RN05)
  canal text not null check (canal in ('whatsapp', 'telefone')), -- Instagram entra no incremento 2 (RN20)
  valor text not null check (valor ~ '^55[1-9][0-9][0-9]{8,9}$'), -- 55 + DDD + número, só dígitos (RN21)
  unique (vendedor_id, canal)
);

comment on table public.contatos is 'Contatos de um vendedor, um por canal. Valor no formato internacional 55 + DDD + número.';

create index contatos_vendedor_id_idx on public.contatos (vendedor_id);

-- RLS: só quem está logado lê (RN04); só o dono cria, altera ou apaga (RN11).
alter table public.vendedores enable row level security;
alter table public.contatos enable row level security;

create policy "vendedores: logados leem"
  on public.vendedores for select
  to authenticated
  using (true);

create policy "vendedores: cada um cria o próprio"
  on public.vendedores for insert
  to authenticated
  with check ((select auth.uid()) = perfil_id);

create policy "vendedores: cada um altera o próprio"
  on public.vendedores for update
  to authenticated
  using ((select auth.uid()) = perfil_id)
  with check ((select auth.uid()) = perfil_id);

create policy "vendedores: cada um apaga o próprio"
  on public.vendedores for delete
  to authenticated
  using ((select auth.uid()) = perfil_id);

-- O dono só muda os dados do perfil; id, perfil_id, tipo e criado_em ficam fora do alcance dele.
revoke update on public.vendedores from authenticated;
grant update (nome_exibicao, descricao, foto_url) on public.vendedores to authenticated;

-- Contato pertence ao dono do vendedor.
create policy "contatos: logados leem"
  on public.contatos for select
  to authenticated
  using (true);

create policy "contatos: dono do vendedor cria"
  on public.contatos for insert
  to authenticated
  with check (
    exists (
      select 1 from public.vendedores v
      where v.id = vendedor_id and v.perfil_id = (select auth.uid())
    )
  );

create policy "contatos: dono do vendedor altera"
  on public.contatos for update
  to authenticated
  using (
    exists (
      select 1 from public.vendedores v
      where v.id = vendedor_id and v.perfil_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.vendedores v
      where v.id = vendedor_id and v.perfil_id = (select auth.uid())
    )
  );

create policy "contatos: dono do vendedor apaga"
  on public.contatos for delete
  to authenticated
  using (
    exists (
      select 1 from public.vendedores v
      where v.id = vendedor_id and v.perfil_id = (select auth.uid())
    )
  );

-- O dono só muda o valor do contato; trocar o canal é apagar e criar outro.
revoke update on public.contatos from authenticated;
grant update (valor) on public.contatos to authenticated;
