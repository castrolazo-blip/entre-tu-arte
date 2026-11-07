-- Cartas con Amor · Lugar y horario de entrega por matrimonio responsable
-- Cada matrimonio del equipo define dónde y cuándo recibe las cartas físicas de sus parejas;
-- se usa en el mensaje de bienvenida ({lugar} y {horario}). Lo edita el propio matrimonio o un administrador.

alter table public.cca_equipo add column if not exists lugar_entrega   text;
alter table public.cca_equipo add column if not exists horario_entrega text;

create or replace function public.cca_guardar_entrega(p_equipo uuid, p_lugar text, p_horario text)
returns public.cca_equipo
language plpgsql security definer set search_path = public as $$
declare v cca_equipo;
begin
  if not (public.cca_es_admin() or exists (
      select 1 from cca_usuarios u where u.user_id = auth.uid() and u.activo and u.equipo_id = p_equipo)
    or exists (  -- miembro del matrimonio que entra con su correo
      select 1 from cca_usuarios u join cca_equipo e on e.id = p_equipo
       where u.user_id = auth.uid() and u.activo
         and lower(coalesce(auth.jwt() ->> 'email', '')) <> ''
         and lower(auth.jwt() ->> 'email') in (lower(e.esposo_correo), lower(e.esposa_correo)))) then
    raise exception 'cca:sin_permiso';
  end if;
  update cca_equipo set lugar_entrega = nullif(btrim(left(p_lugar, 300)), ''), horario_entrega = nullif(btrim(left(p_horario, 200)), '')
   where id = p_equipo returning * into v;
  if v.id is null then raise exception 'cca:no_existe'; end if;
  return v;
end $$;

revoke all on function public.cca_guardar_entrega(uuid, text, text) from public, anon;
grant execute on function public.cca_guardar_entrega(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
