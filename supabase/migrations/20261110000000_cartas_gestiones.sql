-- ════════════════════════════════════════════════════════════════════════════
-- Cartas con Amor · Gestión por contacto: llamadas y notas en el historial
--
-- cca_recordatorios ya guarda los mensajes enviados (WhatsApp, correo, copiado).
-- Ahora también admite «llamada» (al tocar 📞) y «nota» (p. ej. «dice que entrega el jueves»),
-- con el texto en la columna mensaje. Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.cca_recordatorios drop constraint if exists cca_recordatorios_canal_check;
alter table public.cca_recordatorios add constraint cca_recordatorios_canal_check
  check (canal in ('whatsapp', 'correo', 'copiado', 'otro', 'llamada', 'nota'));
notify pgrst, 'reload schema';
