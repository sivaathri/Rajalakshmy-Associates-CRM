import React, { useState, useMemo, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  Calendar,
  CheckCircle2,
  Search,
  Download,
  User,
  ShieldCheck,
  CalendarCheck,
  Building
} from 'lucide-react';
import { formatDateDDMMYYYY, exportToCSV } from '../utils/formatters';

export const AttendancePage = () => {
  const { attendance, punchIn } = useCRM();
  const { currentUser } = useAuth();

  // Live Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Today's formatted date strictly in DD-MM-YYYY
  const todayFormatted = useMemo(() => formatDateDDMMYYYY(currentTime), [currentTime]);

  // Check if logged-in user has punched in for today
  const userTodayPunch = useMemo(() => {
    if (!currentUser) return null;
    return attendance.find(
      a => a.employeeId === currentUser.id && a.date === todayFormatted
    );
  }, [attendance, currentUser, todayFormatted]);

  // Filters State - Strictly personal to logged-in user
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState(''); // DD-MM-YYYY search
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filtered Personal Attendance Dataset (STRICTLY logged-in user only; other users' records excluded)
  const myAttendanceRecords = useMemo(() => {
    if (!currentUser) return [];
    return attendance.filter(item => {
      // 1. Strictly show ONLY logged-in person's details
      if (item.employeeId !== currentUser.id) {
        return false;
      }

      // 2. Date filter (matches DD-MM-YYYY string)
      if (selectedDateFilter.trim()) {
        const queryDate = selectedDateFilter.trim();
        if (!item.date.includes(queryDate)) {
          return false;
        }
      }

      // 3. Search query (In-Time, Date, or Punch ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTime = item.inTime && item.inTime.toLowerCase().includes(q);
        const matchesDate = item.date && item.date.toLowerCase().includes(q);
        const matchesId = item.id && item.id.toLowerCase().includes(q);
        if (!matchesTime && !matchesDate && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [attendance, selectedDateFilter, searchQuery, currentUser]);

  // Personal statistics
  const myTotalPunchesCount = useMemo(() => {
    if (!currentUser) return 0;
    return attendance.filter(a => a.employeeId === currentUser.id).length;
  }, [attendance, currentUser]);

  const myMonthPunchesCount = useMemo(() => {
    if (!currentUser) return 0;
    // Current month-year string in MM-YYYY (e.g. "11-2026")
    const currentMonthYear = todayFormatted.slice(3); // e.g. "11-2026"
    return attendance.filter(a => a.employeeId === currentUser.id && a.date.endsWith(currentMonthYear)).length;
  }, [attendance, currentUser, todayFormatted]);

  // Pagination calculation
  const totalPages = Math.ceil(myAttendanceRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return myAttendanceRecords.slice(start, start + itemsPerPage);
  }, [myAttendanceRecords, currentPage, itemsPerPage]);

  // Handle Export CSV (Exports ONLY logged-in user's punch records)
  const handleExportCSV = () => {
    const exportData = myAttendanceRecords.map(a => ({
      'Punch ID': a.id,
      'Date (DD-MM-YYYY)': a.date,
      'Employee ID': a.employeeId,
      'Employee Name': a.employeeName,
      'Role': a.role,
      'In Time': a.inTime,
      'Status': a.status,
      'Punch Mode': a.punchMode || 'Web In-Punch'
    }));
    exportToCSV(exportData, `My_Attendance_Report_${currentUser?.id}_${todayFormatted}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-gold-300 text-xs font-bold uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>My Daily Attendance</span>
            <span>•</span>
            <span>In-Punch Only</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            {currentUser?.name} — Attendance Portal
          </h2>
          <p className="text-xs text-white/80 max-w-xl mt-1 leading-relaxed">
            Record your daily in-time arrival punch. All attendance timestamps and your personal history records are displayed strictly in <strong className="text-gold-300 font-mono">DD-MM-YYYY</strong> format.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg text-xs font-mono border border-white/10">
            <span>User ID: <strong>{currentUser?.id}</strong></span>
            <span>•</span>
            <span>Role: <strong>{currentUser?.role}</strong></span>
          </div>
        </div>

        {/* Live Clock Card */}
        <div className="rounded-2xl bg-black/40 border border-white/15 p-4 text-center min-w-[220px] shadow-inner backdrop-blur-sm self-start md:self-auto">
          <div className="text-[11px] font-bold text-gold-300 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-gold-400" />
            <span>Today (DD-MM-YYYY)</span>
          </div>
          <div className="text-xl font-extrabold text-white tracking-wider font-mono">
            {todayFormatted}
          </div>
          <div className="text-xs font-mono text-emerald-400 font-bold mt-1 bg-white/10 py-1 px-2.5 rounded-lg inline-block">
            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div className="text-[10px] text-white/60 mt-1 capitalize">
            {currentTime.toLocaleDateString('en-IN', { weekday: 'long' })}
          </div>
        </div>
      </div>

      {/* Primary Punch Action & Personal Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Punch Action Card (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border-2 border-gold-300 bg-gradient-to-br from-white via-[#FAF6EF]/60 to-gold-50/40 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gold-200">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-burgundy-900 text-gold-300">
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-corporate">
                    Your In-Time Punch
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {currentUser?.name} ({currentUser?.role})
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-burgundy-900 bg-white px-2 py-0.5 rounded border border-gold-200">
                {todayFormatted}
              </span>
            </div>

            <div className="py-6">
              {userTodayPunch ? (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-5 text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                      Punched In Successfully Today
                    </span>
                    <span className="text-2xl font-mono font-extrabold text-emerald-800 block mt-1">
                      {userTodayPunch.inTime}
                    </span>
                    <span className="text-[11px] text-emerald-700 block mt-0.5">
                      Date: <strong className="font-mono">{userTodayPunch.date}</strong> (DD-MM-YYYY)
                    </span>
                  </div>
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-sm">
                      Status: {userTodayPunch.status}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Mode: {userTodayPunch.punchMode || 'Web In-Punch'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-left">
                    <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>In-Time Punch Pending for Today</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      You haven't marked your in-time attendance punch for <strong className="font-mono">{todayFormatted}</strong> yet. Click the button below to register your in-punch.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={punchIn}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white font-extrabold text-base shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-teal-900 transition-all flex items-center justify-center gap-2.5 group transform active:scale-98"
                  >
                    <Clock className="w-5 h-5 text-emerald-200 group-hover:rotate-12 transition-transform" />
                    <span>PUNCH IN (IN TIME)</span>
                  </button>
                  <span className="text-[10px] text-slate-400 block">
                    Recorded Date Format: <strong className="font-mono text-slate-600">DD-MM-YYYY</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Terminal: Rajalakshmy CRM</span>
            <span className="font-semibold text-slate-700 font-mono">{currentUser?.id}</span>
          </div>
        </div>

        {/* Personal Stats Grid (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Today's Status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Status Today</span>
              <span className="p-2 rounded-xl bg-burgundy-50 text-burgundy-900 border border-burgundy-200">
                <User className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-xl font-extrabold text-slate-900">
                {userTodayPunch ? (
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Present
                  </span>
                ) : (
                  <span className="text-amber-700">Pending Punch</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {userTodayPunch ? `Punched in at ${userTodayPunch.inTime}` : 'Punch in to mark present'}
              </p>
            </div>
          </div>

          {/* Card 2: Formatted Today Date */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Attendance Date</span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">
                <Calendar className="w-4 h-4 text-amber-800" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-xl font-mono font-extrabold text-burgundy-900">
                {todayFormatted}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Strict Format: <span className="font-semibold text-slate-700 font-mono">DD-MM-YYYY</span>
              </p>
            </div>
          </div>

          {/* Card 3: My Month Punches */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">This Month's In-Punches</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CalendarCheck className="w-4 h-4 text-emerald-700" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900 font-mono">
                {myMonthPunchesCount} Days
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Punches logged for current month ({todayFormatted.slice(3)})
              </p>
            </div>
          </div>

          {/* Card 4: My Historical Total Punches */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">My Total Recorded Days</span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-200">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900 font-mono">
                {myTotalPunchesCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Total attendance punches for {currentUser?.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Attendance History Table Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        {/* Table Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-corporate">
              My Attendance In-Time History
            </h3>
            <p className="text-xs text-slate-500">
              Personal audit log of your in-time punches recorded in DD-MM-YYYY format
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Export My Attendance CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export My Attendance CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Search by In-Time or Punch ID */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by In-Time or Punch ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-8 pr-3 focus:outline-none focus:border-burgundy-800"
            />
          </div>

          {/* Filter by Date (DD-MM-YYYY) */}
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter Date (DD-MM-YYYY)..."
              value={selectedDateFilter}
              onChange={(e) => { setSelectedDateFilter(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-8 pr-3 font-mono focus:outline-none focus:border-burgundy-800"
            />
          </div>
        </div>

        {/* Personal Attendance Records Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
              <thead className="bg-[#FAF6EF] text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Punch ID</th>
                  <th className="px-4 py-3 font-mono">Date (DD-MM-YYYY)</th>
                  <th className="px-4 py-3">User Details</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">In Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Punch Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                      No personal attendance punch records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map(item => (
                    <tr key={item.id} className="hover:bg-[#FAF6EF]/60 transition">
                      <td className="px-4 py-3 font-mono font-bold text-burgundy-900">
                        {item.id}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 bg-amber-50/50">
                        {item.date}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.employeeName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.employeeId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {item.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-800">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{item.inTime}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{item.status || 'Present'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-medium text-[11px]">
                        {item.punchMode || 'Web In-Punch'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="flex items-center justify-between px-6 py-3 bg-[#FAF6EF]/50 border-t border-slate-200 text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-900">{myAttendanceRecords.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, myAttendanceRecords.length)}</span> of <span className="font-bold text-slate-900">{myAttendanceRecords.length}</span> records
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-semibold"
              >
                Previous
              </button>
              <span className="px-2 font-semibold text-slate-800 font-mono">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
