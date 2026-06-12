import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';
import { useAQI } from '../context/AQIContext';
import { BarChart3, Clock, Filter, Download, TrendingUp, Beaker } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const POLLUTANT_COLORS = {
  aqi: '#818cf8',
  pm25: '#f472b6',
  pm10: '#38bdf8',
  co2: '#a78bfa',
  temperature: '#fb923c',
  humidity: '#34d399',
};

const TIME_RANGES = [
  { label: '6h', value: 6 },
  { label: '12h', value: 12 },
  { label: '24h', value: 24 },
  { label: '48h', value: 48 },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#12131f]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl p-3.5 shadow-2xl text-xs" style={{ minWidth: 170 }}>
      <p className="text-white/40 mb-2.5 font-semibold text-[10px] uppercase tracking-wider">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-6 py-0.5">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-white/50">{p.name}</span>
          </span>
          <span className="text-white font-semibold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const { sensors } = useAQI();
  const [trendData, setTrendData] = useState([]);
  const [breakdownData, setBreakdownData] = useState([]);
  const [timeRange, setTimeRange] = useState(24);
  const [selectedSensor, setSelectedSensor] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/analytics/trends?hours=${timeRange}`).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`${API_BASE}/api/analytics/pollutant-breakdown`).then((r) => r.json()).catch(() => []),
    ])
      .then(([trends, breakdown]) => {
        setTrendData(trends.data || []);
        setBreakdownData(Array.isArray(breakdown) ? breakdown : []);
      })
      .finally(() => setLoading(false));
  }, [timeRange]);

  const formattedTrendData = useMemo(() => {
    return trendData.map((d) => ({
      ...d,
      time: d.timestamp?.split(' ')[1] || d.timestamp,
    }));
  }, [trendData]);

  const displayTrendData = useMemo(() => {
    return formattedTrendData;
  }, [formattedTrendData]);

  const displayBreakdownData = useMemo(() => {
    if (breakdownData.length > 0) return breakdownData;

    return [
      { sensor_name: 'Canteen', pm25: 35, pm10: 60, co2: 850, no2: 30, so2: 15 },
      { sensor_name: 'Parking', pm25: 45, pm10: 80, co2: 450, no2: 55, so2: 12 },
      { sensor_name: 'Admin Block', pm25: 12, pm10: 25, co2: 520, no2: 14, so2: 4 },
      { sensor_name: 'Academic-1', pm25: 15, pm10: 30, co2: 650, no2: 18, so2: 5 },
      { sensor_name: 'Academic-2', pm25: 16, pm10: 32, co2: 680, no2: 20, so2: 6 },
      { sensor_name: 'Academic-3', pm25: 22, pm10: 38, co2: 750, no2: 28, so2: 12 },
      { sensor_name: 'Girls Hostel', pm25: 18, pm10: 35, co2: 480, no2: 15, so2: 6 },
      { sensor_name: 'Boys Hostel', pm25: 20, pm10: 38, co2: 560, no2: 16, so2: 7 },
    ];
  }, [breakdownData]);

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title">Analytics</h1>
          <p className="section-subtitle">Historical trends and pollutant analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.02] rounded-xl border border-white/[0.05] p-0.5">
            {TIME_RANGES.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setTimeRange(value)}
                className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  timeRange === value
                    ? 'bg-indigo-500/15 text-indigo-300 shadow-sm'
                    : 'text-white/30 hover:text-white/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              window.location.href = `${API_BASE}/api/analytics/export?hours=${timeRange}`;
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-semibold transition-all bg-indigo-600/80 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
            title="Download AQI history as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* AQI Trend Chart */}
      <div className="glass-card-static p-6 lg:p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm tracking-tight">AQI & Pollutant Trends</h2>
            <p className="text-white/20 text-[11px]">Last {timeRange} hours</p>
          </div>
        </div>
        <div style={{ height: 420 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayTrendData}>
              <defs>
                <linearGradient id="aqiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pm25Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f472b6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', paddingTop: '12px' }} />
              <Area type="monotone" dataKey="aqi" stroke="#818cf8" fill="url(#aqiGrad)" strokeWidth={2} name="AQI" />
              <Area type="monotone" dataKey="pm25" stroke="#f472b6" fill="url(#pm25Grad)" strokeWidth={1.5} name="PM2.5" />
              <Line type="monotone" dataKey="temperature" stroke="#fb923c" strokeWidth={1.5} dot={false} name="Temp °C" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pollutant Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card-static p-6 lg:p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Beaker className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm tracking-tight">Pollutant Breakdown</h2>
              <p className="text-white/20 text-[11px]">By monitoring location</p>
            </div>
          </div>
          <div style={{ height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayBreakdownData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="sensor_name" stroke="rgba(255,255,255,0.15)" fontSize={9} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={55} interval={0} />
                <YAxis stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
                <Bar dataKey="pm25" fill="#f472b6" radius={[3, 3, 0, 0]} name="PM2.5" />
                <Bar dataKey="pm10" fill="#38bdf8" radius={[3, 3, 0, 0]} name="PM10" />
                <Bar dataKey="no2" fill="#fb923c" radius={[3, 3, 0, 0]} name="NO₂" />
                <Bar dataKey="so2" fill="#a78bfa" radius={[3, 3, 0, 0]} name="SO₂" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CO₂ Levels */}
        <div className="glass-card-static p-6 lg:p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm tracking-tight">CO₂ Concentration</h2>
              <p className="text-white/20 text-[11px]">Parts per million by location</p>
            </div>
          </div>
          <div style={{ height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayBreakdownData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="sensor_name" stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="co2" fill="#a78bfa" radius={[0, 4, 4, 0]} name="CO₂ (ppm)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
