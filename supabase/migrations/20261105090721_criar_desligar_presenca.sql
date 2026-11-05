-- #108 [US05] Função desligar_presenca: o vendedor desliga o próprio status e a posição é apagada (RN17).
-- A registrar_presenca (migração 20261020120000) já aceita o ponto fixo (RN14), confere o perímetro com a
-- posição real e desliga quem saiu do campus (RN15); renova ultimo_sinal_em a cada sinal. Faltava só o desligar manual.
-- Como o app não escreve direto em presenca, o desligar também passa por uma função do banco.

-- Desliga a presença do vendedor logado. Desligar é apagar a linha, o que apaga a posição (RN17).
-- Não falha se ele já estava desligado (chamar duas vezes dá o mesmo resultado).
-- security definer: roda com o dono da função, porque o app não tem permissão de apagar em presenca.
-- search_path vazio obriga a escrever public.presenca, evitando que outra tabela com o mesmo nome seja usada.
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
