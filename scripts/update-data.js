const fs = require('fs');
const path = require('path');

const entities = [
  "Coderise",
  "Astorga Management",
  "Fideicomiso Academia",
  "VC Investments"
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to fetch data with retry
async function fetchWithRetry(url, retries = 3, backoff = 500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      if (attempt === retries) throw e;
      console.warn(`[Warning] Failed to fetch ${url} (Attempt ${attempt}/${retries}). Retrying in ${backoff}ms...`);
      await delay(backoff);
      backoff *= 2;
    }
  }
}

async function scrapeAll() {
  console.log("🚀 Starting lawsuit tracker database update...");
  
  const outputPath = path.join(__dirname, '../public/procesos.json');
  let existingData = { procesos: [], actuaciones: {} };
  if (fs.existsSync(outputPath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    } catch (e) {
      console.warn("[Warning] Could not read existing procesos.json, will scrape all actuaciones.");
    }
  }
  
  const existingProcesosMap = new Map();
  for (const p of existingData.procesos || []) {
    existingProcesosMap.set(p.idProceso, p);
  }
  const existingActuaciones = existingData.actuaciones || {};

  const allProcesos = [];
  const actuacionesMap = {};
  
  // Step 1: Fetch all processes for all entities
  for (const entity of entities) {
    console.log(`\n🔍 Fetching processes for: "${entity}"`);
    let pagina = 1;
    let entityProcesosCount = 0;
    let continuar = true;
    
    const entityProcessIds = new Set();
    while (continuar) {
      const url = `https://consultaprocesos.ramajudicial.gov.co:448/api/v2/Procesos/Consulta/NombreRazonSocial?nombre=${encodeURIComponent(entity)}&tipoPersona=jur&SoloActivos=false&codificacionDespacho=&pagina=${pagina}`;
      try {
        const data = await fetchWithRetry(url);
        if (data && data.procesos && data.procesos.length > 0) {
          const hasNew = data.procesos.some(p => !entityProcessIds.has(p.idProceso));
          if (!hasNew) {
            console.log(`   [Info] Page ${pagina} returned only duplicate processes. Stopping page iteration.`);
            continuar = false;
            break;
          }
          for (const p of data.procesos) {
            entityProcessIds.add(p.idProceso);
          }
          allProcesos.push(...data.procesos);
          entityProcesosCount += data.procesos.length;
          pagina++;
          await delay(200); // 200ms throttle between pages
        } else {
          continuar = false;
        }
      } catch (err) {
        console.error(`❌ Error fetching processes for ${entity} page ${pagina}:`, err.message);
        throw new Error(`Failed to fetch processes for ${entity}: ${err.message}`);
      }
    }
    console.log(`✅ Loaded ${entityProcesosCount} processes for "${entity}"`);
  }
  
  // De-duplicate processes just in case
  const uniqueProcesosMap = new Map();
  for (const p of allProcesos) {
    uniqueProcesosMap.set(p.idProceso, p);
  }
  const uniqueProcesos = Array.from(uniqueProcesosMap.values());
  console.log(`\n📋 Total unique processes found: ${uniqueProcesos.length}`);
  
  // Step 2: Fetch actuaciones for each unique process
  console.log(`\n⏳ Fetching detailed history (actuaciones) for ${uniqueProcesos.length} processes...`);
  
  // Batch requests to speed up slightly while keeping load low
  const BATCH_SIZE = 5;
  let cacheHits = 0;
  let apiFetches = 0;

  for (let i = 0; i < uniqueProcesos.length; i += BATCH_SIZE) {
    const batch = uniqueProcesos.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (proceso) => {
      const cachedProc = existingProcesosMap.get(proceso.idProceso);
      const hasCachedActuaciones = !!existingActuaciones[proceso.idProceso];
      
      // Reuse cache if process and last action date haven't changed
      if (cachedProc && hasCachedActuaciones && cachedProc.fechaUltimaActuacion === proceso.fechaUltimaActuacion) {
        actuacionesMap[proceso.idProceso] = existingActuaciones[proceso.idProceso];
        cacheHits++;
        return;
      }
      
      // Otherwise fetch from API
      const url = `https://consultaprocesos.ramajudicial.gov.co:448/api/v2/Proceso/Actuaciones/${proceso.idProceso}?pagina=1`;
      try {
        const data = await fetchWithRetry(url);
        if (data && data.actuaciones) {
          actuacionesMap[proceso.idProceso] = data.actuaciones;
          apiFetches++;
        }
      } catch (err) {
        console.error(`❌ Failed to fetch actuaciones for process ID ${proceso.idProceso}:`, err.message);
        // Fallback to cache if we hit rate limits so we don't lose existing data
        if (hasCachedActuaciones) {
          console.warn(`   [Warning] Reverting to cached actuaciones for process ID ${proceso.idProceso}`);
          actuacionesMap[proceso.idProceso] = existingActuaciones[proceso.idProceso];
        }
      }
    }));
    
    // Log progress
    if ((i + BATCH_SIZE) % 50 === 0 || i + BATCH_SIZE >= uniqueProcesos.length) {
      const progress = Math.min(i + BATCH_SIZE, uniqueProcesos.length);
      console.log(`   Progress: ${progress}/${uniqueProcesos.length} (Cache hits: ${cacheHits}, API fetches: ${apiFetches})`);
    }
    
    // Sleep between batches only if we actually made API calls in this batch
    const madeApiCall = batch.some(proceso => {
      const cachedProc = existingProcesosMap.get(proceso.idProceso);
      const hasCachedActuaciones = !!existingActuaciones[proceso.idProceso];
      return !(cachedProc && hasCachedActuaciones && cachedProc.fechaUltimaActuacion === proceso.fechaUltimaActuacion);
    });
    if (madeApiCall) {
      await delay(500); // 500ms delay between API call batches
    }
  }
  
  // Step 3: Write out to procesos.json
  const payload = {
    procesos: uniqueProcesos,
    actuaciones: actuacionesMap
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(`\n🎉 Done! Database successfully updated and saved to ${outputPath}`);
}

scrapeAll().catch(err => {
  console.error("💥 Critical execution error:", err);
  process.exit(1);
});
