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

export async function fetchActuaciones(idProceso: number): Promise<Actuacion[]> {
  const data = await getLocalData();
  return data.actuaciones[idProceso] ?? [];
}
