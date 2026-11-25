import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  ChevronDown,
  User,
  LogOut,
  Shield,
  Briefcase,
  PhoneCall,
  Menu,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar = ({ pageTitle, toggleSidebar, isSidebarOpen }) => {
  const { currentUser, logout, confirmAndLogout, loginAsRole } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const navigate = useNavigate();

  const roleSwitcherRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(e.target)) {
        setRoleSwitcherOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setRoleSwitcherOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const rolesList = ['Admin', 'Manager', 'Ops', 'RM', 'Sales Manager'];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-burgundy-950/40 bg-gradient-to-r from-[#600516] via-[#79091D] to-[#45020F] text-white px-3 sm:px-4 md:px-6 shadow-md">
      {/* Left: Page Title */}
      <div className="flex items-center min-w-0">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white font-corporate truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-none">
            {pageTitle || 'Rajalakshmy Associates CRM'}
          </h1>
         
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
        {/* Quick Role Switcher Pill */}
        <div className="relative" ref={roleSwitcherRef}>
          <button
            onClick={() => {
              setRoleSwitcherOpen(prev => !prev);
              setProfileOpen(false);
            }}
            className="flex items-center gap-1 rounded-xl border border-white/25 bg-white/10 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition shadow-sm"
            title="Switch Prototype Role"
          >
            <Shield className="w-3.5 h-3.5 text-gold-300 hidden xs:inline" />
            <span className="font-semibold text-white/80 hidden md:inline">Role:</span>
            <span className="font-bold text-white text-[11px] sm:text-xs">{currentUser?.role || 'Role'}</span>
            <ChevronDown className="w-3 h-3 text-white/80" />
          </button>

          {roleSwitcherOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-2xl z-50 animate-fade-in">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Switch Role Prototype
              </div>
              {rolesList.map(r => (
                <button
                  key={r}
                  onClick={() => {
                    loginAsRole(r);
                    setRoleSwitcherOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-xs text-left transition ${
                    currentUser?.role === r
                      ? 'bg-burgundy-50 font-bold text-burgundy-900'
                      : 'text-slate-700 hover:bg-[#FAF6EF]'
                  }`}
                >
                  <span>{r}</span>
                  {currentUser?.role === r && (
                    <span className="h-1.5 w-1.5 rounded-full bg-burgundy-800"></span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setProfileOpen(prev => !prev);
              setRoleSwitcherOpen(false);
            }}
            className="flex items-center gap-1.5 rounded-xl p-1 hover:bg-white/10 transition"
          >
            <div className="w-8 h-8 rounded-full bg-white/15 text-gold-300 font-bold flex items-center justify-center border border-gold-400/80 ring-2 ring-white/10 shadow-sm shrink-0">
              <User className="w-4 h-4 text-gold-300" />
            </div>
            <div className="text-left hidden xl:block">
              <div className="text-xs font-bold text-white leading-tight">
                {currentUser?.name || 'User'}
              </div>
              <div className="text-[10px] text-white/75 font-medium">
                {currentUser?.id} • {currentUser?.role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-white/80 hidden xl:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl z-50">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-burgundy-900 text-gold-300 font-bold flex items-center justify-center border border-gold-400 shadow-sm shrink-0">
                  <User className="w-5 h-5 text-gold-300" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{currentUser?.name}</div>
                  <div className="text-xs text-slate-500">{currentUser?.id} • {currentUser?.department}</div>
                  <span className="inline-block mt-1 text-[10px] font-bold text-burgundy-900 bg-burgundy-50 border border-burgundy-200 px-2 py-0.5 rounded-full">
                    {currentUser?.role}
                  </span>
                </div>
              </div>

              <div className="py-2 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-2 text-[11px]">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{currentUser?.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentUser?.mobile}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    confirmAndLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
