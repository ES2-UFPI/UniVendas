-- #152 [US18] Tabelas conversas e mensagens, com as regras de acesso e o tempo real.
-- Uma conversa é sempre entre um consumidor e um vendedor, no máximo uma por par (RN22).
-- Só os dois participantes leem e enviam mensagens; só texto, até 1000 caracteres (RN23).
-- Apagar a conta apaga as conversas e as mensagens em cascata (RN05).

create table public.conversas (
  id uuid primary key default gen_random_uuid(),
  consumidor_id uuid not null references public.perfis (id) on delete cascade, -- quem abriu a conversa; apagar a conta apaga a conversa (RN05)
  vendedor_id uuid not null references public.vendedores (id) on delete cascade, -- com quem; apagar o vendedor apaga a conversa (RN05)
  criada_em timestamptz not null default now(),
  unique (consumidor_id, vendedor_id) -- no máximo uma conversa por par (RN22)
);

comment on table public.conversas is 'Conversa entre um consumidor (perfil) e um vendedor. Uma por par (RN22).';

create index conversas_vendedor_id_idx on public.conversas (vendedor_id);

create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas (id) on delete cascade, -- apagar a conversa apaga as mensagens
  autor_id uuid not null references public.perfis (id) on delete cascade, -- apagar a conta apaga as mensagens dela (RN05)
  texto text not null check (char_length(btrim(texto)) between 1 and 1000), -- só texto, não vazio, até 1000 caracteres (RN23)
  enviada_em timestamptz not null default now()
);

comment on table public.mensagens is 'Mensagens de uma conversa. Só os dois participantes leem e enviam (RN23).';

-- A tela da conversa lê as mensagens de uma conversa em ordem de envio.
create index mensagens_conversa_id_enviada_em_idx on public.mensagens (conversa_id, enviada_em);

-- Diz se quem está logado participa da conversa: é o consumidor ou é o dono do vendedor.
-- security definer: a política de mensagens consulta conversas e vendedores sem depender da RLS delas.
-- stable: o resultado não muda dentro da mesma consulta, então o Postgres pode reaproveitá-lo.
create function public.participa_da_conversa(p_conversa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversas c
    join public.vendedores v on v.id = c.vendedor_id
    where c.id = p_conversa_id
      and (select auth.uid()) in (c.consumidor_id, v.perfil_id)
  );
$$;

revoke execute on function public.participa_da_conversa(uuid) from public, anon;
grant execute on function public.participa_da_conversa(uuid) to authenticated;

-- RLS: sem política, ninguém acessa. As políticas abaixo liberam só os participantes (RN23).
alter table public.conversas enable row level security;
alter table public.mensagens enable row level security;

-- O consumidor e o dono do vendedor veem a conversa.
create policy "conversas: participantes leem"
  on public.conversas for select
  to authenticated
  using (
    consumidor_id = (select auth.uid())
    or exists (
      select 1 from public.vendedores v
      where v.id = vendedor_id and v.perfil_id = (select auth.uid())
    )
  );

-- Quem abre a conversa é sempre o consumidor logado, e nunca com o próprio perfil de vendedor (RN22).
-- Esta regra precisa olhar a tabela vendedores, então fica na política, e não num check da tabela.
create policy "conversas: consumidor abre"
  on public.conversas for insert
  to authenticated
  with check (
    consumidor_id = (select auth.uid())
    and not exists (
      select 1 from public.vendedores v
      where v.id = vendedor_id and v.perfil_id = (select auth.uid())
    )
  );

-- Conversa não é alterada nem apagada pelo app; só some com a exclusão da conta (RN05).
-- No insert, o app só informa os dois participantes; id e criada_em vêm do banco.
revoke insert, update, delete, truncate on public.conversas from authenticated;
grant insert (consumidor_id, vendedor_id) on public.conversas to authenticated;
revoke all on public.conversas from anon;

create policy "mensagens: participantes leem"
  on public.mensagens for select
  to authenticated
  using (public.participa_da_conversa(conversa_id));

-- Só um participante envia, e sempre em nome próprio.
create policy "mensagens: participantes enviam"
  on public.mensagens for insert
  to authenticated
  with check (
    autor_id = (select auth.uid())
    and public.participa_da_conversa(conversa_id)
  );

-- Mensagem enviada não é editada nem apagada (o histórico fica guardado, RN23).
-- No insert, o app só informa conversa, autor e texto; a hora do envio vem do banco (ninguém volta no tempo).
revoke insert, update, delete, truncate on public.mensagens from authenticated;
grant insert (conversa_id, autor_id, texto) on public.mensagens to authenticated;
revoke all on public.mensagens from anon;

-- A tela "Conversas" do vendedor mostra o nome de quem falou com ele. Pela regra de perfis, cada um só lê
-- o próprio perfil; esta política libera também o perfil de quem tem conversa com um vendedor seu.
-- O consumidor não precisa dela: o nome do vendedor vem de vendedores, que todo logado já lê.
create policy "perfis: vendedor lê quem conversa com ele"
  on public.perfis for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversas c
      join public.vendedores v on v.id = c.vendedor_id
      where c.consumidor_id = perfis.id
        and v.perfil_id = (select auth.uid())
    )
  );

-- Realtime: a tela da conversa recebe a mensagem nova sem recarregar. O Realtime respeita a política de leitura acima.
alter publication supabase_realtime add table public.mensagens;
