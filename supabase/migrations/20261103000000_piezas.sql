-- Obras en juego: dípticos, trípticos o conjuntos de n piezas.
--   piezas          número de piezas del juego (1 = obra de una sola pieza).
--   medidas_piezas  solo si las piezas tienen tamaños distintos: [{"alto":80,"ancho":40}, ...].
--                   Si todas miden lo mismo, alto_cm / ancho_cm son la medida de CADA pieza.
-- El precio de la ficha es por el juego completo. Se puede ejecutar más de una vez.
alter table public.fichas
  add column if not exists piezas         smallint not null default 1,
  add column if not exists medidas_piezas jsonb;

alter table public.fichas drop constraint if exists fichas_piezas_check;
alter table public.fichas add constraint fichas_piezas_check check (piezas between 1 and 20);

notify pgrst, 'reload schema';
