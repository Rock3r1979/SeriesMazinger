// ============================================
// CONFIGURACIÓN
// ============================================
const APIKEY = 'bc2f8428b1238d724f9003cbf430ccee';
const BASEURL = 'https://api.themoviedb.org/3/';

// ============================================
// VARIABLES GLOBALES
// ============================================
let itemActual = null;
let peliculasPage = 1;
let seriesPage = 1;
let tendenciasPage = 1;
let tendenciasTipo = 'tv';
let busquedaPage = 1;
let currentSearch = null;
let aliasActual = localStorage.getItem('alias') || '';
let perfilCompartido = false;

// Variables de filtros
let filtroPeliculas = 'latest';
let filtroSeries = 'latest';

// Variables de agenda
let agendaCargando = false;
let todosLosItemsAgenda = [];
let agendaItemsVisibles = 0;
const agendaBatchSize = 24;
const AGENDA_CACHE_TIME = 3600000;
let filtrosAgenda = { fecha: 'month', plataforma: 'all' };

// Variables de "Para ti"
let prefTipoActual = 'ambos';
let paratiTabActual = 'tv';

// ============================================
// CONSTANTES
// ============================================
const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const AGENDA_PROVIDERS = {
  all: [8, 337, 1899, 119, 350, 1773, 531, 63, 149],
  netflix: [8],
  disneyplus: [337],
  hbomax: [1899],
  primevideo: [119],
  appletv: [350],
  skyshowtime: [1773],
  paramountplus: [531],
  filmin: [63],
  movistar: [149]
};

const AGENDA_PROVIDER_NAMES = {
  8: 'Netflix', 337: 'Disney+', 1899: 'Max', 119: 'Prime Video',
  350: 'Apple TV+', 1773: 'SkyShowtime', 531: 'Paramount+',
  63: 'Filmin', 149: 'Movistar+'
};

const GENEROS = [
  { id: 28, nombre: 'Acción' },
  { id: 12, nombre: 'Aventura' },
  { id: 16, nombre: 'Animación' },
  { id: 35, nombre: 'Comedia' },
  { id: 80, nombre: 'Crimen' },
  { id: 99, nombre: 'Documental' },
  { id: 18, nombre: 'Drama' },
  { id: 14, nombre: 'Fantasía' },
  { id: 27, nombre: 'Terror' },
  { id: 10749, nombre: 'Romance' },
  { id: 878, nombre: 'Ciencia Ficción' },
  { id: 53, nombre: 'Thriller' }
];

const PLATAFORMAS_PREF = [
  { id: 8, nombre: 'Netflix' },
  { id: 337, nombre: 'Disney+' },
  { id: 1899, nombre: 'Max' },
  { id: 119, nombre: 'Prime Video' },
  { id: 350, nombre: 'Apple TV+' }
];

const AVATARES = ['👤', '🎬', '📺', '🦸', '🐉', '👾', '🤖', '👨‍🎤', '👩‍🎤', '🧙', '🦹', '🧛'];

// ============================================
// DETECTAR ANDROID
// ============================================
const esAndroid = /Android/i.test(navigator.userAgent);

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const perfilData = params.get('p');
  const listaData = params.get('d');
  
  // Inicializar listas vacías si no existen
  if (!localStorage.getItem('listas')) {
    localStorage.setItem('listas', JSON.stringify([]));
  }
  
  if (perfilData) {
    cargarPerfilCompartido(perfilData);
    mostrarSeccion('perfil');
  } else if (listaData) {
    cargarListaDesdeURL(listaData);
    mostrarSeccion('miLista');
  } else {
    cargarPeliculas(true);
    cargarSeries(true);
    cargarTendencias(true);
    cargarPreferenciasOnboarding();
    mostrarSeccion('tendencias');
  }
  
  document.querySelector('.close').onclick = cerrarModal;
  
  actualizarDisplayAlias();
  actualizarStatsPerfil();
  renderAvatarSelector();
  cargarBio();
  
  comprobarRecordatorios();
  
  if (esAndroid) {
    configurarManejadorAndroid();
  }
});

// ============================================
// MANEJADOR ESPECÍFICO PARA ANDROID
// ============================================
function configurarManejadorAndroid() {
  document.addEventListener('touchend', function(e) {
    if (e.target.closest('.lista-opcion') && !e.target.closest('.lista-opcion[style*="opacity: 0.5"]')) {
      e.preventDefault();
      const opcion = e.target.closest('.lista-opcion');
      const listaId = opcion.getAttribute('data-lista-id');
      if (listaId) {
        añadirALista(listaId);
      }
    }
  }, { passive: false });
}

// ============================================
// PERFIL COMPARTIDO (SOLO VISUALIZACIÓN)
// ============================================
function cargarPerfilCompartido(data) {
  try {
    const perfil = JSON.parse(decodeURIComponent(atob(data)));
    perfilCompartido = true;
    
    document.getElementById('aliasActualDisplay').textContent = perfil.a || 'Usuario';
    
    const span = document.getElementById('avatarEmoji');
    const img = document.getElementById('avatarPreview');
    
    if (perfil.av && perfil.av.startsWith('data:image')) {
      img.src = perfil.av;
      img.style.display = 'block';
      span.style.display = 'none';
    } else {
      span.textContent = perfil.av || '👤';
      span.style.display = 'flex';
      img.style.display = 'none';
    }
    
    document.querySelectorAll('.btn-perfil, .btn-compartir, #aliasInput, #bioInput, .avatar-emoji-btn, .btn-share').forEach(el => {
      if (el) {
        if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.disabled = true;
        }
      }
    });
    
    document.getElementById('avatarEmojiSelector').style.display = 'none';
    document.querySelector('.avatar-actions').style.display = 'none';
    document.querySelector('.btn-compartir').disabled = true;
    
    mostrarNotificacion('👀 Estás viendo un perfil compartido', 'info');
    
  } catch (e) {
    mostrarNotificacion('Error al cargar perfil', 'error');
  }
}

// ============================================
// CARGAR LISTA DESDE URL
// ============================================
function cargarListaDesdeURL(data) {
  try {
    const decoded = JSON.parse(decodeURIComponent(atob(data)));
    const listas = getListas();
    
    const nuevaLista = {
      id: Date.now().toString(),
      nombre: decoded.n || 'Lista compartida',
      items: (decoded.i || []).map(id => ({
        id: id,
        title: 'Cargando...',
        name: 'Cargando...',
        poster_path: null,
        vote_average: 0,
        release_date: '',
        first_air_date: '',
        overview: '',
        plataformas: [],
        next_episode: null,
        last_episode: null,
        miPuntuacion: 0
      })),
      creada: new Date().toISOString()
    };
    
    listas.push(nuevaLista);
    guardarListas(listas);
    mostrarNotificacion(`Lista de ${decoded.a || 'usuario'} cargada`, 'success');
    
    cargarDetallesItemsCompartidos(nuevaLista);
    
    window.history.replaceState({}, document.title, '/');
  } catch (e) {
    mostrarNotificacion('Error al cargar la lista', 'error');
  }
}

async function cargarDetallesItemsCompartidos(lista) {
  for (let i = 0; i < lista.items.length; i++) {
    const item = lista.items[i];
    try {
      let res = await fetch(`${BASEURL}tv/${item.id}?api_key=${APIKEY}&language=es-ES`);
      let data = await res.json();
      
      if (data.success === false) {
        res = await fetch(`${BASEURL}movie/${item.id}?api_key=${APIKEY}&language=es-ES`);
        data = await res.json();
      }
      
      item.title = data.title || data.name;
      item.name = data.name || data.title;
      item.poster_path = data.poster_path;
      item.vote_average = data.vote_average || 0;
      item.release_date = data.release_date || data.first_air_date || '';
      item.first_air_date = data.first_air_date || data.release_date || '';
      item.overview = data.overview || '';
      
      if (data.next_episode_to_air) {
        item.next_episode = data.next_episode_to_air;
      }
      
      const tipo = data.title ? 'movie' : 'tv';
      const platRes = await fetch(`${BASEURL}${tipo}/${item.id}/watch/providers?api_key=${APIKEY}`);
      const platData = await platRes.json();
      item.plataformas = (platData.results?.ES?.flatrate || []).map(p => ({
        ...p,
        logo_path: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null
      }));
      
    } catch (e) {
      console.error('Error cargando detalles:', e);
    }
  }
  
  renderListas();
}

