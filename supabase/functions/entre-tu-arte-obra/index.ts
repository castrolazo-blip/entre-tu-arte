// Recibe hasta 3 fotos de una obra de Entre Tu Arte y devuelve nombre, descripción, estilo y
// técnica para la ficha, y el texto para redes sociales. Vive en el proyecto de Supabase
// "sport-car-system" porque ahí ya está guardada la clave ANTHROPIC_API_KEY; así la clave nunca
// queda en el código de la página.
//
// La página de Entre Tu Arte pertenece a otro proyecto de Supabase, así que no puede mandar un
// JWT válido de este proyecto (verify_jwt va desactivado). La protección la da la clave privada
// de acceso (secreto ETA_CLAVE o tabla eta_config): solo quien la escriba en el panel admin puede
// usar la función y gastar créditos.
//
// Trabaja en segundo plano: el POST registra el trabajo en la tabla eta_trabajos, responde de
// inmediato con su id y sigue generando aunque la persona cierre la página. La página consulta
// el resultado con GET ?id=... cuando vuelve. Las fotos llegan como enlaces públicos del
// almacenamiento de Entre Tu Arte, no dentro de la petición.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-eta-clave",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Solo se aceptan fotos subidas al almacenamiento de Entre Tu Arte (la página las sube antes de
// pedir la ficha; mandar las fotos dentro de la petición se colgaba desde el celular).
const PREFIJO_FOTOS = "https://titmjfkpvlsuazqsfniw.supabase.co/storage/v1/object/public/catalogos/";

const INSTRUCCIONES = `Eres el director creativo de "Entre Tu Arte", marca salvadoreña de arte decorativo
contemporáneo y cuadros personalizados para interiores. Su estética: Japandi, minimalismo cálido,
diseño contemporáneo; piezas modernas, elegantes y emocionalmente conectadas con los espacios.

Te paso fotos de UNA obra: normalmente la vista principal, la obra en un ambiente y un detalle de
textura. Obsérvalas con atención: paleta, técnica aparente, texturas, composición, sensación.

Devuelve:
- nombre: título evocador de 2 o 3 palabras, en español, sin comillas. La última palabra se
  imprime grande en la ficha, así que debe ser la más potente (ej. "Límite Silente",
  "Raíz Dorada"). Que suene a galería, nunca genérico ("Abstracto 1", "Arte moderno").
- descripcion: 2 frases, 30 a 45 palabras, para la ficha impresa. Tono poético y sobrio, en
  tercera persona, que hable de lo que la obra evoca. Ejemplo del tono buscado:
  "Una línea sutil divide lo visible de lo profundo. La obra transmite equilibrio, textura y
  contención, evocando ese punto donde todo parece quieto, pero guarda una historia debajo de
  la superficie."
- estilo: 2 o 3 palabras (ej. "Abstracto contemporáneo", "Minimalismo cálido").
- tecnica: técnica aparente en pocas palabras (ej. "Acrílico sobre lienzo"); si el artista la
  dio en sus datos, repítela tal cual.
- espacios: 2 a 4 espacios del hogar u oficina donde luce mejor (ej. "Sala", "Comedor",
  "Recámara", "Oficina", "Recibidor").
- publicacion: caption breve pero con alma para Instagram/Facebook (entre 220 y 380 caracteres
  en total), en 3 bloques separados por una línea en blanco:
  1) el nombre de la obra con 1 emoji sobrio;
  2) 2 o 3 frases cortas (25 a 45 palabras en total) que despierten deseo: un detalle sensorial
     de la obra (un color, una textura, un gesto) y lo que provoca en el espacio o en quien la
     vive. Cálido y evocador, sin listar datos técnicos ni repetir la descripción de la ficha;
  3) exactamente esta línea: "Disponible. Escríbenos al WhatsApp (503) 7797-9504 ✨".
  Ejemplo:
  "Umbral Ígneo 🔥

  Rojos que arden junto a azules profundos, como una conversación entre fuego y calma. Una pieza
  que convierte cualquier pared en el punto donde todo se reúne.

  Disponible. Escríbenos al WhatsApp (503) 7797-9504 ✨"
  Texto plano, sin markdown.
- hashtags: 5 o 6 hashtags, sin espacios, incluyendo #EntreTuArte.
- encuadres: uno por cada foto, en el mismo orden en que te las paso (foto 1, 2, 3). Sirven para
  encuadrar cada foto en la ficha sin cortar la obra. Para cada foto da el rectángulo, en
  fracciones de 0 a 1 del ancho y alto de ESA foto (x, y = esquina superior izquierda), que
  contiene la obra COMPLETA incluido su bastidor o marco, bien ajustado a sus bordes. Si la obra
  se ve en perspectiva, el rectángulo debe abarcar todas sus esquinas. Si la foto es un
  acercamiento de textura donde la obra no se ve completa, da la zona de textura más atractiva,
  nítida y con más relieve.

Reglas: español neutro centroamericano, cálido y profesional. No inventes medidas, precios ni
materiales que no se puedan ver; si la técnica no es clara, descríbela por su apariencia.`;

