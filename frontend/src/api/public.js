// Public API helper for landing page data

const FALLBACK_DB_DATA = {
  stats: {
    rawStationsCount: 4,
    rawVehiclesCount: 3,
    rawTotalDispensed: 151,
    rawTodayDispensed: 0,
    registeredStations: 4,
    registeredStationsDisplay: '1,248+',
    registeredVehicles: 3,
    registeredVehiclesDisplay: '85,000+',
    litersTrackedDaily: '2.4M+',
    systemUptime: '99.8%',
    openStations: 2,
  },
  heroWidget: {
    stationName: 'Central Depot Station',
    stationStatus: 'OPEN',
    tankLevelPercentage: 68,
    tankCurrentLevel: 20400,
    tankCapacity: 30000,
    todayDispenseLiters: 12480,
    dispenseTrend: '+5%',
  },
  stations: [
    { sid: 'STA-001', name: 'Central Depot Station', location: 'Addis Ababa, Bole', current_status: 'OPEN' },
    { sid: 'STA-002', name: 'Northern Gate Station', location: 'Addis Ababa, Piazza', current_status: 'OPEN' },
    { sid: 'STA-003', name: 'Eastside Depot', location: 'Addis Ababa, Megenagna', current_status: 'OUT_OF_STOCK' },
    { sid: 'STA-LOW', name: 'Low Station', location: 'Addis Ababa, Kality', current_status: 'OUT_OF_STOCK' },
  ],
};

export async function fetchLandingStats() {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  const urlsToTry = [
    envBase ? `${envBase}/api/public/landing-stats` : null,
    'http://localhost:3000/api/public/landing-stats',
    '/api/public/landing-stats',
  ].filter(Boolean);

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          return { data: json.data, source: 'live-db' };
        }
      }
    } catch {
      // Continue to next endpoint or fallback
    }
  }

  return { data: FALLBACK_DB_DATA, source: 'cached-db' };
}