// ============================================
// NAVBAR HIDE ON SCROLL
// ============================================
let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
  const header = document.querySelector('header');
  if (!header) return;
  
  if (window.scrollY > lastScrollY && window.scrollY > 80) {
    header.classList.add('header-oculto');
  } else {
    header.classList.remove('header-oculto');
  }
  lastScrollY = window.scrollY;
}, { passive: true });

// ============================================
// SCROLL INFINITO
// ============================================
window.addEventListener('scroll', () => {
  const cercaDelFinal = window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;
  if (!cercaDelFinal) return;
  
  const seccionActiva = document.querySelector('.seccion[style*="display: block"]');
  if (!seccionActiva) return;
  
  const id = seccionActiva.id;
  
  if (id === 'peliculas' && peliculasPage <= 10) {
    cargarPeliculas(false);
  } else if (id === 'series' && seriesPage <= 10) {
    cargarSeries(false);
  } else if (id === 'tendencias' && tendenciasPage <= 10) {
    cargarTendencias(false);
  } else if (id === 'buscar' && currentSearch && busquedaPage <= 10) {
    buscar(true);
  } else if (id === 'agenda' && !agendaCargando) {
    if (agendaItemsVisibles < todosLosItemsAgenda.length) {
      cargarMasAgenda();
    }
  }
}, { passive: true });

// ============================================
// SECCIONES
// ============================================
function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
  const target = document.getElementById(id);
  if (!target) return;
  
  target.style.display = 'block';
  
  if (perfilCompartido) return;
  
  switch(id) {
    case 'peliculas':
      cargarPeliculas(true);
      break;
    case 'series':
      cargarSeries(true);
      break;
    case 'tendencias':
      cargarTendencias(true);
      break;
    case 'miLista':
      renderListas();
      break;
    case 'perfil':
      actualizarStatsPerfil();
      break;
    case 'parati':
      mostrarSeccionParaTi();
      break;
    case 'agenda':
      cargarAgenda(true);
      break;
  }
}

// ============================================
// PELÍCULAS
// ============================================
function cambiarFiltroPeliculas(filtro) {
  if (perfilCompartido) return;
  filtroPeliculas = filtro;
  document.querySelectorAll('#peliculas .filtro-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  peliculasPage = 1;
  cargarPeliculas(true);
}

async function cargarPeliculas(reset = false) {
  if (reset) {
    peliculasPage = 1;
    document.getElementById('peliculasContainer').innerHTML = '';
  }
  
  mostrarLoader('peliculasContainer');
  
  let url;
  switch(filtroPeliculas) {
    case 'latest':
      url = `${BASEURL}movie/now_playing?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
      break;
    case 'popular':
      url = `${BASEURL}movie/popular?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
      break;
    case 'top':
      url = `${BASEURL}movie/top_rated?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
      break;
    default:
      url = `${BASEURL}movie/now_playing?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  }
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = await Promise.all((data.results || []).map(i => enriquecerConPlataformas(i, 'movie')));
    
    ocultarLoader('peliculasContainer');
    
    if (reset) {
      mostrarResultados(items, 'peliculasContainer');
    } else {
      agregarResultados(items, 'peliculasContainer');
    }
    
    peliculasPage++;
  } catch (error) {
    ocultarLoader('peliculasContainer');
    mostrarNotificacion('Error cargando películas', 'error');
  }
}

// ============================================
// SERIES
// ============================================
function cambiarFiltroSeries(filtro) {
  if (perfilCompartido) return;
  filtroSeries = filtro;
  document.querySelectorAll('#series .filtro-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  seriesPage = 1;
  cargarSeries(true);
}

async function cargarSeries(reset = false) {
  if (reset) {
    seriesPage = 1;
    document.getElementById('seriesContainer').innerHTML = '';
  }
  
  mostrarLoader('seriesContainer');
  
  let url;
  switch(filtroSeries) {
    case 'latest':
      url = `${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
      break;
    case 'popular':
      url = `${BASEURL}tv/popular?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
      break;
    case 'top':
      url = `${BASEURL}tv/top_rated?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
      break;
    default:
      url = `${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  }
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = await Promise.all((data.results || []).map(i => enriquecerConPlataformas(i, 'tv')));
    
    ocultarLoader('seriesContainer');
    
    if (reset) {
      mostrarResultados(items, 'seriesContainer');
    } else {
      agregarResultados(items, 'seriesContainer');
    }
    
    seriesPage++;
  } catch (error) {
    ocultarLoader('seriesContainer');
    mostrarNotificacion('Error cargando series', 'error');
  }
}

// ============================================
// TENDENCIAS
// ============================================
function cambiarTipoTendencias(tipo) {
  if (perfilCompartido) return;
  tendenciasTipo = tipo;
  document.querySelectorAll('#tendencias .filtro-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`filtroTendencias${tipo === 'tv' ? 'Tv' : 'Movie'}`).classList.add('active');
  tendenciasPage = 1;
  cargarTendencias(true);
}

async function cargarTendencias(reset = false) {
  if (reset) {
    tendenciasPage = 1;
    document.getElementById('tendenciasContainer').innerHTML = '';
  }
  
  mostrarLoader('tendenciasContainer');
  
  const endpoint = tendenciasTipo === 'tv' 
    ? `trending/tv/week?api_key=${APIKEY}&language=es-ES&page=${tendenciasPage}`
    : `trending/movie/week?api_key=${APIKEY}&language=es-ES&page=${tendenciasPage}`;
  
  try {
    const res = await fetch(`${BASEURL}${endpoint}`);
    const data = await res.json();
    const items = await Promise.all((data.results || []).map(i => 
      enriquecerConPlataformas(i, i.title ? 'movie' : 'tv')
    ));
    
    ocultarLoader('tendenciasContainer');
    
    if (reset) {
      mostrarResultados(items, 'tendenciasContainer');
    } else {
      agregarResultados(items, 'tendenciasContainer');
    }
    
    tendenciasPage++;
  } catch (error) {
    ocultarLoader('tendenciasContainer');
    mostrarNotificacion('Error cargando tendencias', 'error');
  }
}

// ============================================
// ENRIQUECER CON PLATAFORMAS Y PRÓXIMOS EPISODIOS
// ============================================
async function enriquecerConPlataformas(item, tipo) {
  try {
    const res = await fetch(`${BASEURL}${tipo}/${item.id}/watch/providers?api_key=${APIKEY}`);
    const data = await res.json();
    item.plataformas = (data.results?.ES?.flatrate || []).map(p => ({
      ...p,
      provider_name: p.provider_name || 'Streaming',
      logo_path: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null
    }));
    
    if (tipo === 'tv') {
      const detallesRes = await fetch(`${BASEURL}tv/${item.id}?api_key=${APIKEY}&language=es-ES`);
      const detalles = await detallesRes.json();
      item.next_episode_to_air = detalles.next_episode_to_air;
      item.last_episode_to_air = detalles.last_episode_to_air;
      item.number_of_seasons = detalles.number_of_seasons;
      item.number_of_episodes = detalles.number_of_episodes;
      item.status = detalles.status;
    }
  } catch {
    item.plataformas = [];
  }
  return item;
}

// ============================================
// RENDERIZAR TARJETAS
// ============================================
function crearTarjetaHTML(item) {
  const titulo = item.title || item.name || 'Sin título';
  const fecha = item.release_date || item.first_air_date || '';
  const poster = item.poster_path 
    ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
    : 'https://via.placeholder.com/300x450?text=Sin+imagen';
  const nota = item.vote_average || 0;
  
  let plataformasHTML = '';
  if (item.plataformas && item.plataformas.length > 0) {
    plataformasHTML = '<div class="card-plataformas">';
    item.plataformas.slice(0, 3).forEach(p => {
      if (p.logo_path) {
        plataformasHTML += `<img src="${p.logo_path}" title="${p.provider_name}" class="plataforma-mini">`;
      }
    });
    if (item.plataformas.length > 3) {
      plataformasHTML += `<span class="mas-plataformas">+${item.plataformas.length - 3}</span>`;
    }
    plataformasHTML += '</div>';
  }
  
  let proximoEpisodioHTML = '';
  if (item.next_episode_to_air) {
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const nextDate = new Date(item.next_episode_to_air.air_date + 'T12:00:00');
    const diffDays = Math.ceil((nextDate - hoy) / (1000 * 60 * 60 * 24));
    
    let badgeClass = 'badge-proximo';
    let emoji = '📅';
    let texto = '';
    
    if (diffDays === 0) {
      badgeClass += ' badge-hoy';
      emoji = '🔴';
      texto = 'HOY';
    } else if (diffDays === 1) {
      badgeClass += ' badge-manana';
      emoji = '🔵';
      texto = 'MAÑANA';
    } else if (diffDays > 0 && diffDays <= 7) {
      texto = `en ${diffDays} días`;
    } else {
      texto = item.next_episode_to_air.air_date;
    }
    
    const diaSemana = nextDate ? DIAS[nextDate.getDay()] : '';
    const fechaTexto = diffDays === 0 ? 'HOY' : 
                      diffDays === 1 ? 'MAÑANA' :
                      diffDays > 0 && diffDays <= 7 ? `${diaSemana} (${diffDays}d)` :
                      item.next_episode_to_air.air_date;
    
    proximoEpisodioHTML = `
      <div class="${badgeClass}">
        ${emoji} Próximo: T${item.next_episode_to_air.season_number}E${item.next_episode_to_air.episode_number} - ${fechaTexto}
      </div>
    `;
  }
  
  return `
    <img src="${poster}" loading="lazy" alt="${titulo}">
    <h4>${titulo}</h4>
    <p>⭐ ${nota.toFixed(1)}</p>
    <p>📅 ${fecha || 'N/A'}</p>
    ${proximoEpisodioHTML}
    ${plataformasHTML}
  `;
}

function mostrarResultados(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="sin-resultados">No hay resultados</p>';
    return;
  }
  
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = crearTarjetaHTML(item);
    card.onclick = () => abrirModal(item);
    container.appendChild(card);
  });
}