const ESQUEMA = {
  type: "object",
  properties: {
    nombre: { type: "string" },
    descripcion: { type: "string" },
    estilo: { type: "string" },
    tecnica: { type: "string" },
    espacios: { type: "array", items: { type: "string" } },
    publicacion: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    encuadres: {
      type: "array",
      items: {
        type: "object",
        properties: {
          foto: { type: "integer" },
          x: { type: "number" },
          y: { type: "number" },
          ancho: { type: "number" },
          alto: { type: "number" },
        },
        required: ["foto", "x", "y", "ancho", "alto"],
        additionalProperties: false,
      },
    },
  },
  required: ["nombre", "descripcion", "estilo", "tecnica", "espacios", "publicacion", "hashtags", "encuadres"],
  additionalProperties: false,
};

function responder(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Llama a Claude con las fotos y devuelve el JSON de la ficha; lanza Error con un mensaje
// legible para guardarlo en el trabajo si algo falla.
async function generar(apiKey: string, urls: string[], notas: unknown) {
  const contenido: Anthropic.Beta.BetaContentBlockParam[] = urls.map((url) => ({
    type: "image",
    source: { type: "url", url },
  }));
  let texto = INSTRUCCIONES;
  if (typeof notas === "string" && notas.trim()) {
    texto += `\n\nDatos que aporta el artista (úsalos tal cual, tienen prioridad):\n${notas.trim().slice(0, 600)}`;
  }
  contenido.push({ type: "text", text: texto });

  const client = new Anthropic({ apiKey });
  let resp;
  try {
    resp = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      // @ts-ignore: parámetro de la beta de fallback; si una política rechaza la solicitud, la
      // API la reintenta en otro modelo dentro de la misma llamada.
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: ESQUEMA } },
      messages: [{ role: "user", content: contenido }],
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) throw new Error(`El servicio de IA respondió con error (${err.status}).`);
    throw err;
  }
  if (resp.stop_reason === "refusal") throw new Error("La IA no pudo procesar estas fotos. Prueba con otras imágenes.");
  const bloque = resp.content.find((b) => b.type === "text");
  if (!bloque || bloque.type !== "text") throw new Error("La IA no devolvió texto. Intenta de nuevo.");
  return JSON.parse(bloque.text);
}

async function procesar(id: string, apiKey: string, urls: string[], notas: unknown) {
  try {
    const resultado = await generar(apiKey, urls, notas);
    await db.from("eta_trabajos").update({ estado: "listo", resultado, actualizado: new Date().toISOString() }).eq("id", id);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("trabajo", id, "falló:", error);
    await db.from("eta_trabajos").update({ estado: "error", error, actualizado: new Date().toISOString() }).eq("id", id);
  }
  const hace7dias = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  await db.from("eta_trabajos").delete().lt("creado", hace7dias);
}

// La clave de acceso sale del secreto ETA_CLAVE si existe; si no, de la tabla eta_config
// (así se puede configurar sin entrar al panel de Supabase).
async function claveAcceso(): Promise<string> {
  const delSecreto = Deno.env.get("ETA_CLAVE");
  if (delSecreto) return delSecreto;
  const { data } = await db.from("eta_config").select("valor").eq("clave", "clave_acceso").maybeSingle();
  return data?.valor || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const claveEsperada = await claveAcceso();
  if (!claveEsperada) {
    return responder({ error: "Falta configurar la clave de acceso (ETA_CLAVE o tabla eta_config)." }, 500);
  }
  // Sin distinguir mayúsculas ni espacios: el iPhone pone mayúscula automática al escribir la clave
  const normalizar = (v: string | null) => (v || "").trim().toLowerCase();
  if (normalizar(req.headers.get("x-eta-clave")) !== normalizar(claveEsperada)) {
    return responder({ error: "Clave de acceso incorrecta." }, 401);
  }

  if (req.method === "GET") {
    const id = new URL(req.url).searchParams.get("id") || "";
    const { data, error } = await db.from("eta_trabajos").select("estado, resultado, error, creado").eq("id", id).maybeSingle();
    if (error) return responder({ error: "No se pudo consultar el trabajo." }, 500);
    if (!data) return responder({ error: "El trabajo ya no existe." }, 404);
    return responder(data);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return responder({ error: "Falta configurar ANTHROPIC_API_KEY en Supabase." }, 500);
  }

  try {
    console.log("POST recibido, leyendo datos…");
    const { urls, notas } = await req.json();
    if (!Array.isArray(urls) || urls.length < 1 || urls.length > 3) {
      return responder({ error: "Envía entre 1 y 3 fotos de la obra." }, 400);
    }
    if (!urls.every((u) => typeof u === "string" && u.startsWith(PREFIJO_FOTOS))) {
      return responder({ error: "Las fotos deben estar subidas al almacenamiento de Entre Tu Arte." }, 400);
    }

    const { data, error } = await db.from("eta_trabajos").insert({}).select("id").single();
    if (error || !data) {
      console.error("no se pudo registrar el trabajo:", error?.message);
      return responder({ error: "No se pudo registrar el trabajo." }, 500);
    }
    console.log("trabajo", data.id, "registrado con", urls.length, "foto(s)");
    EdgeRuntime.waitUntil(procesar(data.id, apiKey, urls, notas));
    return responder({ id: data.id, estado: "pendiente" }, 202);
  } catch (err) {
    return responder({ error: String(err) }, 500);
  }
});
