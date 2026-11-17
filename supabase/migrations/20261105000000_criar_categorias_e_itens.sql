-- #103 [US08] Tabelas categorias e itens, com as regras de acesso.
-- Categorias formam uma árvore (Alimentação > Doces > Brownie). O item sempre aponta para uma folha (RN07).

create table public.categorias (
  id integer generated always as identity primary key,
  nome text not null check (char_length(btrim(nome)) > 0),
  categoria_pai_id integer references public.categorias (id), -- nulo na raiz
  folha boolean not null default false, -- true = último nível, a única que pode classificar um item (RN07)
  unique (categoria_pai_id, nome)
);

comment on table public.categorias is 'Árvore de categorias. Só as folhas classificam itens. Mantida pelas migrações, o app só lê.';

create index categorias_categoria_pai_id_idx on public.categorias (categoria_pai_id);

create table public.itens (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references public.vendedores (id) on delete cascade, -- apagar o vendedor apaga os itens (RN05)
  categoria_id integer not null references public.categorias (id),
  nome text not null check (char_length(btrim(nome)) > 0), -- obrigatório (RN07)
  descricao text,
  preco numeric(10, 2) not null check (preco >= 0), -- em reais, maior ou igual a zero (RN07)
  foto_url text, -- opcional (RN07)
  disponivel boolean not null default true, -- false = esgotado; não há estoque (RN08)
  criado_em timestamptz not null default now()
);

comment on table public.itens is 'Itens à venda de um vendedor. Só o dono escreve (RN11).';

create index itens_vendedor_id_idx on public.itens (vendedor_id);
create index itens_categoria_id_idx on public.itens (categoria_id);

-- Um check não consegue olhar outra tabela, então a regra da categoria folha (RN07) fica num trigger.
-- O erro usa o mesmo código de um check (23514), e o app trata os dois do mesmo jeito.
create function public.exigir_categoria_folha()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.categorias c
    where c.id = new.categoria_id and c.folha
  ) then
    raise exception 'O item precisa de uma categoria folha (ex.: Brownie, e não Doces).'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger itens_exigir_categoria_folha
  before insert or update of categoria_id on public.itens
  for each row execute function public.exigir_categoria_folha();

-- RLS: quem está logado lê (RN04). Categorias: ninguém escreve pelo app. Itens: só o dono do vendedor (RN11).
alter table public.categorias enable row level security;
alter table public.itens enable row level security;

create policy "categorias: logados leem"
  on public.categorias for select
  to authenticated
  using (true);

revoke all on public.categorias from anon;
revoke insert, update, delete, truncate on public.categorias from authenticated;

create policy "itens: logados leem"
  on public.itens for select
  to authenticated
  using (true);

create policy "itens: dono do vendedor cria"
  on public.itens for insert
  to authenticated
  with check (
    exists (
      select 1 from public.vendedores v
      where v.id = vendedor_id and v.perfil_id = (select auth.uid())
    )
  );

create policy "itens: dono do vendedor altera"
  on public.itens for update
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

create policy "itens: dono do vendedor apaga"
  on public.itens for delete
  to authenticated
  using (
    exists (
      select 1 from public.vendedores v
      where v.id = vendedor_id and v.perfil_id = (select auth.uid())
    )
  );

-- O dono só preenche e muda os dados do item; id e criado_em ficam com o padrão, e o item não muda de vendedor.
revoke all on public.itens from anon;
revoke insert, update on public.itens from authenticated;
grant insert (vendedor_id, categoria_id, nome, descricao, preco, foto_url, disponivel) on public.itens to authenticated;
grant update (categoria_id, nome, descricao, preco, foto_url, disponivel) on public.itens to authenticated;

-- Dados iniciais: raízes, subcategorias e folhas.
insert into public.categorias (nome) values ('Alimentação'), ('Outros produtos');

insert into public.categorias (nome, categoria_pai_id)
select sub.nome, c.id
from (values
  ('Alimentação', 'Doces'),
  ('Alimentação', 'Salgados'),
  ('Alimentação', 'Bebidas'),
  ('Alimentação', 'Refeições')
) as sub (pai, nome)
join public.categorias c on c.nome = sub.pai and c.categoria_pai_id is null;

insert into public.categorias (nome, categoria_pai_id, folha)
select folha.nome, c.id, true
from (values
  ('Doces', 'Brownie'),
  ('Doces', 'Bolo'),
  ('Doces', 'Brigadeiro'),
  ('Doces', 'Trufa'),
  ('Doces', 'Cookie'),
  ('Doces', 'Geladinho'),
  ('Salgados', 'Coxinha'),
  ('Salgados', 'Pastel'),
  ('Salgados', 'Empada'),
  ('Salgados', 'Pão de queijo'),
  ('Salgados', 'Sanduíche'),
  ('Bebidas', 'Café'),
  ('Bebidas', 'Suco'),
  ('Bebidas', 'Refrigerante'),
  ('Bebidas', 'Água'),
  ('Refeições', 'Marmita'),
  ('Refeições', 'Tapioca')
) as folha (pai, nome)
join public.categorias c on c.nome = folha.pai and c.categoria_pai_id is not null;

insert into public.categorias (nome, categoria_pai_id, folha)
select folha.nome, c.id, true
from (values
  ('Artesanato'),
  ('Bijuteria'),
  ('Material escolar')
) as folha (nome)
join public.categorias c on c.nome = 'Outros produtos' and c.categoria_pai_id is null;
