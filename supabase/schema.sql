-- Simplifika · esquema de base de datos para Supabase
-- Pégalo completo en Supabase → SQL Editor → Run.
--
-- Seguridad: todas las tablas tienen Row Level Security (RLS). Cada persona
-- solo puede leer y modificar las filas con su propio user_id, así que varios
-- amigos pueden usar la misma instalación sin ver los datos de los demás.

create table if not exists public.perfil (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  ingreso_mensual bigint not null default 0,
  meta_ahorro bigint not null default 0,
  presupuesto_deudas bigint not null default 0, -- total al mes para deudas (cuotas + abono extra)
  revisado_mes text,                            -- último mes con revisión de fin de mes, 'YYYY-MM'
  tarjetas text[] not null default '{}',        -- tarjetas del catálogo de descuentos (js/beneficios.js)
  creado timestamptz not null default now()
);

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  icono text,
  tipo text not null default 'gasto' check (tipo in ('gasto', 'ingreso')),
  tope_mensual bigint not null default 0,
  palabras text,
  orden int not null default 0,
  creado timestamptz not null default now()
);

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  palabras text,
  activo boolean not null default true,
  creado timestamptz not null default now()
);

create table if not exists public.deudas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  acreedor text,
  saldo bigint not null default 0,
  cuota_mensual bigint not null default 0,
  cae numeric(6, 2) not null default 0,
  dia_pago smallint check (dia_pago between 1 and 31),
  cupo_total bigint,                    -- tarjetas: cupo autorizado, para la alerta de uso
  fecha_limite text,                    -- 'YYYY-MM': debe quedar pagada a más tardar ese mes
  estado text not null default 'activa' check (estado in ('activa', 'pausa')),
  notas text,                           -- acuerdos: "cuotas de honor", "pausa hasta resolver tarjetas"
  creado timestamptz not null default now()
);

create table if not exists public.compromisos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  monto bigint not null default 0,
  dia_pago smallint check (dia_pago between 1 and 31),
  categoria_id uuid,                    -- clave foránea con dueño, más abajo
  activo boolean not null default true,
  hasta_mes text,                       -- 'YYYY-MM' para compras en cuotas; null = indefinido
  pagados text[] not null default '{}', -- meses pagados, 'YYYY-MM'
  creado timestamptz not null default now()
);

-- "Me deben": personas a las que les prestaste o pagaste algo, y lo que te deben.
create table if not exists public.personas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  creado timestamptz not null default now()
);

create table if not exists public.cobros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  persona_id uuid not null,              -- clave foránea con dueño, más abajo
  concepto text not null,
  monto_total bigint not null default 0 check (monto_total >= 0),
  cuotas smallint not null default 1 check (cuotas between 1 and 120),
  primer_vencimiento date,               -- las demás cuotas vencen mes a mes desde aquí
  estado text not null default 'pendiente' check (estado in ('pendiente', 'perdonado')),
  creado timestamptz not null default now()
);

create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  fecha date not null,
  monto bigint not null check (monto >= 0),
  tipo text not null default 'gasto' check (tipo in ('gasto', 'ingreso')),
  descripcion text,
  comercio text,
  categoria_id uuid,                     -- estas cinco: claves foráneas con dueño, más abajo
  evento_id uuid,
  compromiso_id uuid,
  deuda_id uuid,
  cobro_id uuid,                         -- pago de algo que te debían ("Me deben")
  origen text not null default 'manual', -- 'manual' | 'correo'
  estado text not null default 'clasificado' check (estado in ('pendiente', 'clasificado')),
  id_externo text,                       -- id del correo del banco, para no duplicar (fase 2)
  creado timestamptz not null default now(),
  unique (user_id, id_externo)
);

-- Lo que la app aprende: "este comercio es de esta categoría".
create table if not exists public.reglas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  patron text not null,
  categoria_id uuid not null,            -- clave foránea con dueño, más abajo
  creado timestamptz not null default now(),
  unique (user_id, patron)
);

