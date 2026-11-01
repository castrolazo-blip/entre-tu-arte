# Entre tu Arte · Web v2

Galería y tienda de arte original con panel de administración e IA.
Misma base técnica que Sport Car: **Vite + React + React Router + Tailwind + Supabase**, organizada por módulos.

## Estructura

```
src/
  main.jsx · App.jsx · index.css       Arranque, rutas (carga diferida) y estilos de marca
  lib/                                 supabase.js, formato.js, analytics.js
  context/ConfigContext.jsx            Textos y contacto editables (tabla configuracion)
  components/                          Logo, títulos, fondos con imagen, tarjetas de obra…
    publico/                           Encabezado, menú de celular, pie de página
    obras/                             TarjetaObra, FormularioConsulta
  modules/
    inicio/                            Portada dinámica, banner de destacadas, inicio
    colecciones/  catalogo/            Colecciones, catálogo con filtros, página de obra
    vendidas/  artistas/  blog/        Vendidas, perfiles de artistas, blog
    asesoria/                          Asesoría con foto de la pared y contacto
    auth/                              Login (Supabase Auth), sesión y ruta protegida
    admin/                             Panel de administración:
      publicar/                          Subir obra con IA + ficha para redes (canvas)
      obras/  portadas/  destacadas/     Obras, portada dinámica, banner de destacadas
      consultas/  artistas/  colecciones/  blog/  configuracion/
supabase/
  migrations/                          Cambios de base de datos (aplicar en orden)
  functions/entre-tu-arte-obra/        Función de IA (vive en el proyecto sport-car-system)
legacy/index-anterior.html             El sitio anterior de un solo archivo, como referencia
```

## Rutas

| Público | Administración (requiere login) |
|---|---|
| `/` Inicio · `/colecciones` · `/obras` · `/obra/:id` | `/admin` Resumen · `/admin/obras` |
| `/vendidas` · `/artistas` · `/artistas/:slug` | `/admin/subir` Subir obra con IA |
| `/blog` · `/blog/:id` · `/asesoria` | `/admin/portadas` · `/admin/destacadas` · `/admin/consultas` |
| `/login` | `/admin/artistas` · `/admin/colecciones` · `/admin/blog` · `/admin/configuracion` |

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
```

Se publica en GitHub Pages con `.github/workflows/publicar.yml` cada vez que hay cambios en `main`.
Para publicar por primera vez sigue `docs/PUESTA_EN_MARCHA.md`.
