-- #67 [US04] Tabela presenca e a função registrar_presenca, com a regra do perímetro do campus.
-- Um vendedor está ativo enquanto tem uma linha aqui (RN16). Desligar é apagar a linha, o que apaga a posição (RN17).
-- O app nunca escreve direto na tabela: só a função registrar_presenca grava, depois de checar o perímetro (RN15).

create table public.presenca (
  vendedor_id uuid primary key references public.vendedores (id) on delete cascade, -- apagar o vendedor apaga a presença (RN05)
  latitude double precision not null check (latitude between -90 and 90), -- posição exibida no mapa
  longitude double precision not null check (longitude between -180 and 180), -- posição exibida no mapa
  ponto_escolhido boolean not null default false, -- true = ponto fixo escolhido no mapa (RN14)
  referencia text check (referencia is null or char_length(referencia) <= 80), -- opcional, até 80 caracteres (RN18)
  ativado_em timestamptz not null default now(),
  ultimo_sinal_em timestamptz not null default now()
);

comment on table public.presenca is 'Vendedores ativos no campus agora. Escrita só pela função registrar_presenca.';

-- RLS: quem está logado lê (RN04); ninguém escreve direto. Sem política de insert, update ou delete, o RLS já nega;
-- o revoke é uma segunda trava.
alter table public.presenca enable row level security;

create policy "presenca: logados leem"
  on public.presenca for select
  to authenticated
  using (true);

revoke all on public.presenca from anon;
revoke insert, update, delete, truncate on public.presenca from authenticated;

-- Perímetro do campus Ministro Petrônio Portella (RN15).
-- Origem: OpenStreetMap, relação 13751151, baixada em 20/10/2026. Pontos em [latitude, longitude].
-- Dentro do polígono ou a até 100 m da borda conta como dentro (tolerância pela imprecisão do GPS).
-- Sem PostGIS: o teste do ponto dentro do polígono (ray casting) e a distância até a borda são feitos aqui mesmo.
-- Função interna: só a registrar_presenca chama.
create function public.no_perimetro_do_campus(lat double precision, lng double precision)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  perimetro constant double precision[] := array[
    [-5.0538789, -42.8002240],
    [-5.0541757, -42.7994018],
    [-5.0542074, -42.7993470],
    [-5.0546153, -42.7988084],
    [-5.0546406, -42.7987708],
    [-5.0547436, -42.7986175],
    [-5.0555091, -42.7976214],
    [-5.0555355, -42.7975884],
    [-5.0557076, -42.7973601],
    [-5.0557283, -42.7973698],
    [-5.0563638, -42.7963077],
    [-5.0565909, -42.7959261],
    [-5.0570904, -42.7950764],
    [-5.0566837, -42.7947035],
    [-5.0566801, -42.7946225],
    [-5.0566424, -42.7944623],
    [-5.0563897, -42.7942122],
    [-5.0563474, -42.7939856],
    [-5.0561932, -42.7938682],
    [-5.0557212, -42.7933495],
    [-5.0534419, -42.7907828],
    [-5.0532707, -42.7906325],
    [-5.0545867, -42.7894772],
    [-5.0554769, -42.7886660],
    [-5.0562033, -42.7879838],
    [-5.0562900, -42.7879873],
    [-5.0620605, -42.7943406],
    [-5.0623715, -42.7950766],
    [-5.0626623, -42.7959912],
    [-5.0627239, -42.7963770],
    [-5.0627223, -42.7966902],
    [-5.0627034, -42.7969179],
    [-5.0625157, -42.7982794],
    [-5.0622100, -42.8004062],
    [-5.0619859, -42.8021522],
    [-5.0602522, -42.8043630],
    [-5.0579140, -42.8079486],
    [-5.0574411, -42.8079271],
    [-5.0571632, -42.8078896],
    [-5.0568747, -42.8078359],
    [-5.0566807, -42.8077947],
    [-5.0565968, -42.8077769],
    [-5.0563083, -42.8077447],
    [-5.0560304, -42.8077233],
    [-5.0557686, -42.8076643],
    [-5.0555134, -42.8076449],
    [-5.0554853, -42.8076428],
    [-5.0552075, -42.8075624],
    [-5.0549296, -42.8075409],
    [-5.0548926, -42.8075288],
    [-5.0546518, -42.8074497],
    [-5.0543792, -42.8073371],
    [-5.0543485, -42.8073282],
    [-5.0541014, -42.8072566],
    [-5.0538288, -42.8071815],
    [-5.0535670, -42.8071332],
    [-5.0532891, -42.8071010],
    [-5.0530006, -42.8070098],
    [-5.0527388, -42.8068972],
    [-5.0524769, -42.8067899],
    [-5.0521991, -42.8066719],
    [-5.0519158, -42.8065914],
    [-5.0516487, -42.8064948],
    [-5.0513387, -42.8064036],
    [-5.0510555, -42.8063232],
    [-5.0509144, -42.8062256],
    [-5.0508151, -42.8061569],
    [-5.0505586, -42.8060389],
    [-5.0536695, -42.8011620]
  ];
  tolerancia_m constant double precision := 100;
  metros_por_grau constant double precision := 111320; -- aproximação plana, suficiente para 100 m
  n constant int := array_length(perimetro, 1);
  fator_lng constant double precision := cos(radians(lat));
  i int;
  j int := n;
  dentro boolean := false;
  a_x double precision;
  a_y double precision;
  b_x double precision;
  b_y double precision;
  dx double precision;
  dy double precision;
  comprimento2 double precision;
  t double precision;
