-- Lucas · esquema de base de datos para Supabase
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
  categoria_id uuid references public.categorias on delete set null,
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
  categoria_id uuid references public.categorias on delete set null,
  evento_id uuid references public.eventos on delete set null,
  compromiso_id uuid references public.compromisos on delete set null,
  deuda_id uuid references public.deudas on delete set null,
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
  categoria_id uuid not null references public.categorias on delete cascade,
  creado timestamptz not null default now(),
  unique (user_id, patron)
);

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
