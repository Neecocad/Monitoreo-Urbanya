// Sincronización de registros con el Web App de Google Sheets.
import * as DB from './db.js';
import { registroPlano } from './export.js';

const URL_KEY = 'urbanya-sync-url';

export function getUrl() {
  return localStorage.getItem(URL_KEY) || '';
}

export function setUrl(url) {
  localStorage.setItem(URL_KEY, url.trim());
}

// Envía los registros aún no sincronizados al Web App y los marca como sincronizados.
export async function sincronizar(onProgress) {
  const url = getUrl();
  if (!url) throw new Error('Configura primero la URL de sincronización.');

  const todos = await DB.getRegistros();
  const pendientes = todos.filter((r) => !r.sincronizado);
  if (!pendientes.length) return { enviados: 0, total: 0 };

  let enviados = 0;
  // Se envían de a uno para que las fotos no excedan el límite de tamaño.
  for (const reg of pendientes) {
    const payload = { registros: [registroPlano(reg)] };
    // text/plain evita el preflight CORS con Apps Script.
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'Error del servidor');
    reg.sincronizado = 1;
    await DB.updateRegistro(reg);
    enviados++;
    if (onProgress) onProgress(enviados, pendientes.length);
  }
  return { enviados, total: pendientes.length };
}
