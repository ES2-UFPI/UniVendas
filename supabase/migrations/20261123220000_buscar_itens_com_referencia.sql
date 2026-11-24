-- #165 [US21] A tela de busca nova mostra onde achar o vendedor ("Perto da Biblioteca Central")
-- e abre o detalhe de um item. Por isso a busca passa a devolver a referência da presença (RN18)
-- e aceita o id de um item, para o detalhe ler o mesmo formato da lista.

-- Mudar o retorno e os parâmetros exige apagar a versão anterior.
drop function public.buscar_itens(text, integer);

-- security invoker (o padrão): a RLS de itens, vendedores, categorias e presenca continua valendo (RN04).
create function public.buscar_itens(
  texto text default '',
  categoria integer default null,
  item uuid default null
)
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
  no_campus_agora boolean,
  referencia text
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
    p.vendedor_id is not null,
    -- Onde achar o vendedor, só enquanto ele está no mapa (RN18).
    p.referencia
  from public.itens i
  join public.vendedores v on v.id = i.vendedor_id
  left join public.presenca p
    on p.vendedor_id = i.vendedor_id
    and p.ultimo_sinal_em > now() - interval '30 minutes'
  cross join termo t
  -- Com um item, só ele. Sem categoria, o texto precisa de 2 letras (menos que isso traria quase tudo).
  -- Com categoria, o texto é opcional: vazio traz todos os itens dela.
  where (item is null or i.id = item)
    and (t.tamanho >= 2 or categoria is not null or item is not null)
    and (categoria is null or i.categoria_id in (select a.id from arvore a))
    and (
      t.tamanho = 0
      or extensions.unaccent(lower(i.nome)) like '%' || t.valor || '%'
      or extensions.unaccent(lower(v.nome_exibicao)) like '%' || t.valor || '%'
    )
  order by i.disponivel desc, lower(i.nome), i.id
  limit 50;
$$;

revoke execute on function public.buscar_itens(text, integer, uuid) from public, anon;
grant execute on function public.buscar_itens(text, integer, uuid) to authenticated;
