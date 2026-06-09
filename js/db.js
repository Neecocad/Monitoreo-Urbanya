// Almacenamiento offline con IndexedDB.
// Object stores:
//   registros -> cada individuo censado (incluye foto en base64 si existe)
//   especies  -> especies agregadas en terreno (extienden el catálogo base)

const DB_NAME = 'urbanya-monitoreo';
const DB_VERSION = 1;

let _db = null;

function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('registros')) {
        const s = db.createObjectStore('registros', { keyPath: 'id', autoIncrement: true });
        s.createIndex('zona', 'zona', { unique: false });
        s.createIndex('sincronizado', 'sincronizado', { unique: false });
      }
      if (!db.objectStoreNames.contains('especies')) {
        db.createObjectStore('especies', { keyPath: 'nombre' });
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        const result = fn(s);
        t.oncomplete = () => resolve(result._value !== undefined ? result._value : result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

// --- Registros ---
export async function addRegistro(reg) {
  reg.creado = new Date().toISOString();
  reg.sincronizado = 0;
  return tx('registros', 'readwrite', (s) => {
    const wrap = {};
    const r = s.add(reg);
    r.onsuccess = () => { wrap._value = r.result; };
    return wrap;
  });
}

export async function updateRegistro(reg) {
  return tx('registros', 'readwrite', (s) => s.put(reg));
}

export async function deleteRegistro(id) {
  return tx('registros', 'readwrite', (s) => s.delete(id));
}

export async function getRegistros() {
  return tx('registros', 'readonly', (s) => {
    const wrap = { _value: [] };
    const r = s.getAll();
    r.onsuccess = () => { wrap._value = r.result || []; };
    return wrap;
  });
}

export async function nextIndividuo(zona) {
  const regs = await getRegistros();
  const enZona = regs.filter((r) => Number(r.zona) === Number(zona));
  if (!enZona.length) return 1;
  return Math.max(...enZona.map((r) => Number(r.individuo) || 0)) + 1;
}

export async function marcarSincronizados(ids) {
  const regs = await getRegistros();
  for (const r of regs) {
    if (ids.includes(r.id)) { r.sincronizado = 1; await updateRegistro(r); }
  }
}

// --- Especies agregadas en terreno ---
export async function addEspecie(esp) {
  return tx('especies', 'readwrite', (s) => s.put(esp));
}

export async function getEspeciesExtra() {
  return tx('especies', 'readonly', (s) => {
    const wrap = { _value: [] };
    const r = s.getAll();
    r.onsuccess = () => { wrap._value = r.result || []; };
    return wrap;
  });
}
