# Cartas con Amor · puesta en marcha y manual de organizadores

Aplicación web (dentro del sitio de Entre tu Arte, de forma temporal) para recibir, clasificar,
resguardar e imprimir las cartas de familiares y amigos para las parejas del retiro.

| Dirección | Para quién |
|---|---|
| `https://entretuarte.com/cartas/enviar?c=CÓDIGO` | Familiares y amigos (sin cuenta) |
| `https://entretuarte.com/cartas/entrar` | Organizadores (con cuenta) |
| `https://entretuarte.com/cartas/panel` | Panel |

Nada de esto aparece en Google (`noindex` y `robots.txt`) ni en el menú de la tienda.

---

## 1. Puesta en marcha (una sola vez, ~10 minutos)

1. **Base de datos.** Supabase (proyecto de Entre tu Arte) › SQL Editor › pega y ejecuta
   `supabase/migrations/20261106000000_cartas_con_amor.sql`. Crea las tablas `cca_*`, la seguridad
   y el bucket privado `cca-cartas`. Los administradores de Entre tu Arte quedan como administradores aquí.
   Se puede ejecutar de nuevo sin perder datos.
2. **Publicar.** Unir la rama `cartas-con-amor` a `main` (GitHub Actions publica solo).
3. **Recuperar contraseña.** Authentication › URL Configuration › Redirect URLs: agrega
   `https://entretuarte.com/cartas/entrar`.
4. **Organizadores.** Authentication › Users › *Add user* (correo + contraseña, "Auto confirm user").
   Luego en el panel › Configuración › Usuarios: agrégalo por correo, elige rol y si **puede leer** las cartas,
   y asígnale el retiro.
5. **Retiro.** Panel › Retiros › Nuevo retiro. Ejemplo:
   *Renova R02 · El Salvador*, 27–29 nov 2026, Casa de Retiro Encuentros Conyugales,
   fecha límite lunes 23 nov 23:59, meta 10 por persona, responsable "Equipo Renova · Regnum Christi",
   contacto "WhatsApp 7729-0194". Cambia el estado a **Activo** para abrir la recepción.

## 1b. Flujo de Renova (cómo trabaja el equipo de cartas)

- **Meta:** 10 cartas por persona = 20 por pareja (Retiros › Editar › *Meta de cartas por persona*).
  Una carta «para ambos» cuenta para los dos. El semáforo y el tablero miden contra la meta.
- **Importar el Excel de inscripción** (Parejas › Importar › *Excel de inscripción*): toma el archivo
  `Cartas_Renova_02_SV.xlsx` tal cual. Crea las 25 parejas con nombres, apellidos, «le gusta que le digan»,
  celulares, responsable e «invitados por», y los **dos contactos de la familia** de cada una como
  *coordinadores*. Los celulares que no son teléfono (p. ej. un DUI) no se guardan.
- **Mensaje a las familias:** Seguimiento › *Contactos sin entregar* › WhatsApp. Es el texto «¡Venga Tu Reino!…»
  con la pareja, la responsable, la meta, la fecha límite y el enlace ya completados. Se edita en Retiros › Editar.
- **Recepción:**
  - *En papel* (Colegio Highlands): pareja › **Registrar cartas recibidas** › «En papel», elegir qué contacto
    entregó el paquete y escribir una línea por carta («De: hermano», y para quién). No se abren ni se
    fotografían; van directo al sobre. El contacto pasa a «entregó».
  - *Por correo* (cartasrenova@gmail.com): igual, con «Por correo» y adjuntando el archivo para imprimirlo.
  - *Por el enlace*: los familiares (o el contacto, una carta a la vez) la escriben o suben foto/escaneo.
- **Sobres:** Impresión › *Etiquetas para los sobres* (una por persona, con nombre completo y número de cartas).
  El PDF para imprimir solo incluye las cartas digitales y por correo.
- **Confidencialidad:** los organizadores nuevos **no** pueden leer cartas. Actívalo solo para quien imprime.
  Aun con permiso, el contenido se abre con un botón y queda registrado quién lo abrió.
- Fecha límite sugerida: **lunes 23 de noviembre 2026, 11:59 p. m.** (la entrega en papel es hasta las 2:30 p. m.).

## 1c. Equipo de cartas y repartición

1. **Supabase › SQL Editor:** ejecuta también `supabase/migrations/20261107000000_cartas_equipo.sql`, una sola vez. Se puede repetir.
2. **Configuración › Equipo › Nuevo matrimonio:**
   - Primero los **dos apellidos** («Castro Lazo»); avisa si ya existe uno igual.
   - Después, de cada cónyuge: nombre, teléfono y correo.
