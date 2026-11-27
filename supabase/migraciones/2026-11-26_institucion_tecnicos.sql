-- 26-nov-2026: los técnicos indican su institución al registrarse o al pedir el acceso de técnico.
-- Aplicado en Supabase (migraciones agricultores_institucion y perfil_institucion).
alter table agricultores add column if not exists institucion text;
-- _perfil(agricultores) devuelve además 'institucion'.
-- app_registrar(jsonb): si p->>'rol' = 'tecnico' exige p->>'institucion' (error 'institucion_requerida') y la guarda.
-- app_actualizar_perfil(uuid, jsonb): acepta 'institucion'.
-- (ver definiciones completas en Supabase: select pg_get_functiondef('app_registrar(jsonb)'::regprocedure))

-- Edad (migración agricultores_edad): columna edad int (10–110), obligatoria en app_registrar (error 'edad_invalida'),
-- editable en app_actualizar_perfil y devuelta por _perfil.
alter table agricultores add column if not exists edad int check (edad is null or edad between 10 and 110);
