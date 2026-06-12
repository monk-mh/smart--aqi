import { useAQI } from '../context/AQIContext';
import { useAuth } from '../context/AuthContext';
import AQIGauge from '../components/AQIGauge';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Map, BarChart3, Bell, TrendingUp,
  Thermometer, Droplets, Radio, AlertTriangle, Wind,
  ArrowRight, Activity, Zap,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, unit, accent }) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent} bg-opacity-10`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-white/30 text-[11px] font-medium uppercase tracking-wide">{label}</p>
        <p className="text-white text-2xl font-bold tracking-tight mt-0.5">
          {value}<span className="text-white/25 text-sm font-normal ml-1">{unit}</span>
        </p>
      </div>
    </div>
  );
}

function NavCard({ to, icon: Icon, label, description, accent }) {
  return (
    <Link
      to={to}
      className="glass-card p-5 flex items-center gap-4 group cursor-pointer"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent} transition-transform duration-300 group-hover:scale-105`}>
        <Icon className="w-5.5 h-5.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold text-sm tracking-tight">{label}</h3>
        <p className="text-white/25 text-xs mt-0.5">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-white/10 group-hover:text-white/30 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

export default function Home() {
  const { latestReadings, alerts, wsStatus } = useAQI();
  const { user } = useAuth();

  const activeReadings = latestReadings.filter((r) => r.status !== 'malfunction');
  const avgAqi = activeReadings.length
    ? Math.round(activeReadings.reduce((sum, r) => sum + (r.aqi || 0), 0) / activeReadings.length)
    : 0;
  const avgTemp = activeReadings.length
    ? (activeReadings.reduce((sum, r) => sum + (r.temperature || 0), 0) / activeReadings.length).toFixed(1)
    : '--';
  const avgHumidity = activeReadings.length
    ? Math.round(activeReadings.reduce((sum, r) => sum + (r.humidity || 0), 0) / activeReadings.length)
    : '--';
  const activeSensors = activeReadings.length;

  return (
    <div className="w-full space-y-8 pb-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">
            {user ? `Welcome, ${user.name.split(' ')[0]}` : 'Welcome'}
          </h1>
          <p className="section-subtitle">Campus air quality monitoring overview</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-500' : wsStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'}`} />
          <span className="text-[11px] text-white/25 font-medium">
            {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Reconnecting' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Hero: Campus Average AQI */}
      <div className="glass-card-static p-8 lg:p-10 flex flex-col lg:flex-row items-center gap-8">
        <AQIGauge aqi={avgAqi} size={200} strokeWidth={12} label="Campus Average" />
        <div className="flex-1 text-center lg:text-left">
          <h2 className="text-xl font-bold text-white tracking-tight mb-2">Campus Air Quality Index</h2>
          <p className="text-white/30 text-sm leading-relaxed mb-5 max-w-lg">
            Real-time aggregate reading from {activeSensors} active sensor{activeSensors !== 1 ? 's' : ''} deployed across campus monitoring zones.
          </p>
          <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
            {[
              { label: 'Good', range: '0-50', color: 'bg-emerald-500' },
              { label: 'Moderate', range: '51-100', color: 'bg-amber-500' },
              { label: 'Sensitive', range: '101-150', color: 'bg-orange-500' },
              { label: 'Unhealthy', range: '151-200', color: 'bg-red-500' },
              { label: 'Hazardous', range: '201+', color: 'bg-purple-500' },
            ].map(({ label, range, color }) => (
              <div key={range} className="flex items-center gap-2 text-[11px] text-white/30">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Radio} label="Active Sensors" value={activeSensors} unit={`/ ${latestReadings.length}`} accent="text-indigo-400 bg-indigo-500/10" />
        <StatCard icon={Thermometer} label="Avg Temperature" value={avgTemp} unit="°C" accent="text-orange-400 bg-orange-500/10" />
        <StatCard icon={Droplets} label="Avg Humidity" value={avgHumidity} unit="%" accent="text-cyan-400 bg-cyan-500/10" />
        <StatCard icon={AlertTriangle} label="Active Alerts" value={alerts?.length || 0} unit="" accent="text-red-400 bg-red-500/10" />
      </div>

      {/* Alert Ticker */}
      {alerts && alerts.length > 0 && (
        <div className="glass-card-static overflow-hidden px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-shrink-0 pr-3 border-r border-white/[0.06]">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider">Live</span>
            </div>
            <div className="overflow-hidden flex-1">
              <div className="marquee whitespace-nowrap">
                {alerts.slice(0, 5).map((a, i) => (
                  <span key={a.id || i} className="mx-6 text-sm">
                    <span className={`font-semibold ${a.severity === 'critical' ? 'text-red-400' : a.severity === 'danger' ? 'text-orange-400' : 'text-amber-400'}`}>
                      {a.severity?.toUpperCase()}
                    </span>
                    <span className="text-white/40 mx-1.5">—</span>
                    <span className="text-white/50">{a.message}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Cards */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/15 font-semibold mb-4">Quick Access</p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <NavCard to="/dashboard" icon={LayoutDashboard} label="Live Dashboard" description="Real-time sensor grid with AQI gauges" accent="bg-indigo-600" />
          <NavCard to="/map" icon={Map} label="Campus Map" description="Interactive map with sensor locations" accent="bg-emerald-600" />
          <NavCard to="/analytics" icon={BarChart3} label="Analytics" description="Historical trends and breakdowns" accent="bg-amber-600" />
          <NavCard to="/alerts" icon={Bell} label="Alert Center" description="Active warnings and notifications" accent="bg-red-600" />
          <NavCard to="/predictions" icon={TrendingUp} label="Predictions" description="AI-powered AQI forecasting" accent="bg-purple-600" />
          <NavCard to="/dashboard" icon={Activity} label="System Health" description="Sensor status and diagnostics" accent="bg-cyan-600" />
        </div>
      </div>
    </div>
  );
}
