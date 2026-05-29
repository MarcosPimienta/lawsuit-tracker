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
  
  const response = await fetch("./procesos.json");
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

// Nueva función para obtener las actuaciones
export async function fetchActuaciones(idProceso: number): Promise<Actuacion[]> {
  const data = await getLocalData();
  return data.actuaciones[idProceso] || [];
}