function agregarResultados(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = crearTarjetaHTML(item);
    card.onclick = () => abrirModal(item);
    container.appendChild(card);
  });
}

// ============================================
// MODAL
// ============================================
function abrirModal(item) {
  itemActual = item;
  
  const titulo = item.title || item.name || 'Sin título';
  const descripcion = item.overview || 'Sin descripción disponible';
  const fecha = item.release_date || item.first_air_date || 'Fecha desconocida';
  const nota = item.vote_average || 0;
  
  let proximoHTML = '';
  if (item.next_episode_to_air) {
    const nextDate = new Date(item.next_episode_to_air.air_date);
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const diffDays = Math.ceil((nextDate - hoy) / (1000 * 60 * 60 * 24));
    
    let emoji = '📅';
    if (diffDays === 0) emoji = '🔴';
    else if (diffDays === 1) emoji = '🔵';
    
    proximoHTML = `<p style="color:#ffd700; margin-top:10px;">${emoji} Próximo: T${item.next_episode_to_air.season_number}E${item.next_episode_to_air.episode_number} - ${item.next_episode_to_air.air_date}</p>`;
  }
  
  document.getElementById('detalle').innerHTML = `
    <h2>${titulo}</h2>
    <p>${descripcion}</p>
    <p>📅 ${fecha}</p>
    <p>⭐ ${nota.toFixed(1)}/10</p>
    ${proximoHTML}
  `;
  
  const plataformasContainer = document.getElementById('plataformasContainer');
  plataformasContainer.innerHTML = '<h3>Disponible en:</h3>';
  
  if (item.plataformas && item.plataformas.length > 0) {
    item.plataformas.forEach(p => {
      if (p.logo_path) {
        const img = document.createElement('img');
        img.src = p.logo_path;
        img.title = p.provider_name;
        img.alt = p.provider_name;
        img.style.width = '50px';
        img.style.margin = '5px';
        img.style.borderRadius = '8px';
        plataformasContainer.appendChild(img);
      }
    });
  } else {
    plataformasContainer.innerHTML += '<p>No disponible en streaming</p>';
  }
  
  document.getElementById('temporadasContainer').innerHTML = '';
  if (!item.title) {
    cargarTemporadas(item.id);
  }
  
  dibujarEstrellas(item);
  
  document.getElementById('modal').style.display = 'block';
}

function cerrarModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('trailerContainer').innerHTML = '';
  document.getElementById('temporadasContainer').innerHTML = '';
}

async function cargarTemporadas(serieId) {
  try {
    const res = await fetch(`${BASEURL}tv/${serieId}?api_key=${APIKEY}&language=es-ES`);
    const data = await res.json();
    
    if (data.seasons && data.seasons.length > 0) {
      const container = document.getElementById('temporadasContainer');
      container.innerHTML = '<h3>Temporadas:</h3>';
      
      data.seasons.forEach(season => {
        if (season.season_number > 0) {
          const div = document.createElement('div');
          div.className = 'temporada';
          div.style.cssText = 'margin:10px 0; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px;';
          div.innerHTML = `
            <h4>Temporada ${season.season_number}</h4>
            <p>${season.name || ''}</p>
            <p>Episodios: ${season.episode_count || 'N/A'}</p>
            <p>Fecha: ${season.air_date || 'N/A'}</p>
          `;
          container.appendChild(div);
        }
      });
    }
  } catch (error) {
    console.error('Error cargando temporadas:', error);
  }
}

// ============================================
// PUNTUACIÓN CON ESTRELLAS
// ============================================
function dibujarEstrellas(item) {
  const container = document.getElementById('estrellasSerie');
  container.innerHTML = '<h3>Tu puntuación:</h3>';
  
  const listas = getListas();
  let puntuacionActual = 0;
  
  for (let lista of listas) {
    const encontrado = lista.items.find(i => i.id == item.id);
    if (encontrado && encontrado.miPuntuacion) {
      puntuacionActual = encontrado.miPuntuacion;
      break;
    }
  }
  
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    star.innerHTML = '★';
    star.style.cssText = 'font-size:2rem; cursor:pointer; margin:0 5px; color:' + (i <= puntuacionActual ? '#ffd700' : '#555');
    star.onclick = () => puntuarItem(item, i);
    container.appendChild(star);
  }
}

function puntuarItem(item, puntuacion) {
  const listas = getListas();
  let puntuado = false;
  
  listas.forEach(lista => {
    const idx = lista.items.findIndex(i => i.id == item.id);
    if (idx !== -1) {
      lista.items[idx].miPuntuacion = puntuacion;
      puntuado = true;
    }
  });
  
  if (!puntuado && listas.length > 0) {
    listas[0].items.push({
      id: item.id,
      title: item.title || item.name,
      name: item.name || item.title,
      poster_path: item.poster_path,
      vote_average: item.vote_average,
      release_date: item.release_date || item.first_air_date,
      first_air_date: item.first_air_date || item.release_date,
      overview: item.overview || '',
      plataformas: item.plataformas || [],
      next_episode_to_air: item.next_episode_to_air || null,
      last_episode_to_air: item.last_episode_to_air || null,
      number_of_seasons: item.number_of_seasons || 0,
      number_of_episodes: item.number_of_episodes || 0,
      status: item.status || '',
      networks: item.networks || [],
      miPuntuacion: puntuacion
    });
  }
  
  guardarListas(listas);
  dibujarEstrellas(item);
  mostrarNotificacion('Puntuación guardada', 'success');
}

// ============================================
// SISTEMA DE LISTAS MÚLTIPLES (AHORA SIN LISTA POR DEFECTO)
// ============================================
function getListas() {
  const raw = localStorage.getItem('listas');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  return [];
}

function guardarListas(listas) {
  localStorage.setItem('listas', JSON.stringify(listas));
  const todasItems = listas.flatMap(l => l.items);
  localStorage.setItem('miLista', JSON.stringify(todasItems));
}

function crearLista() {
  if (perfilCompartido) {
    mostrarNotificacion('No puedes editar un perfil compartido', 'error');
    return;
  }
  
  const nombre = prompt('Nombre de la nueva lista:');
  if (!nombre || !nombre.trim()) return;
  
  const listas = getListas();
  listas.push({
    id: Date.now().toString(),
    nombre: nombre.trim(),
    items: [],
    creada: new Date().toISOString()
  });
  
  guardarListas(listas);
  renderListas();
  mostrarNotificacion('Lista creada', 'success');
}

