import AQIGauge from './AQIGauge';
import { Battery, MapPin, Wifi, WifiOff, Wind } from 'lucide-react';

function getBatteryColor(pct) {
  if (pct > 60) return 'text-emerald-400';
  if (pct > 30) return 'text-amber-400';
  return 'text-red-400';
}

export default function SensorCard({ sensor, reading }) {
  const data = reading || sensor?.latest_reading;
  const aqi = data?.aqi ?? 0;
  const category = data?.aqi_category || 'Unknown';
  const status = data?.status || sensor?.status || 'unknown';
  const battery = data?.battery ?? sensor?.battery ?? 0;
  const isMalfunction = status === 'malfunction';

  return (
    <div className="glass-card p-5 flex flex-col gap-4 fade-in-up h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm leading-tight truncate tracking-tight" title={sensor?.name}>
            {sensor?.name || data?.sensor_name || 'Sensor'}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5">
            <MapPin className="w-3 h-3 text-white/25 flex-shrink-0" />
            <span className="text-white/25 text-[11px] capitalize font-medium">
              {(sensor?.location_type || data?.location_type || 'Unknown').toLowerCase()}
            </span>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider ${
          isMalfunction
            ? 'bg-red-500/10 text-red-400 border border-red-500/15'
            : 'bg-emerald-500/8 text-emerald-400/70 border border-emerald-500/10'
        }`}>
          {isMalfunction ? (
            <><WifiOff className="w-3 h-3" /> Offline</>
          ) : (
            <><Wifi className="w-3 h-3" /> Live</>
          )}
        </div>
      </div>

      {/* Gauge */}
      <div className="flex justify-center py-2">
        <AQIGauge aqi={isMalfunction ? 0 : aqi} size={120} strokeWidth={8} label={isMalfunction ? 'Offline' : undefined} />
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-[11px] mt-auto pt-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <Battery className={`w-3.5 h-3.5 ${getBatteryColor(battery)}`} />
          <span className="text-white/35 font-medium">{battery}%</span>
        </div>
        {data && !isMalfunction && (
          <div className="flex gap-3 text-white/30">
            <span>PM2.5 <strong className="text-white/60 font-semibold">{data.pm25}</strong></span>
            <span>CO₂ <strong className="text-white/60 font-semibold">{data.co2}</strong></span>
          </div>
        )}
        {isMalfunction && (
          <span className="text-red-400/60 text-[11px] font-medium">Sensor offline</span>
        )}
      </div>
    </div>
  );
}
