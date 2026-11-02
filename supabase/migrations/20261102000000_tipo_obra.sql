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

-- Que la API reconozca los campos nuevos de inmediato
notify pgrst, 'reload schema';