function crearListaDesdeModal() {
  if (perfilCompartido) {
    mostrarNotificacion('No puedes editar un perfil compartido', 'error');
    return;
  }
  
  cerrarSelectorListas();
  setTimeout(() => {
    const nombre = prompt('Nombre de la nueva lista:');
    if (!nombre || !nombre.trim()) return;
    
    const listas = getListas();
    listas.push({
      id: Date.now().toString(),
      nombre: nombre.trim(),
      items: [],
      creada: new Date().toISOString()
    });
    
    guardarListas(listas);
    mostrarSelectorListas();
    mostrarNotificacion('Lista creada', 'success');
  }, 300);
}

function renombrarLista(id) {
  if (perfilCompartido) {
    mostrarNotificacion('No puedes editar un perfil compartido', 'error');
    return;
  }
  
  const listas = getListas();
  const lista = listas.find(l => l.id === id);
  if (!lista) return;
  
  const nuevo = prompt('Nuevo nombre:', lista.nombre);
  if (!nuevo || !nuevo.trim()) return;
  
  lista.nombre = nuevo.trim();
  guardarListas(listas);
  renderListas();
}

function eliminarLista(id) {
  if (perfilCompartido) {
    mostrarNotificacion('No puedes editar un perfil compartido', 'error');
    return;
  }
  
  const listas = getListas();
  
  if (!confirm('¿Eliminar esta lista y todo su contenido?')) return;
  
  guardarListas(listas.filter(l => l.id !== id));
  renderListas();
  mostrarNotificacion('Lista eliminada', 'success');
}

// ============================================
// SELECTOR DE LISTAS MODAL
// ============================================
function mostrarSelectorListas() {
  if (!itemActual || perfilCompartido) return;
  
  const listas = getListas();
  const selector = document.getElementById('listasSelector');
  selector.innerHTML = '';
  
  if (listas.length === 0) {
    selector.innerHTML = '<p style="text-align:center; padding:2rem; color:#888;">No tienes listas. Crea una primero.</p>';
  } else {
    listas.forEach(lista => {
      const yaEsta = lista.items.some(i => i.id == itemActual.id);
      
      const opcion = document.createElement('div');
      opcion.className = 'lista-opcion';
      opcion.setAttribute('data-lista-id', lista.id);
      opcion.setAttribute('data-ya-esta', yaEsta);
      opcion.innerHTML = `
        <span class="nombre">${lista.nombre}</span>
        <span class="contador">${lista.items.length} items</span>
      `;
      
      if (yaEsta) {
        opcion.style.opacity = '0.5';
        opcion.style.pointerEvents = 'none';
        opcion.title = 'Ya está en esta lista';
      } else {
        if (!esAndroid) {
          opcion.onclick = function(e) {
            e.preventDefault();
            const listaId = this.getAttribute('data-lista-id');
            añadirALista(listaId);
          };
        } else {
          opcion.style.cursor = 'pointer';
        }
      }
      
      selector.appendChild(opcion);
    });
  }
  
  document.getElementById('selectorListasModal').style.display = 'block';
}

function cerrarSelectorListas() {
  document.getElementById('selectorListasModal').style.display = 'none';
}

// ============================================
// AÑADIR A LISTA
// ============================================
function añadirALista(listaId) {
  if (!itemActual || perfilCompartido) return;
  
  const listas = getListas();
  const lista = listas.find(l => l.id === listaId);
  if (!lista) return;
  
  if (lista.items.some(i => i.id == itemActual.id)) {
    mostrarNotificacion('Ya está en esta lista', 'info');
    cerrarSelectorListas();
    return;
  }
  
  lista.items.push({
    id: itemActual.id,
    title: itemActual.title || itemActual.name,
    name: itemActual.name || itemActual.title,
    poster_path: itemActual.poster_path,
    vote_average: itemActual.vote_average || 0,
    release_date: itemActual.release_date || itemActual.first_air_date || '',
    first_air_date: itemActual.first_air_date || itemActual.release_date || '',
    overview: itemActual.overview || '',
    plataformas: itemActual.plataformas || [],
    next_episode_to_air: itemActual.next_episode_to_air || null,
    last_episode_to_air: itemActual.last_episode_to_air || null,
    number_of_seasons: itemActual.number_of_seasons || 0,
    number_of_episodes: itemActual.number_of_episodes || 0,
    status: itemActual.status || '',
    networks: itemActual.networks || [],
    miPuntuacion: 0
  });
  
  guardarListas(listas);
  cerrarSelectorListas();
  mostrarNotificacion(`Añadido a "${lista.nombre}"`, 'success');
}

function eliminarDeLista(itemId, listaId, event) {
  if (perfilCompartido) {
    mostrarNotificacion('No puedes editar un perfil compartido', 'error');
    return;
  }
  
  event.stopPropagation();
  
  if (!confirm('¿Eliminar este elemento de la lista?')) return;
  
  const listas = getListas();
  const lista = listas.find(l => l.id === listaId);
  if (lista) {
    lista.items = lista.items.filter(i => i.id != itemId);
    guardarListas(listas);
    renderListas();
    mostrarNotificacion('Eliminado de la lista', 'success');
  }
}

// ============================================
// RENDERIZAR LISTAS CON PRÓXIMOS EPISODIOS
// ============================================
function renderListas() {
  const listas = getListas();
  const container = document.getElementById('listasContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (listas.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:3rem; background:rgba(255,255,255,0.03); border-radius:15px;">
        <p style="font-size:3rem; margin-bottom:1rem;">📋</p>
        <h3 style="color:#888;">No tienes ninguna lista</h3>
        <p style="color:#666; margin:1rem 0;">Crea tu primera lista para empezar a guardar series y películas</p>
        <button class="btn-primario" onclick="crearLista()">+ Crear mi primera lista</button>
      </div>
    `;
    return;
  }
  
  listas.forEach(lista => {
    const listaDiv = document.createElement('div');
    listaDiv.className = 'lista-item';
    
    listaDiv.innerHTML = `
      <div class="lista-header">
        <h3>${lista.nombre} <span style="color:#ffd700">(${lista.items.length})</span></h3>
        <div class="lista-acciones">
          <button class="btn-lista" onclick="renombrarLista('${lista.id}')">✏️ Renombrar</button>
          <button class="btn-eliminar" onclick="eliminarLista('${lista.id}')">🗑️ Eliminar</button>
          <button class="btn-share" onclick="compartirLista('${lista.id}')">📤 Compartir</button>
        </div>
      </div>
    `;
    
    if (lista.items.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.style.cssText = 'padding: 1rem; color: #888; text-align: center;';
      emptyMsg.textContent = 'Lista vacía';
      listaDiv.appendChild(emptyMsg);
    } else {
      const grid = document.createElement('div');
      grid.className = 'grid-container';
      
      lista.items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        
        const poster = item.poster_path 
          ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
          : 'https://via.placeholder.com/300x450?text=Sin+imagen';
        
        const fecha = item.release_date || item.first_air_date || '';
        
        let plataformasHTML = '';
        if (item.plataformas && item.plataformas.length > 0) {
          plataformasHTML = '<div class="card-plataformas">';
          item.plataformas.slice(0, 3).forEach(p => {
            if (p.logo_path) {
              plataformasHTML += `<img src="${p.logo_path}" title="${p.provider_name}" class="plataforma-mini">`;
            }
          });
          if (item.plataformas.length > 3) {
            plataformasHTML += `<span class="mas-plataformas">+${item.plataformas.length - 3}</span>`;
          }
          plataformasHTML += '</div>';
        }
        
        let proximoEpisodioHTML = '';
        if (item.next_episode_to_air && !item.title) {
          const hoy = new Date();
          hoy.setHours(0,0,0,0);
          const nextDate = new Date(item.next_episode_to_air.air_date + 'T12:00:00');
          const diffDays = Math.ceil((nextDate - hoy) / (1000 * 60 * 60 * 24));
          
          let badgeClass = 'badge-proximo';
          let emoji = '📅';
          let fechaTexto = item.next_episode_to_air.air_date;
          
          if (diffDays === 0) {
            badgeClass += ' badge-hoy';
            emoji = '🔴';
            fechaTexto = 'HOY';
          } else if (diffDays === 1) {
            badgeClass += ' badge-manana';
            emoji = '🔵';
            fechaTexto = 'MAÑANA';
          } else if (diffDays > 0 && diffDays <= 7) {
            const diaSemana = DIAS[nextDate.getDay()];
            fechaTexto = `${diaSemana} (${diffDays}d)`;
          }
          
          proximoEpisodioHTML = `
            <div class="${badgeClass}">
              ${emoji} T${item.next_episode_to_air.season_number}E${item.next_episode_to_air.episode_number} - ${fechaTexto}
            </div>
          `;
        }
        
        card.innerHTML = `
          <img src="${poster}" loading="lazy" alt="${item.title || item.name || ''}">
          <h4>${item.title || item.name || 'Sin título'}</h4>
          <p>⭐ ${(item.vote_average || 0).toFixed(1)}</p>
          <p>📅 ${fecha || 'N/A'}</p>
          ${proximoEpisodioHTML}
          ${plataformasHTML}
          <button class="btn-eliminar" onclick="eliminarDeLista('${item.id}', '${lista.id}', event)">Eliminar</button>
        `;
        
        card.onclick = (e) => {
          if (!e.target.classList.contains('btn-eliminar')) {
            abrirModal(item);
          }
        };
        
        grid.appendChild(card);
      });
      
      listaDiv.appendChild(grid);
    }
    
    container.appendChild(listaDiv);
  });
}

// ============================================
// COMPARTIR LISTAS Y PERFIL POR REDES SOCIALES
// ============================================
async function compartirLista(listaId) {
  const listas = getListas();
  const lista = listas.find(l => l.id === listaId);
  if (!lista || lista.items.length === 0) {
    mostrarNotificacion('La lista está vacía', 'error');
    return;
  }

  const alias = aliasActual || 'Usuario';
  
  const shareData = {
    a: alias,
    n: lista.nombre,
    i: lista.items.map(i => i.id)
  };
  
  const compressed = btoa(encodeURIComponent(JSON.stringify(shareData)));
  const url = `https://seriestopia.vercel.app/?d=${compressed}`;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Mi lista: ${lista.nombre}`,
        text: `Mira mi lista "${lista.nombre}" en SERIESTOPIA`,
        url: url
      });
      mostrarNotificacion('Compartido', 'success');
    } catch (e) {
      if (e.name === 'AbortError') return;
      compartirRedesSociales(url, lista.nombre);
    }
  } else {
    compartirRedesSociales(url, lista.nombre);
  }
}

