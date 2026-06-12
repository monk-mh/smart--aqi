import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAQI } from '../context/AQIContext';
import { useAuth } from '../context/AuthContext';
import {
  Home, LayoutDashboard, Map, BarChart3, Bell, TrendingUp,
  LogOut, Wifi, WifiOff, Radio, Menu, X, Wind, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Overview' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/map', icon: Map, label: 'Campus Map' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/predictions', icon: TrendingUp, label: 'Predictions' },
];

function StatusBadge({ status }) {
  const color = status === 'connected' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-amber-500' : 'bg-red-500';
  const label = status === 'connected' ? 'Connected' : status === 'connecting' ? 'Reconnecting' : 'Offline';

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        {status === 'connected' && (
          <div className={`absolute inset-0 w-2 h-2 rounded-full ${color} animate-ping opacity-50`} />
        )}
      </div>
      <span className="text-[11px] text-white/35 font-medium">{label}</span>
    </div>
  );
}

export default function Layout() {
  const { wsStatus, alerts } = useAQI();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeAlerts = alerts?.length || 0;

  return (
    <div className="flex h-screen bg-gradient-main overflow-hidden noise-overlay">
      {/* ── Sidebar (Desktop) ──────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-white/[0.04] bg-[#090a14]/80 backdrop-blur-xl">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-white/[0.04]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/15">
            <Wind className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-[15px] tracking-tight leading-none">SmartAQ</h1>
            <p className="text-white/20 text-[9px] uppercase tracking-[0.2em] font-medium mt-0.5">Campus</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <p className="px-3 mb-2.5 text-[9px] uppercase tracking-[0.2em] text-white/15 font-semibold">Navigation</p>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/15'
                    : 'text-white/35 hover:text-white/65 hover:bg-white/[0.03] border border-transparent'
                }`
              }
            >
              <Icon className="w-[17px] h-[17px] transition-colors flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {label === 'Alerts' && activeAlerts > 0 && (
                <span className="text-[9px] font-bold bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-md">
                  {activeAlerts}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Status & User */}
        <div className="px-4 py-4 border-t border-white/[0.04] space-y-3">
          <StatusBadge status={wsStatus} />
          {user && (
            <div className="flex items-center justify-between px-1">
              <div className="min-w-0">
                <p className="text-white/50 text-xs font-medium truncate">{user.name}</p>
                <p className="text-white/20 text-[10px]">{user.role}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-white/[0.05] text-white/20 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ─────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-[#090a14]/98 backdrop-blur-2xl border-r border-white/[0.06]">
            <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <Wind className="w-5 h-5 text-indigo-400" />
                <span className="text-white font-bold text-sm">SmartAQ</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 text-white/30 hover:text-white rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="px-3 py-5 space-y-0.5">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-300'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                    }`
                  }
                >
                  <Icon className="w-[17px] h-[17px]" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Top Bar (Mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-white/[0.04] bg-[#090a14]/80 backdrop-blur-xl">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-white/50 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-indigo-400" />
            <span className="text-white font-semibold text-sm">SmartAQ</span>
          </div>
          <StatusBadge status={wsStatus} />
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
