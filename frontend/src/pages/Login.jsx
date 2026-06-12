import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Wind, Eye, EyeOff, LogIn, UserPlus, AlertCircle, Shield, GraduationCap, User } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(form.name, form.email, form.password, form.role);
      } else {
        await login(form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (email, password) => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-login flex noise-overlay">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[400px] h-[400px] bg-purple-600/6 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Wind className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight leading-none">SmartAQ</h1>
              <p className="text-white/25 text-[10px] uppercase tracking-[0.2em] font-medium">Campus Platform</p>
            </div>
          </div>

          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
            Monitor your
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">campus air</span>
            <br />
            in real-time.
          </h2>
          <p className="text-white/30 text-sm mt-6 leading-relaxed max-w-md">
            Enterprise-grade IoT monitoring with live sensor data,
            predictive analytics, and intelligent alerts across
            8 campus zones.
          </p>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-6 text-xs text-white/20">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>8 Live Sensors</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>Real-time Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span>AI Predictions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-[420px] fade-in-up">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 mb-5">
              <Wind className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">SmartAQ Campus</h1>
            <p className="text-white/30 text-xs mt-1">Air Quality Monitoring Platform</p>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {isRegister ? 'Create account' : 'Welcome back'}
            </h2>
            <p className="text-white/30 text-sm mt-1.5">
              {isRegister ? 'Set up your monitoring dashboard' : 'Sign in to your monitoring dashboard'}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 mb-6 rounded-xl bg-red-500/8 border border-red-500/15">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-red-300/90 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-white/40 text-xs font-medium mb-2 tracking-wide">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Enter your name"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-white/40 text-xs font-medium mb-2 tracking-wide">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                placeholder="you@smartaq.edu"
                required
              />
            </div>

            <div>
              <label className="block text-white/40 text-xs font-medium mb-2 tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field !pr-11"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-white/40 text-xs font-medium mb-2 tracking-wide">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="input-field"
                >
                  <option value="Student" className="bg-gray-900">Student</option>
                  <option value="Faculty" className="bg-gray-900">Faculty</option>
                  <option value="Admin" className="bg-gray-900">Admin</option>
                </select>
              </div>
            )}

            <div className="pt-1">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isRegister ? (
                  <><UserPlus className="w-4 h-4" /> Create Account</>
                ) : (
                  <><LogIn className="w-4 h-4" /> Sign In</>
                )}
              </button>
            </div>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-white/25 text-xs hover:text-white/50 transition-colors"
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>

          {/* Quick Login */}
          {!isRegister && (
            <div className="mt-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/6" />
                <span className="text-white/20 text-[10px] uppercase tracking-[0.15em] font-medium">Quick Access</span>
                <div className="flex-1 h-px bg-white/6" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Admin', icon: Shield, email: 'admin@smartaq.edu', pw: 'admin123', accent: 'text-rose-400', bg: 'hover:bg-rose-500/8 border-rose-500/10' },
                  { label: 'Faculty', icon: User, email: 'faculty@smartaq.edu', pw: 'faculty123', accent: 'text-amber-400', bg: 'hover:bg-amber-500/8 border-amber-500/10' },
                  { label: 'Student', icon: GraduationCap, email: 'student@smartaq.edu', pw: 'student123', accent: 'text-emerald-400', bg: 'hover:bg-emerald-500/8 border-emerald-500/10' },
                ].map(({ label, icon: Icon, email, pw, accent, bg }) => (
                  <button
                    key={label}
                    onClick={() => quickLogin(email, pw)}
                    disabled={loading}
                    className={`flex flex-col items-center gap-2 py-3.5 rounded-xl bg-white/[0.02] border ${bg} text-white/50 text-xs font-medium hover:text-white/80 transition-all disabled:opacity-40`}
                  >
                    <Icon className={`w-4 h-4 ${accent}`} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
