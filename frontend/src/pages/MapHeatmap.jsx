import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useAQI } from '../context/AQIContext';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

function getMarkerColor(aqi) {
  if (aqi <= 50) return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#a855f7';
  return '#7f1d1d';
}

export default function MapHeatmap() {
  const { latestReadings } = useAQI();

  const markers = useMemo(() => {
    return latestReadings.filter((r) => r.lat && r.lng && r.status !== 'malfunction');
  }, [latestReadings]);

  const center = [12.9107, 74.8993];

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Campus Map</h1>
          <p className="section-subtitle">Interactive air quality map with sensor locations</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <MapPin className="w-3 h-3 text-indigo-400" />
          <span className="text-[11px] text-white/25 font-medium">{markers.length} active sensors</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-[11px]">
        {[
          { label: 'Good', range: '0-50', color: '#22c55e' },
          { label: 'Moderate', range: '51-100', color: '#eab308' },
          { label: 'Sensitive', range: '101-150', color: '#f97316' },
          { label: 'Unhealthy', range: '151+', color: '#ef4444' },
        ].map(({ label, range, color }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}50` }} />
            <span className="text-white/30 font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="glass-card-static overflow-hidden" style={{ height: 'calc(100vh - 230px)', minHeight: 400 }}>
        <MapContainer
          center={center}
          zoom={17}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          className="rounded-2xl"
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />

          {markers.map((r) => {
            const color = getMarkerColor(r.aqi);
            return (
              <CircleMarker
                key={r.sensor_id}
                center={[r.lat, r.lng]}
                radius={14}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.3,
                  color: color,
                  weight: 2,
                  opacity: 0.7,
                }}
              >
                <Popup>
                  <div style={{ minWidth: 220, fontFamily: 'Inter, sans-serif' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', letterSpacing: '-0.02em' }}>{r.sensor_name}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{r.location_type}</div>
                      </div>
                      <div style={{
                        background: color + '15',
                        border: `1px solid ${color}30`,
                        borderRadius: 10,
                        padding: '6px 12px',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontWeight: 800, fontSize: 20, color, letterSpacing: '-0.02em' }}>{r.aqi}</div>
                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>AQI</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '6px 10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Temp</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 2 }}>{r.temperature}°C</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '6px 10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Humidity</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 2 }}>{r.humidity}%</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {[
                        { label: 'PM2.5', value: r.pm25, max: 150, color: '#818cf8' },
                        { label: 'PM10', value: r.pm10, max: 250, color: '#38bdf8' },
                        { label: 'CO₂', value: r.co2, max: 2000, color: '#f472b6' },
                        { label: 'NO₂', value: r.no2, max: 200, color: '#fb923c' },
                        { label: 'SO₂', value: r.so2, max: 100, color: '#a78bfa' },
                      ].map(({ label, value, max, color: c }) => (
                        <div key={label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{label}</span>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{value}</span>
                          </div>
                          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              borderRadius: 2,
                              width: `${Math.min((value / max) * 100, 100)}%`,
                              background: c,
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
