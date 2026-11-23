-- #170 [US12] A busca também filtra por categoria, trazendo os itens da categoria escolhida e de
-- todas as filhas (escolher Alimentação traz Doces, Brownie, Café...). Continua como na #167:
-- sem diferenciar maiúsculas e acentos, disponíveis primeiro e esgotados depois (RN09).

-- Mudar os parâmetros exige apagar a versão antiga, que só recebia o texto.
drop function public.buscar_itens(text);

-- security invoker (o padrão): a RLS de itens, vendedores, categorias e presenca continua valendo (RN04).
create function public.buscar_itens(texto text default '', categoria integer default null)
returns table (
  id uuid,
  vendedor_id uuid,
  vendedor_nome text,
  categoria_id integer,
  nome text,
  descricao text,
  preco numeric,
  foto_url text,
  disponivel boolean,
  no_campus_agora boolean
)
language sql
stable
set search_path = ''
as $$
  with recursive arvore as (
    -- A categoria escolhida e, descendo pela árvore, todas as filhas dela.
    select c.id from public.categorias c where c.id = categoria
    union all
    select filha.id from public.categorias filha join arvore a on filha.categoria_pai_id = a.id
  ),
  limpo as (
    -- Sem acento, sem espaços nas pontas e em minúsculas.
    select extensions.unaccent(lower(btrim(coalesce(texto, '')))) as valor
  ),
  termo as (
    -- % e _ viram texto comum, para não funcionarem como curinga no like.
    select
      char_length(l.valor) as tamanho,
      replace(replace(replace(l.valor, '\', '\\'), '%', '\%'), '_', '\_') as valor
    from limpo l
  )
  select
    i.id,
    i.vendedor_id,
    v.nome_exibicao,
    i.categoria_id,
    i.nome,
    i.descricao,
    i.preco,
    i.foto_url,
    i.disponivel,
    -- No mapa agora: presença com sinal nos últimos 30 minutos (RN16).
    exists (
      select 1 from public.presenca p
      where p.vendedor_id = i.vendedor_id
        and p.ultimo_sinal_em > now() - interval '30 minutes'
    )
  from public.itens i
  join public.vendedores v on v.id = i.vendedor_id
  cross join termo t
  -- Sem categoria, o texto precisa de 2 letras (menos que isso traria quase tudo).
  -- Com categoria, o texto é opcional: vazio traz todos os itens dela.
  where (t.tamanho >= 2 or categoria is not null)
    and (categoria is null or i.categoria_id in (select a.id from arvore a))
    and (
      t.tamanho = 0
      or extensions.unaccent(lower(i.nome)) like '%' || t.valor || '%'
      or extensions.unaccent(lower(v.nome_exibicao)) like '%' || t.valor || '%'
    )
  order by i.disponivel desc, lower(i.nome), i.id
  limit 50;
$$;

revoke execute on function public.buscar_itens(text, integer) from public, anon;
grant execute on function public.buscar_itens(text, integer) to authenticated;
