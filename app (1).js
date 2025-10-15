import dayjs from "dayjs";
/* ...existing code... */
import { respond, detectCrisis, SOURCES } from "./responder.js";
/* ...existing code... */

const els = {
  messages: document.getElementById("messages"),
  form: document.getElementById("input-form"),
  input: document.getElementById("user-input"),
  send: document.getElementById("send-btn"),
  moods: document.querySelectorAll(".mood[data-mood]"),
  checkin: document.getElementById("checkin-btn"),
  breathCircle: document.querySelector(".circle"),
  breathText: document.getElementById("breath-text"),
  breathToggle: document.getElementById("breath-toggle"),
  crisisDialog: document.getElementById("crisis-dialog"),
  crisisClose: document.getElementById("crisis-close"),
  crisisLinks: document.getElementById("crisis-links"),
  resourcesList: document.getElementById("resources-list"),
  voiceBtn: document.getElementById("voice-btn"),
  brandName: document.getElementById("brand-name"),
  nameDialog: document.getElementById("name-dialog"),
  nameInput: document.getElementById("assistant-name-input"),
  nameSave: document.getElementById("assistant-name-save"),
  resetBtn: document.getElementById("reset-btn"),
  bgSelect: document.getElementById("bg-style"),
  renameBtn: document.getElementById("assistant-rename"),
};
/* ...existing code... */

let pendingMood = null;
const NAME_KEY = "assistant.name.v1";
let assistantName = localStorage.getItem(NAME_KEY) || "PsicoloIA";
if (!localStorage.getItem(NAME_KEY)) els.nameDialog.showModal();
els.brandName.textContent = "PsicoloIA";

els.nameSave.addEventListener("click", () => {
  const n = (els.nameInput.value.trim() || "PsicoloIA").slice(0,32);
  assistantName = n; localStorage.setItem(NAME_KEY, n);
  // remove brandName header update to keep "PsicoloIA" fixed
  els.nameDialog.close();
});

// Persistence
const STORAGE_KEY = "acompania.chat.v1";
let history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
renderHistory(history);

// Load API key
// els.apiKey.value = localStorage.getItem("acompania.apikey") || "";
// els.apiKey.addEventListener("input", () => {
//   localStorage.setItem("acompania.apikey", els.apiKey.value.trim());
// });

// els.restrict.checked = localStorage.getItem("acompania.restrict") === "1";
// els.restrict.addEventListener("change", ()=>localStorage.setItem("acompania.restrict", els.restrict.checked ? "1":""));

// Crisis resources
document.getElementById("sources-list").innerHTML = SOURCES.map(s=>`<li><a href="${s.url}" target="_blank" rel="noopener">${s.name}</a></li>`).join("");

const placeInfo = {
  villa_elisa: "Cales – Red de Psicólogos (Villa Elisa): varios consultorios, horarios lun-vie 8–21 y sáb 9–15. Ofrecen terapia para jóvenes, adultos, pareja, niños. Fuente: Cales.\nConsultorios – Hospital de Día (Calle 44-837 entre 8 y 9): dispositivo de día para seguimiento frecuente y terapias. Fuente: Establecimientos de Salud de Argentina.\nUnidad Sanitaria Nº 39 (Calle 5 entre 45 y 46 SN): atención primaria municipal con posibles derivaciones a psicología. Fuente: Establecimientos de Salud de Argentina.",
  lp_centro: "Consultorios de Red de Psicólogos La Plata (varias sedes: Tolosa, Los Hornos, centro, etc.): profesionales para ansiedad, depresión, niños, adultos, parejas; buena disponibilidad privada con turnos. Fuente: Psico.org.\nFiorenza Paolucci (sede en 530 y 9 / otra cerca de 4 entre 59 y 60): terapia presencial en autoestima, TCA, infantil, etc. Fuente: Psico.org.",
  los_hornos: "Centro Médico Ambulatorio \"La Plata – Los Hornos\" (UPCN) — Av. 66 Nº 2323, entre 141 y 142. Tel. (0221) 450-2370. Consultorios que incluyen psicología (lic. Martínez Valeria). Horarios adm. 9–19; llamar por la mañana. Fuente: upcnba.org.\nUPA-6 Los Hornos — Calle 66 y 152: Unidad de Pronta Atención; actividades comunitarias. No confirmado psicología permanente, pero es un punto público cercano. Fuente: GovServ.\nCentro de Salud Nº 37 — Calle 137 entre 78 y 79: centro de salud barrial; referencia para atención primaria y derivaciones. Fuentes: memoria-identidad-y-resistencia.blogspot.com, quepasalaplata.com.ar.",
  melchor_romero: "Unidad Residencial y Centro de Salud Mental y Consumo Problemático \"Hebe de Bonafini\" — Calle 515 y 159: específico para adolescentes y jóvenes; salud mental y consumo problemático; estatal, servicio especializado. Fuente: Gobierno de la Provincia de Buenos Aires.\nCentro de Salud Nº 31 (zona Melchor Romero): centros de cabecera del barrio; servicios primarios y derivaciones. Fuente: quepasalaplata.com.ar.",
  gonnet: "Centro de Salud Nº 29 — República de los Niños, Gonnet: salud pública primaria; podría incluir psicología o derivaciones. Fuente: quepasalaplata.com.ar.\nConsultorio de Psicología / Psicopedagogía — Hermeto González, Calle 489 1836: atención particular con especialistas; buena opción privada/local. Fuentes: quepasalaplata.com.ar (+1)."
};

