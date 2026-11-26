-- =====================================================================
-- CampoGuía · refuerzo de seguridad y privacidad (nov 2026)
-- Se ejecuta después de schema.sql (reemplaza funciones con versiones más seguras).
--  1. Ingreso con cédula + celular (antes bastaba la cédula).
--  2. Límite de intentos por cédula y por conexión (evita adivinar cuentas).
--  3. Mensaje de error único: no revela si una cédula existe.
--  4. Sesiones que caducan tras 1 año sin uso.
--  5. Límites de tamaño en textos y cantidad de datos por envío.
--  6. Un registro solo puede apuntar a un lote del mismo agricultor.
--  7. Carpeta de fotos: solo imágenes de hasta 5 MB.
-- =====================================================================

alter table sesiones add column if not exists ultimo_uso timestamptz not null default now();

create table if not exists intentos_acceso (
  id bigint generated always as identity primary key,
  clave text not null,          -- huella (md5) de la conexión o de la cédula; nunca el dato en claro
  tipo text not null,
  momento timestamptz not null default now()
);
create index if not exists intentos_acceso_idx on intentos_acceso (clave, tipo, momento);
alter table intentos_acceso enable row level security;   -- sin políticas: nadie la lee por la API
revoke all on intentos_acceso from anon, authenticated;
revoke all on sesiones from anon, authenticated;

