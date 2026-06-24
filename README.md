# Visor de Límite Urbano

Un visor geográfico web ligero, responsivo y elegante construido con **Leaflet** y con integración de geocodificación (búsqueda de direcciones y lugares) mediante **ESRI Geocoding** y **OpenStreetMap (OSM) Nominatim**.

Este proyecto está diseñado para publicarse de forma rápida y sencilla en **GitHub Pages**.

## Características principales

- **Visualización de Capa:** Carga del límite urbano en formato GeoJSON.
- **Simbología Dinámica:** Diferenciación de estilo entre suelo Urbano (línea verde continua) y Urbano/Rural (línea verde discontinua).
- **Estadísticas en Tiempo Real:** Cálculo dinámico de polígonos totales, clasificaciones y el área total urbana en hectáreas directamente en el navegador.
- **Descargas Integradas:**
  - Descarga de la capa reproyectada en formato WGS84 (EPSG:4326), lista para usar en visores web.
  - Descarga de la capa original en su proyección oficial para Colombia: **MAGNA-SIRGAS / Origen Nacional (EPSG:9377)**.
- **Búsqueda (Geocoding):**
  - **OSM Nominatim Engine:** Activo por defecto (sin requerir credenciales).
  - **ESRI Geocoding Engine:** Opcional. Permite configurar una clave de API de ArcGIS Developer en caliente desde la interfaz para habilitar la geocodificación de alta precisión de ESRI (se guarda de forma segura en `localStorage`).
- **Diseño Moderno:** Panel flotante estilo *glassmorphism* utilizando la paleta de color `#7cb928` solicitada.

## Estructura del Proyecto

```text
VisorLimite/
├── index.html               # Estructura de la aplicación e interfaz de usuario
├── style.css                # Estilos personalizados (glassmorphism y paleta de colores)
├── app.js                   # Lógica del visor, mapa base y peticiones de geocodificación
├── limite_urbano.geojson    # Capa reproyectada en WGS84 (EPSG:4326) para visualización web
├── LimiteUrbano.geojson     # Capa original en Origen Nacional (EPSG:9377) para descarga GIS
└── README.md                # Esta guía de usuario e instalación
```

## Ejecución Local

Para visualizar el proyecto localmente, es necesario utilizar un servidor web local debido a las restricciones de CORS de los navegadores al cargar archivos JSON locales (`fetch`).

Puedes iniciar un servidor rápidamente con Python:

```bash
# En el directorio del proyecto
python3 -m http.server 8000
```

Luego, abre en tu navegador: [http://localhost:8000](http://localhost:8000)

## Publicación en GitHub Pages

Para publicar este visor mañana mismo, sigue estos pasos:

1. **Crear el repositorio en GitHub** y subir los archivos:
   ```bash
   git add .
   git commit -m "feat: initial commit with leaflet viewer and geocoding"
   # Vincula tu repositorio remoto y sube el código:
   # git remote add origin <URL_DEL_REPOSITORIO>
   # git branch -M main
   # git push -u origin main
   ```

2. **Habilitar GitHub Pages:**
   - Ve a la pestaña **Settings** (Configuración) de tu repositorio en GitHub.
   - En la barra lateral izquierda, selecciona **Pages**.
   - Bajo la sección **Build and deployment**, selecciona la rama `main` (o `master`) y la carpeta `/ (root)`.
   - Presiona **Save** (Guardar).
   - ¡Listo! En un par de minutos tu visor estará publicado en `https://<tu-usuario>.github.io/<nombre-del-repo>/`.

## Notas de la Proyección (Saber GIS)

La capa original `@LimiteUrbano.geojson` se encontraba en la proyección oficial **MAGNA-SIRGAS / Origen Nacional (EPSG:9377)**. Para poder mostrarla en visores web basados en mapas web estándar (como Leaflet con Carto Positron), la capa de visualización (`limite_urbano.geojson`) fue reproyectada a coordenadas geográficas **WGS84 (EPSG:4326)** utilizando la herramienta profesional `ogr2ogr` de GDAL.
