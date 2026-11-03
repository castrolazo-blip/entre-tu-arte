-- Estadísticas: datos anónimos extra en cada evento de la tabla analytics.
--   visitante   identificador aleatorio del navegador (para contar visitantes únicos)
--   origen      de dónde llegó la visita (Google, Instagram, Facebook, WhatsApp, Directo…)
--   dispositivo Celular, Tablet o Computadora
-- Se puede ejecutar más de una vez.
alter table public.analytics add column if not exists visitante text;
alter table public.analytics add column if not exists origen text;
alter table public.analytics add column if not exists dispositivo text;
create index if not exists analytics_created_at_idx on public.analytics (created_at desc);

notify pgrst, 'reload schema';
