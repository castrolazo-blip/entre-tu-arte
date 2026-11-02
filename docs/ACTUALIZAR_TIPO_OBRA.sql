-- Actualización de la base (tipo de obra + obras en juego de varias piezas).
-- Tipo de obra: original o interpretación (inspirada en la obra de otro artista),
-- y si incluye certificado de autenticidad. Se puede ejecutar más de una vez.
alter table public.fichas
  add column if not exists tipo_obra    text,
  add column if not exists inspirada_en text,
  add column if not exists certificado  boolean not null default false;

alter table public.fichas drop constraint if exists fichas_tipo_obra_check;
alter table public.fichas add constraint fichas_tipo_obra_check
  check (tipo_obra is null or tipo_obra in ('original', 'interpretacion'));

-- Las obras que ya existen quedan "sin indicar" (null) hasta que el administrador las clasifique,
-- para no afirmar en la tienda algo que no se ha confirmado.

-- Obras en juego: dípticos, trípticos o conjuntos de n piezas.
-- piezas = número de piezas (1 = una sola). medidas_piezas solo si las piezas miden distinto:
-- [{"alto":80,"ancho":40}, ...]. Si miden igual, alto_cm / ancho_cm son la medida de cada pieza.
alter table public.fichas
  add column if not exists piezas         smallint not null default 1,
  add column if not exists medidas_piezas jsonb;

alter table public.fichas drop constraint if exists fichas_piezas_check;
alter table public.fichas add constraint fichas_piezas_check check (piezas between 1 and 20);

-- Que la API reconozca los campos nuevos de inmediato
notify pgrst, 'reload schema';
