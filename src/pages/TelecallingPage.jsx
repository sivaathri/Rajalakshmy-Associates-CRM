import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  PhoneCall,
  Clock,
  CalendarCheck,
  CheckCircle2,
  PhoneMissed,
  XCircle,
  CalendarClock,
  Filter,
  User,
  Building,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Calendar,
  Layers,
  History,
  TrendingUp
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { formatDate, formatDateTime, getStatusBadgeClass, exportToCSV } from '../utils/formatters';

export const TelecallingPage = () => {
  const { customers, calls, startCallingCustomer } = useCRM();
  const { currentUser } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState('focused'); // 'focused' | 'queue' | 'history' | 'analytics'
  const [queueFilter, setQueueFilter] = useState('all'); // 'all' | 'pending' | 'reminders' | 'completed'
  const [searchQueue, setSearchQueue] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Calling Reports Filter
  const [reportDateRange, setReportDateRange] = useState('this-month'); // 'today' | 'range' | 'this-month'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedOutcomeFilter, setSelectedOutcomeFilter] = useState('All');

  // Filter assigned contacts for current user (or all if Admin/Manager)
  const assignedCustomers = useMemo(() => {
    return customers.filter(c => {
      if (currentUser?.role === 'RM') {
        return c.assignedTo === currentUser.id;
      }
      return true;
    });
  }, [customers, currentUser]);

  // Queue filtered items
  const displayQueue = useMemo(() => {
    return assignedCustomers.filter(c => {
      if (queueFilter === 'pending' && c.callingStatus !== 'Pending') return false;
      if (queueFilter === 'reminders' && c.callingStatus !== 'Reminder') return false;
      if (queueFilter === 'completed' && !['OK', 'Not Attend', 'No Need'].includes(c.callingStatus)) return false;

      if (searchQueue.trim()) {
        const q = searchQueue.toLowerCase();
        const mName = c.name && c.name.toLowerCase().includes(q);
        const mPhone = c.mobile && c.mobile.includes(q);
        const mBiz = c.business && c.business.toLowerCase().includes(q);
        if (!mName && !mPhone && !mBiz) return false;
      }
      return true;
    });
  }, [assignedCustomers, queueFilter, searchQueue]);

  // Current focused contact
  const currentFocusedContact = displayQueue[focusedIndex] || displayQueue[0] || null;

  // Filtered Call History for Reports
  const filteredCalls = useMemo(() => {
    const todayStr = '2026-11-16'; // Current local system date
    return calls.filter(call => {
      // Role scope
      if (currentUser?.role === 'RM' && call.employeeId !== currentUser.id) {
        return false;
      }

      // Date range filters
      if (reportDateRange === 'today') {
        if (call.callDate !== todayStr && call.callDate !== new Date().toISOString().split('T')[0]) {
          return false;
        }
      } else if (reportDateRange === 'range') {
        if (customStartDate && call.callDate < customStartDate) return false;
        if (customEndDate && call.callDate > customEndDate) return false;
      } else if (reportDateRange === 'this-month') {
        if (!call.callDate.startsWith('2026-11')) return false;
      }

      // Outcome filter
      if (selectedOutcomeFilter !== 'All' && call.outcome !== selectedOutcomeFilter) {
        return false;
      }

      return true;
    });
  }, [calls, currentUser, reportDateRange, customStartDate, customEndDate, selectedOutcomeFilter]);

  // Calling Metrics
  const totalCallsLogged = filteredCalls.length;
  const todayCallsCount = calls.filter(c => {
    const isToday = c.callDate === '2026-11-16' || c.callDate === new Date().toISOString().split('T')[0];
    return currentUser?.role === 'RM' ? (isToday && c.employeeId === currentUser.id) : isToday;
  }).length;

  const outcomeCounts = {
    OK: filteredCalls.filter(c => c.outcome === 'OK').length,
    NotAttend: filteredCalls.filter(c => c.outcome === 'Not Attend').length,
    NoNeed: filteredCalls.filter(c => c.outcome === 'No Need').length,
    Reminder: filteredCalls.filter(c => c.outcome === 'Reminder').length
  };

  const outcomePieData = [
    { name: 'OK (Interested)', value: outcomeCounts.OK, color: '#10B981' },
    { name: 'Not Attend', value: outcomeCounts.NotAttend, color: '#3B82F6' },
    { name: 'No Need', value: outcomeCounts.NoNeed, color: '#F43F5E' },
    { name: 'Reminder', value: outcomeCounts.Reminder, color: '#F59E0B' }
  ].filter(d => d.value > 0);

  const handleExportCalls = () => {
    const data = filteredCalls.map(c => ({
      "Call ID": c.id,
      "Customer Name": c.customerName,
      "Mobile Contact": c.mobile,
      "Telecaller": c.employeeName,
      "Date": c.callDate,
      "Time": c.callTime,
      "Duration": c.duration,
      "Call Outcome": c.outcome,
      "Discussion Remarks": c.remarks,
      "Scheduled Follow-up Date": c.reminderDate || '-'
    }));
    exportToCSV(data, 'rajalakshmy_telecalling_report.csv');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-gold-300 text-xs font-bold uppercase tracking-wider">
            <PhoneCall className="w-4 h-4" />
            <span>Telecalling Operations Command</span>
            <span>•</span>
            <span>{currentUser?.name} ({currentUser?.role})</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            Relationship Manager Calling Module
          </h2>
          <p className="text-xs text-white/80 max-w-xl">
            Execute manual calls with live duration timers, register 4-stage call outcomes, schedule follow-up reminders, and generate calling audits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-1.5 text-center">
            <span className="text-[10px] text-white/60 block uppercase font-bold">Assigned Contacts</span>
            <span className="text-sm font-extrabold text-gold-300">{assignedCustomers.length}</span>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-1.5 text-center">
            <span className="text-[10px] text-white/60 block uppercase font-bold">Today's Calls</span>
            <span className="text-sm font-extrabold text-emerald-300">{todayCallsCount}</span>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-1.5 text-center">
            <span className="text-[10px] text-white/60 block uppercase font-bold">Pending Reminders</span>
            <span className="text-sm font-extrabold text-amber-300">{outcomeCounts.Reminder}</span>
          </div>
        </div>
      </div>

      {/* Module Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl px-2 sm:px-4 text-xs font-bold shadow-sm overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('focused')}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'focused'
              ? 'border-burgundy-800 text-burgundy-900 bg-[#FAF6EF]/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PhoneCall className="w-4 h-4 text-emerald-600" />
          <span>Focused Calling Mode</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'border-burgundy-800 text-burgundy-900 bg-[#FAF6EF]/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-burgundy-800" />
          <span>Assigned Queue ({displayQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-burgundy-800 text-burgundy-900 bg-[#FAF6EF]/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-blue-600" />
          <span>Call Logs & Reports ({filteredCalls.length})</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: FOCUSED CALLING VIEW (ONE CONTACT AT A TIME) */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'focused' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Focused Calling Workspace (8 cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            {currentFocusedContact ? (
              <div className="space-y-6">
                {/* Stepper / Navigation bar */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Contact Queue Position:
                    </span>
                    <span className="text-xs font-extrabold text-burgundy-900 bg-burgundy-50 px-2.5 py-0.5 rounded-full border border-burgundy-200">
                      {focusedIndex + 1} of {displayQueue.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFocusedIndex(p => Math.max(p - 1, 0))}
                      disabled={focusedIndex === 0}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>
                    <button
                      onClick={() => setFocusedIndex(p => Math.min(p + 1, displayQueue.length - 1))}
                      disabled={focusedIndex >= displayQueue.length - 1}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>Next Lead</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Primary Contact Card */}
                <div className="rounded-2xl border border-gold-300 bg-gradient-to-br from-white via-[#FAF6EF]/50 to-gold-50/30 p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900">{currentFocusedContact.name}</h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-burgundy-50 text-burgundy-900 border border-burgundy-200 px-2 py-0.5 rounded-full">
                          {currentFocusedContact.databaseType} / {currentFocusedContact.customerType}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-gold-700 mt-1">
                        {currentFocusedContact.business || 'Commercial Enterprise'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {currentFocusedContact.city}, {currentFocusedContact.state} • Source: {currentFocusedContact.source}
                      </div>
                    </div>

                    {/* Massive Call Action Trigger */}
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-400 font-semibold mb-1">Direct Calling Contact:</div>
                      <div className="text-lg font-mono font-bold text-slate-900 tracking-wider">
                        {currentFocusedContact.mobile}
                      </div>
                      <button
                        onClick={() => startCallingCustomer(currentFocusedContact)}
                        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/10 transition transform hover:-translate-y-0.5"
                      >
                        <PhoneCall className="w-4 h-4 text-white animate-bounce" />
                        <span>Initiate Call Session</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status & Reminders Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Calling Disposition</span>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(currentFocusedContact.callingStatus)}`}>
                      {currentFocusedContact.callingStatus || 'Pending'}
                    </span>
                    {currentFocusedContact.lastCallDate && (
                      <div className="text-xs text-slate-500 mt-2">
                        Last called on: <span className="font-semibold text-slate-700">{formatDate(currentFocusedContact.lastCallDate)}</span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                    <span className="text-[10px] font-bold uppercase text-amber-800 block mb-1">Scheduled Reminder</span>
                    {currentFocusedContact.reminderDate ? (
                      <div>
                        <span className="text-xs font-bold text-amber-900">
                          Due: {formatDate(currentFocusedContact.reminderDate)}
                        </span>
                        {currentFocusedContact.reminderRemark && (
                          <p className="text-xs text-amber-800 italic mt-1">
                            "{currentFocusedContact.reminderRemark}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No future reminder scheduled</span>
                    )}
                  </div>
                </div>

                {/* Prior Call Notes for this Contact */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Prior Telecalling Records for this Contact
                  </h4>
                  {calls.filter(c => c.customerId === currentFocusedContact.id).length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-200">
                      No previous calls logged for this customer. Click "Initiate Call Session" above to start calling.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {calls.filter(c => c.customerId === currentFocusedContact.id).map(c => (
                        <div key={c.id} className="p-3 rounded-xl border border-slate-200 bg-white text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{c.callDate} ({c.callTime})</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(c.outcome)}`}>
                              {c.outcome} ({c.duration})
                            </span>
                          </div>
                          <div className="text-slate-600 mt-1 italic">"{c.remarks}"</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400">
                No contacts currently in queue. Select a contact from the Queue tab.
              </div>
            )}
          </div>

          {/* Side Queue Quick List (4 cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 font-corporate">
                Queue Leads ({displayQueue.length})
              </h4>
              <span className="text-[10px] uppercase font-bold text-slate-400">Click to Select</span>
            </div>

            {/* Quick search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by name or phone..."
                value={searchQueue}
                onChange={(e) => setSearchQueue(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 py-1.5 pl-8 pr-3 focus:outline-none focus:border-burgundy-800"
              />
            </div>

            {/* Queue List items */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {displayQueue.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => setFocusedIndex(idx)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                    idx === focusedIndex
                      ? 'border-burgundy-800 bg-burgundy-50/60 ring-2 ring-burgundy-800/15'
                      : 'border-slate-200 hover:bg-[#FAF6EF]/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{item.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(item.callingStatus)}`}>
                      {item.callingStatus || 'Pending'}
                    </span>
                  </div>
                  <div className="font-mono text-slate-600 text-[11px] mt-0.5">{item.mobile}</div>
                  <div className="text-slate-500 text-[10px] truncate mt-0.5">{item.business || item.city}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: ASSIGNED QUEUE TABLE                          */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Queue Filter Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQueueFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                  queueFilter === 'all'
                    ? 'bg-burgundy-900 text-white border-burgundy-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Assigned ({assignedCustomers.length})
              </button>
              <button
                onClick={() => setQueueFilter('pending')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                  queueFilter === 'pending'
                    ? 'bg-burgundy-900 text-white border-burgundy-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Pending Calls ({assignedCustomers.filter(c => c.callingStatus === 'Pending').length})
              </button>
              <button
                onClick={() => setQueueFilter('reminders')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                  queueFilter === 'reminders'
                    ? 'bg-burgundy-900 text-white border-burgundy-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Due Reminders ({assignedCustomers.filter(c => c.callingStatus === 'Reminder').length})
              </button>
            </div>

            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search assigned leads..."
                value={searchQueue}
                onChange={(e) => setSearchQueue(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 py-1.5 pl-8 pr-3 focus:outline-none focus:border-burgundy-800"
              />
            </div>
          </div>

          {/* Full Queue Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
              <thead className="bg-[#FAF6EF] text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Customer ID</th>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3">Mobile Contact</th>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Database</th>
                  <th className="px-4 py-3">Calling Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayQueue.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-[#FAF6EF]/60 transition">
                    <td className="px-4 py-3 font-mono font-bold text-burgundy-900">{item.id}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 font-mono font-medium">{item.mobile}</td>
                    <td className="px-4 py-3">{item.business || 'General Client'}</td>
                    <td className="px-4 py-3">{item.city || item.state}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.databaseType} / {item.customerType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(item.callingStatus)}`}>
                        {item.callingStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => startCallingCustomer(item)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1 text-xs font-bold text-white shadow-sm transition"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Call</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: CALL LOGS & CALLING REPORTS                   */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Calling Report KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Calls (Filtered)</span>
              <span className="text-2xl font-black text-slate-900">{totalCallsLogged}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Audit log count</span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">1. OK Outcomes</span>
              <span className="text-2xl font-black text-emerald-900">{outcomeCounts.OK}</span>
              <span className="text-[10px] text-emerald-700 block mt-1">Interested / converted</span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">4. Reminders</span>
              <span className="text-2xl font-black text-amber-900">{outcomeCounts.Reminder}</span>
              <span className="text-[10px] text-amber-700 block mt-1">Follow-ups scheduled</span>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-blue-800 block">2 & 3. Attend / No Need</span>
              <span className="text-2xl font-black text-blue-900">{outcomeCounts.NotAttend + outcomeCounts.NoNeed}</span>
              <span className="text-[10px] text-blue-700 block mt-1">Not reachable / closed</span>
            </div>
          </div>

          {/* Outcome Breakdown Chart & Filter Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Outcome Breakdown Pie (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-900 font-corporate pb-2 border-b border-slate-100 mb-3">
                Call Outcomes Breakdown
              </h4>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outcomePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {outcomePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`${val} Calls`, name]}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs mt-2">
                <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100">
                  OK: {outcomeCounts.OK}
                </span>
                <span className="px-2 py-1 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-100">
                  Reminder: {outcomeCounts.Reminder}
                </span>
                <span className="px-2 py-1 rounded bg-blue-50 text-blue-800 font-semibold border border-blue-100">
                  Not Attend: {outcomeCounts.NotAttend}
                </span>
                <span className="px-2 py-1 rounded bg-rose-50 text-rose-800 font-semibold border border-rose-100">
                  No Need: {outcomeCounts.NoNeed}
                </span>
              </div>
            </div>

            {/* Filter Bar (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 font-corporate pb-2 border-b border-slate-100 mb-4">
                  Calling Reports Filter Controls
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Time Horizon</label>
                    <select
                      value={reportDateRange}
                      onChange={(e) => setReportDateRange(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white"
                    >
                      <option value="today">Today's Telecalls</option>
                      <option value="this-month">This Month (November 2026)</option>
                      <option value="range">Custom Date Range</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Outcome Filter</label>
                    <select
                      value={selectedOutcomeFilter}
                      onChange={(e) => setSelectedOutcomeFilter(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white"
                    >
                      <option value="All">All Outcomes</option>
                      <option value="OK">OK</option>
                      <option value="Not Attend">Not Attend</option>
                      <option value="No Need">No Need</option>
                      <option value="Reminder">Reminder</option>
                    </select>
                  </div>

                  {reportDateRange === 'range' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                <button
                  onClick={handleExportCalls}
                  className="flex items-center gap-2 rounded-xl bg-burgundy-900 px-5 py-2 text-xs font-bold text-white hover:bg-burgundy-800 transition shadow-sm"
                >
                  <Download className="w-4 h-4 text-gold-300" />
                  <span>Export Calling Report CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Full Detailed History Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-[#FAF6EF] border-b border-slate-200 text-xs font-bold text-slate-800">
              Detailed Call Audit History Records ({filteredCalls.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[760px]">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Call ID</th>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Mobile Contact</th>
                    <th className="px-4 py-3">Telecaller / RM</th>
                    <th className="px-4 py-3">Call Date & Time</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Call Outcome</th>
                    <th className="px-4 py-3">Remarks & Reminders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCalls.map(c => (
                    <tr key={c.id} className="hover:bg-[#FAF6EF]/60 transition">
                      <td className="px-4 py-3 font-mono font-bold text-burgundy-900">{c.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{c.customerName}</td>
                      <td className="px-4 py-3 font-mono font-medium">{c.mobile}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{c.employeeName}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{c.employeeId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{c.callDate}</span>
                        <span className="text-[10px] text-slate-500 block">{c.callTime}</span>
                      </td>
                      <td className="px-4 py-3 font-mono">{c.duration}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(c.outcome)}`}>
                          {c.outcome}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700 truncate max-w-xs">{c.remarks || '-'}</div>
                        {c.reminderDate && (
                          <div className="text-[10px] text-amber-800 font-bold mt-0.5">
                            Follow-up: {formatDate(c.reminderDate)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
