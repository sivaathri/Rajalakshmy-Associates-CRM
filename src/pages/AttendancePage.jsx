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
  Building,
  History,
  Plus,
  X,
  Check,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Filter,
  Users
} from 'lucide-react';
import { formatDateDDMMYYYY, formatDate, exportToCSV } from '../utils/formatters';

export const AttendancePage = () => {
  const { attendance, punchIn, leaves = [], requestLeave, approveLeave, rejectLeave } = useCRM();
  const { currentUser, showToast } = useAuth();

  // Top Tab Switcher: 'attendance' vs 'leaves'
  const [activeTab, setActiveTab] = useState('attendance');

  // Live Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if logged-in user is Admin / Manager for approvals
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

  // Today's formatted date strictly in DD-MM-YYYY
  const todayFormatted = useMemo(() => formatDateDDMMYYYY(currentTime), [currentTime]);
  const todayIso = new Date().toISOString().split('T')[0];

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
      if (item.employeeId !== currentUser.id) {
        return false;
      }
      if (selectedDateFilter.trim()) {
        const queryDate = selectedDateFilter.trim();
        if (!item.date.includes(queryDate)) {
          return false;
        }
      }
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
    const currentMonthYear = todayFormatted.slice(3); // e.g. "11-2026"
    return attendance.filter(a => a.employeeId === currentUser.id && a.date.endsWith(currentMonthYear)).length;
  }, [attendance, currentUser, todayFormatted]);

  // Pagination calculation
  const totalPages = Math.ceil(myAttendanceRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return myAttendanceRecords.slice(start, start + itemsPerPage);
  }, [myAttendanceRecords, currentPage, itemsPerPage]);

  // ----------------------------------------------------
  // LEAVE MANAGEMENT STATE & FILTERS
  // ----------------------------------------------------
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [rejectingLeave, setRejectingLeave] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState('');

  // Request Leave Form Inputs
  const [leaveType, setLeaveType] = useState('Casual Leave (CL)');
  const [leaveStartDate, setLeaveStartDate] = useState(todayIso);
  const [leaveEndDate, setLeaveEndDate] = useState(todayIso);
  const [leaveDaysCount, setLeaveDaysCount] = useState(1);
  const [leaveReason, setLeaveReason] = useState('');

  // Auto-calculate days count between start and end date
  const handleStartDateChange = (val) => {
    setLeaveStartDate(val);
    if (leaveEndDate < val) {
      setLeaveEndDate(val);
      setLeaveDaysCount(1);
    } else {
      const diff = Math.max(1, Math.round((new Date(leaveEndDate) - new Date(val)) / (1000 * 60 * 60 * 24)) + 1);
      setLeaveDaysCount(isNaN(diff) ? 1 : diff);
    }
  };

  const handleEndDateChange = (val) => {
    setLeaveEndDate(val);
    const diff = Math.max(1, Math.round((new Date(val) - new Date(leaveStartDate)) / (1000 * 60 * 60 * 24)) + 1);
    setLeaveDaysCount(isNaN(diff) ? 1 : diff);
  };

  // Submit Leave Requisition
  const handleSubmitLeaveRequest = (e) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      showToast('Please specify the reason for your leave request.', 'error');
      return;
    }

    requestLeave({
      leaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      daysCount: leaveDaysCount,
      reason: leaveReason
    });

    setShowRequestModal(false);
    setLeaveReason('');
    setLeaveType('Casual Leave (CL)');
  };

  // Leave filters
  const [adminStatusFilter, setAdminStatusFilter] = useState('All');
  const [leaveSearch, setLeaveSearch] = useState('');

  // Pending leaves count for admin badge
  const pendingLeavesAdminCount = useMemo(() => {
    return leaves.filter(l => l.status === 'Pending Approval').length;
  }, [leaves]);

  // Personal leaves for current user
  const myLeaves = useMemo(() => {
    if (!currentUser) return [];
    return leaves.filter(l => l.employeeId === currentUser.id);
  }, [leaves, currentUser]);

  // Admin view: all employee leaves
  const filteredAdminLeaves = useMemo(() => {
    return leaves.filter(l => {
      if (adminStatusFilter !== 'All' && l.status !== adminStatusFilter) return false;
      if (leaveSearch.trim()) {
        const q = leaveSearch.toLowerCase();
        const matchesName = l.employeeName?.toLowerCase().includes(q);
        const matchesEmpId = l.employeeId?.toLowerCase().includes(q);
        const matchesType = l.leaveType?.toLowerCase().includes(q);
        const matchesReason = l.reason?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmpId && !matchesType && !matchesReason) return false;
      }
      return true;
    });
  }, [leaves, adminStatusFilter, leaveSearch]);

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
            <span>Attendance & Leave Portal</span>
            <span>•</span>
            <span>Rajalakshmy Associates</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            {currentUser?.name} — Attendance & Leave Desk
          </h2>
          <p className="text-xs text-white/80 max-w-xl mt-1 leading-relaxed">
            Record your daily in-time arrival punch and manage your leave requisitions. All timestamps and history logs are maintained in <strong className="text-gold-300 font-mono">DD-MM-YYYY</strong> corporate standards.
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

      {/* TOP TAB NAVIGATION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          {/* Tab 1: Daily In-Punch & History */}
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs ${
              activeTab === 'attendance'
                ? 'bg-burgundy-900 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <History className="w-4 h-4 text-gold-300" />
            <span>Daily In-Punch & History</span>
          </button>

          {/* Tab 2: Leave Management & Approvals */}
          <button
            type="button"
            onClick={() => setActiveTab('leaves')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs relative ${
              activeTab === 'leaves'
                ? 'bg-burgundy-900 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-emerald-300" />
            <span>Leave Management & Approvals</span>
            {isAdmin && pendingLeavesAdminCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 animate-pulse">
                {pendingLeavesAdminCount}
              </span>
            )}
          </button>
        </div>

        {/* Action Button: Apply Leave (Opens modal directly) */}
        <button
          type="button"
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Request Leave</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: DAILY IN-PUNCH & HISTORY                      */}
      {/* ==================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
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
                  <div className="text-lg font-bold text-slate-900">
                    {userTodayPunch ? 'Present (In-Time)' : 'Pending In-Punch'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {userTodayPunch ? `Punched at ${userTodayPunch.inTime}` : 'Punch required before start of business day'}
                  </p>
                </div>
              </div>

              {/* Card 2: This Month's Punches */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">This Month Punches</span>
                  <span className="p-2 rounded-xl bg-gold-50 text-gold-900 border border-gold-200">
                    <Calendar className="w-4 h-4 text-gold-700" />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-extrabold text-slate-900 font-mono">
                    {myMonthPunchesCount} <span className="text-xs font-normal text-slate-500">days</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Marked for current calendar month
                  </p>
                </div>
              </div>

              {/* Card 3: Approved Leaves */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">My Leave Days Approved</span>
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CalendarCheck className="w-4 h-4 text-emerald-700" />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-extrabold text-emerald-900 font-mono">
                    {myLeaves.filter(l => l.status === 'Approved').reduce((acc, c) => acc + (c.daysCount || 1), 0)} <span className="text-xs font-normal text-slate-500">days</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Total authorized leave taken this year
                  </p>
                </div>
              </div>

              {/* Card 4: Total Recorded Days */}
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
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-burgundy-50 text-burgundy-900">
                  <History className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-corporate">
                    My Attendance In-Time History
                  </h3>
                  <p className="text-xs text-slate-500">
                    Personal audit log of your in-time punches recorded in DD-MM-YYYY format
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
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
                      <th className="px-4 py-3 font-mono">In Time</th>
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
      )}

      {/* ==================================================== */}
      {/* TAB 2: LEAVE MANAGEMENT & APPROVALS                  */}
      {/* ==================================================== */}
      {activeTab === 'leaves' && (
        <div className="space-y-6">
          {/* Quick Metrics for Leaves */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">My Submitted Applications</span>
              <span className="text-2xl font-black text-slate-900">{myLeaves.length}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Total requests recorded</span>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">My Pending Requests</span>
              <span className="text-2xl font-black text-amber-900">
                {myLeaves.filter(l => l.status === 'Pending Approval').length}
              </span>
              <span className="text-[10px] text-amber-700 block mt-1 font-semibold">Waiting for Admin approval</span>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">My Approved Days</span>
              <span className="text-2xl font-black text-emerald-900">
                {myLeaves.filter(l => l.status === 'Approved').reduce((acc, c) => acc + (c.daysCount || 1), 0)}
              </span>
              <span className="text-[10px] text-emerald-700 block mt-1 font-semibold">Days sanctioned</span>
            </div>

            {isAdmin ? (
              <div className="rounded-2xl border-2 border-gold-300 bg-gradient-to-br from-white via-gold-50/30 to-[#FAF6EF] p-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-burgundy-900 block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Admin Pending Action
                </span>
                <span className="text-2xl font-black text-burgundy-900">{pendingLeavesAdminCount}</span>
                <span className="text-[10px] text-burgundy-800 font-semibold block mt-1">
                  Requisitions across company
                </span>
              </div>
            ) : (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-rose-800 block">My Rejected Requests</span>
                <span className="text-2xl font-black text-rose-900">
                  {myLeaves.filter(l => l.status === 'Rejected').length}
                </span>
                <span className="text-[10px] text-rose-700 block mt-1">Declined with remarks</span>
              </div>
            )}
          </div>

          {/* ADMIN APPROVAL CONSOLE (Req: "admin action show the users of who raise the leave") */}
          {isAdmin && (
            <div className="rounded-2xl border-2 border-burgundy-900/30 bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-burgundy-900 text-gold-300">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 font-corporate flex items-center gap-2">
                      <span>Admin Leave Approval Console</span>
                      {pendingLeavesAdminCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                          {pendingLeavesAdminCount} Action Required
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Review requisitions raised by employees, verify reasoning, and approve or reject with comments
                    </p>
                  </div>
                </div>

                {/* Status Filter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {['All', 'Pending Approval', 'Approved', 'Rejected'].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setAdminStatusFilter(status)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        adminStatusFilter === status
                          ? status === 'Pending Approval'
                            ? 'bg-amber-500 text-amber-950 font-black shadow-xs ring-2 ring-amber-400/40'
                            : 'bg-burgundy-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Employee Name, ID, Leave Type, or Reason..."
                  value={leaveSearch}
                  onChange={(e) => setLeaveSearch(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              {/* Admin Leaves Table Showing WHO Raised the Leave */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
                    <thead className="bg-[#FAF6EF] text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Leave ID & Applied Date</th>
                        <th className="px-4 py-3">Raised By (User Details)</th>
                        <th className="px-4 py-3">Leave Type</th>
                        <th className="px-4 py-3">Duration & Dates</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Admin Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAdminLeaves.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                            No leave applications found matching current criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredAdminLeaves.map(leave => {
                          const isPending = leave.status === 'Pending Approval';
                          return (
                            <tr key={leave.id} className={`hover:bg-slate-50/80 transition ${
                              isPending ? 'bg-amber-50/30' : ''
                            }`}>
                              {/* Leave ID & Applied Date */}
                              <td className="px-4 py-3 font-mono">
                                <span className="font-bold text-burgundy-900 block">{leave.id}</span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Applied: {formatDate(leave.requestedAt)}</span>
                              </td>

                              {/* Raised By (Req: "show the users of who raise the leave") */}
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-burgundy-800" />
                                  <span>{leave.employeeName}</span>
                                </div>
                                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                                  ID: {leave.employeeId} • <span className="font-semibold text-slate-700">{leave.employeeRole}</span>
                                </div>
                              </td>

                              {/* Leave Type */}
                              <td className="px-4 py-3 font-semibold text-slate-800">
                                {leave.leaveType}
                              </td>

                              {/* Duration & Dates */}
                              <td className="px-4 py-3">
                                <div className="font-mono font-bold text-slate-900">
                                  {formatDate(leave.startDate)} {leave.endDate !== leave.startDate ? `to ${formatDate(leave.endDate)}` : ''}
                                </div>
                                <div className="text-[11px] font-bold text-emerald-800 mt-0.5">
                                  {leave.daysCount} Day{leave.daysCount > 1 ? 's' : ''}
                                </div>
                              </td>

                              {/* Reason */}
                              <td className="px-4 py-3 max-w-xs">
                                <p className="text-xs text-slate-700 leading-snug" title={leave.reason}>
                                  {leave.reason}
                                </p>
                                {leave.actionRemarks && (
                                  <div className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-100">
                                    <strong>Admin Note:</strong> {leave.actionRemarks} ({leave.actionedBy})
                                  </div>
                                )}
                              </td>

                              {/* Status */}
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  leave.status === 'Approved'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : leave.status === 'Rejected'
                                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                                    : 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                                }`}>
                                  {leave.status === 'Approved' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                  {leave.status === 'Rejected' && <XCircle className="w-3 h-3 text-rose-600" />}
                                  {leave.status === 'Pending Approval' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                                  <span>{leave.status}</span>
                                </span>
                              </td>

                              {/* Admin Action */}
                              <td className="px-4 py-3 text-right">
                                {isPending ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => approveLeave(leave.id)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-[11px] font-bold text-white shadow-xs transition flex items-center gap-1"
                                      title="Approve Leave Requisition"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRejectingLeave(leave);
                                        setRejectRemarks('');
                                      }}
                                      className="px-2 py-1 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-semibold transition flex items-center gap-1"
                                      title="Reject Leave Requisition"
                                    >
                                      <X className="w-3 h-3" />
                                      <span>Reject</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-medium italic">
                                    Actioned ({leave.actionedAt || 'Done'})
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MY PERSONAL LEAVE APPLICATIONS TABLE */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-800">
                  <CalendarCheck className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-corporate">
                    My Personal Leave Applications
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track the approval progress of your leave requests submitted to management
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-burgundy-900 hover:bg-burgundy-950 text-white text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5 text-gold-300" />
                <span>+ New Leave Request</span>
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
                  <thead className="bg-[#FAF6EF] text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Leave ID</th>
                      <th className="px-4 py-3">Leave Type</th>
                      <th className="px-4 py-3">Dates & Days</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Application Status</th>
                      <th className="px-4 py-3">Admin Response</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myLeaves.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                          You haven't submitted any leave applications yet. Click "Request Leave" above to apply.
                        </td>
                      </tr>
                    ) : (
                      myLeaves.map(leave => (
                        <tr key={leave.id} className="hover:bg-[#FAF6EF]/60 transition">
                          <td className="px-4 py-3 font-mono font-bold text-burgundy-900">
                            {leave.id}
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {formatDate(leave.requestedAt)}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {leave.leaveType}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-mono text-slate-900">
                              {formatDate(leave.startDate)} {leave.endDate !== leave.startDate ? `to ${formatDate(leave.endDate)}` : ''}
                            </div>
                            <span className="text-[10px] font-bold text-emerald-800">
                              {leave.daysCount} Day{leave.daysCount > 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 max-w-xs">
                            {leave.reason}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              leave.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : leave.status === 'Rejected'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-amber-50 text-amber-900 border-amber-300'
                            }`}>
                              {leave.status === 'Approved' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {leave.status === 'Rejected' && <XCircle className="w-3 h-3 text-rose-600" />}
                              {leave.status === 'Pending Approval' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                              <span>{leave.status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-600">
                            {leave.actionRemarks ? (
                              <div>
                                <span className="font-semibold text-slate-800">"{leave.actionRemarks}"</span>
                                <span className="text-[10px] text-slate-400 block">by {leave.actionedBy}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Waiting for Admin review</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: REQUEST LEAVE APPLICATION                   */}
      {/* ==================================================== */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-950 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-gold-300" />
                <h3 className="text-base font-bold text-white font-corporate">Request Leave Application</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="p-1 rounded-lg text-white/80 hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLeaveRequest} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 mb-0.5">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span>Leave Policy Notice</span>
                </div>
                Your application will be marked as <strong>Waiting for Admin Approval</strong>. You will receive real-time notification once approved.
              </div>

              {/* Leave Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Leave Type *
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-burgundy-800 bg-white"
                >
                  <option value="Casual Leave (CL)">Casual Leave (CL)</option>
                  <option value="Sick Leave (SL)">Sick Leave (SL)</option>
                  <option value="Earned / Privilege Leave (PL)">Earned / Privilege Leave (PL)</option>
                  <option value="Compensatory Off (Comp-Off)">Compensatory Off (Comp-Off)</option>
                  <option value="Emergency Personal Leave">Emergency Personal Leave</option>
                  <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
                </select>
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-burgundy-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
              </div>

              {/* Number of Days */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Total Leave Days *
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={leaveDaysCount}
                  onChange={(e) => setLeaveDaysCount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-burgundy-800 font-bold"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Reason for Leave *
                </label>
                <textarea
                  required
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Specify clear reason for leave requisition..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-burgundy-900 hover:bg-burgundy-950 text-white font-bold transition shadow-sm"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: ADMIN REJECT LEAVE REASON MODAL             */}
      {/* ==================================================== */}
      {rejectingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-rose-700 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-200" />
                <h3 className="text-base font-bold text-white">Decline Leave Requisition</h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingLeave(null)}
                className="p-1 rounded-lg text-white/80 hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900">
                <p className="font-semibold">
                  Declining leave request <strong>{rejectingLeave.id}</strong> submitted by <strong>{rejectingLeave.employeeName}</strong> ({rejectingLeave.daysCount} day(s)).
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  placeholder="Enter specific managerial reason for rejection (e.g. Critical deployment, insufficient coverage)..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingLeave(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    rejectLeave(rejectingLeave.id, rejectRemarks);
                    setRejectingLeave(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold transition shadow-sm"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
