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
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  UserCheck
} from 'lucide-react';

export const LoginPage = () => {
  const { login, loginAsRole, currentUser, showToast } = useAuth();
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
    <div className="min-h-screen w-full relative flex items-center justify-center lg:justify-end overflow-hidden bg-[#45020D]">
      {/* 1. Left Office Background */}
      <div
        className="absolute inset-0 lg:w-[65%] w-full h-full bg-cover bg-left md:bg-center bg-no-repeat"
        style={{ backgroundImage: `url('./login-office.jpg')` }}
      >
        {/* Subtle warm lighting vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/30 pointer-events-none" />
      </div>

      {/* 2. Seamless Curved Gold Wave Divider (Desktop Only) */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none z-10">
        <svg
          viewBox="0 0 1000 600"
          className="w-full h-full"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="goldCurveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#DFB76C" />
              <stop offset="35%" stopColor="#F5E2A8" />
              <stop offset="70%" stopColor="#C9983E" />
              <stop offset="100%" stopColor="#8F6218" />
            </linearGradient>
            <linearGradient id="goldCurveShadow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(0,0,0,0.4)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="burgundyFill" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4A020E" />
              <stop offset="60%" stopColor="#550412" />
              <stop offset="100%" stopColor="#3E010C" />
            </linearGradient>
          </defs>

          {/* Burgundy Right Section Fill */}
          <path
            d="M 640 0 
               C 560 140, 480 270, 480 340 
               C 480 430, 440 520, 420 600 
               L 1000 600 
               L 1000 0 Z"
            fill="url(#burgundyFill)"
          />

          {/* Deep Drop Shadow along Curve */}
          <path
            d="M 638 0 
               C 558 140, 478 270, 478 340 
               C 478 430, 438 520, 418 600"
            stroke="rgba(0,0,0,0.45)"
            strokeWidth="14"
            fill="none"
          />

          {/* Main Metallic Golden Ribbon Curve */}
          <path
            d="M 640 0 
               C 560 140, 480 270, 480 340 
               C 480 430, 440 520, 420 600"
            stroke="url(#goldCurveGradient)"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />

          {/* Inner Golden Highlight Core */}
          <path
            d="M 640 0 
               C 560 140, 480 270, 480 340 
               C 480 430, 440 520, 420 600"
            stroke="#FFF4D0"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.8"
          />
        </svg>
      </div>

      {/* Mobile Dark Backdrop Overlay */}
      <div className="lg:hidden absolute inset-0 bg-[#45020D]/85 backdrop-blur-xs" />

      {/* 3. Floating Interactive White Login Card */}
      <div className="relative z-20 w-full max-w-[420px] mx-4 sm:mx-8 lg:mr-20 xl:mr-28">
        <div className="rounded-[32px] bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border border-white/40 px-8 pt-7 pb-0 overflow-hidden">
          {/* Logo & Branding */}
          <div className="text-center">
            <img
              src="./login-card-logo.png"
              alt="Rajalakshmy Associates"
              className="h-[88px] w-auto mx-auto object-contain select-none"
              onError={(e) => {
                // Fallback in case of path resolution difference
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

        {/* 4. Discreet Quick-Role Demo Helper (Floating Bar) */}
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setShowDemoRoles(!showDemoRoles)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 hover:bg-black/60 text-gold-300 text-[11px] font-bold border border-gold-400/30 backdrop-blur-sm transition shadow-sm"
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
            <div className="mt-2 p-2.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 shadow-xl grid grid-cols-2 sm:grid-cols-3 gap-1.5 animate-fade-in text-left">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleQuickRole(acc.role)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/10 text-left"
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
