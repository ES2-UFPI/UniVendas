-- #173 [US17] Função que exclui a conta de quem está logado e os dados dela (RN05).
-- Apagar o usuário em auth.users apaga tudo em cascata, pelas chaves estrangeiras:
-- perfis -> vendedores -> contatos, presenca e itens (cada uma com on delete cascade).
-- As conversas e mensagens (US18) entram na mesma cascata se as chaves delas também forem on delete cascade.

create function public.excluir_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil_id uuid := (select auth.uid());
begin
  -- A conta vem da sessão, nunca de um parâmetro (ninguém exclui a conta de outro, RN11).
  if v_perfil_id is null then
    raise exception 'Entre na sua conta para excluí-la.' using errcode = '42501';
  end if;

  delete from auth.users where id = v_perfil_id;
end;
$$;

comment on function public.excluir_conta() is 'Exclui a conta de quem está logado, com perfil, vendedor, contatos, presença e itens em cascata (RN05).';

revoke execute on function public.excluir_conta() from public, anon;
grant execute on function public.excluir_conta() to authenticated;
