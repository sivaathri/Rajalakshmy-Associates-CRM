import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import {
  Bell,
  Search,
  ChevronDown,
  User,
  LogOut,
  CalendarCheck,
  Shield,
  Briefcase,
  PhoneCall,
  Menu,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar = ({ pageTitle, toggleSidebar }) => {
  const { currentUser, logout, loginAsRole, setShowFollowUpModal } = useAuth();
  const { customers, startCallingCustomer } = useCRM();
  const [profileOpen, setProfileOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const navigate = useNavigate();

  const roleSwitcherRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(e.target)) {
        setRoleSwitcherOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearching(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setRoleSwitcherOpen(false);
        setProfileOpen(false);
        setIsSearching(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Calculate pending follow-ups scoped for currentUser
  const pendingFollowUps = customers.filter(c => {
    if (currentUser?.role === 'RM') {
      return c.callingStatus === 'Reminder' && c.assignedTo === currentUser.id;
    }
    if (currentUser?.role === 'Sales Manager') {
      return (
        c.callingStatus === 'Reminder' &&
        (c.submittedBy === currentUser.id ||
          c.referenceFrom?.includes(currentUser.name) ||
          c.assignedTo === currentUser.id)
      );
    }
    return c.callingStatus === 'Reminder';
  });

  const handleSearch = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const filtered = customers.filter(c =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.mobile.includes(q) ||
      (c.business && c.business.toLowerCase().includes(q.toLowerCase()))
    ).slice(0, 6);
    setSearchResults(filtered);
  };

  const rolesList = ['Admin', 'Manager', 'Ops', 'RM', 'Sales Manager'];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E8E1D5] bg-white/95 px-3 sm:px-4 md:px-6 backdrop-blur shadow-sm">
      {/* Left: Hamburger & Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 hover:text-burgundy-800 transition shrink-0"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-burgundy-900 font-corporate truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-none">
            {pageTitle || 'Rajalakshmy Associates CRM'}
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block truncate">
            Corporate Financial Advisory & Field CRM Platform
          </p>
        </div>
      </div>

      {/* Middle: Universal Search (Desktop / Tablet) */}
      <div className="relative hidden md:block w-64 lg:w-96" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer name, mobile, business..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full rounded-xl border border-slate-200 bg-[#FAF6EF]/60 py-1.5 pl-9 pr-4 text-xs md:text-sm text-slate-800 placeholder-slate-400 transition focus:border-burgundy-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-burgundy-800"
          />
        </div>

        {/* Search Results Dropdown */}
        {isSearching && searchResults.length > 0 && (
          <div className="absolute left-0 mt-2 w-full rounded-xl border border-slate-200 bg-white py-2 shadow-2xl z-50">
            <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Found {searchResults.length} Contact(s)
            </div>
            {searchResults.map(c => (
              <div
                key={c.id}
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery('');
                  startCallingCustomer(c);
                }}
                className="flex items-center justify-between px-3 py-2 text-xs hover:bg-[#FAF6EF] cursor-pointer transition border-b border-slate-50 last:border-0"
              >
                <div>
                  <div className="font-semibold text-slate-800">{c.name}</div>
                  <div className="text-[11px] text-slate-500">{c.mobile} • {c.business || c.city}</div>
                </div>
                <span className="text-[10px] uppercase font-bold text-burgundy-800 bg-burgundy-50 px-2 py-0.5 rounded-full border border-burgundy-100">
                  {c.databaseType} / {c.customerType}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
        {/* Mobile Search Toggle */}
        <button
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 md:hidden"
          title="Search contacts"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Pending Follow-ups Quick Button */}
        <button
          onClick={() => setShowFollowUpModal(true)}
          className="relative flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/80 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 hover:border-amber-400 shadow-sm"
          title="View Pending Follow-ups"
        >
          <CalendarCheck className="w-4 h-4 text-amber-700" />
          <span className="hidden sm:inline">Follow-ups</span>
          {pendingFollowUps.length > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-burgundy-800 px-1.5 text-[10px] sm:text-[11px] font-bold text-white shadow">
              {pendingFollowUps.length}
            </span>
          )}
        </button>

        {/* Quick Role Switcher Pill */}
        <div className="relative" ref={roleSwitcherRef}>
          <button
            onClick={() => {
              setRoleSwitcherOpen(prev => !prev);
              setProfileOpen(false);
            }}
            className="flex items-center gap-1 rounded-xl border border-gold-300 bg-gold-50/70 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-amber-950 hover:bg-gold-100 transition shadow-sm"
            title="Switch Prototype Role"
          >
            <Shield className="w-3.5 h-3.5 text-gold-700 hidden xs:inline" />
            <span className="font-semibold hidden md:inline">Role:</span>
            <span className="font-bold text-burgundy-900 text-[11px] sm:text-xs">{currentUser?.role || 'Role'}</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
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
            className="flex items-center gap-1.5 rounded-xl p-1 hover:bg-slate-100 transition"
          >
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
              alt={currentUser?.name}
              className="w-8 h-8 rounded-full object-cover border border-gold-400 ring-2 ring-burgundy-800/10 shadow-sm shrink-0"
            />
            <div className="text-left hidden xl:block">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser?.name || 'User'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {currentUser?.id} • {currentUser?.role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl z-50">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <img
                  src={currentUser?.avatar}
                  alt={currentUser?.name}
                  className="w-10 h-10 rounded-full object-cover border border-gold-400"
                />
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
                    logout();
                    navigate('/login');
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

      {/* Mobile Floating Search Drawer */}
      {mobileSearchOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b border-slate-200 p-3 shadow-lg z-50 md:hidden animate-fade-in">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer name, phone, business..."
              value={searchQuery}
              onChange={handleSearch}
              autoFocus
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-9 text-xs focus:outline-none focus:border-burgundy-800"
            />
            <button
              onClick={() => {
                setMobileSearchOpen(false);
                setSearchQuery('');
                setIsSearching(false);
              }}
              className="absolute right-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isSearching && searchResults.length > 0 && (
            <div className="mt-2 divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {searchResults.map(c => (
                <div
                  key={c.id}
                  onClick={() => {
                    setMobileSearchOpen(false);
                    setIsSearching(false);
                    setSearchQuery('');
                    startCallingCustomer(c);
                  }}
                  className="py-2 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">{c.name}</div>
                    <div className="text-[11px] text-slate-500">{c.mobile} • {c.business || c.city}</div>
                  </div>
                  <span className="text-[10px] font-bold bg-burgundy-50 text-burgundy-800 px-2 py-0.5 rounded-full">
                    {c.databaseType}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
