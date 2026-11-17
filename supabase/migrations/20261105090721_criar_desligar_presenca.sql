create function public.desligar_presenca()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vendedor_id uuid;
begin
  -- O vendedor vem da sessão, nunca de um parâmetro (ninguém desliga a presença de outro, RN11).
  select v.id into v_vendedor_id
  from public.vendedores v
  where v.perfil_id = (select auth.uid());

  if v_vendedor_id is null then
    raise exception 'Só vendedores podem ficar ativos no mapa.' using errcode = '42501';
  end if;

  delete from public.presenca where vendedor_id = v_vendedor_id;
end;
$$;

revoke execute on function public.desligar_presenca() from public, anon;
grant execute on function public.desligar_presenca() to authenticated;
