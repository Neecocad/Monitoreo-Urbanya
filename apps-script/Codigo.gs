/**
 * Monitoreo Urbanya — Web App de sincronización a Google Sheets.
 *
 * Recibe los registros del PWA (POST con JSON) y los agrega a la hoja "Censo".
 * Las fotos (base64) se guardan en una carpeta de Drive y se enlaza la URL.
 *
 * --- Instalación ---
 * 1. Crea una planilla nueva en Google Sheets.
 * 2. Menú Extensiones → Apps Script. Borra el contenido y pega este archivo.
 * 3. Guarda. Implementar → Nueva implementación → tipo "Aplicación web".
 *      - Ejecutar como: Yo
 *      - Quién tiene acceso: Cualquier persona
 * 4. Copia la URL .../exec y pégala en el PWA (pestaña Exportar → URL de sincronización).
 */

var HOJA = 'Censo';
var CARPETA_FOTOS = 'Urbanya Monitoreo - Fotos';

var COLUMNAS = [
  'Evaluador', 'Zona', 'Individuo', 'Especie', 'Origen', 'Código GPS', 'Coordenada X', 'Coordenada Y',
  'Sobrevivencia', 'Vitalidad', 'Fitosanitario', 'Herbivoría', 'Poda', 'Corta',
  'Altura', 'DAP', 'Foto', 'Latitud', 'Longitud', 'Huso', 'Fecha registro', 'Sincronizado',
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var datos = JSON.parse(e.postData.contents);
    var registros = datos.registros || [];
    var hoja = obtenerHoja_();
    var carpeta = null;
    var procesados = [];

    registros.forEach(function (r) {
      var fotoUrl = '';
      if (r.foto) {
        if (!carpeta) carpeta = obtenerCarpeta_();
        fotoUrl = guardarFoto_(carpeta, r);
      }
      hoja.appendRow([
        r.evaluador, r.zona, r.individuo, r.especie, r.origen, r.codigoGps, r.x, r.y,
        r.sobrevivencia, r.vitalidad, r.fitosanitario, r.herbivoria, r.poda, r.corta,
        r.altura, r.dap, fotoUrl, r.lat, r.lon, r.huso, r.creado,
        new Date(),
      ]);
      if (r.id != null) procesados.push(r.id);
    });

    return json_({ ok: true, recibidos: registros.length, ids: procesados });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, servicio: 'Monitoreo Urbanya', hoja: HOJA });
}

function obtenerHoja_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA);
    hoja.appendRow(COLUMNAS);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function obtenerCarpeta_() {
  var it = DriveApp.getFoldersByName(CARPETA_FOTOS);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_FOTOS);
}

function guardarFoto_(carpeta, r) {
  try {
    var partes = r.foto.split(',');
    var bytes = Utilities.base64Decode(partes[1] || partes[0]);
    var blob = Utilities.newBlob(bytes, 'image/jpeg',
      'Z' + r.zona + '_I' + r.individuo + '_' + (r.especie || 'sp') + '.jpg');
    var archivo = carpeta.createFile(blob);
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return archivo.getUrl();
  } catch (err) {
    return 'ERROR_FOTO: ' + err;
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
