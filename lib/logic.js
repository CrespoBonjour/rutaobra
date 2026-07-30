/*
 * lib/logic.js — Lógica PURA de RutaObra (sin DOM, sin red, sin variables globales de la app).
 *
 * Son funciones que solo reciben datos y devuelven datos: se pueden probar solas, sin abrir el
 * navegador. Por eso viven acá afuera y tienen tests en tests/logic.test.js.
 *
 * Regla: si una función necesita el DOM (document, elementos), Supabase, o el estado global
 * (localStore, agendaStore, currentUser), NO va acá. Solo cálculo puro.
 *
 * El archivo funciona en los dos mundos:
 *  - En el navegador se carga con <script src="lib/logic.js"> y define las funciones como globales
 *    (igual que antes, cuando estaban dentro de index.html).
 *  - En Node (los tests) se importa con require() gracias al module.exports del final.
 */

// ── Fechas ──────────────────────────────────────────────────────────────────

// Fecha -> 'YYYY-MM-DD' en hora local.
function fmtYMD(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

// Parsea una fecha uruguaya 'DD/MM/AAAA' (con hora opcional 'HH:MM') a timestamp. 0 si no matchea.
function parseFechaUY(str){
  if(!str) return 0;
  const m=String(str).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ ,]+(\d{1,2}):(\d{2}))?/);
  if(!m) return 0;
  let y=parseInt(m[3],10); if(y<100) y+=2000;
  return new Date(y, parseInt(m[2],10)-1, parseInt(m[1],10), parseInt(m[4]||'0',10), parseInt(m[5]||'0',10)).getTime();
}

// ── Días de trabajo de Martín (mar/mié/jue) ────────────────────────────────

const DIAS_TRABAJO=[2,3,4];
// Primer día de trabajo (mar/mié/jue) en o después de la fecha dada.
function proximoDiaTrabajo(d){
  const x=new Date(d); x.setHours(0,0,0,0);
  for(let i=0;i<7;i++){ if(DIAS_TRABAJO.includes(x.getDay())) return x; x.setDate(x.getDate()+1); }
  return x;
}
// Fecha para una actividad automática: arranca en "mañana" y salta al mar/mié/jue más cercano.
function fechaAutoTrabajo(){ return fmtYMD(proximoDiaTrabajo(new Date(Date.now()+86400000))); }

// ── Cadencia de seguimiento (vista "Hoy") ──────────────────────────────────

const CADENCIA_DIAS = { hot:12, warm:20, cold:30 };
function cadenciaDe(e){ return CADENCIA_DIAS[e.temp] || 30; }

// Texto para la columna "Entrando en instalaciones": cuánto falta para la fecha estimada.
function faltaTexto(fechaYMD, hoyYMD){
  const d=Math.round((new Date(fechaYMD+'T00:00:00')-new Date(hoyYMD+'T00:00:00'))/86400000);
  if(d<0) return {t:'Ya entró (hace '+(-d)+' d)', cls:'warm'};
  if(d===0) return {t:'Entra hoy', cls:'hot'};
  if(d<=10) return {t:'En ~'+d+' días', cls:'hot'};
  const sem=Math.round(d/7);
  return {t:'En ~'+sem+' semana'+(sem===1?'':'s'), cls:'cold'};
}

// ── Varios ─────────────────────────────────────────────────────────────────

// Separa una cadena de teléfonos (separados por , ; o /) en una lista limpia.
function parsePhones(str){
  if(!str) return [];
  return str.split(/[,;/]+/).map(s=>s.trim()).filter(Boolean);
}
function joinPhones(arr){ return arr.filter(Boolean).join(', '); }

function tamanoLabel(v){ return v==='chico'?'Obra chica':v==='mediano'?'Obra mediana':v==='grande'?'Obra grande':''; }

// Exporta para los tests en Node. En el navegador `module` no existe, así que esto se ignora.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fmtYMD, parseFechaUY, DIAS_TRABAJO, proximoDiaTrabajo, fechaAutoTrabajo, CADENCIA_DIAS, cadenciaDe, faltaTexto, parsePhones, joinPhones, tamanoLabel };
}