async function compartirPerfil() {
  const alias = aliasActual || 'Usuario';
  
  const avatarEmoji = localStorage.getItem('avatarEmoji') || '👤';
  const avatarCustom = localStorage.getItem('avatarCustom') || '';
  
  const shareData = {
    a: alias,
    av: avatarCustom || avatarEmoji
  };
  
  const compressed = btoa(encodeURIComponent(JSON.stringify(shareData)));
  const url = `https://seriestopia.vercel.app/?p=${compressed}`;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Perfil de ${alias}`,
        text: `Mira mi perfil en SERIESTOPIA`,
        url: url
      });
      mostrarNotificacion('Compartido', 'success');
    } catch (e) {
      if (e.name === 'AbortError') return;
      compartirRedesSociales(url, alias);
    }
  } else {
    compartirRedesSociales(url, alias);
  }
}

function compartirRedesSociales(url, titulo) {
  const opciones = [
    { nombre: 'Twitter', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(titulo)}&url=${encodeURIComponent(url)}` },
    { nombre: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { nombre: 'WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(titulo + ' ' + url)}` },
    { nombre: 'Telegram', url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(titulo)}` }
  ];
  
  let opcionesHTML = '<div style="text-align:center;">';
  opcionesHTML += '<p style="margin-bottom:1rem;">Compartir en:</p>';
  opcionesHTML += '<div style="display:flex; gap:1rem; justify-content:center; flex-wrap:wrap;">';
  
  opciones.forEach(op => {
    opcionesHTML += `<a href="${op.url}" target="_blank" style="background:var(--primary); color:white; padding:0.8rem 1.5rem; border-radius:10px; text-decoration:none; margin:0.5rem;">${op.nombre}</a>`;
  });
  
  opcionesHTML += '</div>';
  opcionesHTML += `<p style="margin-top:1rem;"><small>O copia este enlace: ${url}</small></p>`;
  opcionesHTML += '</div>';
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:600px; text-align:center;">
      <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
      <h2>Compartir</h2>
      ${opcionesHTML}
    </div>
  `;
  
  document.body.appendChild(modal);
}

// ============================================
// RECORDATORIOS
// ============================================
function guardarRecordatorio() {
  if (!itemActual || perfilCompartido) return;
  
  let recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  
  const esSerie = !itemActual.title;
  
  const nuevoRecordatorio = {
    id: itemActual.id,
    title: itemActual.title || itemActual.name,
    tipo: esSerie ? 'serie' : 'pelicula',
    fecha: itemActual.release_date || itemActual.first_air_date || new Date().toISOString().split('T')[0],
    poster: itemActual.poster_path,
    next_episode_to_air: itemActual.next_episode_to_air || null,
    creado: new Date().toISOString()
  };
  
  if (esSerie && itemActual.next_episode_to_air) {
    nuevoRecordatorio.proximoEpisodio = itemActual.next_episode_to_air.air_date;
    nuevoRecordatorio.temporada = itemActual.next_episode_to_air.season_number;
    nuevoRecordatorio.episodio = itemActual.next_episode_to_air.episode_number;
  }
  
  if (!recordatorios.some(r => r.id == nuevoRecordatorio.id)) {
    recordatorios.push(nuevoRecordatorio);
    localStorage.setItem('recordatorios', JSON.stringify(recordatorios));
    actualizarStatsPerfil();
    mostrarNotificacion('⏰ Recordatorio guardado', 'success');
  } else {
    mostrarNotificacion('Ya tienes este recordatorio', 'info');
  }
}

function verRecordatorios() {
  const recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');

  if (recordatorios.length === 0) {
    mostrarNotificacion('No tienes recordatorios', 'info');
    return;
  }

  recordatorios.sort((a, b) => {
    const fechaA = a.proximoEpisodio || a.fecha;
    const fechaB = b.proximoEpisodio || b.fecha;
    return new Date(fechaA) - new Date(fechaB);
  });

  const hoy = new Date();
  hoy.setHours(0,0,0,0);

  let itemsHTML = '';
  recordatorios.forEach(rec => {
    const poster = rec.poster
      ? `https://image.tmdb.org/t/p/w92${rec.poster}`
      : 'https://via.placeholder.com/52x76?text=?';

    const fechaRec = new Date((rec.proximoEpisodio || rec.fecha) + 'T12:00:00');
    const diffDays = Math.ceil((fechaRec - hoy) / (1000 * 60 * 60 * 24));
    let emoji = '📅';
    let estadoTexto = rec.proximoEpisodio || rec.fecha;
    
    if (diffDays === 0) {
      emoji = '🔴';
      estadoTexto = 'HOY';
    } else if (diffDays === 1) {
      emoji = '🔵';
      estadoTexto = 'MAÑANA';
    } else if (diffDays < 0) {
      emoji = '✅';
    }
    
    const estadoHTML = `<span class="rec-modal-estado">${emoji} ${estadoTexto}</span>`;

    let episodioHTML = '';
    if (rec.proximoEpisodio && rec.temporada && rec.episodio) {
      episodioHTML = `
        <div class="rec-modal-episodio${diffDays >= 0 && diffDays <= 7 ? ' rec-modal-episodio-pronto' : ''}">
          📺 T${rec.temporada}E${rec.episodio}
        </div>`;
    }

    itemsHTML += `
      <div class="rec-modal-card">
        <img src="${poster}" class="rec-modal-poster" alt="${rec.title}">
        <div class="rec-modal-info">
          <div class="rec-modal-titulo">${rec.title}</div>
          ${estadoHTML}
          ${episodioHTML}
        </div>
        <button class="rec-modal-borrar" onclick="event.stopPropagation(); eliminarRecordatorio(${rec.id})" title="Eliminar">✕</button>
      </div>`;
  });

  document.getElementById('modalRecordatoriosBody').innerHTML = itemsHTML;
  document.getElementById('modalRecordatorios').style.display = 'block';
}

function cerrarModalRecordatorios() {
  document.getElementById('modalRecordatorios').style.display = 'none';
}

function eliminarRecordatorio(id) {
  let recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  recordatorios = recordatorios.filter(r => r.id != id);
  localStorage.setItem('recordatorios', JSON.stringify(recordatorios));
  actualizarStatsPerfil();
  if (recordatorios.length === 0) {
    cerrarModalRecordatorios();
    mostrarNotificacion('No tienes recordatorios', 'info');
  } else {
    verRecordatorios();
  }
}

function comprobarRecordatorios() {
  const recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const hoyStr = hoy.toISOString().split('T')[0];
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  const mananaStr = manana.toISOString().split('T')[0];
  
  recordatorios.forEach(rec => {
    if (rec.fecha === hoyStr) {
      mostrarNotificacion(`🔴 ¡HOY SE ESTRENA! ${rec.title}`, 'info');
    }
    
    if (rec.proximoEpisodio === hoyStr) {
      mostrarNotificacion(`🔴 ¡HOY NUEVO EPISODIO! ${rec.title} T${rec.temporada}E${rec.episodio}`, 'info');
    } else if (rec.proximoEpisodio === mananaStr) {
      mostrarNotificacion(`🔵 MAÑANA: ${rec.title} T${rec.temporada}E${rec.episodio}`, 'info');
    }
  });
}

// ============================================
// BUSCAR
// ============================================
async function buscar(mas = false) {
  const input = document.getElementById('searchInput');
  if (!input) return;
  
  const query = input.value.trim();
  const tipo = document.getElementById('tipo').value;
  
  if (!query && !mas) {
    mostrarNotificacion('Escribe algo para buscar', 'error');
    return;
  }
  
  if (!mas) {
    busquedaPage = 1;
    document.getElementById('contenedorBuscar').innerHTML = '';
    currentSearch = { query, tipo };
  }
  
  mostrarLoader('contenedorBuscar');
  
  try {
    const url = tipo === 'multi'
      ? `${BASEURL}search/multi?api_key=${APIKEY}&language=es-ES&query=${encodeURIComponent(query)}&page=${busquedaPage}`
      : `${BASEURL}search/${tipo}?api_key=${APIKEY}&language=es-ES&query=${encodeURIComponent(query)}&page=${busquedaPage}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    const filtrados = (data.results || []).filter(i => i.media_type !== 'person');
    const items = await Promise.all(filtrados.map(i => 
      enriquecerConPlataformas(i, i.media_type === 'movie' || i.title ? 'movie' : 'tv')
    ));
    
    ocultarLoader('contenedorBuscar');
    
    if (items.length === 0 && busquedaPage === 1) {
      document.getElementById('contenedorBuscar').innerHTML = '<p class="sin-resultados">No hay resultados</p>';
    } else {
      if (mas) {
        agregarResultados(items, 'contenedorBuscar');
      } else {
        mostrarResultados(items, 'contenedorBuscar');
      }
    }
    
    busquedaPage++;
  } catch (error) {
    ocultarLoader('contenedorBuscar');
    mostrarNotificacion('Error en la búsqueda', 'error');
  }
}

// ============================================
// TRÁILER
// ============================================
async function verTrailer() {
  if (!itemActual) return;
  
  const id = itemActual.id;
  const tipo = itemActual.title ? 'movie' : 'tv';
  
  try {
    const res = await fetch(`${BASEURL}${tipo}/${id}/videos?api_key=${APIKEY}&language=es-ES`);
    const data = await res.json();
    
    const trailer = (data.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');
    
    if (trailer) {
      document.getElementById('trailerContainer').innerHTML = `
        <iframe width="100%" height="315" 
          src="https://www.youtube.com/embed/${trailer.key}" 
          frameborder="0" allowfullscreen>
        </iframe>
      `;
    } else {
      mostrarNotificacion('No hay tráiler disponible', 'error');
    }
  } catch {
    mostrarNotificacion('Error cargando tráiler', 'error');
  }
}

// ============================================
// AGENDA - TMDB
// ============================================
function aplicarFiltrosAgenda() {
  filtrosAgenda.fecha = document.getElementById('filtroFechaAgenda').value;
  filtrosAgenda.plataforma = document.getElementById('filtroPlataformaAgenda').value;
  
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('agenda_tmdb_')) {
      localStorage.removeItem(key);
    }
  });
  
  todosLosItemsAgenda = [];
  agendaItemsVisibles = 0;
  cargarAgenda(true);
}

function getRangoAgenda() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let dias = 30;
  
  if (filtrosAgenda.fecha === 'week') dias = 7;
  else if (filtrosAgenda.fecha === 'all') dias = 45;
  
  return { hoy, dias };
}

function getDateISO(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

function parseSafeDate(fechaStr) {
  if (!fechaStr) return null;
  const d = new Date(fechaStr + 'T12:00:00');
  return isNaN(d) ? null : d;
}

async function obtenerSeriesTMDB(providerIds, fechaInicio, fechaFin) {
  const todas = [];
  const vistos = new Set();
  
  await Promise.all(providerIds.map(async (pid) => {
    for (let page = 1; page <= 3; page++) {
      try {
        const url = `${BASEURL}discover/tv?api_key=${APIKEY}&language=es-ES&watch_region=ES`
          + `&with_watch_providers=${pid}&air_date.gte=${fechaInicio}&air_date.lte=${fechaFin}`
          + `&sort_by=first_air_date.asc&page=${page}`;
        const res = await fetch(url);
        const data = await res.json();
        const results = data.results || [];
        
        if (!results.length) break;
        
        results.forEach(s => {
          if (!vistos.has(s.id)) {
            vistos.add(s.id);
            s._provider_id = pid;
            todas.push(s);
          }
        });
      } catch {
        break;
      }
    }
  }));
  
  return todas;
}

async function obtenerEpisodiosMes(serieId, fechaInicio, fechaFin) {
  try {
    const res = await fetch(`${BASEURL}tv/${serieId}?api_key=${APIKEY}&language=es-ES`);
    const detalle = await res.json();
    const episodios = [];
    
    await Promise.all((detalle.seasons || []).filter(s => s.season_number > 0).map(async (t) => {
      try {
        const r = await fetch(`${BASEURL}tv/${serieId}/season/${t.season_number}?api_key=${APIKEY}&language=es-ES`);
        const dt = await r.json();
        
        (dt.episodes || []).forEach(ep => {
          const f = ep.air_date || '';
          if (f && f >= fechaInicio && f <= fechaFin) {
            episodios.push({
              fecha: f,
              temporada: t.season_number,
              numero: ep.episode_number,
              titulo: ep.name || ''
            });
          }
        });
      } catch {}
    }));
    
    return episodios.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.temporada - b.temporada || a.numero - b.numero);
  } catch {
    return [];
  }
}

async function cargarAgenda(reset = false) {
  if (agendaCargando) return;
  
  if (reset) {
    todosLosItemsAgenda = [];
    agendaItemsVisibles = 0;
    document.getElementById('agendaContainer').innerHTML = '';
  }
  
  agendaCargando = true;
  mostrarLoader('agendaContainer');
  
  try {
    const cacheKey = `agenda_tmdb_${filtrosAgenda.fecha}_${filtrosAgenda.plataforma}`;
    const cache = localStorage.getItem(cacheKey);
    
    if (cache) {
      const parsed = JSON.parse(cache);
      if (Date.now() - parsed.time < AGENDA_CACHE_TIME) {
        todosLosItemsAgenda = parsed.data || [];
        ocultarLoader('agendaContainer');
        agendaItemsVisibles = 0;
        renderAgendaLote(true);
        agendaCargando = false;
        return;
      }
    }
    
    const { hoy, dias } = getRangoAgenda();
    const fechaInicio = getDateISO(hoy);
    const fechaFin = getDateISO(sumarDias(hoy, dias));
    const providerIds = AGENDA_PROVIDERS[filtrosAgenda.plataforma] || AGENDA_PROVIDERS.all;
    
    const series = await obtenerSeriesTMDB(providerIds, fechaInicio, fechaFin);
    const items = [];
    
    await Promise.all(series.map(async (serie) => {
      const episodios = await obtenerEpisodiosMes(serie.id, fechaInicio, fechaFin);
      if (!episodios.length) return;
      
      const poster = serie.poster_path ? `https://image.tmdb.org/t/p/w300${serie.poster_path}` : null;
      const providerName = AGENDA_PROVIDER_NAMES[serie._provider_id] || 'Streaming';
      
      const porFecha = {};
      episodios.forEach(ep => {
        if (!porFecha[ep.fecha]) porFecha[ep.fecha] = [];
        porFecha[ep.fecha].push(ep);
      });
      
      Object.entries(porFecha).forEach(([fecha, eps]) => {
        const total = eps.length;
        let episodioTexto, badge;
        
        if (total >= 3) {
          episodioTexto = `T${eps[0].temporada} Ep.${eps[0].numero}-${eps[total-1].numero} (${total} ep)`;
          badge = 'Temporada';
        } else if (total === 2) {
          episodioTexto = eps.map(e => `T${e.temporada}E${String(e.numero).padStart(2,'0')}`).join(' / ');
          badge = 'Doble';
        } else {
          const e = eps[0];
          episodioTexto = `T${e.temporada}E${String(e.numero).padStart(2,'0')}${e.titulo ? ' - ' + e.titulo : ''}`;
          badge = (e.temporada===1&&e.numero===1) ? 'Estreno' : 'Capítulo';
        }
        
        items.push({
          id: `tmdb-${serie.id}-${fecha}`,
          tmdb_id: serie.id,
          titulo: serie.name || 'Sin título',
          plataforma: providerName,
          fecha: fecha,
          poster: poster,
          resumen: (serie.overview || '').substring(0, 120),
          episodio: episodioTexto,
          badge: badge,
          plataformas: [{ provider_name: providerName }]
        });
      });
    }));
    
    todosLosItemsAgenda = items.sort((a,b) => a.fecha.localeCompare(b.fecha));
    localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: todosLosItemsAgenda }));
    
    ocultarLoader('agendaContainer');
    agendaItemsVisibles = 0;
    renderAgendaLote(true);
  } catch(e) {
    console.error('Error agenda:', e);
    ocultarLoader('agendaContainer');
    mostrarNotificacion('Error cargando agenda', 'error');
  } finally {
    agendaCargando = false;
  }
}

