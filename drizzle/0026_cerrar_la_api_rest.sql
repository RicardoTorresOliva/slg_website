-- Seguridad · La API REST automática de Supabase no llega a nuestras tablas (2026-09-22).
--
-- QUÉ PASABA. Supabase publica el esquema `public` por una API REST (PostgREST)
-- a los roles `anon` y `authenticated`, y concede por defecto permisos sobre
-- todas las tablas nuevas. Este sitio NO usa esa API —la aplicación entra por
-- PostgreSQL con su propio rol, `slg_app`—, pero la API estaba ahí igual. El
-- asesor de seguridad de Supabase lo marcaba como ERROR sobre producción el
-- 22-09: diez tablas sin RLS legibles por `anon` —`user`, `session`, `account`
-- (con los hashes de las contraseñas), `verification`, `lead_capture` (los
-- correos de los leads), `organization`, `email_delivery`, `crm_delivery`,
-- `download_event`, `webhook_delivery`— y siete funciones `SECURITY DEFINER`
-- ejecutables sin sesión por `/rest/v1/rpc/…`, entre ellas
-- `app_canjear_invitacion` y `app_clave_api_por_hash`. Bastaba la clave
-- `anon` del proyecto, que Supabase trata como pública.
--
-- POR QUÉ NO SE ARREGLA TABLA A TABLA. Activar RLS en las diez y revocar
-- `EXECUTE` en las siete cierra lo que hay hoy, y la próxima tabla o función
-- que alguien cree vuelve a nacer expuesta, porque los permisos por defecto de
-- Supabase la regalan. Quitar a `anon` y `authenticated` el USO del esquema
-- cierra la puerta entera, con lo que hay y con lo que venga: sin USAGE sobre
-- `public`, PostgREST no puede nombrar nada de dentro.
--
-- POR QUÉ ES SEGURO. `slg_app` tiene su propio USAGE concedido explícitamente
-- (comprobado en producción: `slg_app=U`), así que no depende del que se quita a
-- PUBLIC. `postgres` y `service_role` conservan el suyo; Supabase Storage usa su
-- propio esquema (`storage`) y no se toca. Revertirlo es un GRANT.
--
-- POR QUÉ EL `DO`. En PostgreSQL local y en CI no existen `anon` ni
-- `authenticated` —son roles de Supabase—, y un REVOKE sobre un rol inexistente
-- falla. Se revoca a cada uno solo si existe.

REVOKE USAGE ON SCHEMA public FROM PUBLIC;--> statement-breakpoint

DO $$
DECLARE
  rol text;
BEGIN
  FOREACH rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = rol) THEN
      EXECUTE format('REVOKE USAGE ON SCHEMA public FROM %I', rol);
    END IF;
  END LOOP;
END
$$;--> statement-breakpoint

-- `slg_app` explícito, por si una base se creó sin la concesión propia: sin
-- esto, quitar el USAGE de PUBLIC dejaría a la aplicación fuera de su esquema.
GRANT USAGE ON SCHEMA public TO slg_app;