-- Avisos al celular: un celular o navegador donde la persona activó los avisos.
-- No es parte de sus datos (no va en los respaldos): es la dirección a la que
-- el servicio de notificaciones de Google, Apple o Mozilla entrega el aviso.
create table if not exists public.suscripciones_push (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null check (endpoint like 'https://%' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  creado timestamptz not null default now(),
  unique (endpoint)
);

-- Un celular es de una sola cuenta: si otra persona inicia sesión en él, los
-- avisos pasan a ella (anotar_suscripcion). Antes era único por (user_id, endpoint)
-- y el mismo celular podía recibir los avisos de dos cuentas.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'suscripciones_push_endpoint_key') then
    delete from public.suscripciones_push a using public.suscripciones_push b
    where a.endpoint = b.endpoint and (a.creado, a.id) < (b.creado, b.id);
    alter table public.suscripciones_push drop constraint if exists suscripciones_push_user_id_endpoint_key;
    alter table public.suscripciones_push add constraint suscripciones_push_endpoint_key unique (endpoint);
  end if;
end $$;

-- Instalaciones anteriores: columnas agregadas después de crear las tablas.
alter table public.perfil add column if not exists tarjetas text[] not null default '{}';
alter table public.movimientos add column if not exists cobro_id uuid;

create index if not exists movimientos_usuario_fecha on public.movimientos (user_id, fecha desc);

