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

// Helper function to handle proxy fallbacks and retries
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

function getData(endpoint: string): Promise<ApiResponse> {
  return fetchWithRetryAndFallback(endpoint, 2, 200)
    .then(data => data as ApiResponse);
}

export async function getCombinedProcesos(): Promise<Proceso[]> {
  const fetchProcesos = async (entity: string): Promise<Proceso[]> => {
    let pagina = 1;
    let allProcesos: Proceso[] = [];
    let continuar = true;

    while (continuar) {
      try {
        const response = await getData(
          `https://consultaprocesos.ramajudicial.gov.co:448/api/v2/Procesos/Consulta/NombreRazonSocial?nombre=${encodeURIComponent(
            entity
          )}&tipoPersona=jur&SoloActivos=false&codificacionDespacho=&pagina=${pagina}`
        );

        if (response && response.procesos && response.procesos.length > 0) {
          allProcesos = allProcesos.concat(response.procesos);
          pagina++; // Continue to the next page
          // Add a small 100ms throttle between pages to avoid slamming the proxy
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          continuar = false; // Stop if no more processes are found
        }
      } catch (error) {
        console.error(`Error fetching page ${pagina} for ${entity}:`, error);
        continuar = false; // Stop looping on error, but keep what we fetched so far
      }
    }

    return allProcesos;
  };

  // Fetch procesos for all entities in parallel
  const [coderiseProcesos, astorgaProcesos, fideicomisoProcesos, vcInvestmentsProcesos] = await Promise.all([
    fetchProcesos("Coderise"),
    fetchProcesos("Astorga Management"),
    fetchProcesos("Fideicomiso Academia"),
    fetchProcesos("VC Investments"),
  ]);

  // Combine both lists into a single array
  return [...coderiseProcesos, ...astorgaProcesos, ...fideicomisoProcesos, ...vcInvestmentsProcesos];
}

// Nueva función para obtener las actuaciones
export async function fetchActuaciones(idProceso: number): Promise<Actuacion[]> {
  const url = `https://consultaprocesos.ramajudicial.gov.co:448/api/v2/Proceso/Actuaciones/${idProceso}?pagina=1`;
  const data = await fetchWithRetryAndFallback(url, 2, 200);
  return data.actuaciones;
}
