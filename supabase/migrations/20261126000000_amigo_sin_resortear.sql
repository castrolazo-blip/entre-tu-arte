-- ════════════════════════════════════════════════════════════════════════════
-- Si nos organizamos! · Amigo secreto: sacar o agregar a alguien SIN volver a sortear
--
-- Antes, cualquier cambio de participantes después del sorteo lo anulaba y había que sortear
-- y avisar a todos de nuevo. Ahora se ajusta el círculo con el mínimo de cambios:
--   · Sacar a X (A le regalaba a X y X a B): ahora A le regala a B. Solo A vuelve a «No ha visto».
--   · Agregar a N: se elige a alguien al azar (A, que le regalaba a B): ahora A → N → B.
--     Solo A y N quedan en «No ha visto».
-- Si quedan menos de 3 participantes, el sorteo se anula (no se puede hacer con 2).
-- Ni el panel ve las asignaciones: solo quién tiene que volver a mirar.
--
-- Requiere 20261113000000_amigo_secreto.sql. Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

-- Antes de borrar a un participante de un sorteo ya hecho: unir a quien le regalaba con su amigo
create or replace function public.sno_sacar_del_circulo() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_da uuid; v_recibe uuid;
begin
  if not exists (select 1 from sno_sorteos where id = old.sorteo_id and estado = 'sorteado') then return old; end if;
  select persona_id into v_da from sno_sorteo_asignaciones where sorteo_id = old.sorteo_id and regala_a = old.persona_id;
  select regala_a into v_recibe from sno_sorteo_asignaciones where sorteo_id = old.sorteo_id and persona_id = old.persona_id;
  delete from sno_sorteo_asignaciones where sorteo_id = old.sorteo_id and (persona_id = old.persona_id or regala_a = old.persona_id);
  if v_da is not null and v_recibe is not null and v_da <> v_recibe then
    insert into sno_sorteo_asignaciones (sorteo_id, persona_id, regala_a) values (old.sorteo_id, v_da, v_recibe);
    update sno_sorteo_participantes set visto_en = null where sorteo_id = old.sorteo_id and persona_id = v_da;
  end if;
  return old;
end $$;
drop trigger if exists sno_sacar_del_circulo on public.sno_sorteo_participantes;
create trigger sno_sacar_del_circulo before delete on public.sno_sorteo_participantes
  for each row execute function public.sno_sacar_del_circulo();

-- Después de un cambio: si entra alguien, se mete al círculo; si quedan menos de 3, se anula
create or replace function public.sno_tras_cambio_participantes() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sorteo uuid := coalesce(new.sorteo_id, old.sorteo_id); v_da uuid; v_recibe uuid;
begin
  if not exists (select 1 from sno_sorteos where id = v_sorteo and estado = 'sorteado') then return null; end if;
  if (select count(*) from sno_sorteo_participantes where sorteo_id = v_sorteo) < 3 then
    delete from sno_sorteo_asignaciones where sorteo_id = v_sorteo;
    update sno_sorteos set estado = 'preparacion', sorteado_en = null where id = v_sorteo;
    update sno_sorteo_participantes set visto_en = null where sorteo_id = v_sorteo;
    return null;
  end if;
  if tg_op = 'INSERT' then
    select persona_id, regala_a into v_da, v_recibe from sno_sorteo_asignaciones
     where sorteo_id = v_sorteo and persona_id <> new.persona_id order by random() limit 1;
    if v_da is null then
      -- No había círculo (caso raro): se anula para sortear de nuevo
      update sno_sorteos set estado = 'preparacion', sorteado_en = null where id = v_sorteo;
      return null;
    end if;
    update sno_sorteo_asignaciones set regala_a = new.persona_id where sorteo_id = v_sorteo and persona_id = v_da;
    insert into sno_sorteo_asignaciones (sorteo_id, persona_id, regala_a) values (v_sorteo, new.persona_id, v_recibe);
    update sno_sorteo_participantes set visto_en = null where sorteo_id = v_sorteo and persona_id in (v_da, new.persona_id);
  end if;
  return null;
end $$;
drop trigger if exists sno_tras_cambio_participantes on public.sno_sorteo_participantes;
create trigger sno_tras_cambio_participantes after insert or delete on public.sno_sorteo_participantes
  for each row execute function public.sno_tras_cambio_participantes();

notify pgrst, 'reload schema';
