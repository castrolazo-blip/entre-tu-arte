# Menú en Casa · manual

Aplicación independiente en **https://entretuarte.com/menu/**. Muestra qué come cada integrante de la familia en cada desayuno, refrigerio, almuerzo y cena. También junta las porciones para cocinar y arma la lista del súper.

- El código está en `apps/menu-en-casa/` (Vite + React + TypeScript). Se compila y se publica junto con el sitio (`.github/workflows/publicar.yml`).
- **Privacidad:** los planes son información de salud. El código es público, pero **no incluye datos**. Planes, perfiles y marcas de cocina viven en Supabase (tablas `menu_*`) y solo los leen miembros con sesión. La página lleva `noindex`, así que Google no la indexa.

## Puesta en marcha (una sola vez)
1. Supabase › proyecto de Entre tu Arte › **SQL Editor** › pega y ejecuta `supabase/migrations/20261119000000_menu_en_casa.sql`. Se puede ejecutar más de una vez.
2. Entra a https://entretuarte.com/menu/ con tu cuenta de administrador de Entre tu Arte. Mientras el menú no tenga ningún administrador propio, esa cuenta entra como administrador.
3. Ve a **Planes y perfiles** › **Importar respaldo** y elige el archivo `menu-en-casa-respaldo.json`. Con eso quedan cargados los planes y perfiles.
4. En **Miembros con acceso** agrégate como Administrador. Agrega también a quien cocina (permiso Cocina) y a cada integrante. Cada persona necesita antes una cuenta: Supabase › Authentication › **Add user** (correo y contraseña).

## Actualización (protecciones)
Ejecutar también `supabase/migrations/20261120000000_menu_en_casa_protecciones.sql` en el SQL Editor. Impide que un teléfono con datos viejos borre los planes y que se quite al último administrador.

## Actualización («Comí algo más»)
Ejecutar `supabase/migrations/20261121000000_menu_en_casa_extras.sql` en el SQL Editor para guardar lo que alguien comió fuera del plan.

## Permisos
| Permiso | Puede |
|---|---|
| Administrador | Todo: cargar, corregir y activar planes, editar perfiles, dar y quitar accesos |
| Cocina | Ver menús y cantidades, elegir opciones de cambio, marcar listo, comprado y lo que hay en casa |
| Integrante | Ver su plan y el menú familiar, y elegir opciones de cambio |

## Notas
- Los cambios de cada teléfono se guardan al momento y los demás los ven al volver a abrir la app (o en menos de un minuto).
- El documento original (PDF) que se sube al crear un plan queda guardado solo en el teléfono donde se subió.
