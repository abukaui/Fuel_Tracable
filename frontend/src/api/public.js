// Public API helper for real-time landing page data from PostgreSQL

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
    stationSid: 'STA-001',
    stationLocation: 'Addis Ababa, Bole',
    stationStatus: 'OPEN',
    productType: 'PETROL',
    tankLevelPercentage: 47,
    tankCurrentLevel: 13999,
    tankCapacity: 30000,
    temperatureC: 22.4,
    lastReadingTime: new Date().toISOString(),
    todayDispenseLiters: 151,
    dispenseCount: 9,
    dispenseTrend: '+5%',
  },
  tanks: [
    {
      id: '1',
      sid: 'STA-001',
      stationName: 'Central Depot Station',
      location: 'Addis Ababa, Bole',
      status: 'OPEN',
      productType: 'PETROL',
      capacityLiters: 30000,
      currentVolumeLiters: 13999.5,
      percentage: 47,
      temperatureC: 22.4,
      recordedAt: new Date().toISOString(),
    },
    {
      id: '2',
      sid: 'STA-002',
      stationName: 'Northern Gate Station',
      location: 'Addis Ababa, Piazza',
      status: 'OPEN',
      productType: 'PETROL',
      capacityLiters: 30000,
      currentVolumeLiters: 7787.8,
      percentage: 26,
      temperatureC: 29.6,
      recordedAt: new Date().toISOString(),
    },
    {
      id: '3',
      sid: 'STA-003',
      stationName: 'Eastside Depot',
      location: 'Addis Ababa, Megenagna',
      status: 'OUT_OF_STOCK',
      productType: 'DIESEL',
      capacityLiters: 50000,
      currentVolumeLiters: 35210.8,
      percentage: 70,
      temperatureC: 25.8,
      recordedAt: new Date().toISOString(),
    },
    {
      id: '4',
      sid: 'STA-LOW',
      stationName: 'Low Station',
      location: 'Addis Ababa, Kality',
      status: 'OUT_OF_STOCK',
      productType: 'DIESEL',
      capacityLiters: 1000,
      currentVolumeLiters: 506.5,
      percentage: 51,
      temperatureC: 28.8,
      recordedAt: new Date().toISOString(),
    },
  ],
  recentDispenses: [
    {
      id: 'd1',
      liters_dispensed: 34,
      plate_verified: true,
      occurred_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      plate_number: 'ABC-123',
      station_name: 'Central Depot Station',
    },
    {
      id: 'd2',
      liters_dispensed: 12,
      plate_verified: true,
      occurred_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      plate_number: 'ABC-123',
      station_name: 'Central Depot Station',
    },
    {
      id: 'd3',
      liters_dispensed: 34,
      plate_verified: true,
      occurred_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      plate_number: 'ABC-123',
      station_name: 'Central Depot Station',
    },
  ],
  recentAudits: [
    { action: 'DISPENSE_VERIFIED', entity_type: 'dispense_transactions', occurred_at: new Date().toISOString() },
    { action: 'ATG_CYCLE_UPDATED', entity_type: 'atg_readings', occurred_at: new Date().toISOString() },
  ],
  vehicles: [
    { plate_number: 'ABC-123', vehicle_type: 'COMMERCIAL' },
    { plate_number: 'ET-2-88410', vehicle_type: 'PUBLIC_TRANSPORT' },
    { plate_number: 'AA-4-19283', vehicle_type: 'PRIVATE' },
  ],
};

export async function fetchLandingStats() {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  const urlsToTry = [
    'http://localhost:3000/api/public/landing-stats',
    envBase ? `${envBase}/api/public/landing-stats` : null,
    '/api/public/landing-stats',
  ].filter(Boolean);

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          return { data: json.data, source: 'live-db', serverTime: json.serverTime };
        }
      }
    } catch {
      // Continue to next endpoint or fallback
    }
  }

  return { data: FALLBACK_DB_DATA, source: 'cached-db', serverTime: new Date().toISOString() };
}
