# Si nos organizamos!

Aplicación **independiente** para encontrar la fecha en que todos pueden. Usa la misma base técnica que Entre tu Arte
(Vite + React + Supabase), pero no comparte datos, marca ni pantallas con la tienda.

- Código: `src/modules/organizar/` · Base de datos: `supabase/migrations/20261112000000_si_nos_organizamos.sql` (prefijo `sno_`)
- Participante: `https://entretuarte.com/organizar/mi?c=ENLACE` (sin cuenta ni contraseña)
- Administrador: `https://entretuarte.com/organizar/panel` (mismo correo y contraseña que el panel de Entre tu Arte)

## Activar (una sola vez)
Supabase › proyecto de Entre tu Arte › SQL Editor › pegar todo el archivo de la migración › Run.
Se puede ejecutar más de una vez. El administrador de Entre tu Arte queda como administrador general.

## Cómo funciona
1. **Participantes**: se registran una sola vez con nombre y teléfono. Cada uno tiene un enlace privado,
   largo e imposible de adivinar. El botón 🔄 genera uno nuevo y el anterior deja de funcionar al instante.
2. **Evento**: nombre, período, días permitidos, horario («7:00 p. m. en adelante» o con hora final),
   fecha límite e invitados. Puede haber muchos eventos a la vez, cada uno con sus invitados.
3. **Disponibilidad**: cada invitado abre su enlace y toca los días que **no** puede (solo a esa hora o todo el día),
   y luego «Listo». Hasta que confirma, cuenta como **sin respuesta**, nunca como disponible.
4. **Calendario compartido**: los bloqueos son de la persona, no del evento. Un bloqueo se aplica solo a todos sus
   eventos cuyo horario choque (ocupado de 3 a 5 p. m. no afecta un evento de 7 p. m.).
5. **Resultados**: el panel ordena las fechas (100 % primero, luego las de mayor asistencia), con vista de lista,
   de calendario y resumen por día de la semana.
6. **Votación**: el administrador elige 2 a 6 fechas y abre la votación. Un voto por persona (se puede cambiar).
   Si hay empate: confirmar una o abrir una segunda ronda solo con las empatadas.
7. **Confirmación**: los invitados ven la fecha con botones para Google Calendar e iPhone/Outlook (.ics).
8. **WhatsApp**: cada invitado tiene botones con el mensaje listo (invitar, recordar, pedir voto, avisar fecha).

## Amigo secreto (dentro de cada evento)
En el detalle del evento › **Agregar amigo secreto** (monto, fecha del intercambio y mensaje, opcionales).
Participan los invitados del evento: si se invita o quita a alguien, se ajusta solo (y si ya se había sorteado,
se anula para volver a sortear). **Sortear** reparte al azar en un círculo: nadie se saca a sí mismo.
Cada participante abre el evento con su enlace y toca «Descubrir» para ver a quién le tocó y su lista de deseos.
La lista de deseos es general de cada persona (`sno_personas.deseo`): se escribe una vez y sirve para todos sus sorteos.
Las asignaciones (`sno_sorteo_asignaciones`) no tienen reglas de lectura: ni el panel las muestra; solo dice
quién ya vio la suya. Base de datos: `supabase/migrations/20261113000000_amigo_secreto.sql`.

## Quién lleva qué (encargados, dentro de cada evento)
En el detalle del evento: lista de encargos (sugeridos: comida, pastel, carne, arroz, hielo, vino, cerveza,
mesas, casa, limpieza… o los propios), cada uno con «1 persona», «varias: hasta N» o «varias: sin límite» y un detalle opcional. Los invitados se apuntan con
«Yo lo llevo» desde su enlace, o el administrador asigna. Esta lista sí la ven todos los invitados del evento
(primer nombre de cada responsable). «Enviar al grupo» manda la lista con lo que falta.
Base de datos: `supabase/migrations/20261114000000_encargados.sql`.

## Privacidad
`sno_bloqueos` y `sno_votos` no tienen ninguna regla de lectura: nadie los lee directamente, ni siquiera el
administrador. Cada participante recibe solo lo suyo y el administrador solo conteos (cuántos pueden cada día,
cuántos votos tiene cada fecha, quién respondió o votó, pero no qué marcó ni por cuál votó).

## Otro administrador
```sql
insert into public.sno_admins (user_id, nombre)
select id, 'Nombre' from auth.users where email = 'correo@ejemplo.com';
```
(La cuenta se crea primero en Supabase › Authentication › Users.)