3. **Configuración › Repartición:** a cada pareja participante se le elige el matrimonio responsable. Se puede asignar una por una o «las N de la lista» de una vez.
4. **Enlace privado de cada matrimonio (recomendado, sin cuenta):** en Equipo, «Enviar a Ronald / Ana» manda por WhatsApp su enlace `/cartas/equipo?t=…`. Ven solo sus parejas, el mensaje para las familias y registran paquetes en papel; nunca leen cartas. «Cambiar» crea un enlace nuevo y anula el anterior. Requiere la migración `20261108000000_cartas_enlace_equipo.sql`.
5. **Bandeja de cada matrimonio («Mis parejas», con cuenta):** muestra solo sus parejas asignadas, con el avance por persona, los contactos de la familia, WhatsApp y «Registrar cartas recibidas».
   - Para entrar, cada cónyuge va a `/cartas/entrar` › **Crear mi cuenta** con el **mismo correo** registrado en el equipo, y confirma el correo que le llega.
   - Entra como organizador **sin lectura de cartas**.
   - El administrador ve la bandeja de cualquier matrimonio en «Bandejas del equipo».
   - Si el correo de confirmación no llega: Supabase › Authentication › Users › el usuario › *Confirm email*. El correo gratuito de Supabase envía pocos mensajes por hora.
5. El mensaje a las familias dice «Pueden hacer la entrega de cartas con **el matrimonio Castro Lazo (Ronald 7000-0000 · Ana 7111-1111)**».

## 1d. Clasificación de las cartas
No hay remitentes esperados: las cartas quedan abiertas a quien quiera enviarlas. Cada carta se **clasifica**
por quién la envía: Papá, Mamá, Hijo, Hija, Hermano, Hermana, Abuelo/a, Nieto/a, Tío/a, Primo/a, Sobrino/a,
Suegro/a, Cuñado/a, Padrino, Madrina, Ahijado/a, Amigo/a, Compañero de trabajo, Sacerdote / religioso,
o en grupo (Papás, Hijos, Hermanos, Abuelos, Tíos, Suegros, Amigos, Familia) u «Otro».
- En el formulario es obligatoria (botones) y el nombre es opcional para los contactos de familia.
- En «Registrar cartas recibidas» cada línea lleva la clasificación y un nombre opcional.
- La ficha de cada pareja muestra el desglose («Hermana 2 · Papá 1…») y la bandeja filtra por clasificación.

## 2. Roles

| Rol | Puede |
|---|---|
| Administrador | Todo: retiros, usuarios, plazos, todas las cartas, exportar, respaldo y eliminación. |
| Organizador | Solo sus retiros asignados: parejas, remitentes, revisar cartas, cartas físicas, recordatorios, impresión. |
| Organizador sin lectura | Igual, pero **no ve el texto ni los archivos**: solo controla estados. |
| Familiar o amigo | Solo el formulario. No ve ninguna carta, ni siquiera la suya después de enviarla. |

Lo garantiza la base de datos (seguridad por filas), no solo la pantalla: un usuario sin permiso no puede abrir
una carta ni con el enlace directo. Los archivos se abren con enlaces temporales de 5 minutos.

## 3. Uso diario

1. **Parejas** › Nueva pareja o *Importar CSV* (plantilla incluida; en Excel "Guardar como CSV UTF-8").
   Después importa los **remitentes esperados** (se enlazan por el código de pareja).
2. **Compartir enlaces.**
   - *Enlace general* (Tablero): la persona elige la pareja de una lista.
   - *Enlace de pareja* (ficha de la pareja): la pareja ya viene elegida.
   - *Enlace personal* de cada remitente (botón WhatsApp / Copiar mensaje): además vincula su carta
     automáticamente y lo marca "recibido".
3. **Pendientes**: lista de quién falta. El botón WhatsApp abre el chat con el mensaje listo (incluye el
   recordatorio de que es sorpresa). Queda registrado quién lo recordó y cuándo. "No enviará" pide motivo.
4. **Cartas** (bandeja): revisar, aprobar, rechazar o marcar duplicada (con motivo), vincular a un remitente
   esperado, corregir pareja o destinatario, marcar archivo ilegible e incidencia. Todo queda en el historial.
   *Registrar carta física*: foto o escaneo desde el celular; queda con origen "física".
