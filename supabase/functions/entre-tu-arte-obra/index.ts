// Recibe hasta 3 fotos de una obra de Entre Tu Arte y devuelve nombre, descripción, estilo y
// técnica para la ficha, y el texto para redes sociales. Vive en el proyecto de Supabase
// "sport-car-system" porque ahí ya está guardada la clave ANTHROPIC_API_KEY; así la clave nunca
// queda en el código de la página.
//
// La página de Entre Tu Arte pertenece a otro proyecto de Supabase, así que no puede mandar un
// JWT válido de este proyecto (verify_jwt va desactivado). La protección la da la clave privada
// ETA_CLAVE: solo quien la escriba en el panel admin puede usar la función y gastar créditos.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-eta-clave",
};

const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"];

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
- publicacion: texto listo para Instagram/Facebook. Primera línea con el nombre de la obra y
  1 emoji sobrio. Luego 2 a 4 frases que conecten la obra con el hogar y las emociones. Si hay
  datos del artista (nombre, medidas), menciónalos. Cierra con una invitación a escribir por
  mensaje directo o WhatsApp. Texto plano, sin markdown.
- hashtags: 6 a 10 hashtags en español e inglés, sin espacios, incluyendo #EntreTuArte.

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
  },
  required: ["nombre", "descripcion", "estilo", "tecnica", "espacios", "publicacion", "hashtags"],
  additionalProperties: false,
};

function responder(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const claveEsperada = Deno.env.get("ETA_CLAVE");
  if (!claveEsperada) {
    return responder({ error: "Falta configurar el secreto ETA_CLAVE en Supabase." }, 500);
  }
  if (req.headers.get("x-eta-clave") !== claveEsperada) {
    return responder({ error: "Clave de acceso incorrecta." }, 401);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return responder({ error: "Falta configurar ANTHROPIC_API_KEY en Supabase." }, 500);
  }

  try {
    const { imagenes, notas } = await req.json();
    if (!Array.isArray(imagenes) || imagenes.length < 1 || imagenes.length > 3) {
      return responder({ error: "Envía entre 1 y 3 fotos de la obra." }, 400);
    }
    for (const img of imagenes) {
      if (!img || !TIPOS_IMAGEN.includes(img.tipo) || typeof img.datos !== "string") {
        return responder({ error: "Formato de imagen no válido (usa JPG, PNG o WEBP)." }, 400);
      }
    }

    const contenido: Anthropic.Beta.BetaContentBlockParam[] = imagenes.map((img) => ({
      type: "image",
      source: { type: "base64", media_type: img.tipo, data: img.datos },
    }));
    let texto = INSTRUCCIONES;
    if (typeof notas === "string" && notas.trim()) {
      texto += `\n\nDatos que aporta el artista (úsalos tal cual, tienen prioridad):\n${notas.trim().slice(0, 600)}`;
    }
    contenido.push({ type: "text", text: texto });

    const client = new Anthropic({ apiKey });
    const resp = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      // @ts-ignore: parámetro de la beta de fallback; si una política rechaza la solicitud, la
      // API la reintenta en otro modelo dentro de la misma llamada.
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: ESQUEMA } },
      messages: [{ role: "user", content: contenido }],
    });

    if (resp.stop_reason === "refusal") {
      return responder({ error: "La IA no pudo procesar estas fotos. Prueba con otras imágenes." }, 422);
    }
    const bloque = resp.content.find((b) => b.type === "text");
    if (!bloque || bloque.type !== "text") {
      return responder({ error: "La IA no devolvió texto. Intenta de nuevo." }, 502);
    }
    return responder(JSON.parse(bloque.text));
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return responder({ error: `El servicio de IA respondió con error (${err.status}).` }, 502);
    }
    return responder({ error: String(err) }, 500);
  }
});
