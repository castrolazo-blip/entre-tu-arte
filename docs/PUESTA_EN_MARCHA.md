# Puesta en marcha de la web v2

El orden importa: la migración activa la seguridad y desde ese momento el panel viejo
(contraseña dentro de la página) deja de poder escribir.

## 1. Publicar la web nueva (Vercel, igual que Sport Car)
1. En vercel.com › Add New › Project, importa el repositorio `entre-tu-arte`.
2. Framework: **Vite** (se detecta solo). Build: `npm run build`. Output: `dist`.
3. Conecta tu dominio en Settings › Domains.

`vercel.json` ya hace que rutas como `/obra/12` funcionen al recargar la página.

## 2. Crear tu usuario administrador
Supabase (proyecto de Entre tu Arte) › Authentication › Users › **Add user**:
correo y contraseña. Marca "Auto confirm user".

En Authentication › URL Configuration agrega la dirección del sitio (y `/login`)
para que funcione "Olvidé mi contraseña".

## 3. Aplicar la migración
Supabase › SQL Editor › pega y ejecuta `supabase/migrations/20261101000000_web_modular.sql`.

Hace lo siguiente:
- Agrega a las obras: precio, medidas, técnica, existencias, edición limitada, artista, hasta 3 fotos,
  ficha para redes, destacada, reservada hasta, vendida en.
- Crea las tablas `artistas` (copia los nombres que ya tenías en el publicador), `portadas`,
  `consultas` y `admins`.
- Activa la seguridad por filas: el público solo lee; solo un administrador escribe.
  Las obras vendidas salen solas del banner de destacadas.

## 4. Registrarte como administrador
En el SQL Editor (cambia el correo):

```sql
insert into public.admins (user_id, nombre)
select id, 'Ronald' from auth.users where email = 'TU_CORREO';
```

## 5. Primeros pasos en el panel (`/login`)
1. **Configuración**: WhatsApp, correo, redes y la **clave de la IA** (la misma de antes).
2. **Artistas**: revisa los importados, agrega foto y biografía (sin teléfonos ni redes personales).
3. **Obras**: las obras viejas aparecen con "Sin datos": edítalas para agregar precio, medidas y artista.
4. **Portada dinámica** y **Banner destacadas**: elige qué se muestra en el inicio.

## Notas
- La función de IA sigue en el proyecto `sport-car-system` y se protege con la clave privada
  (`x-eta-clave`); no hace falta cambiarla.
- Los clientes solo pueden subir la foto de su pared a la carpeta `asesorias/`.
- La compra todavía no cobra en línea: "Comprar" y "Reservar" crean una consulta que el equipo
  confirma (Admin › Consultas). El pago en línea (Wompi / N1co / PayPal) es la siguiente fase.
