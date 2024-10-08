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
  return fetch(endpoint)
    .then(res => {
      if (!res.ok) {
        // Si la respuesta no es satisfactoria, rechazamos la promesa con un error
        return Promise.reject(new Error(`Error al obtener los datos: ${res.status} ${res.statusText}`));
      }
      return res.json();
    })
    .then(data => data as ApiResponse)
    .catch(error => {
      // Capturamos cualquier error de la solicitud y rechazamos la promesa
      return Promise.reject(error);
    });
}

export async function getAllProcesos(): Promise<Proceso[]> {
  let pagina = 1;
  let todosLosProcesos: Proceso[] = [];
  let continuar = true;

  while (continuar) {
      const response = await getData(`https://consultaprocesos.ramajudicial.gov.co:448/api/v2/Procesos/Consulta/NombreRazonSocial?nombre=Coderise&tipoPersona=jur&SoloActivos=false&codificacionDespacho=&pagina=${pagina}`);

      if (response.procesos.length > 0) {
          todosLosProcesos = todosLosProcesos.concat(response.procesos);
          pagina++; // Pasar a la siguiente página
      } else {
          continuar = false; // Detener si ya no hay más procesos
      }
  }
  return todosLosProcesos;
}

// Nueva función para obtener las actuaciones
export async function fetchActuaciones(idProceso: number): Promise<Actuacion[]> {
  const response = await fetch(
    `https://consultaprocesos.ramajudicial.gov.co:448/api/v2/Proceso/Actuaciones/${idProceso}?pagina=1`
  );
  const data = await response.json();
  return data.actuaciones;
}