5. **Impresión y entrega**: elige la pareja, ordena, y genera el **PDF para imprimir** (portada, separador por
   carta, texto, fotos, PDF y Word incluidos), el **ZIP de originales** y la **lista de control**.
   Marca "Impresa" y, al entregarlas en mano, "Entregada" (imprimir no marca entregada).
6. **Tablero**: KPIs, semáforo por pareja, plazo, actividad y reportes (PDF de resumen y CSV).

### Reglas que aplica el sistema
- Una carta "para ambos" cuenta una sola vez.
- Una persona puede mandar varias cartas; si repite a la misma pareja se marca "¿Duplicada?" para revisión.
- Las cartas sin remitente esperado son **adicionales**: no reducen los pendientes de nadie.
- Las rechazadas/duplicadas no cuentan ni se imprimen. Si se rechaza la única carta de un remitente, vuelve a "pendiente".
- Pareja que se retira: estado "Se retiró del evento" — conserva historial y sale de indicadores y formulario.
- Después de la fecha límite: se bloquea o se acepta como "tardía", según la configuración del retiro.
- Antispam: campo trampa invisible y límite de envíos por conexión. Archivos: solo PDF, DOCX, JPG, PNG,
  se valida tipo real, tamaño y existencia en el servidor. Las fotos grandes se reducen antes de subir.
- El formulario guarda un borrador en el teléfono mientras se escribe.

## 4. Respaldo y restauración
- **Automático**: Supabase hace copias diarias del proyecto (Database › Backups).
- **Por retiro**: Configuración › *Descargar respaldo completo* → ZIP con `datos/*.json` (incluye textos) y
  `archivos/` (originales por folio). Verificación sugerida: abrir el ZIP y comprobar que el número de cartas
  de `cartas.json` coincide con el Tablero y que los archivos abren.
- **Restaurar**: aplicar la migración en un proyecto limpio e importar los JSON con Table Editor › Import
  (orden: retiros, parejas, remitentes, cartas, contenidos, archivos) y subir los archivos al bucket
  `cca-cartas` con la misma ruta del campo `ruta`.

## 5. Conservación y eliminación
Cada retiro define sus días de conservación (90 por defecto). Pasado el plazo, un administrador va a
Configuración › Conservación, escribe el nombre del retiro y elimina su contenido (cartas, textos y archivos).
Para quitar todo el módulo: `docs/cartas/QUITAR_CARTAS.md`.

## 6. Criterios de aceptación del MVP
| # | Criterio | Cómo se cumple |
|---|---|---|
| 1 | Crear retiro, pareja y 5 remitentes | Retiros › Nuevo; Parejas › Nueva; ficha › Agregar (o CSV) |
| 2 | Envío desde el teléfono con texto o archivo y confirmación | `/cartas/enviar` → número CA-0001 |
| 3 | Aparece en la bandeja con pareja y destinatario correctos | Cartas |
| 4 | Vincular a remitente esperado y se actualiza el pendiente | Detalle › Remitente esperado |
| 5 | Carta adicional no altera pendientes | Remitente vacío = "Adicional" |
| 6 | Carta física por foto con origen conservado | Cartas › Registrar carta física |
| 7 | Filtrar faltantes y generar recordatorio | Pendientes › WhatsApp/Correo/Copiar |
| 8 | Aprobar y exportar PDF imprimible por pareja | Impresión › PDF para imprimir |
| 9 | Sin permisos no se abre por URL | Seguridad por filas + bucket privado |
| 10 | Reporte y respaldo | Tablero › Reportes; Configuración › Respaldo |

Probado: la lógica de base de datos (permisos, envíos, duplicados, pendientes, antispam, auditoría) contra
PostgreSQL; las pantallas en navegador (celular y escritorio) con datos simulados.
**Pendiente de probar en el Supabase real**: subida de archivos al bucket y enlaces firmados.

## 7. Decisiones pendientes (del documento de requerimientos)
- Nombre/branding definitivo (hoy: "Cartas con Amor · Encuentro matrimonial", colores vino y oro).
- Quién lee contenido vs. quién solo controla estados → se configura por usuario ("Puede leer").
- Fecha límite y aceptación tardía → por retiro.
- Edición de cartas después del envío: **no** implementada (se puede corregir pareja/destinatario).
- WhatsApp automático: no incluido (fase 3); hoy se abre el chat con el mensaje listo.
- La lista de parejas del enlace general muestra sus nombres a quien tenga el enlace: si no se desea,
  compartir solo enlaces de pareja o personales.