function renderAgendaLote(reset = false) {
  const container = document.getElementById('agendaContainer');
  const stats = document.getElementById('agendaStats');
  if (!container || !stats) return;
  
  if (reset) container.innerHTML = '';
  if (!todosLosItemsAgenda.length) {
    container.innerHTML = '<p style="text-align:center;padding:2rem;">No hay resultados</p>';
    stats.innerHTML = 'Sin resultados';
    return;
  }
  
  const hasta = Math.min(agendaItemsVisibles + agendaBatchSize, todosLosItemsAgenda.length);
  const lote = todosLosItemsAgenda.slice(0, hasta);
  agendaItemsVisibles = hasta;
  
  const agrupado = {};
  lote.forEach(item => {
    const f = item.fecha || 'Sin fecha';
    if (!agrupado[f]) agrupado[f] = [];
    agrupado[f].push(item);
  });
  
  container.innerHTML = '';
  stats.innerHTML = `${todosLosItemsAgenda.length} emisiones encontradas`;
  
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  
  Object.keys(agrupado).sort().forEach(fecha => {
    const lista = agrupado[fecha];
    const fechaObj = parseSafeDate(fecha);
    let etiqueta = fecha;
    
    if (fechaObj) {
      etiqueta = `${fechaObj.getDate()} de ${MESES[fechaObj.getMonth()]}`;
      if (+fechaObj === +hoy) etiqueta = '🔴 HOY - ' + etiqueta;
      else if (+fechaObj === +manana) etiqueta = '🔵 MAÑANA - ' + etiqueta;
    }
    
    const bloque = document.createElement('div');
    bloque.className = 'agenda-bloque';
    
    const h3 = document.createElement('h3');
    h3.className = 'agenda-dia-titulo';
    h3.innerHTML = `<span>${etiqueta}</span><small>${lista.length} emisión${lista.length !== 1 ? 'es' : ''}</small>`;
    bloque.appendChild(h3);
    
    lista.forEach(item => {
      const card = document.createElement('div');
      card.className = 'agenda-card';
      card.onclick = () => abrirModalAgenda(item.tmdb_id);
      
      const posterHTML = item.poster 
        ? `<img src="${item.poster}" class="agenda-poster" onerror="this.style.display='none'">`
        : `<div class="agenda-poster agenda-poster-fallback">📺</div>`;
      
      card.innerHTML = `
        <div class="agenda-poster-wrap">${posterHTML}</div>
        <div class="agenda-info">
          <div class="agenda-topline">
            <h4 class="agenda-titulo">${item.titulo}</h4>
            <span class="agenda-badge agenda-badge-${item.badge === 'Estreno' ? 'estreno' : 'episodio'}">${item.badge}</span>
          </div>
          <div class="agenda-episodio">${item.episodio}</div>
          <div class="agenda-meta">📺 ${item.plataforma}</div>
          ${item.resumen ? `<p class="agenda-resumen">${item.resumen}</p>` : ''}
        </div>
      `;
      
      bloque.appendChild(card);
    });
    
    container.appendChild(bloque);
  });
  
  if (agendaItemsVisibles < todosLosItemsAgenda.length) {
    const more = document.createElement('div');
    more.className = 'agenda-more';
    more.innerHTML = '<button class="agenda-more-btn" onclick="cargarMasAgenda()">Cargar más</button>';
    container.appendChild(more);
  }
}

