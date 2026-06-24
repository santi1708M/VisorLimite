// Visor de Límite Urbano - Lógica de Negocio y Mapas
// Arquitectura limpia en Vanilla JS para Leaflet y Geocoding

document.addEventListener('DOMContentLoaded', () => {
  // --- CONSTANTES Y ESTADO ---
  const DEFAULT_CENTER = [6.2442, -75.5812]; // Medellín, Colombia
  const DEFAULT_ZOOM = 12;
  
  let map = null;
  let geojsonLayer = null;
  let searchMarker = null;
  let geojsonData = null;
  
  // Clave de API de ESRI almacenada en localStorage
  let esriApiKey = localStorage.getItem('arcgis_api_key') || '';

  // --- ELEMENTOS DEL DOM ---
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const resultsBox = document.getElementById('search-results-box');
  const providerStatus = document.getElementById('provider-status');
  
  const layerToggle = document.getElementById('layer-toggle');
  const opacitySlider = document.getElementById('layer-opacity');
  const opacityVal = document.getElementById('opacity-val');
  
  const statPolygons = document.getElementById('stat-polygons');
  const statClass = document.getElementById('stat-class');
  const statArea = document.getElementById('stat-area');
  
  const configToggleBtn = document.getElementById('config-toggle-btn');
  const configContentPanel = document.getElementById('config-content-panel');
  const esriApiKeyInput = document.getElementById('esri-api-key');
  const btnSaveKey = document.getElementById('btn-save-key');
  
  const coordsDisplay = document.getElementById('coords-display');
  
  const btnDownloadWgs84 = document.getElementById('btn-download-wgs84');
  const btnDownloadOrig = document.getElementById('btn-download-orig');

  // --- INICIALIZACIÓN DEL MAPA ---
  function initMap() {
    map = L.map('map', {
      zoomControl: true
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    // Mapa base: Carto Positron (Limpio y claro)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Mover control de zoom a la derecha para no chocar con el panel flotante
    map.zoomControl.setPosition('topright');

    // Escuchar coordenadas del cursor
    map.on('mousemove', (e) => {
      const lat = e.latlng.lat.toFixed(5);
      const lng = e.latlng.lng.toFixed(5);
      coordsDisplay.innerHTML = `Lat: ${lat} | Lon: ${lng}`;
    });
  }

  // --- ESTILO Y POPUPS DEL GEOJSON ---
  // Estilo dinámico según CLAS_SUELO
  function getFeatureStyle(feature) {
    const classSuelo = feature.properties.CLAS_SUELO || '';
    
    if (classSuelo.toLowerCase().includes('rural')) {
      return {
        color: '#558f19',       // Tono verde más oscuro
        weight: 3,
        dashArray: '6, 6',     // Línea discontinua
        fillColor: '#558f19',
        fillOpacity: 0.12
      };
    }
    
    // Por defecto: Urbano (#7cb928)
    return {
      color: '#7cb928',
      weight: 3,
      fillColor: '#7cb928',
      fillOpacity: 0.20
    };
  }

  // Interacción para cada feature
  function onEachFeature(feature, layer) {
    // Popup personalizado con diseño en tabla
    const props = feature.properties;
    const areaHa = props.Area ? parseFloat(props.Area).toLocaleString('es-CO', { maximumFractionDigits: 2 }) + ' ha' : 'N/A';
    const areaM2 = props.Shape_Area ? parseFloat(props.Shape_Area).toLocaleString('es-CO', { maximumFractionDigits: 0 }) + ' m²' : 'N/A';
    
    const popupContent = `
      <div class="popup-container">
        <div class="popup-title">
          <i class="fa-solid fa-circle-info"></i> Límite Urbano
        </div>
        <table class="popup-table">
          <tr>
            <td class="label">ID Objeto</td>
            <td class="value">${props.OBJECTID || props.OBJECTID_1 || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Clasificación</td>
            <td class="value"><strong>${props.CLAS_SUELO || 'N/A'}</strong></td>
          </tr>
          <tr>
            <td class="label">Categoría</td>
            <td class="value">${props.Categoria || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Área Calculada</td>
            <td class="value">${areaHa}</td>
          </tr>
          <tr>
            <td class="label">Área Cartográfica</td>
            <td class="value">${areaM2}</td>
          </tr>
          <tr>
            <td class="label">Estado Conflicto</td>
            <td class="value">${props.Conflicto_ || 'NO'}</td>
          </tr>
        </table>
      </div>
    `;
    
    layer.bindPopup(popupContent);

    // Efectos visuales de hover
    layer.on({
      mouseover: (e) => {
        const lyr = e.target;
        lyr.setStyle({
          weight: 4,
          fillOpacity: 0.35
        });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          lyr.bringToFront();
        }
      },
      mouseout: (e) => {
        geojsonLayer.resetStyle(e.target);
      }
    });
  }

  // --- CARGA DE DATOS GEOJSON ---
  async function loadGeoJson() {
    try {
      const response = await fetch('limite_urbano.geojson');
      if (!response.ok) {
        throw new Error('No se pudo cargar el archivo GeoJSON reproyectado.');
      }
      geojsonData = await response.json();

      // Crear capa de Leaflet
      geojsonLayer = L.geoJSON(geojsonData, {
        style: getFeatureStyle,
        onEachFeature: onEachFeature
      }).addTo(map);

      // Centrar el mapa en los límites del GeoJSON
      const bounds = geojsonLayer.getBounds();
      map.fitBounds(bounds);

      // Calcular y renderizar estadísticas
      calculateStats(geojsonData);

    } catch (error) {
      console.error('Error al cargar la capa:', error);
      statClass.innerHTML = '<span style="color:#d9534f;">Error</span>';
      alert('Error cargando el archivo de datos: ' + error.message);
    }
  }

  // Calcular estadísticas
  function calculateStats(data) {
    const features = data.features || [];
    statPolygons.innerText = features.length;

    // Obtener clasificaciones únicas
    const classes = new Set();
    let totalArea = 0;

    features.forEach(f => {
      if (f.properties) {
        if (f.properties.CLAS_SUELO) classes.add(f.properties.CLAS_SUELO);
        if (f.properties.Area) totalArea += parseFloat(f.properties.Area);
      }
    });

    // Mostrar clasificaciones
    statClass.innerText = Array.from(classes).join(', ');
    
    // Mostrar área formateada
    const formattedArea = totalArea.toLocaleString('es-CO', {
      maximumFractionDigits: 2
    }) + ' ha';
    statArea.innerText = formattedArea;
  }

  // --- CONTROLADORES DE CAPA ---
  layerToggle.addEventListener('change', (e) => {
    if (!geojsonLayer) return;
    if (e.target.checked) {
      map.addLayer(geojsonLayer);
    } else {
      map.removeLayer(geojsonLayer);
    }
  });

  opacitySlider.addEventListener('input', (e) => {
    const value = e.target.value;
    opacityVal.innerText = `${value}%`;
    if (!geojsonLayer) return;
    geojsonLayer.setStyle({
      fillOpacity: (value / 100) * 0.20, // Proporcional al valor por defecto
      opacity: value / 100
    });
  });

  // --- BÚSQUEDA Y GEOCODING (OSM / ESRI) ---
  // Inicialización de la clave en el panel de configuración
  if (esriApiKey) {
    esriApiKeyInput.value = esriApiKey;
    updateProviderUI('esri');
  } else {
    updateProviderUI('osm');
  }

  function updateProviderUI(type) {
    if (type === 'esri') {
      providerStatus.innerText = 'ESRI Engine';
      providerStatus.className = 'provider-badge esri';
    } else {
      providerStatus.innerText = 'OSM Engine';
      providerStatus.className = 'provider-badge osm';
    }
  }

  // Evento guardar Clave API
  btnSaveKey.addEventListener('click', () => {
    const newKey = esriApiKeyInput.value.trim();
    esriApiKey = newKey;
    if (newKey) {
      localStorage.setItem('arcgis_api_key', newKey);
      updateProviderUI('esri');
      alert('Clave de API de ArcGIS guardada correctamente.');
    } else {
      localStorage.removeItem('arcgis_api_key');
      updateProviderUI('osm');
      alert('Clave de API eliminada. Se usará OpenStreetMap.');
    }
    configContentPanel.classList.remove('active');
    configToggleBtn.classList.remove('active');
  });

  // Evento alternar panel de configuración
  configToggleBtn.addEventListener('click', () => {
    configContentPanel.classList.toggle('active');
    configToggleBtn.classList.toggle('active');
  });

  // Limpiar caja de búsqueda
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    resultsBox.style.display = 'none';
    resultsBox.innerHTML = '';
    if (searchMarker) {
      map.removeLayer(searchMarker);
      searchMarker = null;
    }
  });

  // Escuchar entrada de teclado en la búsqueda
  let debounceTimeout = null;
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    if (query.length > 0) {
      clearSearchBtn.style.display = 'block';
    } else {
      clearSearchBtn.style.display = 'none';
      resultsBox.style.display = 'none';
      return;
    }

    if (query.length < 3) {
      resultsBox.style.display = 'none';
      return;
    }

    // Debounce de 350ms para evitar llamadas excesivas
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      performGeocoding(query);
    }, 350);
  });

  // Llamada a geocodificador según el proveedor activo
  async function performGeocoding(query) {
    if (esriApiKey) {
      await searchWithEsri(query);
    } else {
      await searchWithOsm(query);
    }
  }

  // Geocodificación OSM Nominatim (Sin clave)
  async function searchWithOsm(query) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}&countrycodes=co`; // Sesgo hacia Colombia
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'es'
        }
      });
      if (!response.ok) throw new Error();
      const results = await response.json();
      
      renderSearchResults(results.map(r => ({
        name: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon)
      })));
    } catch (e) {
      console.error('Error en geocodificación OSM:', e);
    }
  }

  // Geocodificación ESRI (Con clave)
  async function searchWithEsri(query) {
    try {
      // Usar el endpoint REST directo de ArcGIS Geocoding Service
      const url = `https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?singleLine=${encodeURIComponent(query)}&f=json&token=${esriApiKey}&maxLocations=5&countryCode=COL`; // Sesgo hacia Colombia
      const response = await fetch(url);
      if (!response.ok) throw new Error();
      const data = await response.json();
      
      const candidates = data.candidates || [];
      renderSearchResults(candidates.map(c => ({
        name: c.address,
        lat: c.location.y,
        lon: c.location.x
      })));
    } catch (e) {
      console.error('Error en geocodificación ESRI:', e);
      // Fallback a OSM si ESRI falla (por ejemplo por token expirado)
      console.log('Fallando a OSM geocoding...');
      await searchWithOsm(query);
    }
  }

  // Renderizar los resultados de búsqueda
  function renderSearchResults(items) {
    if (items.length === 0) {
      resultsBox.innerHTML = '<div class="result-item" style="cursor:default;color:var(--text-muted);">No se encontraron resultados</div>';
      resultsBox.style.display = 'block';
      return;
    }

    resultsBox.innerHTML = '';
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'result-item';
      div.innerHTML = `<i class="fa-solid fa-location-dot"></i> <span>${item.name}</span>`;
      
      div.addEventListener('click', () => {
        selectLocation(item);
      });
      resultsBox.appendChild(div);
    });
    
    resultsBox.style.display = 'block';
  }

  // Selección de una sugerencia
  function selectLocation(item) {
    // Zoom y centrado
    map.setView([item.lat, item.lon], 15);
    
    // Añadir o mover marcador de búsqueda
    if (searchMarker) {
      searchMarker.setLatLng([item.lat, item.lon]);
    } else {
      searchMarker = L.marker([item.lat, item.lon]).addTo(map);
    }
    
    // Popup del marcador
    searchMarker.bindPopup(`<strong>Búsqueda encontrada:</strong><br>${item.name}`).openPopup();
    
    // Rellenar caja e interfaz
    searchInput.value = item.name;
    resultsBox.style.display = 'none';
  }

  // Cerrar lista al hacer click afuera
  document.addEventListener('click', (e) => {
    if (!resultsBox.contains(e.target) && e.target !== searchInput) {
      resultsBox.style.display = 'none';
    }
  });

  // --- BOTONES DE DESCARGA ---
  // Descarga directa del WGS84
  btnDownloadWgs84.addEventListener('click', () => {
    // Crear un elemento de anclaje temporal
    const link = document.createElement('a');
    link.href = 'limite_urbano.geojson';
    link.download = 'LimiteUrbano_WGS84.geojson';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Descarga del original (EPSG:9377)
  btnDownloadOrig.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = 'LimiteUrbano.geojson';
    link.download = 'LimiteUrbano_EPSG9377.geojson';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // --- INICIAR ---
  initMap();
  loadGeoJson();
});
