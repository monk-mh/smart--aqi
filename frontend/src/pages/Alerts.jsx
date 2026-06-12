import { useAQI } from '../context/AQIContext';
import { useAuth } from '../context/AuthContext';
import { Bell, X, AlertTriangle, ShieldAlert, AlertOctagon, Clock, MapPin, Shield } from 'lucide-react';

function getSeverityConfig(severity) {
  switch (severity) {
    case 'critical':
      return {
        icon: AlertOctagon,
        className: 'alert-critical',
        badge: 'bg-red-500/15 text-red-400 border-red-500/20',
        iconColor: 'text-red-400',
      };
    case 'danger':
      return {
        icon: ShieldAlert,
        className: 'alert-danger',
        badge: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
        iconColor: 'text-orange-400',
      };
    default:
      return {
        icon: AlertTriangle,
        className: 'alert-warning',
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
        iconColor: 'text-amber-400',
      };
  }
}

function formatTime(timestamp) {
  if (!timestamp) return '--';
  const d = new Date(timestamp);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Alerts() {
  const { alerts, dismissAlert } = useAQI();
  const { user } = useAuth();
  const canDismiss = user && (user.role === 'Admin' || user.role === 'Faculty');

  const sortedAlerts = [...(alerts || [])].sort((a, b) => {
    const severityOrder = { critical: 0, danger: 1, warning: 2 };
    return (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
  });

  const criticalCount = sortedAlerts.filter((a) => a.severity === 'critical').length;
  const dangerCount = sortedAlerts.filter((a) => a.severity === 'danger').length;
  const warningCount = sortedAlerts.filter((a) => a.severity === 'warning').length;

  return (
    <div className="w-full space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Alert Center</h1>
          <p className="section-subtitle">Active air quality warnings and notifications</p>
        </div>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/15">
              {criticalCount} Critical
            </span>
          )}
          {dangerCount > 0 && (
            <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/15">
              {dangerCount} Danger
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/15">
              {warningCount} Warning
            </span>
          )}
        </div>
      </div>

      {sortedAlerts.length === 0 ? (
        <div className="glass-card-static p-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-5">
            <Shield className="w-7 h-7 text-emerald-500/40" />
          </div>
          <h3 className="text-white/40 font-semibold text-sm">All Clear</h3>
          <p className="text-white/20 text-xs mt-1.5 max-w-xs mx-auto">All sensors are reporting normal air quality levels across campus</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAlerts.map((alert, i) => {
            const { icon: Icon, className, badge, iconColor } = getSeverityConfig(alert.severity);
            return (
              <div
                key={alert.id || i}
                className={`glass-card-static ${className} rounded-xl p-5 fade-in-up`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 p-2 rounded-lg bg-white/[0.03] ${iconColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${badge}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-white/50 text-sm leading-relaxed">{alert.message}</p>
                    <div className="flex items-center gap-5 mt-3 text-[11px] text-white/20">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        {alert.sensor_name || alert.sensor_id || 'Unknown sensor'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {formatTime(alert.timestamp)}
                      </span>
                    </div>
                  </div>
                  {canDismiss && (
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="p-2 rounded-lg hover:bg-white/[0.05] text-white/15 hover:text-white/50 transition-all flex-shrink-0"
                      title="Dismiss alert"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!canDismiss && sortedAlerts.length > 0 && (
        <p className="text-white/15 text-[11px] text-center">
          Only Admin and Faculty roles can dismiss alerts
        </p>
      )}
    </div>
  );
}
