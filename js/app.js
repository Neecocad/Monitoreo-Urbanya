// Lógica principal del PWA Monitoreo Urbanya.
import * as DB from './db.js';
import { latLonToUTM } from './utm.js';
import * as XP from './export.js';
import * as SYNC from './sync.js';
import {
  ESPECIES_BASE, ALTURA, DAP, SOBREVIVENCIA, VITALIDAD,
  FITOSANITARIO, HERBIVORIA, PODA, CORTA, ORIGENES,
} from './catalog.js';

const $ = (id) => document.getElementById(id);
const estado = { especies: [], foto: null, gps: null, segValues: {} };

// ---------- Utilidades UI ----------
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function buildSegmented(containerId, key, opciones) {
  const cont = $(containerId);
  cont.innerHTML = '';
  opciones.forEach((o) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg-btn';
    b.textContent = o.label;
    b.dataset.code = o.code;
    b.addEventListener('click', () => {
      cont.querySelectorAll('.seg-btn').forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      estado.segValues[key] = o.code;
    });
    cont.appendChild(b);
  });
}

function buildAllSegmented() {
  buildSegmented('seg-altura', 'altura', ALTURA);
  buildSegmented('seg-dap', 'dap', DAP);
  buildSegmented('seg-sobrevivencia', 'sobrevivencia', SOBREVIVENCIA);
  buildSegmented('seg-vitalidad', 'vitalidad', VITALIDAD);
  buildSegmented('seg-fitosanitario', 'fitosanitario', FITOSANITARIO);
  buildSegmented('seg-herbivoria', 'herbivoria', HERBIVORIA);
  buildSegmented('seg-poda', 'poda', PODA);
  buildSegmented('seg-corta', 'corta', CORTA);
}

// ---------- Especies ----------
async function cargarEspecies() {
  const extra = await DB.getEspeciesExtra();
  const base = ESPECIES_BASE.map((e) => ({ ...e }));
  const nombres = new Set(base.map((e) => e.nombre));
  extra.forEach((e) => { if (!nombres.has(e.nombre)) base.push(e); });
  estado.especies = base;
  const sel = $('especie');
  const actual = sel.value;
  sel.innerHTML = '<option value="" disabled selected>— Seleccionar —</option>';
  base.forEach((e) => {
    const o = document.createElement('option');
    o.value = e.nombre;
    o.textContent = e.nombre;
    o.dataset.origen = e.origen;
    sel.appendChild(o);
  });
  if (actual) sel.value = actual;
}

function actualizarOrigen() {
  const sel = $('especie');
  const opt = sel.selectedOptions[0];
  $('origen-label').textContent = opt && opt.dataset.origen ? ORIGENES[opt.dataset.origen] : '—';
}

