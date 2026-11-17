-- #109 [US05] Desliga quem fica 30 minutos sem sinal (RN16).
-- O app manda um sinal a cada 2 minutos ou 25 m (#111). Se o celular fechar o app ou ficar sem
-- internet, o sinal para, e esta rotina apaga a presença. Apagar a linha dispara o Realtime,
-- então o marcador some do mapa de quem está olhando, sem recarregar a página.

-- pg_cron: agendador de tarefas dentro do próprio Postgres (o Supabase recomenda o schema pg_catalog).
create extension if not exists pg_cron with schema pg_catalog;

create function public.desligar_presencas_sem_sinal()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_desligados integer;
begin
  delete from public.presenca
  where ultimo_sinal_em < now() - interval '30 minutes';

  get diagnostics v_desligados = row_count;
  return v_desligados; -- quantos foram desligados, aparece no histórico do cron (cron.job_run_details)
end;
$$;

comment on function public.desligar_presencas_sem_sinal() is
  'Apaga as presenças com o último sinal há mais de 30 minutos (RN16). Chamada pelo pg_cron a cada minuto.';

-- Só o agendador (que roda como postgres) chama a função; o app não precisa dela.
revoke execute on function public.desligar_presencas_sem_sinal() from public, anon, authenticated;

-- A cada minuto. Agendar de novo com o mesmo nome só atualiza a tarefa, não duplica.
select cron.schedule(
  'desligar-presencas-sem-sinal',
  '* * * * *',
  'select public.desligar_presencas_sem_sinal()'
);
