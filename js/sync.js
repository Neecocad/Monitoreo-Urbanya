// Sincronización de registros con el Web App de Google Sheets.
// Formato compatible con el patrón de Santiago Solar: { record_id, rows: [...] }
// enviado como `data=` (application/x-www-form-urlencoded) para evitar CORS.
import * as DB from './db.js';
import { registroPlano } from './export.js';

const URL_KEY = 'urbanya-sync-url';

// URL del Web App por defecto (se puede sobreescribir en la app).
const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbzFHRSLG_sz0luNEEoF4GOw73gyYxn9fb-BIxWElkEPbzZYbfImZZkt63NQCVFu0LPVSQ/exec';

export function getUrl() {
  return localStorage.getItem(URL_KEY) || DEFAULT_URL;
}

export function setUrl(url) {
  localStorage.setItem(URL_KEY, url.trim());
}

// Construye la fila (snake_case) que espera la planilla.
function fila(reg) {
  const p = registroPlano(reg);
  return {
    fecha: p.creado,
    evaluador: p.evaluador,
    zona: p.zona,
    n_individuo: p.individuo,
    especie: p.especie,
    origen: p.origen,
    codigo_gps: p.codigoGps,
    utm_este: p.x,
    utm_norte: p.y,
    huso: p.huso,
    datum: 'WGS84',
    lat: p.lat,
    lon: p.lon,
    sobrevivencia: p.sobrevivencia,
    vitalidad: p.vitalidad,
    estado_fitosanitario: p.fitosanitario,
    herbivoria: p.herbivoria,
    poda: p.poda,
    corta: p.corta,
    altura: p.altura,
    dap: p.dap,
    foto: p.foto, // base64; el servidor la sube a Drive y deja la URL en foto_url
  };
}

// Envía los registros no sincronizados; uno por POST (record_id idempotente).
export async function sincronizar(onProgress) {
  const url = getUrl();
  if (!url) throw new Error('Configura primero la URL de sincronización.');

  const todos = await DB.getRegistros();
  const pendientes = todos.filter((r) => !r.sincronizado);
  if (!pendientes.length) return { enviados: 0, total: 0 };

  let enviados = 0;
  for (const reg of pendientes) {
    const payload = { record_id: `Z${reg.zona}_I${reg.individuo}`, rows: [fila(reg)] };
    const body = 'data=' + encodeURIComponent(JSON.stringify(payload));
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body,
    });
    let data;
    try {
      data = await resp.json();
    } catch (_) {
      throw new Error('Respuesta no válida (¿la implementación es "Cualquier persona"?)');
    }
    if (data.status !== 'ok') throw new Error(data.mensaje || data.error || 'Error del servidor');
    reg.sincronizado = 1;
    await DB.updateRegistro(reg);
    enviados++;
    if (onProgress) onProgress(enviados, pendientes.length);
  }
  return { enviados, total: pendientes.length };
}
