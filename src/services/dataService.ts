export interface Proceso {
  idProceso: number;
  idConexion: number;
  llaveProceso: string;
  fechaProceso: string;
  fechaUltimaActuacion: string;
  despacho: string;
  departamento: string;
  sujetosProcesales: string;
  esPrivado: boolean;
  cantFilas: number;
}

export interface ApiResponse {
  tipoConsulta: string;
  procesos: Proceso[];
}

export interface Actuacion {
  idRegActuacion: number;
  llaveProceso: string;
  consActuacion: number;
  fechaActuacion: string;
  actuacion: string;
  anotacion: string;
}

interface LocalData {
  procesos: Proceso[];
  actuaciones: { [key: number]: Actuacion[] };
}

let cachedData: LocalData | null = null;

async function getLocalData(): Promise<LocalData> {
  if (cachedData) {
    return cachedData;
  }

  const publicUrl = process.env.PUBLIC_URL;
  const cacheBust = `?v=${Date.now()}`;
  const url = publicUrl ? `${publicUrl}/procesos.json${cacheBust}` : `./procesos.json${cacheBust}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load procesos.json: ${response.status} ${response.statusText}`);
  }

  cachedData = await response.json();
  return cachedData!;
}

export async function getCombinedProcesos(): Promise<Proceso[]> {
  const data = await getLocalData();
  return data.procesos;
}

async function fetchWithRetryAndFallback(endpoint: string, retries = 2, delayMs = 150): Promise<any> {
  const proxies = [
    (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`
  ];

  for (let attempt = 1; attempt <= retries; attempt++) {
    for (const getProxyUrl of proxies) {
      const proxiedUrl = getProxyUrl(endpoint);
      try {
        const response = await fetch(proxiedUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (proxiedUrl.includes("allorigins.win")) {
          if (!data.contents) {
            throw new Error("AllOrigins returned empty contents");
          }
          return JSON.parse(data.contents);
        }
        
        return data;
      } catch (err: any) {
        console.warn(`Attempt ${attempt} failed with proxy: ${proxiedUrl.split('?')[0]}. Error: ${err.message}`);
      }
    }
    
    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error(`Failed to fetch ${endpoint} after ${retries} attempts with all proxies.`);
}

async function fetchOnlineProcesosForEntity(entity: string): Promise<Proceso[]> {
  let pagina = 1;
  let allProcesos: Proceso[] = [];
  let continuar = true;
  const seenIds = new Set<number>();

  while (continuar) {
    const cacheBuster = `&_cb=${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const url = `https://consultaprocesos.ramajudicial.gov.co:448/api/v2/Procesos/Consulta/NombreRazonSocial?nombre=${encodeURIComponent(
      entity
    )}&tipoPersona=jur&SoloActivos=false&codificacionDespacho=&pagina=${pagina}${cacheBuster}`;

    try {
      const response = await fetchWithRetryAndFallback(url, 2, 200);
      if (response && response.procesos && response.procesos.length > 0) {
        if (response.paginacion && response.paginacion.pagina !== pagina) {
          console.warn(`Proxy returned cached page ${response.paginacion.pagina} instead of requested page ${pagina} for entity "${entity}".`);
        }

        const hasNew = response.procesos.some((p: Proceso) => !seenIds.has(p.idProceso));
        const isFreshResponse = !response.paginacion || response.paginacion.pagina === pagina;

        if (!hasNew && isFreshResponse) {
          continuar = false;
          break;
        }

        for (const p of response.procesos) {
          seenIds.add(p.idProceso);
        }
        allProcesos = allProcesos.concat(response.procesos);

        if (response.paginacion && pagina >= response.paginacion.cantidadPaginas) {
          continuar = false;
        } else {
          pagina++;
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms throttle
        }
      } else {
        continuar = false;
      }
    } catch (error) {
      console.error(`Error fetching page ${pagina} for ${entity}:`, error);
      continuar = false; // Stop looping on error
    }
  }

  return allProcesos;
}

export async function getOnlineProcesos(): Promise<Proceso[]> {
  const entities = [
    "Coderise",
    "Astorga Management",
    "Fideicomiso Academia",
    "VC Investments",
    "Lumni"
  ];

  try {
    const results = await Promise.all(
      entities.map(entity => fetchOnlineProcesosForEntity(entity))
    );

    const allProcesos = results.flat();
    const uniqueProcesosMap = new Map<number, Proceso>();
    for (const p of allProcesos) {
      uniqueProcesosMap.set(p.idProceso, p);
    }

    return Array.from(uniqueProcesosMap.values());
  } catch (error) {
    console.error("Failed to fetch online processes:", error);
    return [];
  }
}

// Nueva función para obtener las actuaciones
export async function fetchActuaciones(idProceso: number): Promise<Actuacion[]> {
  const data = await getLocalData();
  if (data.actuaciones[idProceso] && data.actuaciones[idProceso].length > 0) {
    return data.actuaciones[idProceso];
  }

  // Fallback: Fetch dynamically from the live API using proxy fallback
  console.log(`Actuaciones for process ID ${idProceso} not in cache, fetching dynamically...`);
  const url = `https://consultaprocesos.ramajudicial.gov.co:448/api/v2/Proceso/Actuaciones/${idProceso}?pagina=1`;
  try {
    const res = await fetchWithRetryAndFallback(url, 2, 200);
    return res.actuaciones || [];
  } catch (error) {
    console.error(`Failed to fetch actuaciones dynamically for process ID ${idProceso}:`, error);
    return [];
  }
}
