-- Productos de otras marcas (no del portafolio) que el agricultor escribe como su última aplicación.
create table if not exists public.otros_productos (
  id bigserial primary key,
  nombre text not null,
  nombre_norm text not null unique,
  ingrediente_activo text,
  grupo text,
  categoria text,
  empresa text,
  estado text not null default 'pendiente' check (estado in ('pendiente','completo')),
  fuente text,
  veces int not null default 1,
  reportado_por uuid references public.agricultores(id) on delete set null,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
alter table public.otros_productos enable row level security;
drop policy if exists admin_todo on public.otros_productos;
create policy admin_todo on public.otros_productos for all using (es_admin()) with check (es_admin());

create or replace function public._norm_prod(t text) returns text language sql immutable as $$
  select trim(regexp_replace(lower(translate(coalesce(t,''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '[^a-z0-9]+', ' ', 'g'))
$$;

-- el nombre normalizado se calcula solo (también cuando el administrador edita en el panel)
create or replace function public._otros_productos_norm() returns trigger language plpgsql as $$
begin
  new.nombre_norm := _norm_prod(new.nombre);
  new.actualizado := now();
  return new;
end $$;
drop trigger if exists otros_productos_norm on public.otros_productos;
create trigger otros_productos_norm before insert or update on public.otros_productos for each row execute function _otros_productos_norm();

-- lista pública (sin datos de quién lo reportó) para las sugerencias de la app
create or replace function public.app_otros_productos() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nombre', nombre, 'ingrediente_activo', ingrediente_activo, 'grupo', grupo, 'categoria', categoria, 'empresa', empresa) order by nombre), '[]'::jsonb)
  from otros_productos where coalesce(ingrediente_activo, '') <> ''
$$;

-- el agricultor reporta un producto de otra marca; si ya existe suma una vez y completa el ingrediente si faltaba
create or replace function public.app_reportar_producto(p_token uuid, p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare a agricultores; n text := _norm_prod(p->>'nombre'); ia text := nullif(left(trim(coalesce(p->>'ingrediente_activo','')), 150), ''); r otros_productos;
begin
  begin a := _agricultor(p_token); exception when others then a := null; end;
  if length(n) < 2 then raise exception 'nombre_requerido'; end if;
  insert into otros_productos (nombre, nombre_norm, ingrediente_activo, grupo, reportado_por, fuente)
  values (left(trim(p->>'nombre'), 80), n, upper(ia), nullif(left(trim(coalesce(p->>'grupo','')), 60), ''), a.id, case when ia is not null then 'agricultor' end)
  on conflict (nombre_norm) do update set veces = otros_productos.veces + 1,
    ingrediente_activo = coalesce(otros_productos.ingrediente_activo, excluded.ingrediente_activo),
    grupo = coalesce(otros_productos.grupo, excluded.grupo),
    fuente = coalesce(otros_productos.fuente, excluded.fuente)
  returning * into r;
  return jsonb_build_object('id', r.id, 'nombre', r.nombre, 'ingrediente_activo', r.ingrediente_activo, 'grupo', r.grupo, 'estado', r.estado);
end $$;
revoke all on function public.app_reportar_producto(uuid, jsonb) from public;
grant execute on function public.app_otros_productos() to anon, authenticated;
grant execute on function public.app_reportar_producto(uuid, jsonb) to anon, authenticated;

-- etapas_plan_sanitario (aplicada): etapas.plan_etapas int[] → para etapas solo de fertilización, qué etapas del
-- plan sanitario le corresponden (la asesoría rápida usa ese plan). Pitahaya: Floración y cuajado = {1,2,3}; Engrose de fruta = {4,5}.

-- etapas_requerimiento_npk (aplicada): etapas.req_n, req_p2o5, req_k2o (kg/ha por aplicación). Si la etapa los tiene,
-- la app reparte en medios sacos los fertilizantes NPK al suelo de la etapa para cumplirlos (Logic.repartirNPK).

-- requerimiento_cultivo_y_reparto_etapas (aplicada): cultivos.req_n/req_p2o5/req_k2o/req_periodo('año'|'ciclo')/req_fuente;
-- etapas.aplicaciones/pct_n/pct_p2o5/pct_k2o. Requerimiento por aplicación = requerimiento del cultivo × % ÷ aplicaciones.

-- cultivos_kg_aplicacion (aplicada): cultivos.kg_aplicacion (kg de fertilizante por ha por aplicación). La mezcla de
-- cada etapa la arma la app con las reglas del asesor (Logic.REGLAS_FERT / mezclaPorRegla), priorizando los Soli.

-- cultivos_ciclo_meses (aplicada): cultivos.ciclo_meses (maíz 4, malanga 10, perennes 12) → «cada X meses/semanas».
-- otros_productos_fertilizantes (aplicada): otros_productos.tipo ('agroquimico'|'fertilizante'), n, p2o5, k2o,
-- otros_nutrientes, kg_saco, precio_saco; app_reportar_producto/app_otros_productos los aceptan y devuelven.

-- etapas_reparto_literatura (aplicada): etapas.pct_lit_n/p2o5/k2o, apps_lit, fuente_lit (curvas de absorción: maíz y malanga).
-- Pitahaya: requerimiento INIAP 2020 (Tabla 7, suelo medio, 1 250 plantas/ha) = 175 N · 69 P₂O₅ · 156 K₂O kg/ha/año.
-- Kg por aplicación: los calcula la app por etapa para cumplir lo que pide la etapa (suma NPK); reglas propias del maíz.

-- 2026-11-27 · cultivos_requerimiento_por_nivel_suelo
-- Columnas en cultivos: req_unidad ('ha' | 'planta'), nivel_suelo (bajo/medio/alto, el que ve el agricultor), pha_ref,
-- req_{bajo,medio,alto}_{n,p2o5,k2o,s} y fuente_suelo.
-- Pitahaya: g por planta (INIAP 2020 Tabla 7), suelo bajo por defecto, 1600 pl/ha de referencia.
-- Cacao, maíz, malanga: medio = requerimiento actual; bajo N ×1,43 P₂O₅ ×1,55 K₂O ×1,40; alto ×0,57 ×0,55 ×0,60 (proporciones INIAP pitahaya).