document.querySelectorAll(".recommendations .mood").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const key = btn.dataset.place;
    const info = placeInfo[key];
    if (info) addMessage("assistant", `Te recomiendo ir: ${info}`);
  });
});

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = els.input.value.trim();
  if (!text) return;
  if (pendingMood) {
    addMessage("user", text);
    els.input.value = "";
    addMessage("assistant", "Pensando en algunos pasos prácticos…", { placeholder: true });
    try {
      const prompt = `Me siento ${pendingMood} porque: ${text}. Valida brevemente y propone hasta 3 pasos prácticos, claros y amables para aliviar esta emoción ahora mismo.`;
      const reply = await respond({ text: prompt, history, feelings: pendingMood, mode: "local", apiKey: "", safe: true, assistantName, restrict: false });
      replaceLastAssistant(reply);
      history.push({ role: "user", content: `Motivo de sentirse ${pendingMood}: ${text}` });
      history.push({ role: "assistant", content: reply });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (err) {
      replaceLastAssistant("Hubo un problema al generar sugerencias. Intenta de nuevo en unos segundos.");
      console.error(err);
    } finally {
      pendingMood = null;
    }
    return;
  }
  addMessage("user", text);
  els.input.value = "";
  const crisis = detectCrisis(text);
  if (crisis) showCrisis(resources);

  addMessage("assistant", "Escribiendo…", { placeholder: true });
  const feelings = currentMoodLabel();
  try {
    const reply = await respond({ text, history, feelings, mode: "local", apiKey: "", safe: true, assistantName, restrict: false });
    replaceLastAssistant(reply);
    history.push({ role: "user", content: text });
    history.push({ role: "assistant", content: reply });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    replaceLastAssistant("Lo siento, hubo un problema generando la respuesta. Revisa tu conexión.");
    console.error(err);
  }
});

// els.clear.addEventListener("click", () => {
//   history = [];
//   localStorage.removeItem(STORAGE_KEY);
//   els.messages.innerHTML = "";
// });

els.moods.forEach(btn => btn.addEventListener("click", () => {
  els.moods.forEach(b => b.classList.toggle("primary", b === btn));
  pendingMood = btn.dataset.mood;
  addMessage("assistant", `Gracias por compartir que te sientes ${pendingMood}. ¿Te gustaría contarme por qué te sientes así?`);
  els.input.focus();
}));

els.checkin.addEventListener("click", () => {
  addMessage("assistant", "Tomemos un momento. ¿Qué estás sintiendo en este instante? Si te ayuda, puedes nombrar una emoción y una necesidad.");
});

els.resetBtn.addEventListener("click", () => {
  history = []; localStorage.removeItem(STORAGE_KEY); els.messages.innerHTML = "";
});
els.renameBtn.addEventListener("click", () => {
  els.nameInput.value = assistantName;
  els.nameDialog.showModal();
});

