// Exportación de los registros: Excel (dos hojas), CSV y respaldo JSON.
import { buildXlsx } from './xlsx-mini.js';
import { LABELS } from './catalog.js';

function L(grupo, code) {
  if (code === undefined || code === null || code === '') return '';
  return LABELS[grupo]?.[code] ?? code;
}

function fecha() {
  return new Date().toISOString().slice(0, 10);
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Registro con valores etiquetados (legibles), usado por sincronización.
export function registroPlano(r) {
  return {
    id: r.id,
    zona: Number(r.zona), individuo: Number(r.individuo),
    especie: r.especie || '', origen: L('origen', r.origen),
    codigoGps: r.codigoGps || '', x: r.x ?? '', y: r.y ?? '',
    sobrevivencia: L('sobrevivencia', r.sobrevivencia), vitalidad: L('vitalidad', r.vitalidad),
    fitosanitario: L('fitosanitario', r.fitosanitario), herbivoria: L('herbivoria', r.herbivoria),
    poda: L('poda', r.poda), corta: L('corta', r.corta),
    altura: L('altura', r.altura), dap: L('dap', r.dap),
    lat: r.lat ?? '', lon: r.lon ?? '', huso: r.huso ?? '',
    creado: r.creado ? r.creado.slice(0, 19).replace('T', ' ') : '',
    foto: r.foto || '',
  };
}

function ordenar(regs) {
  return [...regs].sort(
    (a, b) => (Number(a.zona) - Number(b.zona)) || (Number(a.individuo) - Number(b.individuo))
  );
}

// Hoja Dasométrico (identificación + altura + DAP)
function hojaDasometrico(regs) {
  const head = ['Zona', 'Individuo', 'Especie', 'Origen', 'Código GPS', 'Coordenada X', 'Coordenada Y', 'Altura', 'DAP'];
  const rows = [head];
  for (const r of regs) {
    rows.push([
      Number(r.zona), Number(r.individuo), r.especie || '', L('origen', r.origen),
      r.codigoGps || '', r.x ?? '', r.y ?? '', L('altura', r.altura), L('dap', r.dap),
    ]);
  }
  return rows;
}

// Hoja Fitosanitario (identificación + dasométrico + estado sanitario)
function hojaFitosanitario(regs) {
  const head = ['Zona', 'Individuo', 'Especie', 'Origen', 'Código GPS', 'Coordenada X', 'Coordenada Y',
    'Sobrevivencia', 'Vitalidad', 'Fitosanitario', 'Herbivoría', 'Poda', 'Corta', 'Altura', 'DAP', 'Foto', 'Fecha registro'];
  const rows = [head];
  for (const r of regs) {
    rows.push([
      Number(r.zona), Number(r.individuo), r.especie || '', L('origen', r.origen),
      r.codigoGps || '', r.x ?? '', r.y ?? '',
      L('sobrevivencia', r.sobrevivencia), L('vitalidad', r.vitalidad), L('fitosanitario', r.fitosanitario),
      L('herbivoria', r.herbivoria), L('poda', r.poda), L('corta', r.corta),
      L('altura', r.altura), L('dap', r.dap),
      r.foto ? 'Sí' : 'No', r.creado ? r.creado.slice(0, 19).replace('T', ' ') : '',
    ]);
  }
  return rows;
}

export async function exportarExcel(regs) {
  const ord = ordenar(regs);
  const blob = buildXlsx([
    { name: 'Dasométrico', rows: hojaDasometrico(ord) },
    { name: 'Fitosanitario', rows: hojaFitosanitario(ord) },
  ]);
  download(blob, `Urbanya_Monitoreo_${fecha()}.xlsx`);
}

export async function exportarCSV(regs) {
  const ord = ordenar(regs);
  const rows = hojaFitosanitario(ord);
  const csv = rows
    .map((row) => row.map((v) => {
      const s = String(v ?? '');
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(';'))
    .join('\r\n');
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `Urbanya_Monitoreo_${fecha()}.csv`);
}

// Respaldo completo (incluye fotos en base64) para reimportar o sincronizar.
export async function exportarRespaldo(regs) {
  const blob = new Blob([JSON.stringify({ exportado: new Date().toISOString(), registros: regs }, null, 2)],
    { type: 'application/json' });
  download(blob, `Urbanya_Respaldo_${fecha()}.json`);
}

export function descargarFoto(reg) {
  if (!reg.foto) return;
  fetch(reg.foto).then((r) => r.blob()).then((b) => {
    const esp = (reg.especie || 'sp').replace(/[^\w]+/g, '-');
    download(b, `Z${reg.zona}_I${reg.individuo}_${esp}.jpg`);
  });
}
