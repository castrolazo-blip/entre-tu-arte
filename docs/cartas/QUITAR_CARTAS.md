# Quitar Cartas con Amor ("barrerlo")

El módulo es temporal y vive aislado. Al terminar el retiro y vencido el plazo de conservación:

## 1. Datos (Supabase de Entre tu Arte)
1. En el panel (`/cartas/panel/configuracion`), descarga el **respaldo** de cada retiro si hay que conservarlo.
2. Supabase › Storage › `cca-cartas`: selecciona todo y **Delete**.
3. Supabase › SQL Editor: ejecuta `docs/cartas/QUITAR_CARTAS.sql`.
4. Authentication › Users: borra las cuentas de los organizadores (no las de Entre tu Arte).

## 2. Código (en una rama nueva, luego unir a `main`)
Borrar:
- `src/modules/cartas/` (carpeta completa)
- `scripts/paginas-cartas.mjs`
- `supabase/migrations/20261106000000_cartas_con_amor.sql` `20261107000000_cartas_equipo.sql` y `20261108000000_cartas_enlace_equipo.sql`
- `docs/cartas/`

Deshacer estas líneas (todas tienen el comentario "Cartas con Amor"):
- `src/App.jsx`: `const RutasCartas = lazy(...)` y `<Route path="cartas/*" ... />`
- `.github/workflows/publicar.yml`: paso `node scripts/paginas-cartas.mjs`
- `tailwind.config.js`: colores `vino` y `oro`
- `src/lib/actualizacion.js`: `|| window.location.pathname.includes('/cartas')`
- `public/robots.txt`: `Disallow: /cartas`
- `package.json`: `npm uninstall pdf-lib fflate mammoth`

Comprobar: `npm run build` y buscar que no quede nada: `grep -ri "cartas con amor\|cca_\|cca-" src scripts .github`.
