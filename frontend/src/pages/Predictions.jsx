import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { TrendingUp, Clock, CloudRain, Sun, Wind, ThermometerSun, Activity, Brain, Gauge } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#12131f]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl p-3.5 shadow-2xl text-xs" style={{ minWidth: 170 }}>
      <p className="text-white/40 mb-2.5 font-semibold text-[10px] uppercase tracking-wider">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-6 py-0.5">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.stroke }} />
            <span className="text-white/50">{p.name}</span>
          </span>
          <span className="text-white font-semibold">{typeof p.value === 'number' ? p.value.toFixed(1) : '--'}</span>
        </div>
      ))}
    </div>
  );
}

function WeatherCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="glass-card p-5 flex items-center gap-3.5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-white/25 text-[10px] uppercase tracking-wider font-medium">{label}</p>
        <p className="text-white font-semibold text-sm mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function Predictions() {
  const [predictionData, setPredictionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoursAhead, setHoursAhead] = useState(24);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/predictions?hours_ahead=${hoursAhead}`)
      .then((r) => r.json())
      .then((data) => setPredictionData(data))
      .catch((e) => {
        console.error("Failed to fetch predictions", e);
        setPredictionData({ data: [], model: null });
      })
      .finally(() => setLoading(false));
  }, [hoursAhead]);

  const chartData = useMemo(() => {
    if (!predictionData?.data) return [];
    return predictionData.data.map((d) => ({
      ...d,
      time: d.timestamp?.split(' ').pop()?.substring(0, 5) || d.timestamp,
      actual: d.type === 'actual' ? d.aqi : null,
      predicted: d.type === 'predicted' ? d.aqi : null,
      lower: d.lower_bound,
      upper: d.upper_bound,
      confidence: d.type === 'predicted' ? d.upper_bound - d.lower_bound : null,
    }));
  }, [predictionData]);

  const model = predictionData?.model;

  const weatherOutlook = [
    { icon: Sun, label: 'Condition', value: 'Partly Cloudy', accent: 'bg-amber-500/15 text-amber-400' },
    { icon: ThermometerSun, label: 'Forecast Temp', value: '28-34°C', accent: 'bg-orange-500/15 text-orange-400' },
    { icon: Wind, label: 'Wind Speed', value: '12 km/h', accent: 'bg-cyan-500/15 text-cyan-400' },
    { icon: CloudRain, label: 'Rain Chance', value: '15%', accent: 'bg-blue-500/15 text-blue-400' },
  ];

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title">Predictions</h1>
          <p className="section-subtitle">AI-powered AQI forecast with confidence intervals</p>
        </div>
        <div className="flex items-center bg-white/[0.02] rounded-xl border border-white/[0.05] p-0.5">
          {[12, 24, 48].map((h) => (
            <button
              key={h}
              onClick={() => setHoursAhead(h)}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                hoursAhead === h
                  ? 'bg-purple-500/15 text-purple-300 shadow-sm'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              {h}h Ahead
            </button>
          ))}
        </div>
      </div>

      {/* Weather Outlook */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {weatherOutlook.map((w) => (
          <WeatherCard key={w.label} {...w} />
        ))}
      </div>

      {/* Main Prediction Chart */}
      <div className="glass-card-static p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm tracking-tight">AQI Forecast</h2>
              <p className="text-white/20 text-[11px]">Next {hoursAhead} hours with confidence bands</p>
            </div>
          </div>
          {model && (
            <div className="hidden sm:flex items-center gap-4 text-[10px] text-white/20 font-medium">
              <span className="flex items-center gap-1.5"><Gauge className="w-3 h-3" /> R² = {model.r_squared}</span>
              <span>{(model.confidence_level * 100).toFixed(0)}% CI</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
          </div>
        ) : (
          <div style={{ height: 420 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', paddingTop: '12px' }} />

                <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confidenceGrad)" name="Upper Bound" stackId="confidence" />
                <Area type="monotone" dataKey="lower" stroke="none" fill="transparent" name="Lower Bound" stackId="confidence" />

                <Area type="monotone" dataKey="actual" stroke="#818cf8" fill="url(#actualGrad)" strokeWidth={2.5} dot={false} name="Actual AQI" connectNulls={false} />
                <Line type="monotone" dataKey="predicted" stroke="#a78bfa" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Predicted AQI" connectNulls={false} />

                <ReferenceLine y={100} stroke="rgba(234, 179, 8, 0.25)" strokeDasharray="3 3" label={{ value: 'Moderate', fill: 'rgba(234,179,8,0.35)', fontSize: 9, position: 'insideTopRight' }} />
                <ReferenceLine y={150} stroke="rgba(239, 68, 68, 0.25)" strokeDasharray="3 3" label={{ value: 'Unhealthy', fill: 'rgba(239,68,68,0.35)', fontSize: 9, position: 'insideTopRight' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Model Info */}
      {model && (
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-white/25 text-[10px] uppercase tracking-wider font-semibold">Model Trend</p>
            </div>
            <p className="text-white font-bold text-xl tracking-tight">
              {model.slope > 0 ? '↗' : model.slope < 0 ? '↘' : '→'}{' '}
              {model.slope > 0 ? 'Rising' : model.slope < 0 ? 'Falling' : 'Stable'}
            </p>
            <p className="text-white/20 text-xs mt-1">Slope: {model.slope}/hr</p>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-white/25 text-[10px] uppercase tracking-wider font-semibold">Baseline AQI</p>
            </div>
            <p className="text-white font-bold text-xl tracking-tight">{model.intercept}</p>
            <p className="text-white/20 text-xs mt-1">Linear intercept value</p>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-white/25 text-[10px] uppercase tracking-wider font-semibold">Model Fit (R²)</p>
            </div>
            <p className="text-white font-bold text-xl tracking-tight">{(model.r_squared * 100).toFixed(1)}%</p>
            <p className="text-white/20 text-xs mt-1">Variance explained</p>
          </div>
        </div>
      )}
    </div>
  );
}
