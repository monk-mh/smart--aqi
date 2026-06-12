import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const AQIContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Offline Fallback Simulator ─────────────────────────────────
function generateFallbackReading(sensor, index) {
  const categories = ['Good', 'Moderate', 'Unhealthy for Sensitive Groups', 'Unhealthy'];
  const colors = ['#22c55e', '#eab308', '#f97316', '#ef4444'];
  const hour = new Date().getHours();
  const timeMult = (hour >= 8 && hour < 10) || (hour >= 17 && hour < 19) ? 1.3 : hour >= 10 && hour < 17 ? 1.1 : 0.7;

  const baseAqi = [35, 25, 55, 18, 65, 22, 50, 15][index] || 30;
  const aqi = Math.round(baseAqi * timeMult + (Math.random() - 0.5) * 20);
  const catIdx = aqi <= 50 ? 0 : aqi <= 100 ? 1 : aqi <= 150 ? 2 : 3;

  return {
    id: `fallback-${sensor.id}-${Date.now()}`,
    sensor_id: sensor.id,
    sensor_name: sensor.name,
    location_type: sensor.location_type,
    lat: sensor.lat,
    lng: sensor.lng,
    timestamp: new Date().toISOString(),
    status: 'active',
    battery: sensor.battery,
    pm25: +(aqi * 0.4 + Math.random() * 10).toFixed(1),
    pm10: +(aqi * 0.8 + Math.random() * 15).toFixed(1),
    co2: Math.round(400 + aqi * 3 + Math.random() * 50),
    no2: +(aqi * 0.3 + Math.random() * 8).toFixed(1),
    so2: +(aqi * 0.1 + Math.random() * 5).toFixed(1),
    temperature: +(26 + Math.random() * 8).toFixed(1),
    humidity: +(45 + Math.random() * 20).toFixed(1),
    aqi,
    aqi_category: categories[catIdx],
    aqi_color: colors[catIdx],
    dominant_pollutant: ['pm25', 'pm10', 'co2', 'no2'][catIdx],
    sub_indices: {},
  };
}

const DEFAULT_SENSORS = [
  { id: 'sensor-001', name: 'Canteen', location_type: 'outdoor', lat: 12.910677, lng: 74.897480, battery: 87 },
  { id: 'sensor-002', name: 'Parking', location_type: 'outdoor', lat: 12.911566, lng: 74.900122, battery: 92 },
  { id: 'sensor-003', name: 'Administrative Block', location_type: 'Indoor', lat: 12.91082, lng: 74.89868, battery: 78 },
  { id: 'sensor-004', name: 'Academic Block -1', location_type: 'Indoor', lat: 12.910712, lng: 74.89875, battery: 95 },
  { id: 'sensor-005', name: 'Academic Block -2', location_type: 'indoor', lat: 12.91071, lng: 74.89936, battery: 64 },
  { id: 'sensor-006', name: 'Academic Block -3', location_type: 'Indoor', lat: 12.910375, lng: 74.89961, battery: 88 },
  { id: 'sensor-007', name: 'Girls Hostel', location_type: 'Outdoor', lat: 12.90936, lng: 74.89929, battery: 71 },
  { id: 'sensor-008', name: 'Boys Hostel', location_type: 'Indoor', lat: 12.91145, lng: 74.90053, battery: 93 },
];

export function AQIProvider({ children }) {
  const [sensors, setSensors] = useState(DEFAULT_SENSORS);
  const [latestReadings, setLatestReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [wsStatus, setWsStatus] = useState('connecting'); // 'connected' | 'connecting' | 'offline'
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  // ─── Start offline fallback simulator ────────────────────────
  const startFallback = useCallback(() => {
    setWsStatus('offline');
    // Random simulation removed as per user request
  }, []);

  const stopFallback = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  // ─── WebSocket Connection (CRITICAL: empty dep array []) ─────
  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws/aqi`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setWsStatus('connected');
          stopFallback();
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'sensor_update' && msg.data) {
              setLatestReadings(msg.data);
              if (msg.alert_count !== undefined) {
                // Fetch latest alerts
                fetch(`${API_BASE}/api/alerts`)
                  .then((r) => r.json())
                  .then((a) => setAlerts(a))
                  .catch(() => {});
              }
            }
          } catch (e) {
            // ignore parse errors
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsStatus('connecting');
          // 5-second reconnect debounce
          reconnectTimerRef.current = setTimeout(() => {
            if (isMounted) {
              connect();
            }
          }, 5000);
        };

        ws.onerror = () => {
          if (!isMounted) return;
          ws.close();
          // Switch to offline fallback after failed connection
          startFallback();
        };
      } catch (e) {
        startFallback();
      }
    }

    // Try to fetch sensors first
    fetch(`${API_BASE}/api/sensors`)
      .then((r) => r.json())
      .then((data) => {
        if (isMounted) setSensors(data);
        connect();
      })
      .catch(() => {
        startFallback();
      });

    // Fetch initial alerts
    fetch(`${API_BASE}/api/alerts`)
      .then((r) => r.json())
      .then((a) => { if (isMounted) setAlerts(a); })
      .catch(() => {});

    return () => {
      isMounted = false;
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      stopFallback();
    };
  }, []); // ← CRITICAL: empty dependency array

  const dismissAlert = useCallback(async (alertId) => {
    try {
      await fetch(`${API_BASE}/api/alerts/${alertId}/dismiss`, { method: 'POST' });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (e) {
      // optimistic removal
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    }
  }, []);

  const value = {
    sensors,
    latestReadings,
    alerts,
    wsStatus,
    dismissAlert,
  };

  return <AQIContext.Provider value={value}>{children}</AQIContext.Provider>;
}

export function useAQI() {
  const ctx = useContext(AQIContext);
  if (!ctx) throw new Error('useAQI must be used within AQIProvider');
  return ctx;
}
