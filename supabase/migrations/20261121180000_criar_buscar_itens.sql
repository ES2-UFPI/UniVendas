-- #167 [US11] Busca por nome de produto ou de vendedor, sem diferenciar maiúsculas e acentos.
-- Disponíveis primeiro, esgotados depois (RN09). O filtro por categoria entra com a US12.

-- unaccent tira os acentos ("Café" vira "Cafe"). No Supabase as extensões ficam no schema extensions.
create extension if not exists unaccent with schema extensions;

-- security invoker (o padrão): a função lê com as permissões de quem chama, então a RLS de itens,
-- vendedores e presenca continua valendo (só logados leem, RN04).
create function public.buscar_itens(texto text)
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
  with limpo as (
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
  -- Menos de 2 letras devolveria quase tudo: a busca fica vazia.
  where t.tamanho >= 2
    and (
      extensions.unaccent(lower(i.nome)) like '%' || t.valor || '%'
      or extensions.unaccent(lower(v.nome_exibicao)) like '%' || t.valor || '%'
    )
  order by i.disponivel desc, lower(i.nome), i.id
  limit 50;
$$;

revoke execute on function public.buscar_itens(text) from public, anon;
grant execute on function public.buscar_itens(text) to authenticated;
