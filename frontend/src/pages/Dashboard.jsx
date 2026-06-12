import { useState, useMemo } from 'react';
import { useAQI } from '../context/AQIContext';
import SensorCard from '../components/SensorCard';
import { Search, Filter, Clock, Radio, SlidersHorizontal } from 'lucide-react';

export default function Dashboard() {
  const { sensors, latestReadings } = useAQI();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const readingMap = useMemo(() => {
    const map = {};
    latestReadings.forEach((r) => { map[r.sensor_id] = r; });
    return map;
  }, [latestReadings]);

  const sensorList = useMemo(() => {
    let list = sensors.map((s) => ({
      ...s,
      id: s.id,
      name: s.name || s.sensor_name,
    }));

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.location_type || '').toLowerCase().includes(q)
      );
    }

    if (filterType !== 'all') {
      list = list.filter((s) => (s.location_type || '').toLowerCase() === filterType.toLowerCase());
    }

    list.sort((a, b) => {
      if (sortBy === 'aqi') {
        return (readingMap[b.id]?.aqi || 0) - (readingMap[a.id]?.aqi || 0);
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    return list;
  }, [sensors, search, filterType, sortBy, readingMap]);

  const lastUpdate = latestReadings[0]?.timestamp
    ? new Date(latestReadings[0].timestamp).toLocaleTimeString()
    : '--:--:--';

  const goodCount = latestReadings.filter((r) => r.status === 'active' && r.aqi <= 50).length;
  const modCount = latestReadings.filter((r) => r.aqi > 50 && r.aqi <= 100).length;
  const poorCount = latestReadings.filter((r) => r.aqi > 100).length;

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Live Dashboard</h1>
          <p className="section-subtitle">Real-time sensor readings across campus</p>
        </div>
        <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <Clock className="w-3.5 h-3.5 text-white/20" />
          <span className="text-[11px] text-white/25 font-medium">{lastUpdate}</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sensors..."
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all" className="bg-gray-900">All Types</option>
            <option value="indoor" className="bg-gray-900">Indoor</option>
            <option value="outdoor" className="bg-gray-900">Outdoor</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field w-auto"
          >
            <option value="name" className="bg-gray-900">Sort: Name</option>
            <option value="aqi" className="bg-gray-900">Sort: AQI ↓</option>
          </select>
        </div>
      </div>

      {/* Sensor Status Summary */}
      <div className="flex items-center gap-5 text-[11px]">
        <div className="flex items-center gap-2 text-white/25">
          <Radio className="w-3.5 h-3.5" />
          <span className="font-medium">{sensorList.length} sensors</span>
        </div>
        <div className="h-3 w-px bg-white/[0.06]" />
        <div className="flex items-center gap-2 text-white/25">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{goodCount} Good</span>
        </div>
        <div className="flex items-center gap-2 text-white/25">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>{modCount} Moderate</span>
        </div>
        <div className="flex items-center gap-2 text-white/25">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>{poorCount} Unhealthy</span>
        </div>
      </div>

      {/* Sensor Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sensorList.map((sensor, i) => (
          <div key={sensor.id} style={{ animationDelay: `${i * 0.04}s` }}>
            <SensorCard sensor={sensor} reading={readingMap[sensor.id]} />
          </div>
        ))}
      </div>

      {sensorList.length === 0 && (
        <div className="text-center py-20">
          <SlidersHorizontal className="w-10 h-10 mx-auto mb-3 text-white/10" />
          <p className="text-white/25 text-sm font-medium">No sensors match your filters</p>
          <p className="text-white/15 text-xs mt-1">Try adjusting search or filter criteria</p>
        </div>
      )}
    </div>
  );
}
