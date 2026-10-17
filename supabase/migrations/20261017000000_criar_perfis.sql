-- #51 [US01] Tabela perfis e trigger que cria o perfil no cadastro.
-- Todo usuário de auth.users ganha uma linha aqui, criada pelo banco (ninguém fica sem perfil).

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade, -- apagar a conta apaga o perfil (RN05)
  nome text not null default '',
  eh_moderador boolean not null default false,
  criado_em timestamptz not null default now()
);

comment on table public.perfis is 'Um perfil por conta. Ser vendedor = ter linha em vendedores (D2).';

-- RLS: sem política, ninguém acessa. As políticas abaixo liberam só o próprio perfil e só para quem está logado (RN04).
alter table public.perfis enable row level security;

create policy "perfis: cada um lê o próprio"
  on public.perfis for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "perfis: cada um altera o próprio"
  on public.perfis for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- O usuário só pode mudar o nome; eh_moderador, id e criado_em ficam fora do alcance dele.
revoke update on public.perfis from authenticated;
grant update (nome) on public.perfis to authenticated;

-- Trigger: quando o Supabase Auth cria um usuário, cria o perfil dele.
-- security definer roda com o dono da função, porque quem se cadastra ainda não tem permissão de inserir.
-- search_path vazio obriga a escrever public.perfis, evitando que outra tabela com o mesmo nome seja usada.
create function public.criar_perfil_no_cadastro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', ''));
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_no_cadastro();