if (els.voiceBtn) {
  let recognition;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) els.voiceBtn.disabled = true;
  else {
    recognition = new SR(); recognition.lang = (navigator.language && navigator.language.startsWith("es")) ? navigator.language : "es-AR"; recognition.interimResults = true; recognition.continuous = false;
    const stopUI = () => { els.voiceBtn.classList.remove("recording"); els.voiceBtn.setAttribute("aria-pressed","false"); };
    els.voiceBtn.addEventListener("click", async () => {
      if (els.voiceBtn.classList.contains("recording")) { recognition.stop(); return; }
      try { await navigator.mediaDevices.getUserMedia({ audio: true }); recognition.start(); } catch { alert("No se pudo acceder al micrófono."); els.voiceBtn.disabled = true; }
    });
    recognition.addEventListener("start", () => { els.voiceBtn.classList.add("recording"); els.voiceBtn.setAttribute("aria-pressed","true"); });
    recognition.addEventListener("result", (e) => {
      const text = Array.from(e.results).map(r=>r[0].transcript).join(" ").trim();
      els.input.value = text; const last = e.results[e.results.length-1]; if (last.isFinal && text) els.form.requestSubmit();
    });
    recognition.addEventListener("end", stopUI);
    recognition.addEventListener("error", stopUI);
  }
}

let breathing = false;
els.breathToggle.addEventListener("click", () => {
  breathing = !breathing;
  els.breathToggle.textContent = breathing ? "Detener" : "Iniciar";
});
setInterval(() => {
  if (!breathing) return;
  els.breathCircle.classList.toggle("expand");
  els.breathText.textContent = els.breathCircle.classList.contains("expand") ? "Exhala 4s" : "Inhala 4s";
}, 4000);

els.crisisClose.addEventListener("click", () => els.crisisDialog.close());

function addMessage(role, text, { placeholder = false } = {}) {
  const time = dayjs().format("HH:mm");
  const msg = document.createElement("div");
  msg.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = role === "user" ? `Tú • ${time}` : role === "assistant" ? `${assistantName} • ${time}` : `Sistema • ${time}`;
  msg.append(avatar, bubble, meta);
  els.messages.appendChild(msg);
  if (placeholder) bubble.dataset.placeholder = "true";
  els.messages.scrollTop = els.messages.scrollHeight;
}

function replaceLastAssistant(text) {
  const nodes = Array.from(els.messages.querySelectorAll(".message.assistant .bubble"));
  const last = nodes.reverse().find(n => n.dataset.placeholder === "true");
  if (last) {
    last.textContent = text;
    delete last.dataset.placeholder;
  } else {
    addMessage("assistant", text);
  }
}

function renderHistory(items) {
  els.messages.innerHTML = "";
  items.forEach(m => addMessage(m.role, m.content));
}

function currentMoodLabel() {
  const active = Array.from(els.moods).find(b => b.classList.contains("primary"));
  return active ? active.dataset.mood : null;
}

function showCrisis(list) {
  els.crisisLinks.innerHTML = list.map(r => `<li><strong>${r.country}:</strong> <a href="${r.url}" target="_blank" rel="noopener">${r.name}</a> — ${r.phone}</li>`).join("");
  if (!els.crisisDialog.open) els.crisisDialog.showModal();
}

const BG_KEY = "acompania.bg";
function applyBackground(v){
  document.body.classList.toggle("theme-dark", v==="dark");
  document.body.classList.toggle("bg-gradient", v==="gradient");
  document.body.classList.toggle("bg-aurora", v==="aurora");
  document.body.classList.toggle("bg-mosaic", v==="mosaic");
  document.body.classList.toggle("bg-rainbow", v==="rainbow");
  if (v==="light") document.body.classList.remove("theme-dark","bg-gradient","bg-aurora","bg-mosaic","bg-rainbow");
}
els.bgSelect.value = localStorage.getItem(BG_KEY) || "light";
applyBackground(els.bgSelect.value);
els.bgSelect.addEventListener("change", ()=>{ localStorage.setItem(BG_KEY, els.bgSelect.value); applyBackground(els.bgSelect.value); });