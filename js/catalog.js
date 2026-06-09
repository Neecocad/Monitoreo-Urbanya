// Catálogo de especies y opciones del formulario — Monitoreo Urbanya
// El origen (nativa/exótica/desconocido) se deriva automáticamente de la especie.

export const ORIGENES = {
  nativa: 'Nativa',
  exotica: 'Exótica',
  desconocido: 'Desconocido',
};

// Catálogo base precargado a partir de la planilla de terreno.
// El usuario puede agregar especies nuevas en terreno (se guardan en IndexedDB).
export const ESPECIES_BASE = [
  { nombre: 'Álamo', cientifico: 'Populus sp.', origen: 'exotica' },
  { nombre: 'Quillay', cientifico: 'Quillaja saponaria', origen: 'nativa' },
  { nombre: 'Espino', cientifico: 'Vachellia caven', origen: 'nativa' },
  { nombre: 'Quercus suber (alcornoque)', cientifico: 'Quercus suber', origen: 'exotica' },
  { nombre: 'Taxodium distichum (ciprés calvo)', cientifico: 'Taxodium distichum', origen: 'exotica' },
  { nombre: 'Huingán', cientifico: 'Schinus polygamus', origen: 'nativa' },
  { nombre: 'Maitén', cientifico: 'Maytenus boaria', origen: 'nativa' },
  { nombre: 'Pimiento', cientifico: 'Schinus molle', origen: 'exotica' },
  { nombre: 'Desconocido (nn)', cientifico: '', origen: 'desconocido' },
];

// Evaluadores(as) que realizan el censo. "Otro" habilita ingreso de iniciales.
export const EVALUADORES = [
  'Barbara Aros',
  'Sabina Madariaga',
  'Maria Paz Arroyo',
  'Marcela Lizama',
  'Nicolás Calderon',
];

// Parámetros del formulario (orden = orden de captura).
export const ALTURA = [
  { code: 1, label: '< 1 m' },
  { code: 2, label: '1 – 3 m' },
  { code: 3, label: '3 – 10 m' },
  { code: 4, label: '> 10 m' },
];

export const DAP = [
  { code: 1, label: '< 10 cm' },
  { code: 2, label: '10 – 30 cm' },
  { code: 3, label: '> 30 cm' },
];

export const SOBREVIVENCIA = [
  { code: 'vivo', label: 'Vivo' },
  { code: 'muerto', label: 'Muerto' },
];

export const VITALIDAD = [
  { code: 'optimo', label: 'Óptimo' },
  { code: 'regular', label: 'Regular' },
  { code: 'vulnerable', label: 'Vulnerable' },
  { code: 'muerto', label: 'Muerto' },
];

export const FITOSANITARIO = [
  { code: 'sano', label: 'Sano' },
  { code: 'enfermo', label: 'Enfermo' },
  { code: 'danado', label: 'Dañado' },
];

export const HERBIVORIA = [
  { code: 'si', label: 'Sí' },
  { code: 'no', label: 'No' },
];

export const PODA = [
  { code: 'no', label: 'No' },
  { code: 'sanitaria', label: 'Sí (sanitaria)' },
  { code: 'forma', label: 'Sí (forma)' },
];

export const CORTA = [
  { code: 'no', label: 'No' },
  { code: 'riesgo', label: 'Sí (riesgo)' },
  { code: 'deterioro', label: 'Sí (deterioro)' },
];

// Helpers de etiqueta (código -> texto legible para exportación).
const _map = (arr) => Object.fromEntries(arr.map((o) => [o.code, o.label]));
export const LABELS = {
  altura: _map(ALTURA),
  dap: _map(DAP),
  sobrevivencia: _map(SOBREVIVENCIA),
  vitalidad: _map(VITALIDAD),
  fitosanitario: _map(FITOSANITARIO),
  herbivoria: _map(HERBIVORIA),
  poda: _map(PODA),
  corta: _map(CORTA),
  origen: ORIGENES,
};
