# 🌳 Monitoreo Urbanya — Formulario offline (PWA)

Formulario web instalable y **100 % offline** para el censo **dasométrico y fitosanitario**
del estudio Urbanya. Pensado para tomar datos en terreno sin señal, igual que el
monitoreo del 10 % de Santiago Solar.

## Características

- **Funciona sin conexión**: una vez abierto, se cachea y opera offline. Los datos se
  guardan en el dispositivo (IndexedDB) hasta exportarlos.
- **Instalable** como app en el celular (Android/iOS) desde el navegador.
- **Formulario unificado** (identificación + dasométrico + fitosanitario) tal como se usó
  en terreno; al exportar se separan las dos vistas.
- **Captura GPS automática** con conversión a UTM (huso 19S) y código GPS editable.
- **Fotografía con geo-sello incrustado**: fecha/hora, coordenadas, zona/individuo y
  especie quedan grabados sobre la imagen.
- **Catálogo de especies** con origen (nativa/exótica) autoasignado; permite agregar
  especies nuevas en terreno.
- **Exportación**: Excel con dos hojas (Dasométrico + Fitosanitario), CSV y respaldo JSON
  con fotos. Generador XLSX propio, sin dependencias externas.

## Parámetros del censo

| Bloque | Campos |
|---|---|
| Identificación | Zona · Individuo (auto) · Especie · Origen (auto) · Código GPS · Coord. X/Y |
| Dasométrico | Altura `<1 / 1–3 / 3–10 / >10 m` · DAP `<10 / 10–30 / >30 cm` |
| Fitosanitario | Sobrevivencia · Vitalidad · Estado fitosanitario · Herbivoría · Poda · Corta |
| Fotografía | Foto con geo-sello (fecha + coordenadas + individuo) |

## Uso en terreno

1. Abre la app, pestaña **Censar**.
2. Indica la **Zona** (el N° de individuo se autocompleta).
3. Selecciona especie, pulsa **Capturar GPS**, marca los parámetros y toma la foto.
4. **Guardar individuo** → queda listo el siguiente de la misma zona.
5. En **Registros** revisas, ves fotos o eliminas; en **Exportar** descargas los datos.

## Despliegue (GitHub Pages)

1. En GitHub: **Settings → Pages → Source: Deploy from a branch**.
2. Branch: `main` (o la rama publicada), carpeta `/ (root)`.
3. La app queda en `https://<usuario>.github.io/Monitoreo-Urbanya/`.
   Al ser HTTPS, funcionan la instalación PWA, el GPS y la cámara.

> Para desarrollo local sirve la carpeta con HTTPS o `localhost`
> (ej. `python3 -m http.server`) — el service worker y el GPS requieren contexto seguro.

## Estructura

```
index.html              · interfaz
css/styles.css          · estilos
js/app.js               · lógica de la app
js/catalog.js           · especies y parámetros
js/utm.js               · conversión lat/lon → UTM
js/db.js                · almacenamiento offline (IndexedDB)
js/export.js            · exportación Excel/CSV/JSON
js/xlsx-mini.js         · generador XLSX en JS puro (offline)
manifest.webmanifest    · metadatos PWA
sw.js                   · service worker (cache offline)
icons/                  · íconos de la app
```

## Próximo paso

Script de **sincronización en línea** para volcar los resultados a un repositorio central
(el botón "Sincronizar" está preparado en la pestaña Exportar).