// ---------- GPS ----------
function capturarGPS() {
  if (!navigator.geolocation) { toast('GPS no disponible'); return; }
  $('btn-gps').textContent = '📍 Capturando…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const utm = latLonToUTM(latitude, longitude);
      estado.gps = { lat: latitude, lon: longitude, ...utm, accuracy };
      $('x').value = utm.x;
      $('y').value = utm.y;
      $('gps-acc').textContent = `Huso ${utm.huso} · ±${Math.round(accuracy)} m`;
      $('btn-gps').textContent = '📍 Recapturar GPS';
      toast('Coordenadas capturadas');
    },
    (err) => {
      $('btn-gps').textContent = '📍 Capturar GPS';
      toast('Error GPS: ' + err.message);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

// ---------- Fotografía con geo-sello ----------
function tomarFoto(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const maxW = 1280;
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      // Texto del geo-sello
      const lineas = [];
      const now = new Date();
      lineas.push(now.toLocaleString('es-CL'));
      const z = $('zona').value || '?';
      const ind = $('individuo').value || '?';
      const esp = $('especie').value || '';
      lineas.push(`Zona ${z} · Individuo ${ind}${esp ? ' · ' + esp : ''}`);
      if (estado.gps) {
        lineas.push(`UTM ${estado.gps.huso}: ${estado.gps.x} E, ${estado.gps.y} N`);
        lineas.push(`Lat ${estado.gps.lat.toFixed(6)}, Lon ${estado.gps.lon.toFixed(6)}`);
      } else if ($('x').value && $('y').value) {
        lineas.push(`UTM: ${$('x').value} E, ${$('y').value} N`);
      }

      const fs = Math.max(14, Math.round(h * 0.028));
      ctx.font = `bold ${fs}px sans-serif`;
      const pad = fs * 0.5;
      const lineH = fs * 1.35;
      const boxH = lineH * lineas.length + pad;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, h - boxH, w, boxH);
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'top';
      lineas.forEach((ln, i) => ctx.fillText(ln, pad, h - boxH + pad / 2 + i * lineH));

      estado.foto = canvas.toDataURL('image/jpeg', 0.85);
      $('foto-img').src = estado.foto;
      $('foto-preview').classList.remove('hidden');
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// ---------- Guardar ----------
async function guardar(e) {
  e.preventDefault();
  const zona = $('zona').value;
  if (!zona) { toast('Indica la zona'); return; }
  if (!$('especie').value) { toast('Selecciona la especie'); return; }

  const opt = $('especie').selectedOptions[0];
  const reg = {
    zona: Number(zona),
    individuo: Number($('individuo').value),
    especie: $('especie').value,
    origen: opt ? opt.dataset.origen : 'desconocido',
    codigoGps: $('codigoGps').value.trim(),
    x: $('x').value ? Number($('x').value) : null,
    y: $('y').value ? Number($('y').value) : null,
    lat: estado.gps?.lat ?? null,
    lon: estado.gps?.lon ?? null,
    huso: estado.gps?.huso ?? null,
    ...estado.segValues,
    foto: estado.foto,
  };

  await DB.addRegistro(reg);
  toast(`Guardado: Zona ${reg.zona} · Individuo ${reg.individuo}`);
  await prepararSiguiente(reg.zona);
  await refrescarLista();
}

// Tras guardar, deja listo el siguiente individuo de la misma zona.
async function prepararSiguiente(zona) {
  $('censo-form').reset();
  estado.foto = null;
  estado.segValues = {};
  document.querySelectorAll('.seg-btn.selected').forEach((b) => b.classList.remove('selected'));
  $('foto-preview').classList.add('hidden');
  $('btn-gps').textContent = '📍 Capturar GPS';
  $('gps-acc').textContent = '';
  estado.gps = null;
  $('zona').value = zona;
  $('individuo').value = await DB.nextIndividuo(zona);
  await cargarEspecies();
  actualizarOrigen();
}

// ---------- Lista de registros ----------
async function refrescarLista() {
  const regs = (await DB.getRegistros()).sort(
    (a, b) => (Number(a.zona) - Number(b.zona)) || (Number(a.individuo) - Number(b.individuo))
  );
  $('count-badge').textContent = regs.length;
  $('stats').textContent = `${regs.length} individuos guardados en este dispositivo.`;
  const cont = $('list-container');
  cont.innerHTML = '';
  $('list-empty').style.display = regs.length ? 'none' : 'block';

  for (const r of regs) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-main">
        <strong>Z${r.zona} · I${r.individuo}</strong> — ${r.especie || '—'}
        <span class="tag">${ORIGENES[r.origen] || ''}</span>
        <div class="card-sub">
          ${r.x ? `UTM ${r.x} / ${r.y} · ` : ''}${labelDe('sobrevivencia', r.sobrevivencia)}
        </div>
      </div>
      <div class="card-actions">
        ${r.foto ? '<button class="btn-mini" data-foto>🖼</button>' : ''}
        <button class="btn-mini" data-dl>⬇</button>
        <button class="btn-mini danger" data-del>🗑</button>
      </div>`;
    card.querySelector('[data-del]').addEventListener('click', async () => {
      if (confirm(`¿Eliminar Zona ${r.zona} · Individuo ${r.individuo}?`)) {
        await DB.deleteRegistro(r.id); await refrescarLista();
      }
    });
    card.querySelector('[data-dl]').addEventListener('click', () => XP.descargarFoto(r) || toast('Sin foto'));
    if (r.foto) card.querySelector('[data-foto]').addEventListener('click', () => verFoto(r.foto));
    cont.appendChild(card);
  }
}

function labelDe(grupo, code) {
  const maps = { sobrevivencia: SOBREVIVENCIA };
  const arr = maps[grupo] || [];
  return arr.find((o) => o.code === code)?.label || '';
}

function verFoto(src) {
  const o = $('toast'); // reutilizamos overlay simple
  const v = document.createElement('div');
  v.className = 'modal';
  v.innerHTML = `<div class="modal-card"><img src="${src}" style="max-width:100%;border-radius:8px"/><button class="btn-ghost" style="margin-top:10px">Cerrar</button></div>`;
  v.querySelector('button').addEventListener('click', () => v.remove());
  v.addEventListener('click', (e) => { if (e.target === v) v.remove(); });
  document.body.appendChild(v);
}

// ---------- Navegación ----------
function setupTabs() {
  document.querySelectorAll('.tab').forEach((t) => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      document.querySelectorAll('.view').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      $('view-' + t.dataset.view).classList.add('active');
      if (t.dataset.view === 'list') refrescarLista();
    });
  });
}

// ---------- Modal especie ----------
function setupModalEspecie() {
  const modal = $('modal-especie');
  $('add-especie').addEventListener('click', () => modal.classList.remove('hidden'));
  $('ne-cancelar').addEventListener('click', () => modal.classList.add('hidden'));
  $('ne-guardar').addEventListener('click', async () => {
    const nombre = $('ne-nombre').value.trim();
    if (!nombre) { toast('Escribe el nombre'); return; }
    await DB.addEspecie({
      nombre,
      cientifico: $('ne-cientifico').value.trim(),
      origen: $('ne-origen').value,
    });
    await cargarEspecies();
    $('especie').value = nombre;
    actualizarOrigen();
    $('ne-nombre').value = ''; $('ne-cientifico').value = '';
    modal.classList.add('hidden');
    toast('Especie agregada');
  });
}

// ---------- Estado de red ----------
function setupNetwork() {
  const upd = () => {
    const s = $('net-status');
    s.classList.toggle('online', navigator.onLine);
    s.title = navigator.onLine ? 'En línea' : 'Sin conexión (offline)';
  };
  window.addEventListener('online', upd);
  window.addEventListener('offline', upd);
  upd();
}

// ---------- Init ----------
async function init() {
  buildAllSegmented();
  setupTabs();
  setupModalEspecie();
  setupNetwork();
  await cargarEspecies();

  $('especie').addEventListener('change', actualizarOrigen);
  $('btn-gps').addEventListener('click', capturarGPS);
  $('btn-foto').addEventListener('click', () => $('foto-input').click());
  $('foto-input').addEventListener('change', (e) => { if (e.target.files[0]) tomarFoto(e.target.files[0]); });
  $('btn-foto-del').addEventListener('click', () => {
    estado.foto = null; $('foto-preview').classList.add('hidden'); $('foto-input').value = '';
  });
  $('censo-form').addEventListener('submit', guardar);
  $('btn-reset').addEventListener('click', () => {
    estado.foto = null; estado.segValues = {}; estado.gps = null;
    setTimeout(() => {
      document.querySelectorAll('.seg-btn.selected').forEach((b) => b.classList.remove('selected'));
      $('foto-preview').classList.add('hidden');
      $('gps-acc').textContent = ''; $('origen-label').textContent = '—';
    }, 0);
  });

  $('exp-xlsx').addEventListener('click', async () => XP.exportarExcel(await DB.getRegistros()));
  $('exp-csv').addEventListener('click', async () => XP.exportarCSV(await DB.getRegistros()));
  $('exp-json').addEventListener('click', async () => XP.exportarRespaldo(await DB.getRegistros()));

  // Sincronización en línea
  $('sync-url').value = SYNC.getUrl();
  $('sync-url').addEventListener('change', (e) => { SYNC.setUrl(e.target.value); toast('URL guardada'); });
  $('btn-sync').addEventListener('click', async () => {
    const btn = $('btn-sync');
    btn.disabled = true;
    $('sync-info').textContent = 'Sincronizando…';
    try {
      const r = await SYNC.sincronizar((n, t) => { $('sync-info').textContent = `Enviando ${n}/${t}…`; });
      $('sync-info').textContent = r.enviados
        ? `✅ ${r.enviados} registro(s) sincronizado(s).`
        : 'Todo al día, no hay pendientes.';
      toast('Sincronización completa');
      await refrescarLista();
    } catch (err) {
      $('sync-info').textContent = '⚠️ ' + err.message;
      toast('Error al sincronizar');
    } finally {
      btn.disabled = false;
    }
  });

  await refrescarLista();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
