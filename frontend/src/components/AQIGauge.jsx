import { useMemo } from 'react';

const CIRCUMFERENCE = 2 * Math.PI * 45; // radius 45

function getAQIColor(aqi) {
  if (aqi <= 50) return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#a855f7';
  return '#7f1d1d';
}

function getAQICategory(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Sensitive';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

export default function AQIGauge({ aqi = 0, size = 140, strokeWidth = 8, label }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = getAQIColor(aqi);
  const category = getAQICategory(aqi);
  const progress = Math.min(aqi / 500, 1);
  const offset = circumference - progress * circumference;

  const glowFilter = useMemo(() => {
    return `drop-shadow(0 0 8px ${color}80) drop-shadow(0 0 16px ${color}40)`;
  }, [color]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Foreground arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease',
            filter: glowFilter,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold tracking-tight"
          style={{ fontSize: size * 0.24, color }}
        >
          {aqi}
        </span>
        <span className="text-white/50 font-medium" style={{ fontSize: size * 0.09 }}>
          {label || category}
        </span>
      </div>
    </div>
  );
}
