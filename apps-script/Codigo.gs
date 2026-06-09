/**
 * Monitoreo Urbanya — Web App de sincronización a Google Sheets.
 * Estructura basada en el script de Santiago Solar (record_id idempotente).
 *
 * --- Instalación ---
 * 1. Crea una planilla nueva en Google Sheets y copia su ID (lo que va entre
 *    /d/  y  /edit  en la URL). Pégalo abajo en SPREADSHEET_ID.
 * 2. Extensiones → Apps Script. Borra todo y pega este archivo. Guarda.
 * 3. Implementar → Nueva implementación → Aplicación web:
 *      - Ejecutar como: Yo
 *      - Quién tiene acceso: Cualquier persona
 * 4. Copia la URL .../exec y pégala en el PWA (Exportar → URL de sincronización).
 */

const SPREADSHEET_ID = '1I-qHtKN_27Xnx5-c-Whgex9dLWZoteRdTWSdCtB0Yk8';
const HOJA = 'Datos';
const PROYECTO = 'Urbanya';
const CARPETA_FOTOS = 'Urbanya Monitoreo - Fotos';

const COLUMNAS = [
  'timestamp_sync', 'record_id', 'fecha', 'proyecto', 'evaluador',
  'zona', 'n_individuo', 'especie', 'origen', 'codigo_gps',
  'utm_este', 'utm_norte', 'huso', 'datum', 'lat', 'lon',
  'sobrevivencia', 'vitalidad', 'estado_fitosanitario', 'herbivoria',
  'poda', 'corta', 'altura', 'dap', 'foto_url',
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    let payload;
    if (e.parameter && e.parameter.data) {
      payload = JSON.parse(e.parameter.data);
    } else {
      payload = JSON.parse(e.postData.contents);
    }

    const recordId = payload.record_id;
    const filas = payload.rows || [];

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(HOJA);
    if (!sheet) sheet = ss.insertSheet(HOJA);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUMNAS);
      sheet.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    _eliminarPorRecordId(sheet, recordId);

    let carpeta = null;
    const ts = Utilities.formatDate(new Date(), 'America/Santiago', 'yyyy-MM-dd HH:mm:ss');

    for (const fila of filas) {
      // Sube la foto (base64) a Drive y guarda la URL; reutiliza si ya existe.
      if (fila.foto) {
        if (!carpeta) carpeta = _obtenerCarpeta();
        fila.foto_url = _guardarFoto(carpeta, fila, recordId);
      }
      const rowData = COLUMNAS.map((col) => {
        if (col === 'timestamp_sync') return ts;
        if (col === 'record_id') return recordId;
        if (col === 'proyecto') return PROYECTO;
        if (col === 'datum') return fila.datum || 'WGS84';
        return fila[col] !== undefined ? fila[col] : '';
      });
      sheet.appendRow(rowData);
    }

    return _json({ status: 'ok', filas: filas.length });
  } catch (err) {
    return _json({ status: 'error', mensaje: err.message });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return _json({ status: 'ok', mensaje: 'Monitoreo Urbanya – API activa' });
}

function _eliminarPorRecordId(sheet, recordId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  const col = COLUMNAS.indexOf('record_id') + 1;
  const values = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i][0] === recordId) sheet.deleteRow(i + 2);
  }
}

function _obtenerCarpeta() {
  const it = DriveApp.getFoldersByName(CARPETA_FOTOS);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_FOTOS);
}

function _guardarFoto(carpeta, fila, recordId) {
  try {
    const nombre = recordId + '_' + (fila.especie || 'sp') + '.jpg';
    const existentes = carpeta.getFilesByName(nombre);
    if (existentes.hasNext()) return existentes.next().getUrl(); // idempotente
    const partes = String(fila.foto).split(',');
    const bytes = Utilities.base64Decode(partes[1] || partes[0]);
    const blob = Utilities.newBlob(bytes, 'image/jpeg', nombre);
    const archivo = carpeta.createFile(blob);
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return archivo.getUrl();
  } catch (err) {
    return 'ERROR_FOTO: ' + err;
  }
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
