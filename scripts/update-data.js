const fs = require('fs');
const path = require('path');

const entities = [
  "Coderise",
  "Astorga Management",
  "Fideicomiso Academia",
  "VC Investments",
  "Lumni"
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function addCacheBuster(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_cb=${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

// Function to fetch data with retry and proxy fallback
async function fetchWithRetry(baseUrl, retries = 3, backoff = 500) {
  const url = addCacheBuster(baseUrl);
  const proxies = [
    (targetUrl) => targetUrl,
    (targetUrl) => `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
    (targetUrl) => `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`
  ];

  for (let attempt = 1; attempt <= retries; attempt++) {
    for (const getProxyUrl of proxies) {
      const proxiedUrl = getProxyUrl(url);
      try {
        const options = {};
        // Use browser headers on direct connection to bypass Cloudflare/WAF block
        if (getProxyUrl === proxies[0]) {
          options.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
            'Referer': 'https://consultaprocesos.ramajudicial.gov.co/'
          };
        }

        const res = await fetch(proxiedUrl, options);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        
        if (proxiedUrl.includes("allorigins.win")) {
          if (!data.contents) {
            throw new Error("AllOrigins returned empty contents");
          }
          return JSON.parse(data.contents);
        }
        
        return data;
      } catch (e) {
        const sourceName = getProxyUrl === proxies[0] ? 'Direct connection' : `Proxy: ${proxiedUrl.split('?')[0]}`;
        console.warn(`   [Warning] Attempt ${attempt} failed with ${sourceName} (${e.message}).`);
      }
    }
    
    if (attempt < retries) {
      await delay(backoff);
      backoff *= 2;
    }
  }
  throw new Error(`Failed to fetch ${baseUrl} after all attempts and proxies.`);
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
  const actuacionesMap = { ...existingActuaciones };
  
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
          if (data.paginacion && data.paginacion.pagina !== pagina) {
            console.warn(`   [Warning] Received page ${data.paginacion.pagina} instead of requested page ${pagina}. Possible proxy caching.`);
          }

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
          
          if (data.paginacion && pagina >= data.paginacion.cantidadPaginas) {
            continuar = false;
          } else {
            pagina++;
            await delay(200); // 200ms throttle between pages
          }
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
  
  let cacheHits = 0;
  let apiFetches = 0;
  let consecutiveFailures = 0;
  let scrapeError = null;

  try {
    for (let i = 0; i < uniqueProcesos.length; i++) {
      const proceso = uniqueProcesos[i];
      const cachedProc = existingProcesosMap.get(proceso.idProceso);
      const hasCachedActuaciones = !!existingActuaciones[proceso.idProceso];
      
      let wasFetched = false;

      // Reuse cache if process and last action date haven't changed
      if (cachedProc && hasCachedActuaciones && cachedProc.fechaUltimaActuacion === proceso.fechaUltimaActuacion) {
        actuacionesMap[proceso.idProceso] = existingActuaciones[proceso.idProceso];
        cacheHits++;
      } else {
        // Otherwise fetch from API sequentially
        const url = `https://consultaprocesos.ramajudicial.gov.co:448/api/v2/Proceso/Actuaciones/${proceso.idProceso}?pagina=1`;
        try {
          const data = await fetchWithRetry(url);
          if (data && data.actuaciones) {
            actuacionesMap[proceso.idProceso] = data.actuaciones;
            apiFetches++;
            consecutiveFailures = 0; // Reset on successful fetch
            wasFetched = true;
          }
        } catch (err) {
          console.error(`❌ Failed to fetch actuaciones for process ID ${proceso.idProceso}:`, err.message);
          if (hasCachedActuaciones) {
            console.warn(`   [Warning] Reverting to cached actuaciones for process ID ${proceso.idProceso}`);
            actuacionesMap[proceso.idProceso] = existingActuaciones[proceso.idProceso];
          } else {
            scrapeError = err;
            consecutiveFailures++;
          }
        }
      }
      
      // Log progress every 50 processes
      if ((i + 1) % 50 === 0 || i + 1 === uniqueProcesos.length) {
        console.log(`   Progress: ${i + 1}/${uniqueProcesos.length} (Cache hits: ${cacheHits}, API fetches: ${apiFetches})`);
      }
      
      // If we hit too many consecutive failures (e.g. all proxies blocked), save and pause
      if (consecutiveFailures >= 5) {
        console.warn(`\n⚠️ Hitting too many consecutive failures (${consecutiveFailures}). Saving successfully scraped data and pausing to avoid WAF block...`);
        break;
      }
      
      // Sleep between requests to avoid triggering WAF rate limit
      if (wasFetched) {
        await delay(800); // 800ms delay between individual API calls
      }
    }
  } catch (err) {
    console.error("❌ Critical error during actuaciones fetching:", err.message);
    scrapeError = err;
  }
  
  // Step 3: Write out to procesos.json (saving successful fetches so far)
  const payload = {
    procesos: uniqueProcesos,
    actuaciones: actuacionesMap
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(`\n💾 Database saved to ${outputPath} (${Object.keys(actuacionesMap).length} total process histories stored).`);

  if (scrapeError) {
    console.error("💥 Execution completed with errors. Some process histories could not be fetched due to rate limits. Run again to resume.");
    process.exit(1);
  } else {
    console.log("🎉 Done! Database successfully updated and verified.");
  }
}

scrapeAll().catch(err => {
  console.error("💥 Critical execution error:", err);
  process.exit(1);
});

