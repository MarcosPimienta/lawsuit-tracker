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

function getData(endpoint: string): Promise<ApiResponse> {
  const proxiedUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(endpoint)}`;
  return fetch(proxiedUrl)
    .then(res => {
      if (!res.ok) {
        // Si la respuesta no es satisfactoria, rechazamos la promesa con un error
        return Promise.reject(new Error(`Error al obtener los datos: ${res.status} ${res.statusText}`));
      }
      return res.json();
    })
    .then(data => {
      const responseObj = JSON.parse((data as any).contents);
      return responseObj as ApiResponse;
    })
    .catch(error => {
      // Capturamos cualquier error de la solicitud y rechazamos la promesa
      return Promise.reject(error);
    });
}

export async function getCombinedProcesos(): Promise<Proceso[]> {
  const fetchProcesos = async (entity: string): Promise<Proceso[]> => {
    let pagina = 1;
    let allProcesos: Proceso[] = [];
    let continuar = true;

    while (continuar) {
      const response = await getData(
        `https://consultaprocesos.ramajudicial.gov.co:448/api/v2/Procesos/Consulta/NombreRazonSocial?nombre=${encodeURIComponent(
          entity
        )}&tipoPersona=jur&SoloActivos=false&codificacionDespacho=&pagina=${pagina}`
      );

      if (response.procesos.length > 0) {
        allProcesos = allProcesos.concat(response.procesos);
        pagina++; // Continue to the next page
      } else {
        continuar = false; // Stop if no more processes are found
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
  const proxiedUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxiedUrl);
  const data = await response.json();
  const parsedData = JSON.parse(data.contents);
  return parsedData.actuaciones;
}