function cargarMasAgenda() {
  if (agendaItemsVisibles < todosLosItemsAgenda.length) {
    renderAgendaLote(true);
  }
}

async function abrirModalAgenda(tmdbId) {
  try {
    const res = await fetch(`${BASEURL}tv/${tmdbId}?api_key=${APIKEY}&language=es-ES`);
    const show = await res.json();
    const item = await enriquecerConPlataformas({
      id: show.id,
      title: show.name,
      name: show.name,
      overview: show.overview || '',
      poster_path: show.poster_path,
      vote_average: show.vote_average || 0,
      first_air_date: show.first_air_date || ''
    }, 'tv');
    abrirModal(item);
  } catch {
    mostrarNotificacion('Error cargando detalles', 'error');
  }
}

// ============================================
// PARA TI - RECOMENDACIONES (CORREGIDO PARA SERIES)
// ============================================
function cargarPreferenciasOnboarding() {
  const grid = document.getElementById('generosGrid');
  if (!grid) return;
  
  const pref = getPreferencias() || { generos: [], plataformas: [], tipo: 'ambos' };
  
  grid.innerHTML = '';
  GENEROS.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'genero-btn' + (pref.generos.includes(g.id) ? ' selected' : '');
    btn.textContent = g.nombre;
    btn.dataset.id = g.id;
    btn.onclick = function() { this.classList.toggle('selected'); };
    grid.appendChild(btn);
  });
  
  const pGrid = document.getElementById('plataformasPrefGrid');
  if (pGrid) {
    pGrid.innerHTML = '';
    PLATAFORMAS_PREF.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'plataforma-pref-btn' + (pref.plataformas.includes(p.id) ? ' selected' : '');
      btn.textContent = p.nombre;
      btn.dataset.id = p.id;
      btn.onclick = function() { this.classList.toggle('selected'); };
      pGrid.appendChild(btn);
    });
  }
  
  prefTipoActual = pref.tipo;
  document.querySelectorAll('.tipo-pref-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tipo === prefTipoActual);
  });
}

function getPreferencias() {
  try {
    return JSON.parse(localStorage.getItem('preferencias'));
  } catch {
    return null;
  }
}

function mostrarSeccionParaTi() {
  const pref = getPreferencias();
  const onboarding = document.getElementById('paratiOnboarding');
  const resultados = document.getElementById('paratiResultados');
  
  if (!pref || !pref.generos || pref.generos.length === 0) {
    onboarding.style.display = 'block';
    resultados.style.display = 'none';
    cargarPreferenciasOnboarding();
  } else {
    onboarding.style.display = 'none';
    resultados.style.display = 'block';
    cargarRecomendaciones(pref);
  }
}

