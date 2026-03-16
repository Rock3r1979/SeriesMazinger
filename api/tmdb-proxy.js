// ============================================
// PROXY SEGURO PARA TMDB (Vercel Serverless)
// ============================================
export default async function handler(req, res) {
  // Configurar CORS - solo permitir tu dominio
  const allowedOrigins = [
    'https://seriesmazinger.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Responder a preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  
  // Obtener parámetros
  const { endpoint, id, tipo, page = 1, query, language = 'es-ES' } = req.query;
  
  if (!endpoint) {
    return res.status(400).json({ error: 'Falta el parámetro endpoint' });
  }
  
  // Tu API key está en el servidor, segura
  const API_KEY = process.env.TMDB_API_KEY;
  
  if (!API_KEY) {
    console.error('TMDB_API_KEY no configurada en las variables de entorno');
    return res.status(500).json({ error: 'Error de configuración del servidor' });
  }
  
  try {
    let url;
    const baseURL = 'https://api.themoviedb.org/3';
    
    // Construir URL según el endpoint
    switch(endpoint) {
      case 'movie':
      case 'tv':
        if (id) {
          // Detalles de una película/serie específica
          url = `${baseURL}/${endpoint}/${id}?api_key=${API_KEY}&language=${language}&append_to_response=watch/providers`;
        } else {
          // Listados
          url = `${baseURL}/${endpoint}/${tipo || 'popular'}?api_key=${API_KEY}&language=${language}&page=${page}`;
        }
        break;
        
      case 'trending':
        url = `${baseURL}/trending/${tipo || 'tv'}/week?api_key=${API_KEY}&language=${language}&page=${page}`;
        break;
        
      case 'search':
        if (!query) {
          return res.status(400).json({ error: 'Falta el parámetro query para búsqueda' });
        }
        url = `${baseURL}/search/${tipo || 'multi'}?api_key=${API_KEY}&language=${language}&query=${encodeURIComponent(query)}&page=${page}`;
        break;
        
      case 'discover':
        if (tipo === 'tv') {
          // Para agenda: discover/tv con filtros
          const { providerIds, fechaInicio, fechaFin } = req.query;
          url = `${baseURL}/discover/tv?api_key=${API_KEY}&language=${language}&watch_region=ES&sort_by=first_air_date.asc`;
          
          if (providerIds) {
            url += `&with_watch_providers=${providerIds}`;
          }
          if (fechaInicio) {
            url += `&air_date.gte=${fechaInicio}`;
          }
          if (fechaFin) {
            url += `&air_date.lte=${fechaFin}`;
          }
          url += `&page=${page}`;
        } else {
          // Para "Para ti": discover con géneros
          const { with_genres, with_watch_providers } = req.query;
          url = `${baseURL}/discover/${tipo || 'movie'}?api_key=${API_KEY}&language=${language}&watch_region=ES&sort_by=popularity.desc&vote_count.gte=10&page=${page}`;
          
          if (with_genres) {
            url += `&with_genres=${with_genres}`;
          }
          if (with_watch_providers) {
            url += `&with_watch_providers=${with_watch_providers}`;
          }
        }
        break;
        
      case 'season':
        if (!id || !tipo) {
          return res.status(400).json({ error: 'Faltan id o season_number' });
        }
        url = `${baseURL}/tv/${id}/season/${tipo}?api_key=${API_KEY}&language=${language}`;
        break;
        
      case 'videos':
        if (!id || !tipo) {
          return res.status(400).json({ error: 'Faltan id o tipo para videos' });
        }
        url = `${baseURL}/${tipo}/${id}/videos?api_key=${API_KEY}&language=${language}`;
        break;
        
      case 'watch/providers':
        if (!id || !tipo) {
          return res.status(400).json({ error: 'Faltan id o tipo para providers' });
        }
        url = `${baseURL}/${tipo}/${id}/watch/providers?api_key=${API_KEY}`;
        break;
        
      default:
        // Endpoint genérico (por si acaso)
        url = `${baseURL}/${endpoint}?api_key=${API_KEY}&language=${language}&page=${page}`;
    }
    
    console.log('Proxy llamando a:', url.replace(API_KEY, '***'));
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Añadir headers de caché
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Error en proxy:', error);
    return res.status(500).json({ error: 'Error al comunicarse con TMDB' });
  }
}
