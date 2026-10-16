-- Simplifica · esquema de base de datos para Supabase
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

create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  fecha date not null,
  monto bigint not null check (monto >= 0),
  tipo text not null default 'gasto' check (tipo in ('gasto', 'ingreso')),
  descripcion text,
  comercio text,
  categoria_id uuid,                     -- estas cuatro: claves foráneas con dueño, más abajo
  evento_id uuid,
  compromiso_id uuid,
  deuda_id uuid,
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

-- Instalaciones anteriores: columnas agregadas después de crear las tablas.
alter table public.perfil add column if not exists tarjetas text[] not null default '{}';

create index if not exists movimientos_usuario_fecha on public.movimientos (user_id, fecha desc);

-- Row Level Security: cada usuario solo ve y toca lo suyo.
do $$
declare t text;
begin
  foreach t in array array['perfil', 'categorias', 'eventos', 'deudas', 'compromisos', 'movimientos', 'reglas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "solo lo propio" on public.%I', t);
    execute format(
      'create policy "solo lo propio" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t);
  end loop;
end $$;

-- Claves foráneas con dueño: una fila solo puede apuntar a categorías, eventos,
-- compromisos o deudas con su mismo user_id. RLS no alcanza, porque Postgres
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

  foreach t in array array['categorias', 'eventos', 'compromisos', 'deudas'] loop
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
      ('reglas',      'categoria_id',  'categorias',  'cascade')
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
