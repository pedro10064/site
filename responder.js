/* ...existing code... */
export const SOURCES = [
  { name: "Psicología y Mente", url: "https://psicologiaymente.com" },
  { name: "Psicología-Online", url: "https://www.psicologia-online.com" },
  { name: "Psicodoc", url: "https://www.psicodoc.org" },
  { name: "Revista de Psicología Científica", url: "https://www.psicologiacientifica.com" },
  { name: "Psiquiatría.com", url: "https://psiquiatria.com" },
  { name: "Guía de Psicología – Univ. de Sevilla", url: "https://guiapsicologia.us.es" }
];

export function detectCrisis(text) {
  const t = text.toLowerCase();
  const flags = ["suicid", "matarme", "hacerme daño", "no quiero vivir", "me quiero morir", "lastimar", "daño a otros"];
  return flags.some(k => t.includes(k));
}

export async function respond({ text, history, feelings, mode = "local", apiKey = "", safe = true, assistantName = "PsicoloIA", restrict = false }) {
  if (mode === "openai" && apiKey) {
    const sys = buildSystemPrompt(safe, assistantName, restrict);
    const msgs = [
      { role: "system", content: sys },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: withContext(text, feelings) }
    ];
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.9,
        messages: msgs,
        max_tokens: 700
      })
    });
    if (!r.ok) throw new Error("OpenAI API error");
    const data = await r.json();
    return data.choices?.[0]?.message?.content?.trim() || fallbackLocal(text, feelings, safe, restrict);
  }
  return fallbackLocal(text, feelings, safe, restrict);
}

/* ...existing code... */
function withContext(text, feelings) {
  if (!feelings) return text;
  return `Estado reportado: ${feelings}. Usuario: ${text}`;
}

function buildSystemPrompt(safe, name = "PsicoloIA", restrict = false) {
  const base = `Eres "${name}", un amigo cercano y atento. Habla de forma cálida, simple y humana, sin tecnicismos ni instrucciones clínicas (evita guías tipo "inhala/exhala"). Ofrece 3–5 acciones concretas y cotidianas con ejemplos, enfocadas en aliviar y acompañar, manteniendo un tono empático y cercano.`;
  const safety = safe ? `Si detectas riesgo de autolesión o daño, detén el tema y ofrece ayuda inmediata con recursos y líneas de crisis.` : "";
  const src = restrict ? `Usa únicamente información coherente con estas fuentes reconocidas y cita 1–3 al final en formato [Fuente: Nombre]: ${SOURCES.map(s=>s.name).join(", ")}. Si no estás seguro, dilo y sugiere consultar la fuente.` : "";
  return `${base}\n${safety}\n${src}`.trim();
}

function fallbackLocal(text, feelings, safe, restrict=false) {
  const crisis = detectCrisis(text);
  if (safe && crisis) {
    return "Gracias por confiar en mí. Estoy acá para cuidarte. Si sentís que podrías hacerte daño, pidamos ayuda ahora: una línea de crisis o alguien de confianza. ¿Qué podríamos hacer juntos en los próximos minutos para que te sientas un poco más acompañado y seguro?";
  }
  const moodLine = feelings ? `Te entiendo; es lógico sentirse ${feelings}. ` : "";
  const explora = ["¿Qué pasó hoy que te dejó así?","Si esto fuera un mensaje a un amigo, ¿qué le dirías?","¿Qué te ayudaría a estar 10% mejor ahora mismo?"];
  const plan = [
    "1) Pequeño cuidado: un vaso de agua y estirarte un minuto.",
    "2) Conexión: manda un audio o mensaje a alguien de confianza y contale cómo estás.",
    "3) Paso simple: escribí lo que te preocupa y elegí un mini paso que puedas hacer hoy.",
    "4) Orden amable: acomodá un rincón por 5 minutos para despejar la cabeza.",
    "5) Salir un poco: caminata corta o aire en la ventana con tu música favorita."
  ].join("\n");
  const body = `${moodLine}Estoy con vos. Contame un poco más y vemos juntos qué te sirve.\n
Exploración breve:\n- ${explora.join("\n- ")}\n
Plan práctico (podés probar ahora):\n${plan}\n
Después: anotá una meta pequeña para mañana y elegí un horario. Si querés, te acompaño paso a paso.`;
  const cite = restrict ? `\n\nFuentes: ${SOURCES.map(s=>s.name).slice(0,3).join(", ")}` : "";
  return body + cite;
}
/* ...existing code... */