-- Row Level Security: cada usuario solo ve y toca lo suyo.
do $$
declare t text;
begin
  foreach t in array array['perfil', 'categorias', 'eventos', 'deudas', 'compromisos', 'personas', 'cobros', 'movimientos', 'reglas', 'suscripciones_push'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "solo lo propio" on public.%I', t);
    execute format(
      'create policy "solo lo propio" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t);
  end loop;
end $$;

-- Claves foráneas con dueño: una fila solo puede apuntar a categorías, eventos,
-- compromisos, deudas, personas o cobros con su mismo user_id. RLS no alcanza, porque Postgres
-- revisa las claves foráneas sin mirar las políticas: con una clave simple,
-- alguien podría guardar en su fila el id de un registro ajeno.
-- Va después de RLS para que, si algo falla aquí, las políticas ya estén puestas.
do $$
declare
  t text;
  r record;
  nombre text;
begin
  -- "set null (columna)" existe desde Postgres 15.
  if current_setting('server_version_num')::int < 150000 then
    raise exception 'Las claves foráneas con dueño necesitan Postgres 15 o más nuevo (esta base tiene %).', current_setting('server_version');
  end if;

  foreach t in array array['categorias', 'eventos', 'compromisos', 'deudas', 'personas', 'cobros'] loop
    if not exists (select 1 from pg_constraint
                   where conrelid = format('public.%I', t)::regclass and conname = t || '_id_dueno') then
      execute format('alter table public.%I add constraint %I unique (id, user_id)', t, t || '_id_dueno');
    end if;
  end loop;

  for r in select * from (values
      ('compromisos', 'categoria_id',  'categorias',  'set null (categoria_id)'),
      ('movimientos', 'categoria_id',  'categorias',  'set null (categoria_id)'),
      ('movimientos', 'evento_id',     'eventos',     'set null (evento_id)'),
      ('movimientos', 'compromiso_id', 'compromisos', 'set null (compromiso_id)'),
      ('movimientos', 'deuda_id',      'deudas',      'set null (deuda_id)'),
      ('reglas',      'categoria_id',  'categorias',  'cascade'),
      -- Una persona con cuentas no se puede borrar: la app pide borrar sus cuentas primero.
      ('cobros',      'persona_id',    'personas',    'restrict'),
      ('movimientos', 'cobro_id',      'cobros',      'set null (cobro_id)')
    ) as v(tabla, columna, padre, al_borrar)
  loop
    nombre := r.tabla || '_' || r.columna || '_dueno';

    if not exists (select 1 from pg_constraint
                   where conrelid = format('public.%I', r.tabla)::regclass and conname = nombre) then
      -- "not valid": rige para lo nuevo sin revisar ni tocar lo ya guardado.
      execute format(
        'alter table public.%I add constraint %I foreign key (%I, user_id) references public.%I (id, user_id) on delete %s not valid',
        r.tabla, nombre, r.columna, r.padre, r.al_borrar);
    end if;

    -- Revisa lo ya guardado. Solo si todo calza se quita la clave simple de
    -- instalaciones anteriores; si hay una referencia ajena, la fila queda como
    -- está, la clave simple sigue protegiéndola y se avisa.
    begin
      execute format('alter table public.%I validate constraint %I', r.tabla, nombre);
      execute format('alter table public.%I drop constraint if exists %I', r.tabla, r.tabla || '_' || r.columna || '_fkey');
    exception when foreign_key_violation then
      raise warning '% tiene filas con % de otro usuario: revísalas a mano', r.tabla, r.columna;
    end;
  end loop;
end $$;

-- Índices para las claves foráneas con dueño: al borrar una categoría, un
-- evento, un compromiso o una deuda, Postgres busca las filas que apuntan ahí.
create index if not exists movimientos_categoria on public.movimientos (user_id, categoria_id);
create index if not exists movimientos_evento on public.movimientos (user_id, evento_id);
create index if not exists movimientos_compromiso on public.movimientos (user_id, compromiso_id);
create index if not exists movimientos_deuda on public.movimientos (user_id, deuda_id);
create index if not exists compromisos_categoria on public.compromisos (user_id, categoria_id);
create index if not exists reglas_categoria on public.reglas (user_id, categoria_id);
create index if not exists movimientos_cobro on public.movimientos (user_id, cobro_id);
create index if not exists cobros_persona on public.cobros (user_id, persona_id);

-- Restaurar un respaldo: reemplaza todos los datos de la persona por los del
-- archivo en una sola transacción, así que si algo falla no se borra nada.
-- "security invoker" corre con los permisos de quien la llama: RLS sigue
-- mandando y el user_id siempre es el de la sesión, venga lo que venga en el
-- archivo. La app manda las filas ya limpias y con ids nuevos (js/validar.js).
create or replace function public.restaurar_respaldo(respaldo jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  yo uuid := (select auth.uid());
begin
  if yo is null then
    raise exception 'Hay que iniciar sesión para restaurar un respaldo';
  end if;
  -- Un respaldo siempre trae categorías: así una llamada vacía no puede dejar la cuenta en blanco.
  if jsonb_typeof(respaldo->'categorias') is distinct from 'array' or jsonb_array_length(respaldo->'categorias') = 0 then
    raise exception 'El respaldo no trae categorías';
  end if;

  delete from public.reglas where user_id = yo;
  delete from public.movimientos where user_id = yo;
  delete from public.cobros where user_id = yo;
  delete from public.personas where user_id = yo;
  delete from public.compromisos where user_id = yo;
  delete from public.deudas where user_id = yo;
  delete from public.eventos where user_id = yo;
  delete from public.categorias where user_id = yo;

  insert into public.categorias (id, user_id, nombre, icono, tipo, tope_mensual, palabras, orden)
  select id, yo, nombre, icono, tipo, tope_mensual, palabras, orden
  from jsonb_populate_recordset(null::public.categorias, coalesce(respaldo->'categorias', '[]'));

  insert into public.eventos (id, user_id, nombre, palabras, activo)
  select id, yo, nombre, palabras, activo
  from jsonb_populate_recordset(null::public.eventos, coalesce(respaldo->'eventos', '[]'));

  insert into public.deudas (id, user_id, nombre, acreedor, saldo, cuota_mensual, cae, dia_pago, cupo_total, fecha_limite, estado, notas)
  select id, yo, nombre, acreedor, saldo, cuota_mensual, cae, dia_pago, cupo_total, fecha_limite, estado, notas
  from jsonb_populate_recordset(null::public.deudas, coalesce(respaldo->'deudas', '[]'));

  insert into public.compromisos (id, user_id, nombre, monto, dia_pago, categoria_id, activo, hasta_mes, pagados)
  select id, yo, nombre, monto, dia_pago, categoria_id, activo, hasta_mes, pagados
  from jsonb_populate_recordset(null::public.compromisos, coalesce(respaldo->'compromisos', '[]'));

  insert into public.personas (id, user_id, nombre)
  select id, yo, nombre
  from jsonb_populate_recordset(null::public.personas, coalesce(respaldo->'personas', '[]'));

  insert into public.cobros (id, user_id, persona_id, concepto, monto_total, cuotas, primer_vencimiento, estado)
  select id, yo, persona_id, concepto, monto_total, cuotas, primer_vencimiento, estado
  from jsonb_populate_recordset(null::public.cobros, coalesce(respaldo->'cobros', '[]'));

  insert into public.movimientos (id, user_id, fecha, monto, tipo, descripcion, comercio, categoria_id, evento_id, compromiso_id, deuda_id, cobro_id, origen, estado, id_externo)
  select id, yo, fecha, monto, tipo, descripcion, comercio, categoria_id, evento_id, compromiso_id, deuda_id, cobro_id, origen, estado, id_externo
  from jsonb_populate_recordset(null::public.movimientos, coalesce(respaldo->'movimientos', '[]'));

  insert into public.reglas (id, user_id, patron, categoria_id)
  select id, yo, patron, categoria_id
  from jsonb_populate_recordset(null::public.reglas, coalesce(respaldo->'reglas', '[]'));

  insert into public.perfil (user_id, ingreso_mensual, meta_ahorro, presupuesto_deudas, revisado_mes, tarjetas)
  select yo, coalesce(p.ingreso_mensual, 0), coalesce(p.meta_ahorro, 0), coalesce(p.presupuesto_deudas, 0), p.revisado_mes, coalesce(p.tarjetas, '{}')
  from jsonb_populate_record(null::public.perfil, coalesce(respaldo->'perfil', '{}')) as p
  on conflict (user_id) do update set
    ingreso_mensual = excluded.ingreso_mensual,
    meta_ahorro = excluded.meta_ahorro,
    presupuesto_deudas = excluded.presupuesto_deudas,
    revisado_mes = excluded.revisado_mes,
    tarjetas = excluded.tarjetas;
end $$;

-- Solo con sesión iniciada: Postgres deja ejecutar funciones a todos por defecto.
revoke execute on function public.restaurar_respaldo(jsonb) from public, anon;
grant execute on function public.restaurar_respaldo(jsonb) to authenticated;

-- Avisos al celular: los celulares de quienes hoy tienen una cuota por recibir
-- que todavía no les pagan. Las cuotas se calculan igual que en la app
-- (cuotasDeCobro en js/calculos.js): partes enteras, las primeras con el peso
-- que sobra, y una por mes desde la primera; lo pagado cubre las cuotas en orden.
-- Solo la llama la función avisar-cobros (supabase/functions), con la clave de servicio.
create or replace function public.suscripciones_para_avisar(hoy date default (now() at time zone 'America/Santiago')::date)
returns table (id uuid, endpoint text, p256dh text, auth text)
language sql stable security invoker set search_path = ''
as $$
  with pagado as (
    select m.cobro_id, sum(m.monto) as total
    from public.movimientos m
    where m.tipo = 'ingreso' and m.cobro_id is not null
    group by m.cobro_id
  ), cuotas as (
    select c.id, c.user_id,
      (c.primer_vencimiento + make_interval(months => k - 1))::date as vence,
      sum(c.monto_total / c.cuotas + case when k <= c.monto_total % c.cuotas then 1 else 0 end)
        over (partition by c.id order by k) as hasta_aqui
    from public.cobros c, generate_series(1, c.cuotas) k
    where c.estado = 'pendiente' and c.primer_vencimiento is not null and c.primer_vencimiento <= hoy
  )
  select s.id, s.endpoint, s.p256dh, s.auth
  from public.suscripciones_push s
  where s.user_id in (
    select q.user_id from cuotas q left join pagado p on p.cobro_id = q.id
    where q.vence = hoy and coalesce(p.total, 0) < q.hasta_aqui
  );
$$;

-- Anota este celular para la persona con sesión iniciada, aunque antes fuera de
-- otra cuenta. Necesita security definer porque RLS no deja tocar la fila ajena.
create or replace function public.anotar_suscripcion(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Se necesita una sesión iniciada';
  end if;
  insert into public.suscripciones_push (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, creado = now();
end $$;

revoke execute on function public.anotar_suscripcion(text, text, text) from public, anon;
grant execute on function public.anotar_suscripcion(text, text, text) to authenticated;

revoke execute on function public.suscripciones_para_avisar(date) from public, anon, authenticated;
grant execute on function public.suscripciones_para_avisar(date) to service_role;

-- Todos los días a las 13:00 UTC (10:00 en Chile en verano, 9:00 en invierno)
-- se llama a la función avisar-cobros. Solo si están activas las extensiones
-- pg_cron y pg_net (Database → Extensions). La dirección del proyecto y la
-- clave compartida con la función se guardan en Vault, fuera de este archivo:
--   select vault.create_secret('https://<tu-proyecto>.supabase.co', 'url_proyecto');
--   select vault.create_secret('<clave larga al azar>', 'avisos_secreto');
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.schedule('avisar-cobros', '0 13 * * *', $cron$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'url_proyecto') || '/functions/v1/avisar-cobros',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-avisos-secreto', (select decrypted_secret from vault.decrypted_secrets where name = 'avisos_secreto')),
        body := '{}'::jsonb)
    $cron$);
  end if;
end $$;
