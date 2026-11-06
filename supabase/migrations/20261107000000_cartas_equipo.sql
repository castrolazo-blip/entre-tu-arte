-- ════════════════════════════════════════════════════════════════════════════
-- Cartas con Amor · Equipo de servidores y repartición de parejas
--
-- Cada matrimonio del equipo se registra con sus dos apellidos (p. ej. "Castro Lazo") y los datos
-- de cada cónyuge. Luego se le asignan las parejas de cuya recolección de cartas es responsable.
-- Si un miembro del equipo crea su cuenta con el mismo correo, obtiene acceso de organizador
-- (sin lectura de cartas) con cca_reclamar_acceso().
--
-- Requiere haber ejecutado antes 20261106000000_cartas_con_amor.sql. Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.cca_equipo (
  id              uuid primary key default gen_random_uuid(),
  retiro_id       uuid not null references public.cca_retiros(id) on delete cascade,
  -- Dos apellidos como mínimo: hay matrimonios con el mismo primer apellido
  apellidos       text not null check (array_length(regexp_split_to_array(btrim(apellidos), '\s+'), 1) >= 2),
  esposo_nombre   text,
  esposo_telefono text,
  esposo_correo   text,
  esposa_nombre   text,
  esposa_telefono text,
  esposa_correo   text,
  notas           text,
  created_at      timestamptz not null default now()
);
create index if not exists cca_equipo_retiro_idx on public.cca_equipo (retiro_id);

-- Matrimonio del equipo responsable de cada pareja
alter table public.cca_parejas add column if not exists equipo_id uuid references public.cca_equipo(id) on delete set null;
create index if not exists cca_parejas_equipo_idx on public.cca_parejas (equipo_id);

-- La pareja y el matrimonio del equipo deben ser del mismo retiro
create or replace function public.cca_validar_equipo_pareja() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.equipo_id is not null and not exists (
    select 1 from cca_equipo where id = new.equipo_id and retiro_id = new.retiro_id) then
    raise exception 'Ese matrimonio del equipo no pertenece a este retiro';
  end if;
  return new;
end $$;
drop trigger if exists cca_validar_equipo_pareja on public.cca_parejas;
create trigger cca_validar_equipo_pareja before insert or update of equipo_id on public.cca_parejas
  for each row execute function public.cca_validar_equipo_pareja();

-- Auditoría
drop trigger if exists cca_auditar on public.cca_equipo;
create trigger cca_auditar after insert or update or delete on public.cca_equipo
  for each row execute function public.cca_auditar();

-- Seguridad
alter table public.cca_equipo enable row level security;
drop policy if exists cca_equipo_leer on public.cca_equipo;
drop policy if exists cca_equipo_crear on public.cca_equipo;
drop policy if exists cca_equipo_editar on public.cca_equipo;
drop policy if exists cca_equipo_borrar on public.cca_equipo;
create policy cca_equipo_leer on public.cca_equipo for select using (public.cca_acceso(retiro_id));
create policy cca_equipo_crear on public.cca_equipo for insert with check (public.cca_es_admin());
create policy cca_equipo_editar on public.cca_equipo for update
  using (public.cca_es_admin()) with check (public.cca_es_admin());
create policy cca_equipo_borrar on public.cca_equipo for delete using (public.cca_es_admin());

-- Un miembro del equipo que entra con su correo registrado obtiene acceso de organizador
-- (sin lectura de cartas) a los retiros donde está en el equipo. Devuelve cuántos retiros.
create or replace function public.cca_reclamar_acceso() returns int
language plpgsql security definer set search_path = public as $$
declare v_correo text; v_nombre text; v_n int := 0; e record;
begin
  if auth.uid() is null then return 0; end if;
  select lower(email) into v_correo from auth.users where id = auth.uid();
  if v_correo is null then return 0; end if;
  for e in select * from cca_equipo
           where lower(btrim(esposo_correo)) = v_correo or lower(btrim(esposa_correo)) = v_correo loop
    v_nombre := case when lower(btrim(e.esposo_correo)) = v_correo then e.esposo_nombre else e.esposa_nombre end;
    insert into cca_usuarios (user_id, nombre, correo, rol, puede_leer, activo)
    values (auth.uid(), coalesce(nullif(btrim(v_nombre), ''), split_part(v_correo, '@', 1)) || ' ' || e.apellidos,
            v_correo, 'organizador', false, true)
    on conflict (user_id) do nothing;          -- no cambia el rol de quien ya existía (ni reactiva a un desactivado)
    insert into cca_retiro_organizadores (retiro_id, user_id)
    select e.retiro_id, auth.uid() where exists (select 1 from cca_usuarios where user_id = auth.uid() and activo)
    on conflict do nothing;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function public.cca_reclamar_acceso() from public, anon;
grant execute on function public.cca_reclamar_acceso() to authenticated;

notify pgrst, 'reload schema';
