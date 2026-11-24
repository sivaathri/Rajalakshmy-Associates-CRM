import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const LoginPage = () => {
  const { login, loginAsRole, showToast } = useAuth();
  const [username, setUsername] = useState('EMP001');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [showDemoRoles, setShowDemoRoles] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    const res = login(username, password);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message);
    }
  };

  const handleQuickRole = (roleName) => {
    const user = loginAsRole(roleName);
    if (user) {
      navigate('/dashboard');
    }
  };

  const demoAccounts = [
    { role: 'Admin', name: 'Rajesh Kannan', id: 'EMP001', tag: 'Full Privileges' },
    { role: 'Manager', name: 'Priya Swaminathan', id: 'EMP002', tag: 'Branch Review' },
    { role: 'Ops', name: 'Karthik Sundaram', id: 'EMP003', tag: 'Database Ops' },
    { role: 'RM', name: 'Ananya Subramanian', id: 'EMP004', tag: 'Telecalling RM' },
    { role: 'Sales Manager', name: 'Murugan Velu', id: 'EMP005', tag: 'Field Sourcing' }
  ];

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden bg-gradient-to-br from-[#6A081A] via-[#520412] to-[#3A010A]">
      {/* Decorative Warm Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gold-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-burgundy-800/20 blur-3xl pointer-events-none" />

      {/* Floating Interactive White Login Card */}
      <div className="relative z-20 w-full max-w-[420px]">
        <div className="rounded-[32px] bg-white shadow-[0_30px_70px_rgba(0,0,0,0.5)] border border-white/40 px-8 pt-8 pb-0 overflow-hidden">
          {/* Logo & Branding */}
          <div className="text-center">
            <img
              src="./login-card-logo.png"
              alt="Rajalakshmy Associates"
              className="h-[88px] w-auto mx-auto object-contain select-none"
              onError={(e) => {
                if (!e.target.src.includes('/login-card-logo.png')) {
                  e.target.src = '/login-card-logo.png';
                }
              }}
            />
            <p className="text-[13px] font-semibold text-slate-500 text-center tracking-wide -mt-1 mb-6">
              Business Management System
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            {/* Username or Email Input */}
            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="Username or Email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs rounded-2xl border border-slate-200 py-3.5 pl-11 pr-4 font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5C0617] focus:ring-2 focus:ring-[#5C0617]/15 transition shadow-xs"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs rounded-2xl border border-slate-200 py-3.5 pl-11 pr-11 font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5C0617] focus:ring-2 focus:ring-[#5C0617]/15 transition shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 text-slate-600 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[#5C0617] focus:ring-[#5C0617] border-slate-300 accent-[#5C0617]"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() =>
                  showToast('Password reset link sent to your corporate email address.', 'info')
                }
                className="font-bold text-[#5C0617] hover:underline transition"
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#5C0617] hover:bg-[#480310] active:scale-[0.99] text-white py-3.5 text-xs font-bold shadow-lg transition duration-200 cursor-pointer mt-1"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          </form>

          {/* Bottom Heritage Skyline Illustration */}
          <div className="mt-5 -mx-8 overflow-hidden rounded-b-[32px] pointer-events-none select-none">
            <img
              src="./login-illustration.png"
              alt="Heritage Architecture"
              className="w-full h-auto object-cover object-bottom block"
              onError={(e) => {
                if (!e.target.src.includes('/login-illustration.png')) {
                  e.target.src = '/login-illustration.png';
                }
              }}
            />
          </div>
        </div>

        {/* Discreet Quick-Role Demo Helper */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowDemoRoles(!showDemoRoles)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-gold-300 text-[11px] font-bold border border-gold-400/30 backdrop-blur-sm transition shadow-sm"
          >
            <Sparkles className="w-3 h-3 text-gold-400" />
            <span>1-Click Demo Accounts</span>
            {showDemoRoles ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {showDemoRoles && (
            <div className="mt-2.5 p-3 rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 shadow-2xl grid grid-cols-2 sm:grid-cols-3 gap-2 animate-fade-in text-left">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleQuickRole(acc.role)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/10 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gold-300">{acc.role}</span>
                    <span className="text-[9px] font-mono bg-white/20 px-1 rounded">{acc.id}</span>
                  </div>
                  <div className="text-[10px] text-white/90 truncate font-medium mt-0.5">
                    {acc.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
