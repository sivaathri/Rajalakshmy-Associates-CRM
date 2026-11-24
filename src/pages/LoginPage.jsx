import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  User,
  Shield,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Briefcase,
  Users,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';

export const LoginPage = () => {
  const { login, loginAsRole, currentUser } = useAuth();
  const [employeeId, setEmployeeId] = useState('EMP001'); // default to EMP001 (Admin Rajesh Kannan)
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleManualLogin = (e) => {
    e.preventDefault();
    setError('');
    const res = login(employeeId, password);
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

  const mockRoleAccounts = [
    {
      role: 'Admin',
      name: 'Rajesh Kannan',
      id: 'EMP001',
      desc: 'Full system privileges, case approvals, user management',
      color: 'border-burgundy-300 hover:border-burgundy-600 bg-burgundy-50/60'
    },
    {
      role: 'Manager',
      name: 'Priya Swaminathan',
      id: 'EMP002',
      desc: 'Branch & operations overview, review team activities & cases',
      color: 'border-amber-300 hover:border-amber-600 bg-amber-50/60'
    },
    {
      role: 'Ops',
      name: 'Karthik Sundaram',
      id: 'EMP003',
      desc: 'CRM database management, distribute contacts to RMs',
      color: 'border-cyan-300 hover:border-cyan-600 bg-cyan-50/60'
    },
    {
      role: 'RM',
      name: 'Ananya Subramanian',
      id: 'EMP004',
      desc: 'Relationship Manager, telecalling queue, follow-up actions',
      color: 'border-emerald-300 hover:border-emerald-600 bg-emerald-50/60'
    },
    {
      role: 'Sales Manager',
      name: 'Murugan Velu',
      id: 'EMP005',
      desc: 'Field sales tracking, lead submissions & Excel bulk import',
      color: 'border-violet-300 hover:border-violet-600 bg-violet-50/60'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF6EF] flex flex-col justify-center items-center p-4 md:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 rounded-3xl bg-white shadow-2xl border border-[#E8E1D5] overflow-hidden">
        {/* Left Side: Corporate Presentation */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#600516] via-[#79091D] to-[#42020e] p-8 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gold-400/10 blur-3xl pointer-events-none"></div>

          <div>
            {/* Logo */}
            <div className="inline-flex items-center gap-3 p-2.5 rounded-2xl bg-white shadow-xl ring-2 ring-gold-400/40 mb-6">
              <img
                src="./logo.png"
                alt="Rajalakshmy Associates"
                className="h-9 w-auto object-contain"
                onError={(e) => {
                  if (e.target.src.includes('./logo.png')) {
                    e.target.src = '/logo.png';
                  } else {
                    e.target.style.display = 'none';
                  }
                }}
              />
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight font-corporate text-white leading-tight">
              Rajalakshmy Associates
            </h1>
            <p className="text-xs uppercase tracking-widest font-semibold text-gold-300 mt-1">
              Financial Advisory & CRM Portal
            </p>

            <div className="mt-8 space-y-4 text-xs text-white/80">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-white/10 text-gold-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-white block">Telecalling & Reminder Queue</strong>
                  Focused one-at-a-time calling view with automatic follow-up reminders.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-white/10 text-gold-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-white block">Excel Bulk Import with Duplicate Guard</strong>
                  Upload field prospect sheets with automatic 10-digit validation and deduplication.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-white/10 text-gold-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-white block">Performance Disposition & KYC Vault</strong>
                  Case submission, Admin approval pipeline, KYC 1-3 documents & service history.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/10 text-[11px] text-white/60">
            Protected Prototype Environment • Tamil Nadu & Puducherry Region
          </div>
        </div>

        {/* Right Side: Form & Quick Role Selection */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-corporate">
                  Corporate Employee Login
                </h2>
                <p className="text-xs text-slate-500">
                  Enter your assigned Employee ID and password to access the workspace.
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-burgundy-900 bg-burgundy-50 border border-burgundy-200 px-2.5 py-1 rounded-full">
                Secure Access
              </span>
            </div>

            {currentUser && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Logged-In Session</span>
                  <span className="font-bold text-slate-800">{currentUser.name} ({currentUser.role} • {currentUser.id})</span>
                </div>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {error}
              </div>
            )}

            {/* Manual Form */}
            <form onSubmit={handleManualLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employee ID
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP001, EMP004"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 uppercase font-medium focus:outline-none focus:border-burgundy-800 focus:ring-1 focus:ring-burgundy-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 focus:outline-none focus:border-burgundy-800 focus:ring-1 focus:ring-burgundy-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 py-2.5 text-xs font-bold text-white shadow-lg transition"
              >
                <span>Sign In to CRM Portal</span>
                <ArrowRight className="w-4 h-4 text-gold-300" />
              </button>
            </form>
          </div>

          {/* Quick 1-Click Role Login Section */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                1-Click Quick Role Switch (For Testing & Review)
              </span>
              <Sparkles className="w-3.5 h-3.5 text-gold-600" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mockRoleAccounts.map(acc => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleQuickRole(acc.role)}
                  className={`text-left p-2.5 rounded-xl border transition shadow-sm hover:shadow ${acc.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{acc.role}</span>
                    <span className="text-[10px] font-mono font-semibold text-slate-600 bg-white/80 px-1.5 py-0.5 rounded border">
                      {acc.id}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-800 truncate mt-0.5">
                    {acc.name}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {acc.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