function mostrarOnboarding() {
  document.getElementById('paratiOnboarding').style.display = 'block';
  document.getElementById('paratiResultados').style.display = 'none';
  cargarPreferenciasOnboarding();
}

function selTipo(btn) {
  prefTipoActual = btn.dataset.tipo;
  document.querySelectorAll('.tipo-pref-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function guardarPreferencias() {
  const generos = Array.from(document.querySelectorAll('.genero-btn.selected'))
    .map(btn => parseInt(btn.dataset.id));
  
  const plataformas = Array.from(document.querySelectorAll('.plataforma-pref-btn.selected'))
    .map(btn => parseInt(btn.dataset.id));
  
  if (generos.length === 0) {
    mostrarNotificacion('Selecciona al menos un género', 'error');
    return;
  }
  
  const pref = {
    generos: generos,
    plataformas: plataformas,
    tipo: prefTipoActual
  };
  
  localStorage.setItem('preferencias', JSON.stringify(pref));
  
  document.getElementById('paratiOnboarding').style.display = 'none';
  document.getElementById('paratiResultados').style.display = 'block';
  cargarRecomendaciones(pref);
}

async function cargarRecomendaciones(pref) {
  let tipoActual = paratiTabActual;
  
  if (pref.tipo === 'tv') tipoActual = 'tv';
  if (pref.tipo === 'movie') tipoActual = 'movie';
  
  document.getElementById('tabSeries').classList.toggle('active', tipoActual === 'tv');
  document.getElementById('tabPeliculas').classList.toggle('active', tipoActual === 'movie');
  
  const tabsEl = document.querySelector('.parati-tabs');
  if (tabsEl) {
    tabsEl.style.display = pref.tipo === 'ambos' ? 'flex' : 'none';
  }
  
  mostrarLoader('paratiContainer');
  
  const cacheKey = `parati_${tipoActual}_${pref.generos.join('-')}_${pref.plataformas.join('-')}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const c = JSON.parse(cached);
      if (Date.now() - c.time < 3600000) {
        ocultarLoader('paratiContainer');
        mostrarResultados(c.data, 'paratiContainer');
        return;
      }
    } catch {}
  }
  
  try {
    const generosStr = pref.generos.join(',');
    let url = `${BASEURL}discover/${tipoActual}?api_key=${APIKEY}&language=es-ES&watch_region=ES&with_genres=${generosStr}&sort_by=popularity.desc&vote_count.gte=50&page=1`;
    
    if (pref.plataformas && pref.plataformas.length > 0) {
      url += `&with_watch_providers=${pref.plataformas.join('|')}`;
    }
    
    // Añadir filtros específicos para series
    if (tipoActual === 'tv') {
      url += '&include_null_first_air_dates=false&first_air_date.lte=' + new Date().toISOString().split('T')[0];
    }
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.results || data.results.length === 0) {
      ocultarLoader('paratiContainer');
      document.getElementById('paratiContainer').innerHTML = '<p class="sin-resultados">No hay recomendaciones para estos filtros</p>';
      return;
    }
    
    // Procesar las primeras 20 para series también
    const items = await Promise.all(
      data.results.slice(0, 20).map(i => enriquecerConPlataformas(i, tipoActual))
    );
    
    localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: items }));
    
    ocultarLoader('paratiContainer');
    mostrarResultados(items, 'paratiContainer');
  } catch (error) {
    console.error('Error en recomendaciones:', error);
    ocultarLoader('paratiContainer');
    mostrarNotificacion('Error cargando recomendaciones', 'error');
  }
}

function cambiarTabParaTi(tipo) {
  paratiTabActual = tipo;
  const pref = getPreferencias();
  if (pref) cargarRecomendaciones(pref);
}

// ============================================
// PERFIL
// ============================================
function renderAvatarSelector() {
  const container = document.getElementById('avatarEmojiSelector');
  if (!container) return;
  
  container.innerHTML = '';
  const activo = localStorage.getItem('avatarEmoji') || '👤';
  
  AVATARES.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'avatar-emoji-btn' + (emoji === activo ? ' active' : '');
    btn.textContent = emoji;
    btn.onclick = () => {
      if (perfilCompartido) {
        mostrarNotificacion('No puedes editar un perfil compartido', 'error');
        return;
      }
      localStorage.setItem('avatarEmoji', emoji);
      localStorage.removeItem('avatarCustom');
      
      const span = document.getElementById('avatarEmoji');
      const img = document.getElementById('avatarPreview');
      
      if (span) {
        span.textContent = emoji;
        span.style.display = 'flex';
      }
      if (img) img.style.display = 'none';
      
      renderAvatarSelector();
    };
    container.appendChild(btn);
  });
  
  const span = document.getElementById('avatarEmoji');
  const img = document.getElementById('avatarPreview');
  const custom = localStorage.getItem('avatarCustom');
  
  if (custom && img) {
    img.src = custom;
    img.style.display = 'block';
    if (span) span.style.display = 'none';
  } else if (span) {
    span.textContent = activo;
    span.style.display = 'flex';
    if (img) img.style.display = 'none';
  }
}

function subirAvatarImagen(event) {
  if (perfilCompartido) {
    mostrarNotificacion('No puedes editar un perfil compartido', 'error');
    return;
  }
  
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.size > 500000) {
    mostrarNotificacion('La imagen es demasiado grande (máx 500KB)', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = e => {
    localStorage.setItem('avatarCustom', e.target.result);
    
    const img = document.getElementById('avatarPreview');
    const span = document.getElementById('avatarEmoji');
    
    if (img) {
      img.src = e.target.result;
      img.style.display = 'block';
    }
    if (span) span.style.display = 'none';
    
    mostrarNotificacion('Avatar actualizado', 'success');
  };
  
  reader.readAsDataURL(file);
}

function guardarAlias() {
  if (perfilCompartido) {
    mostrarNotificacion('No puedes editar un perfil compartido', 'error');
    return;
  }
  
  const alias = document.getElementById('aliasInput').value.trim();
  if (!alias) {
    mostrarNotificacion('Escribe un alias', 'error');
    return;
  }
  
  aliasActual = alias;
  localStorage.setItem('alias', alias);
  
  document.getElementById('aliasActualDisplay').textContent = alias;
  document.getElementById('aliasInput').value = '';
  
  mostrarNotificacion('Alias guardado', 'success');
}

function actualizarDisplayAlias() {
  const display = document.getElementById('aliasActualDisplay');
  if (display) {
    display.textContent = aliasActual || 'No tienes alias configurado';
  }
}

function guardarBio() {
  if (perfilCompartido) {
    mostrarNotificacion('No puedes editar un perfil compartido', 'error');
    return;
  }
  
  const bio = document.getElementById('bioInput').value.trim();
  localStorage.setItem('bio', bio);
  mostrarNotificacion('Bio guardada', 'success');
}

function cargarBio() {
  const bio = localStorage.getItem('bio') || '';
  document.getElementById('bioInput').value = bio;
}

function actualizarStatsPerfil() {
  const listas = getListas();
  const recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  
  const totalItems = listas.reduce((sum, lista) => sum + lista.items.length, 0);
  const totalPuntuadas = listas.reduce((sum, lista) => 
    sum + lista.items.filter(i => i.miPuntuacion > 0).length, 0
  );
  
  document.getElementById('statsListas').textContent = listas.length;
  document.getElementById('statsMiLista').textContent = totalItems;
  document.getElementById('statsRecordatorios').textContent = recordatorios.length;
  document.getElementById('statsPuntuadas').textContent = totalPuntuadas;
}

// ============================================
// NEWSLETTER
// ============================================
function suscribirNewsletter() {
  const email = document.getElementById('newsletterEmail').value;
  if (!email || !email.includes('@')) {
    mostrarNotificacion('Email inválido', 'error');
    return;
  }
  
  mostrarNotificacion('¡Gracias por suscribirte!', 'success');
  document.getElementById('newsletterEmail').value = '';
}

// ============================================
// UTILIDADES
// ============================================
function mostrarLoader(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (container.querySelector('.loader')) return;
  
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.textContent = 'Cargando...';
  container.appendChild(loader);
}

function ocultarLoader(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const loader = container.querySelector('.loader');
  if (loader) loader.remove();
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
