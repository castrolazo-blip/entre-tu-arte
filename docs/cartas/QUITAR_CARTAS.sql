-- ════════════════════════════════════════════════════════════════════════════
-- Cartas con Amor · QUITAR el módulo de la base de Entre tu Arte
--
-- ANTES: 1) descarga el respaldo de cada retiro (Panel › Configuración › Respaldo) si lo necesitan;
--        2) vacía el bucket: Supabase › Storage › cca-cartas › selecciona todo › Delete
--           (Supabase no permite borrar archivos desde SQL).
-- Luego pega esto en Supabase › SQL Editor. No toca nada de la tienda (obras, consultas, admins…).
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists cca_subir_publico on storage.objects;
drop policy if exists cca_subir_fisicas on storage.objects;
drop policy if exists cca_leer on storage.objects;
drop policy if exists cca_borrar on storage.objects;
-- Falla si aún hay archivos: vacía el bucket primero (ver arriba)
delete from storage.buckets where id = 'cca-cartas';

drop table if exists public.cca_equipo, public.cca_auditoria, public.cca_recordatorios, public.cca_archivos, public.cca_contenidos,
  public.cca_cartas, public.cca_remitentes, public.cca_parejas, public.cca_retiro_organizadores,
  public.cca_retiros, public.cca_usuarios cascade;

drop function if exists public.cca_enviar_carta(text, uuid, text, text, text, text, text, jsonb, text, boolean, text);
drop function if exists public.cca_portal(text, text, text);
drop function if exists public.cca_agregar_usuario(text, text, text, boolean);
drop function if exists public.cca_reclamar_acceso(), public.cca_validar_equipo_pareja();
drop function if exists public.cca_equipo_info(text), public.cca_entrar_equipo(text, text), public.cca_revocar_enlace_equipo();
drop function if exists public.cca_auditar(), public.cca_tras_carta(), public.cca_recalcular_remitente(uuid),
  public.cca_validar_remitente(), public.cca_validar_carta();
drop function if exists public.cca_puede_leer(uuid), public.cca_acceso(uuid), public.cca_es_usuario(), public.cca_es_admin();

-- Cuentas de organizadores: bórralas a mano en Authentication › Users (no las de Entre tu Arte).

notify pgrst, 'reload schema';
