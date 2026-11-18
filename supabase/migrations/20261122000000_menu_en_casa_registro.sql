-- ════════════════════════════════════════════════════════════════════════════
-- Menú en Casa · «Mi entreno» y «Mis datos»
-- Columna `registro` para datos personales (sexo, nacimiento, estatura, peso, meta)
-- y entrenos de cada integrante. Cualquier miembro puede escribirla, una entrada a la vez.
-- Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.menu_cocina add column if not exists extras   jsonb not null default '{}';
alter table public.menu_cocina add column if not exists registro jsonb not null default '{}';

create or replace function public.menu_cocina_cambiar(p_hogar text, p_campo text, p_clave text, p_valor jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.menu_rol() is null then raise exception 'menu:sin_permiso'; end if;
  if p_campo not in ('choices', 'ready', 'bought', 'stock', 'extras', 'registro') then raise exception 'menu:campo_invalido'; end if;
  insert into public.menu_cocina (hogar) values (p_hogar) on conflict (hogar) do nothing;
  execute format(
    'update public.menu_cocina set %1$I = case when $2 is null or $2 = ''null''::jsonb then %1$I - $1 else jsonb_set(%1$I, array[$1], $2) end, actualizado = now() where hogar = $3',
    p_campo) using p_clave, p_valor, p_hogar;
end $$;
revoke all on function public.menu_cocina_cambiar(text, text, text, jsonb) from public, anon;
grant execute on function public.menu_cocina_cambiar(text, text, text, jsonb) to authenticated;