begin
  -- 1) O ponto está dentro do polígono? (conta quantas arestas um raio para a direita cruza)
  for i in 1..n loop
    if ((perimetro[i][2] > lng) <> (perimetro[j][2] > lng))
       and (lat < (perimetro[i][1] - perimetro[j][1]) * (lng - perimetro[j][2])
                  / (perimetro[i][2] - perimetro[j][2]) + perimetro[j][1]) then
      dentro := not dentro;
    end if;
    j := i;
  end loop;

  if dentro then
    return true;
  end if;

  -- 2) Fora do polígono: está a até 100 m de alguma aresta? (distância do ponto ao segmento, em metros)
  j := n;
  for i in 1..n loop
    a_x := (perimetro[j][2] - lng) * fator_lng * metros_por_grau;
    a_y := (perimetro[j][1] - lat) * metros_por_grau;
    b_x := (perimetro[i][2] - lng) * fator_lng * metros_por_grau;
    b_y := (perimetro[i][1] - lat) * metros_por_grau;
    dx := b_x - a_x;
    dy := b_y - a_y;
    comprimento2 := dx * dx + dy * dy;
    if comprimento2 = 0 then
      t := 0;
    else
      t := greatest(0, least(1, -(a_x * dx + a_y * dy) / comprimento2));
    end if;
    if sqrt((a_x + t * dx) ^ 2 + (a_y + t * dy) ^ 2) <= tolerancia_m then
      return true;
    end if;
    j := i;
  end loop;

  return false;
end;
$$;

revoke execute on function public.no_perimetro_do_campus(double precision, double precision) from public, anon, authenticated;

-- Liga (ou renova) a presença do vendedor logado. Devolve 'ok', 'fora_do_campus' ou 'ponto_fora_do_campus'.
-- lat_real/lng_real: onde o celular está de verdade, usada só para checar o perímetro.
-- lat_ponto/lng_ponto: ponto fixo escolhido no mapa (RN14); os dois nulos = mostrar a posição real.
-- Se a posição real estiver fora do campus, apaga a presença (RN15). Só o ponto exibido é gravado (RN17).
-- security definer: roda com o dono da função, porque o app não tem permissão de escrever em presenca.
-- search_path vazio obriga a escrever public.presenca, evitando que outra tabela com o mesmo nome seja usada.
create function public.registrar_presenca(
  lat_real double precision,
  lng_real double precision,
  lat_ponto double precision default null,
  lng_ponto double precision default null,
  referencia text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vendedor_id uuid;
  v_lat double precision;
  v_lng double precision;
  v_escolhido boolean := lat_ponto is not null;
  v_referencia text := nullif(btrim(referencia), '');
begin
  -- O vendedor vem da sessão, nunca de um parâmetro (ninguém registra presença de outro).
  select v.id into v_vendedor_id
  from public.vendedores v
  where v.perfil_id = (select auth.uid());

  if v_vendedor_id is null then
    raise exception 'Só vendedores podem ficar ativos no mapa.' using errcode = '42501';
  end if;

  if lat_real is null or lng_real is null
     or lat_real not between -90 and 90 or lng_real not between -180 and 180
     or (lat_ponto is null) <> (lng_ponto is null)
     or lat_ponto not between -90 and 90 or lng_ponto not between -180 and 180 then
    raise exception 'Coordenadas inválidas.' using errcode = '22023';
  end if;

  if char_length(v_referencia) > 80 then
    raise exception 'A referência pode ter até 80 caracteres.' using errcode = '22023';
  end if;

  -- RN15: localização real fora do perímetro recusa a ativação e desliga quem já estava ativo.
  if not public.no_perimetro_do_campus(lat_real, lng_real) then
    delete from public.presenca where vendedor_id = v_vendedor_id;
    return 'fora_do_campus';
  end if;

  -- RN14: o ponto escolhido também precisa estar dentro do campus.
  if v_escolhido and not public.no_perimetro_do_campus(lat_ponto, lng_ponto) then
    return 'ponto_fora_do_campus';
  end if;

  -- RN17: grava só o ponto exibido (o escolhido, se houver; senão a posição real).
  v_lat := coalesce(lat_ponto, lat_real);
  v_lng := coalesce(lng_ponto, lng_real);

  insert into public.presenca (vendedor_id, latitude, longitude, ponto_escolhido, referencia)
  values (v_vendedor_id, v_lat, v_lng, v_escolhido, v_referencia)
  on conflict (vendedor_id) do update
    set latitude = excluded.latitude,
        longitude = excluded.longitude,
        ponto_escolhido = excluded.ponto_escolhido,
        referencia = excluded.referencia,
        ultimo_sinal_em = now(); -- ativado_em fica como estava

  return 'ok';
end;
$$;

revoke execute on function public.registrar_presenca(double precision, double precision, double precision, double precision, text) from public, anon;
grant execute on function public.registrar_presenca(double precision, double precision, double precision, double precision, text) to authenticated;

-- Realtime: o mapa recebe um evento sempre que a tabela muda. O Realtime respeita a política de leitura acima.
alter publication supabase_realtime add table public.presenca;
