// Definimos los tipos según el JSON de la respuesta
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

// Servicio para hacer fetch de los datos desde el API
export function getProcesos(): Promise<Proceso[]> {
  return getData('https://consultaprocesos.ramajudicial.gov.co:448/api/v2/Procesos/Consulta/NombreRazonSocial?nombre=Coderise&tipoPersona=jur&SoloActivos=false&codificacionDespacho=&pagina=1')
    .then((result: ApiResponse) => result.procesos);
}

// Función para hacer el llamado al API con un delay simulado
function getData(endpoint: string): Promise<ApiResponse> {
  const delay = (0.5 + Math.random() * 2) * 1000;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      fetch(endpoint)
        .then(res => res.json())
        .then(data => resolve(data as ApiResponse))
        .catch(error => reject(error));
      }, delay);
  });
}