-- huella de la conexión que llama (no se guarda la IP en claro)
create or replace function _ip() returns text
language sql stable set search_path = public as $$
  select md5(coalesce(nullif(trim(split_part(coalesce(
    current_setting('request.headers', true)::json->>'cf-connecting-ip',
    current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1)), ''), 'sin-ip'));
$$;

create or replace function _excede(p_clave text, p_tipo text, p_max int, p_minutos int) returns boolean
language sql stable security definer set search_path = public as $$
  -- si no se conoce la conexión ('sin-ip') no se limita por conexión, para no bloquear a todos a la vez
  select p_clave <> md5('sin-ip') and (select count(*) >= p_max from intentos_acceso
   where clave = p_clave and tipo = p_tipo and momento > now() - make_interval(mins => p_minutos));
$$;

create or replace function _txt(v text, n int) returns text
language sql immutable as $$ select nullif(left(trim(coalesce(v, '')), n), ''); $$;

revoke all on function _ip(), _excede(text, text, int, int), _txt(text, int) from public, anon, authenticated;

-- sesión válida: existe, el agricultor está activo y se usó en el último año
create or replace function _agricultor(p_token uuid) returns agricultores
language plpgsql volatile security definer set search_path = public as $$
declare a agricultores;
begin
  select ag.* into a from sesiones s join agricultores ag on ag.id = s.agricultor_id
   where s.token = p_token and ag.activo and s.ultimo_uso > now() - interval '365 days';
  if a.id is null then raise exception 'sesion_invalida'; end if;
  update sesiones set ultimo_uso = now() where token = p_token and ultimo_uso < now() - interval '1 day';
  return a;
end $$;
revoke all on function _agricultor(uuid) from public, anon, authenticated;

-- Ingreso: cédula + celular registrado. Devuelve {error} en lugar de fallar para que el intento quede anotado.
drop function if exists app_ingresar(text);
create or replace function app_ingresar(p_cedula text, p_telefono text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ced text := regexp_replace(coalesce(p_cedula, ''), '\D', '', 'g');
  tel text := norm_tel(p_telefono);
  ip text := _ip(); hc text := md5('ced:' || ced);
  a agricultores; t uuid;
begin
  if _excede(ip, 'ingreso_ip', 20, 15) or _excede(hc, 'ingreso_ced', 5, 15) then
    return jsonb_build_object('error', 'demasiados_intentos');
  end if;
  select * into a from agricultores where cedula = ced and activo;
  if a.id is null or length(tel) < 9 or right(norm_tel(a.telefono), 9) <> right(tel, 9) then
    insert into intentos_acceso(clave, tipo) values (ip, 'ingreso_ip'), (hc, 'ingreso_ced');
    return jsonb_build_object('error', 'credenciales');
  end if;
  delete from intentos_acceso where clave = hc and tipo = 'ingreso_ced';
  delete from intentos_acceso where momento < now() - interval '1 day';
  delete from sesiones where ultimo_uso < now() - interval '365 days';
  update agricultores set ultimo_ingreso = now() where id = a.id;
  insert into sesiones(agricultor_id) values (a.id) returning token into t;
  return jsonb_build_object('token', t, 'perfil', _perfil(a));
end $$;

-- Registro: máximo 10 cuentas por conexión cada hora; textos con largo máximo
create or replace function app_registrar(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a agricultores; t uuid; tel text := norm_tel(p->>'telefono'); ced text := regexp_replace(coalesce(p->>'cedula',''), '\D', '', 'g');
  ip text := _ip(); ha numeric := nullif(p->>'hectareas','')::numeric;
begin
  if _excede(ip, 'registro_ip', 10, 60) then return jsonb_build_object('error', 'demasiados_intentos'); end if;
  if not cedula_valida(ced) then raise exception 'cedula_invalida'; end if;
  if length(tel) < 9 or length(tel) > 13 then raise exception 'telefono_invalido'; end if;
  if _txt(p->>'nombres', 120) is null then raise exception 'nombre_requerido'; end if;
  if _txt(p->>'provincia', 60) is null or _txt(p->>'sector', 120) is null then raise exception 'ubicacion_requerida'; end if;
  if ha is not null and (ha < 0 or ha > 100000) then ha := null; end if;
  insert into intentos_acceso(clave, tipo) values (ip, 'registro_ip');
  if exists (select 1 from agricultores where cedula = ced) then return jsonb_build_object('error', 'cedula_ya_registrada'); end if;
  -- toda cuenta nace como agricultor; si pidió ser técnico agrícola queda pendiente de aprobación del administrador
  insert into agricultores(cedula, nombres, telefono, cultivo_id, hectareas, provincia, sector, comunidad, rol, rol_solicitado, rol_solicitado_fecha, acepta_seguimiento,
                           latitud, longitud, precision_m, ubicacion_fecha, ultimo_ingreso)
  values (ced, _txt(p->>'nombres', 120), tel, (select id from cultivos where id = p->>'cultivo_id'), ha,
          _txt(p->>'provincia', 60), _txt(p->>'sector', 120), _txt(p->>'comunidad', 120),
          'agricultor', case when p->>'rol' = 'tecnico' then 'tecnico' end, case when p->>'rol' = 'tecnico' then now() end,
          coalesce((p->>'acepta_seguimiento')::boolean, true),
          nullif(p->>'latitud','')::numeric, nullif(p->>'longitud','')::numeric, nullif(p->>'precision_m','')::numeric,
          case when nullif(p->>'latitud','') is not null then now() end, now())
  returning * into a;
  insert into sesiones(agricultor_id) values (a.id) returning token into t;
  return jsonb_build_object('token', t, 'perfil', _perfil(a));
end $$;

-- Sincronizar: máximo 500 lotes y 2000 registros por envío; textos recortados; lote del mismo agricultor
create or replace function app_sincronizar(p_token uuid, p_lotes jsonb, p_registros jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a agricultores := _agricultor(p_token); x jsonb; lid uuid;
begin
  if jsonb_array_length(coalesce(p_lotes, '[]')) > 500 or jsonb_array_length(coalesce(p_registros, '[]')) > 2000 then
    raise exception 'demasiados_datos';
  end if;
  for x in select * from jsonb_array_elements(coalesce(p_lotes, '[]')) loop
    insert into lotes(id, agricultor_id, nombre, cultivo_id, hectareas, plantas, etapa_id, latitud, longitud, precision_m, ubicacion_fecha, borrado, actualizado)
    values ((x->>'id')::uuid, a.id, coalesce(_txt(x->>'nombre', 80), 'Lote'), (select id from cultivos where id = x->>'cultivo_id'),
            nullif(x->>'hectareas','')::numeric, nullif(x->>'plantas','')::int, (select id from etapas where id = nullif(x->>'etapa_id','')::bigint),
            nullif(x->>'latitud','')::numeric, nullif(x->>'longitud','')::numeric, nullif(x->>'precision_m','')::numeric,
            nullif(x->>'ubicacion_fecha','')::timestamptz, coalesce((x->>'borrado')::boolean, false), now())
    on conflict (id) do update set nombre = excluded.nombre, cultivo_id = excluded.cultivo_id, hectareas = excluded.hectareas,
      plantas = excluded.plantas, etapa_id = excluded.etapa_id, latitud = excluded.latitud, longitud = excluded.longitud,
      precision_m = excluded.precision_m, ubicacion_fecha = excluded.ubicacion_fecha, borrado = excluded.borrado, actualizado = now()
    where lotes.agricultor_id = a.id;
  end loop;
  for x in select * from jsonb_array_elements(coalesce(p_registros, '[]')) loop
    select id into lid from lotes where id = nullif(x->>'lote_id','')::uuid and agricultor_id = a.id;
    insert into registros(id, agricultor_id, lote_id, fecha, actividad, producto_id, producto_nombre, dosis, unidad, aplicador,
                          clima, costo, observaciones, proxima_fecha, carencia_hasta, objetivo, personas, pago_diario, dias_trabajo, costo_mano_obra, borrado, actualizado)
    values ((x->>'id')::uuid, a.id, lid, (x->>'fecha')::date, _txt(x->>'actividad', 60),
            (select id from productos where id = nullif(x->>'producto_id','')::bigint), _txt(x->>'producto_nombre', 150), nullif(x->>'dosis','')::numeric, _txt(x->>'unidad', 20),
            _txt(x->>'aplicador', 120), _txt(x->>'clima', 30), nullif(x->>'costo','')::numeric, _txt(x->>'observaciones', 1000),
            nullif(x->>'proxima_fecha','')::date, nullif(x->>'carencia_hasta','')::date,
            _txt(x->>'objetivo', 200), nullif(x->>'personas','')::numeric, nullif(x->>'pago_diario','')::numeric, nullif(x->>'dias_trabajo','')::numeric,
            nullif(x->>'costo_mano_obra','')::numeric, coalesce((x->>'borrado')::boolean, false), now())
    on conflict (id) do update set lote_id = excluded.lote_id, fecha = excluded.fecha, actividad = excluded.actividad,
      producto_id = excluded.producto_id, producto_nombre = excluded.producto_nombre, dosis = excluded.dosis,
      unidad = excluded.unidad, aplicador = excluded.aplicador, clima = excluded.clima, costo = excluded.costo,
      observaciones = excluded.observaciones, proxima_fecha = excluded.proxima_fecha,
      carencia_hasta = excluded.carencia_hasta, objetivo = excluded.objetivo, personas = excluded.personas, pago_diario = excluded.pago_diario,
      dias_trabajo = excluded.dias_trabajo, costo_mano_obra = excluded.costo_mano_obra, borrado = excluded.borrado, actualizado = now()
    where registros.agricultor_id = a.id;
  end loop;
  return app_mis_datos(p_token);
end $$;

create or replace function app_actualizar_perfil(p_token uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a agricultores := _agricultor(p_token); tel text := norm_tel(p->>'telefono');
begin
  update agricultores set nombres = coalesce(_txt(p->>'nombres', 120), nombres),
    cultivo_id = coalesce((select id from cultivos where id = p->>'cultivo_id'), cultivo_id),
    hectareas = coalesce(nullif(p->>'hectareas','')::numeric, hectareas),
    comunidad = case when p ? 'comunidad' then _txt(p->>'comunidad', 120) else comunidad end,
    telefono = case when length(tel) between 9 and 13 then tel else telefono end,
    provincia = coalesce(_txt(p->>'provincia', 60), provincia),
    sector = coalesce(_txt(p->>'sector', 120), sector),
    latitud = coalesce(nullif(p->>'latitud','')::numeric, latitud),
    longitud = coalesce(nullif(p->>'longitud','')::numeric, longitud),
    precision_m = coalesce(nullif(p->>'precision_m','')::numeric, precision_m),
    ubicacion_fecha = case when nullif(p->>'latitud','') is not null then now() else ubicacion_fecha end,
    acepta_seguimiento = coalesce((p->>'acepta_seguimiento')::boolean, acepta_seguimiento)
  where id = a.id returning * into a;
  return _perfil(a);
end $$;

-- Cuentas de prueba: agricultores.cambio_rol_libre = true pasan a técnico sin aprobación
-- (se activa desde SQL: update agricultores set cambio_rol_libre = true where cedula = '...').
alter table agricultores add column if not exists cambio_rol_libre boolean not null default false;
-- Cambio de tipo de cuenta: pasar a técnico agrícola queda pendiente hasta que el administrador lo apruebe;
-- volver a agricultor o cancelar la solicitud es inmediato.
create or replace function app_solicitar_rol(p_token uuid, p_rol text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a agricultores := _agricultor(p_token);
begin
  if p_rol = 'tecnico' then
    if a.cambio_rol_libre then  -- cuenta de prueba del administrador: cambia sin aprobación
      update agricultores set rol = 'tecnico', rol_solicitado = null, rol_solicitado_fecha = null where id = a.id returning * into a;
    elsif a.rol <> 'tecnico' and a.rol_solicitado is null then
      update agricultores set rol_solicitado = 'tecnico', rol_solicitado_fecha = now() where id = a.id returning * into a;
    end if;
  elsif p_rol = 'agricultor' then
    update agricultores set rol = 'agricultor', rol_solicitado = null, rol_solicitado_fecha = null where id = a.id returning * into a;
  elsif p_rol = 'cancelar' then
    update agricultores set rol_solicitado = null, rol_solicitado_fecha = null where id = a.id returning * into a;
  else
    raise exception 'rol_invalido';
  end if;
  return _perfil(a);
end $$;
revoke all on function app_solicitar_rol(uuid, text) from public;
grant execute on function app_solicitar_rol(uuid, text) to anon, authenticated;

grant execute on function app_registrar(jsonb), app_ingresar(text, text), app_mis_datos(uuid),
  app_sincronizar(uuid, jsonb, jsonb), app_actualizar_perfil(uuid, jsonb), app_cerrar_sesion(uuid) to anon, authenticated;

-- Fotos del manual: solo imágenes (jpg, png, webp) de hasta 5 MB
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'] where id = 'fotos';
