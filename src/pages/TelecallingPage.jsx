import React, { useState, useMemo, useEffect } from 'react';
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
  TrendingUp,
  FileText,
  Database,
  UserCheck,
  MapPin
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
import { Pagination } from '../components/common/Pagination';

export const TelecallingPage = () => {
  const { customers, calls, logCall } = useCRM();
  const { currentUser } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState('focused'); // 'focused' | 'queue' | 'history' | 'analytics'
  const [queueFilter, setQueueFilter] = useState('fresh'); // 'fresh' | 'reminders' | 'completed'
  const [searchQueue, setSearchQueue] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Manual Response Entry State for Focused Mode
  const [outcome, setOutcome] = useState('OK');
  const [remarks, setRemarks] = useState('');
  const [reminderDate, setReminderDate] = useState('');

  // Calling Reports Filter
  const [reportDateRange, setReportDateRange] = useState('this-month'); // 'today' | 'range' | 'this-month'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedOutcomeFilter, setSelectedOutcomeFilter] = useState('All');

  // 2-Step Telecalling Partition Filter:
  // Step 1: Select Old Database or New Database
  // Step 2: Select Known or Unknown
  const [selectedDb, setSelectedDb] = useState(null); // 'old' | 'new' | null
  const [selectedType, setSelectedType] = useState(null); // 'known' | 'unknown' | null

  // Helper: check if a customer is a fresh, un-actioned number (excludes converted leads and actioned numbers)
  const isFreshNumber = (c) => {
    const isPending = (c.callingStatus === 'Pending' || !c.callingStatus) && !c.actionedBy && c.status !== 'Lead' && c.callingStatus !== 'OK' && c.callingStatus !== 'Field Visit';
    if (currentUser?.role === 'RM') {
      return isPending && (!c.assignedTo || c.assignedTo === currentUser.id);
    }
    return isPending;
  };

  // Base accessible contacts for current user:
  // - Shows fresh un-actioned numbers (accessible to RMs)
  // - Shows numbers actioned by current user (for their reminders, history)
  const baseCustomers = useMemo(() => {
    return customers.filter(c => {
      if (currentUser?.role === 'RM') {
        const isFresh = isFreshNumber(c);
        const isMine = c.actionedBy === currentUser.id || c.assignedTo === currentUser.id;
        return isFresh || isMine;
      }
      return true;
    });
  }, [customers, currentUser]);

  // Fresh number counts for Step 1 and Step 2 selections
  const oldKnownFreshCount = useMemo(() => 
    customers.filter(c => c.databaseType === 'old' && c.customerType === 'known' && isFreshNumber(c)).length,
    [customers, currentUser]
  );
  const oldUnknownFreshCount = useMemo(() => 
    customers.filter(c => c.databaseType === 'old' && c.customerType === 'unknown' && isFreshNumber(c)).length,
    [customers, currentUser]
  );
  const newKnownFreshCount = useMemo(() => 
    customers.filter(c => c.databaseType === 'new' && c.customerType === 'known' && isFreshNumber(c)).length,
    [customers, currentUser]
  );
  const newUnknownFreshCount = useMemo(() => 
    customers.filter(c => c.databaseType === 'new' && c.customerType === 'unknown' && isFreshNumber(c)).length,
    [customers, currentUser]
  );

  const oldTotalCount = oldKnownFreshCount + oldUnknownFreshCount;
  const newTotalCount = newKnownFreshCount + newUnknownFreshCount;
  const oldKnownCount = oldKnownFreshCount;
  const oldUnknownCount = oldUnknownFreshCount;
  const newKnownCount = newKnownFreshCount;
  const newUnknownCount = newUnknownFreshCount;

  // Filter assigned contacts matching Step 1 (Database) and Step 2 (Classification)
  const assignedCustomers = useMemo(() => {
    if (!selectedDb || !selectedType) return [];
    return baseCustomers.filter(c => c.databaseType === selectedDb && c.customerType === selectedType);
  }, [baseCustomers, selectedDb, selectedType]);

  // Queue filtered items:
  // In Focused Telecalling Mode and when queueFilter is 'fresh' (or default):
  // STRICTLY show ONLY fresh numbers! Actioned numbers do NOT show in Queue Leads.
  const displayQueue = useMemo(() => {
    return assignedCustomers.filter(c => {
      if (activeTab === 'focused' || queueFilter === 'fresh' || queueFilter === 'pending' || queueFilter === 'all') {
        // Queue Leads ONLY shows fresh numbers:
        if (!isFreshNumber(c)) return false;
      } else if (queueFilter === 'reminders') {
        if (c.callingStatus !== 'Reminder') return false;
        if (currentUser?.role === 'RM' && c.actionedBy !== currentUser.id && c.assignedTo !== currentUser.id) return false;
      } else if (queueFilter === 'completed') {
        if (!['OK', 'Not Attend', 'No Need', 'Field Visit'].includes(c.callingStatus)) return false;
        if (currentUser?.role === 'RM' && c.actionedBy !== currentUser.id) return false;
      }

      if (searchQueue.trim()) {
        const q = searchQueue.toLowerCase();
        const mName = c.name && c.name.toLowerCase().includes(q);
        const mPhone = c.mobile && c.mobile.includes(q);
        const mBiz = c.business && c.business.toLowerCase().includes(q);
        if (!mName && !mPhone && !mBiz) return false;
      }
      return true;
    });
  }, [assignedCustomers, activeTab, queueFilter, searchQueue, currentUser]);

  // Auto-clamp focusedIndex if queue shrinks after actioning a number
  useEffect(() => {
    if (displayQueue.length === 0) {
      setFocusedIndex(0);
    } else if (focusedIndex >= displayQueue.length) {
      setFocusedIndex(displayQueue.length - 1);
    }
  }, [displayQueue.length, focusedIndex]);

  // Current focused contact
  const currentFocusedContact = displayQueue[focusedIndex] || displayQueue[0] || null;

  // Sync manual response form with current selected contact
  useEffect(() => {
    if (currentFocusedContact) {
      setOutcome(
        ['OK', 'Not Attend', 'No Need', 'Reminder', 'Field Visit'].includes(currentFocusedContact.callingStatus)
          ? currentFocusedContact.callingStatus
          : 'OK'
      );
      setRemarks(currentFocusedContact.reminderRemark || '');
      setReminderDate(currentFocusedContact.reminderDate || '');
    }
  }, [currentFocusedContact?.id]);

  const handleSaveResponse = (andNext = false) => {
    if (!currentFocusedContact) return;

    if (outcome === 'Reminder' && !reminderDate) {
      alert('Please select a Follow-up Date for Reminder');
      return;
    }

    logCall({
      customerId: currentFocusedContact.id,
      outcome,
      duration: 'Manual Call',
      remarks: remarks.trim() || `Customer call response: ${outcome}`,
      reminderDate: (outcome === 'Reminder' || outcome === 'Field Visit') ? reminderDate : ''
    });

    // Reset remarks for the next lead
    setRemarks('');
    setReminderDate('');
    setOutcome('OK');

    // Note: since this contact is now actioned, it automatically leaves displayQueue.
    // The next fresh number in line will automatically be at current focusedIndex.
  };

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

  // Pagination for Queue (minimum 15 items per page)
  const [queuePage, setQueuePage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    setQueuePage(1);
  }, [queueFilter, searchQueue, selectedDb, selectedType]);

  const paginatedQueue = useMemo(() => {
    const start = (queuePage - 1) * itemsPerPage;
    return displayQueue.slice(start, start + itemsPerPage);
  }, [displayQueue, queuePage, itemsPerPage]);

  // Pagination for Call History (minimum 15 items per page)
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    setHistoryPage(1);
  }, [reportDateRange, customStartDate, customEndDate, selectedOutcomeFilter]);

  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * itemsPerPage;
    return filteredCalls.slice(start, start + itemsPerPage);
  }, [filteredCalls, historyPage, itemsPerPage]);
  const todayCallsCount = calls.filter(c => {
    const isToday = c.callDate === '2026-11-16' || c.callDate === new Date().toISOString().split('T')[0];
    return currentUser?.role === 'RM' ? (isToday && c.employeeId === currentUser.id) : isToday;
  }).length;

  const outcomeCounts = {
    OK: filteredCalls.filter(c => c.outcome === 'OK').length,
    NotAttend: filteredCalls.filter(c => c.outcome === 'Not Attend').length,
    NoNeed: filteredCalls.filter(c => c.outcome === 'No Need').length,
    Reminder: filteredCalls.filter(c => c.outcome === 'Reminder').length,
    FieldVisit: filteredCalls.filter(c => c.outcome === 'Field Visit').length
  };

  const outcomePieData = [
    { name: 'OK (Interested)', value: outcomeCounts.OK, color: '#10B981' },
    { name: 'Not Attend', value: outcomeCounts.NotAttend, color: '#3B82F6' },
    { name: 'No Need', value: outcomeCounts.NoNeed, color: '#F43F5E' },
    { name: 'Reminder', value: outcomeCounts.Reminder, color: '#F59E0B' },
    { name: 'Field Visit', value: outcomeCounts.FieldVisit, color: '#8B5CF6' }
  ].filter(d => d.value > 0);

  const handleExportCalls = () => {
    const data = filteredCalls.map(c => ({
      "Call ID": c.id,
      "Customer Name": c.customerName,
      "Mobile Contact": c.mobile,
      "Telecaller": c.employeeName,
      "Date": formatDate(c.callDate),
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
         
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-1.5 text-center">
            <span className="text-[10px] text-white/60 block uppercase font-bold">
              {selectedDb && selectedType ? 'Fresh Queue Numbers' : 'Total Fresh Numbers'}
            </span>
            <span className="text-sm font-extrabold text-gold-300">
              {selectedDb && selectedType ? displayQueue.length : (oldTotalCount + newTotalCount)}
            </span>
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

      {/* 2-Step Database & Classification Selector Card */}
      <div className="rounded-2xl border-2 border-burgundy-100 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-burgundy-900 bg-burgundy-50 border border-burgundy-200 px-2.5 py-0.5 rounded-full">
                Step-by-Step Calling Setup
              </span>
              {selectedDb && selectedType && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  ✓ Fresh Numbers Loaded ({displayQueue.length})
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 font-corporate mt-1">
              1. Select Database &nbsp;➔&nbsp; 2. Select Classification &nbsp;➔&nbsp; 3. View Customer Numbers
            </h3>
          </div>

          {selectedDb && (
            <button
              onClick={() => {
                setSelectedDb(null);
                setSelectedType(null);
                setFocusedIndex(0);
              }}
              className="text-xs font-semibold text-burgundy-900 hover:text-burgundy-700 underline self-start sm:self-auto"
            >
              Reset / Change Selection
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* STEP 1: Select Old or New Database */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-burgundy-900 text-white text-[11px] font-bold">1</span>
                <span>Select Database</span>
                <span className="text-rose-500">*</span>
              </label>
              {selectedDb && (
                <span className="text-[11px] font-bold text-emerald-700">
                  Selected: {selectedDb === 'old' ? 'Old Database' : 'New Database'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedDb('old');
                  setFocusedIndex(0);
                }}
                className={`p-3 rounded-xl border-2 transition text-left flex flex-col justify-between ${
                  selectedDb === 'old'
                    ? 'border-burgundy-900 bg-burgundy-50/90 text-burgundy-950 ring-2 ring-burgundy-900/20 shadow-sm'
                    : 'border-slate-200 hover:border-burgundy-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database className={`w-4 h-4 shrink-0 ${selectedDb === 'old' ? 'text-burgundy-900' : 'text-slate-400'}`} />
                  <span className="text-xs font-extrabold">Old Database</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Tamil Nadu Master Base</div>
                <span className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 inline-block self-start">
                  {oldTotalCount} Fresh Numbers
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedDb('new');
                  setFocusedIndex(0);
                }}
                className={`p-3 rounded-xl border-2 transition text-left flex flex-col justify-between ${
                  selectedDb === 'new'
                    ? 'border-burgundy-900 bg-burgundy-50/90 text-burgundy-950 ring-2 ring-burgundy-900/20 shadow-sm'
                    : 'border-slate-200 hover:border-burgundy-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className={`w-4 h-4 shrink-0 ${selectedDb === 'new' ? 'text-burgundy-900' : 'text-slate-400'}`} />
                  <span className="text-xs font-extrabold">New Database</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Field Sales & Inquiries</div>
                <span className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 inline-block self-start">
                  {newTotalCount} Fresh Numbers
                </span>
              </button>
            </div>
          </div>

          {/* STEP 2: Select Known or Unknown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  selectedDb ? 'bg-gold-500 text-amber-950' : 'bg-slate-300 text-slate-600'
                }`}>2</span>
                <span>Select Classification</span>
                <span className="text-rose-500">*</span>
              </label>
              {!selectedDb ? (
                <span className="text-[10px] text-slate-400 font-semibold">(Pick Step 1 first)</span>
              ) : selectedType ? (
                <span className="text-[11px] font-bold text-emerald-700">
                  Selected: {selectedType === 'known' ? 'Known' : 'Unknown'}
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={!selectedDb}
                onClick={() => {
                  setSelectedType('known');
                  setFocusedIndex(0);
                }}
                className={`p-3 rounded-xl border-2 transition text-left flex flex-col justify-between disabled:opacity-40 disabled:cursor-not-allowed ${
                  selectedType === 'known'
                    ? 'border-gold-600 bg-gold-50/90 text-amber-950 ring-2 ring-gold-600/20 shadow-sm'
                    : 'border-slate-200 hover:border-gold-400 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className={`w-4 h-4 shrink-0 ${selectedType === 'known' ? 'text-amber-800' : 'text-slate-400'}`} />
                  <span className="text-xs font-extrabold">Known Customers</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Verified Enterprise Profiles</div>
                <span className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 inline-block self-start">
                  {selectedDb ? (selectedDb === 'old' ? oldKnownCount : newKnownCount) : '—'} Fresh Numbers
                </span>
              </button>

              <button
                type="button"
                disabled={!selectedDb}
                onClick={() => {
                  setSelectedType('unknown');
                  setFocusedIndex(0);
                }}
                className={`p-3 rounded-xl border-2 transition text-left flex flex-col justify-between disabled:opacity-40 disabled:cursor-not-allowed ${
                  selectedType === 'unknown'
                    ? 'border-gold-600 bg-gold-50/90 text-amber-950 ring-2 ring-gold-600/20 shadow-sm'
                    : 'border-slate-200 hover:border-gold-400 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className={`w-4 h-4 shrink-0 ${selectedType === 'unknown' ? 'text-amber-800' : 'text-slate-400'}`} />
                  <span className="text-xs font-extrabold">Unknown Leads</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Field Direct Mobile Contacts</div>
                <span className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 inline-block self-start">
                  {selectedDb ? (selectedDb === 'old' ? oldUnknownCount : newUnknownCount) : '—'} Fresh Numbers
                </span>
              </button>
            </div>
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
          <FileText className="w-4 h-4 text-burgundy-800" />
          <span>Focused Telecalling Mode {selectedDb && selectedType && `(${displayQueue.length})`}</span>
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

      {/* If neither or only one is selected and on focused/queue tab, show selection guidance */}
      {(!selectedDb || !selectedType) && activeTab !== 'history' ? (
        <div className="rounded-2xl border-2 border-dashed border-burgundy-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-burgundy-50 text-burgundy-900 border border-burgundy-200 mb-4 shadow-sm">
            <PhoneCall className="w-8 h-8 text-burgundy-900" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 font-corporate">
            {!selectedDb
              ? "Step 1: Select Old Database or New Database Above"
              : "Step 2: Select Known Customers or Unknown Leads Above"}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
            {!selectedDb
              ? "Choose whether you want to telecall leads from the Old Database or the New Database to proceed."
              : `You selected ${selectedDb === 'old' ? 'Old Database' : 'New Database'}. Now choose Known Customers or Unknown Leads above to display the customer phone numbers.`}
          </p>
        </div>
      ) : (
        <>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold text-slate-900">{currentFocusedContact.name}</h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-burgundy-50 text-burgundy-900 border border-burgundy-200 px-2 py-0.5 rounded-full">
                          {currentFocusedContact.databaseType} / {currentFocusedContact.customerType}
                        </span>
                        {(!currentFocusedContact.assignedTo || currentFocusedContact.callingStatus === 'Pending') ? (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
                            ★ Fresh Number (Available to Action)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-gold-100 text-amber-950 border border-gold-300 px-2.5 py-0.5 rounded-full">
                            ✓ Followed by You ({currentFocusedContact.callingStatus})
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-gold-700 mt-1">
                        {currentFocusedContact.business || 'Commercial Enterprise'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {currentFocusedContact.city}, {currentFocusedContact.state} • Source: {currentFocusedContact.source}
                      </div>
                    </div>

                    {/* Customer Mobile Number to Dial Manually */}
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                        Mobile Number to Dial:
                      </div>
                      <div className="inline-block bg-burgundy-50 border border-burgundy-200 px-4 py-2 rounded-xl shadow-sm">
                        <span className="text-xl font-mono font-extrabold text-burgundy-900 tracking-wider">
                          {currentFocusedContact.mobile}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Dial from personal mobile, then enter response below
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enter Manual Response & Disposition Form */}
                <div className="rounded-2xl border-2 border-burgundy-100 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-burgundy-800" />
                      <h4 className="text-sm font-bold text-slate-900 font-corporate">
                        Enter Telecalling Response & Feedback
                      </h4>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Personal Mobile Calling Workflow
                    </span>
                  </div>

                  {/* Outcome Selection Buttons */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Select Call Outcome <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {/* OK */}
                      <button
                        type="button"
                        onClick={() => setOutcome('OK')}
                        className={`p-3 rounded-xl border-2 transition flex flex-col items-center justify-center text-center ${
                          outcome === 'OK'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <CheckCircle2 className={`w-5 h-5 mb-1 ${outcome === 'OK' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold">1. OK</span>
                        <span className="text-[10px] text-slate-500">Interested / Converted</span>
                      </button>

                      {/* Not Attend */}
                      <button
                        type="button"
                        onClick={() => setOutcome('Not Attend')}
                        className={`p-3 rounded-xl border-2 transition flex flex-col items-center justify-center text-center ${
                          outcome === 'Not Attend'
                            ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold ring-2 ring-blue-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <PhoneMissed className={`w-5 h-5 mb-1 ${outcome === 'Not Attend' ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold">2. Not Attend</span>
                        <span className="text-[10px] text-slate-500">Ringing / Busy / Off</span>
                      </button>

                      {/* No Need */}
                      <button
                        type="button"
                        onClick={() => setOutcome('No Need')}
                        className={`p-3 rounded-xl border-2 transition flex flex-col items-center justify-center text-center ${
                          outcome === 'No Need'
                            ? 'border-rose-600 bg-rose-50 text-rose-950 font-bold ring-2 ring-rose-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-rose-300 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <XCircle className={`w-5 h-5 mb-1 ${outcome === 'No Need' ? 'text-rose-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold">3. No Need</span>
                        <span className="text-[10px] text-slate-500">Not Interested / DND</span>
                      </button>

                      {/* Reminder */}
                      <button
                        type="button"
                        onClick={() => setOutcome('Reminder')}
                        className={`p-3 rounded-xl border-2 transition flex flex-col items-center justify-center text-center ${
                          outcome === 'Reminder'
                            ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <CalendarClock className={`w-5 h-5 mb-1 ${outcome === 'Reminder' ? 'text-amber-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold">4. Reminder</span>
                        <span className="text-[10px] text-slate-500">Schedule Follow-up</span>
                      </button>

                      {/* Field Visit */}
                      <button
                        type="button"
                        onClick={() => setOutcome('Field Visit')}
                        className={`p-3 rounded-xl border-2 transition flex flex-col items-center justify-center text-center ${
                          outcome === 'Field Visit'
                            ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold ring-2 ring-purple-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <MapPin className={`w-5 h-5 mb-1 ${outcome === 'Field Visit' ? 'text-purple-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold">5. Field Visit</span>
                        <span className="text-[10px] text-slate-500">In-Person / Meeting</span>
                      </button>
                    </div>
                  </div>

                  {/* Conditional Reminder Section */}
                  {outcome === 'Reminder' && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 space-y-2.5 animate-fade-in">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                        <CalendarClock className="w-4 h-4 text-amber-700" />
                        <span>Schedule Follow-up Reminder</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Follow-up Date <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={reminderDate}
                            onChange={(e) => setReminderDate(e.target.value)}
                            className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:border-burgundy-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Reminder Reason / Time
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Call back at 4:30 PM, discusses with director"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:border-burgundy-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conditional Field Visit Section */}
                  {outcome === 'Field Visit' && (
                    <div className="rounded-xl border border-purple-300 bg-purple-50/80 p-3.5 space-y-2.5 animate-fade-in">
                      <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                        <MapPin className="w-4 h-4 text-purple-700" />
                        <span>Schedule Field Visit & Details</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Planned Visit Date (Optional)
                          </label>
                          <input
                            type="date"
                            value={reminderDate}
                            onChange={(e) => setReminderDate(e.target.value)}
                            className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:border-burgundy-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Meeting Location / Agenda
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Client requested factory visit for machine financing"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:border-burgundy-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Discussion Remarks */}
                  {outcome !== 'Reminder' && outcome !== 'Field Visit' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Call Discussion Remarks & Notes
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Enter client discussion summary, requirements, loan amount, next steps..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-burgundy-800"
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400">
                      Current Status: <span className="font-bold text-slate-700">{currentFocusedContact.callingStatus || 'Pending'}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveResponse(false)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Save Response</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveResponse(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 px-5 py-2 text-xs font-bold text-white shadow-md transition"
                      >
                        <span>Save & Next Lead</span>
                        <ChevronRight className="w-3.5 h-3.5" />
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
                      No previous calls logged for this customer. Enter response above after dialing on personal mobile.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {calls.filter(c => c.customerId === currentFocusedContact.id).map(c => (
                        <div key={c.id} className="p-3 rounded-xl border border-slate-200 bg-white text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{formatDate(c.callDate)} ({c.callTime})</span>
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
              <div className="text-center py-16 px-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3 shadow-sm">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <h4 className="text-base font-bold text-slate-800 font-corporate">All Fresh Numbers Actioned!</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  There are no pending fresh numbers left in this partition. All records you actioned have been saved to your Call Logs.
                </p>
              </div>
            )}
          </div>

          {/* Side Queue Quick List (4 cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 font-corporate">
                Queue Leads ({displayQueue.length})
              </h4>
              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Fresh Numbers Only
              </span>
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
              {displayQueue.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 italic">
                  No fresh numbers pending in queue.
                </div>
              ) : (
                displayQueue.map((item, idx) => (
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
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-800">
                        ★ Fresh Number
                      </span>
                    </div>
                    <div className="font-mono text-slate-600 text-[11px] mt-0.5">{item.mobile}</div>
                    <div className="text-slate-500 text-[10px] truncate mt-0.5">{item.business || item.city}</div>
                  </div>
                ))
              )}
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
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setQueueFilter('fresh')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 ${
                  queueFilter === 'fresh' || queueFilter === 'all' || queueFilter === 'pending'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                    : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                <span>Fresh Queue Leads ({assignedCustomers.filter(c => isFreshNumber(c)).length})</span>
              </button>
              <button
                onClick={() => setQueueFilter('reminders')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 ${
                  queueFilter === 'reminders'
                    ? 'bg-amber-700 text-white border-amber-700 shadow-sm'
                    : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
                }`}
              >
                <span>My Due Reminders ({assignedCustomers.filter(c => c.callingStatus === 'Reminder' && (c.actionedBy === currentUser?.id || c.assignedTo === currentUser?.id)).length})</span>
              </button>
              <button
                onClick={() => setQueueFilter('completed')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 ${
                  queueFilter === 'completed'
                    ? 'bg-burgundy-900 text-white border-burgundy-900 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>My Actioned Calls ({assignedCustomers.filter(c => ['OK', 'Not Attend', 'No Need', 'Field Visit'].includes(c.callingStatus) && c.actionedBy === currentUser?.id).length})</span>
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
                {paginatedQueue.map((item, idx) => (
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
                        onClick={() => {
                          const idx = displayQueue.findIndex(q => q.id === item.id);
                          if (idx !== -1) setFocusedIndex(idx);
                          setActiveTab('focused');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-burgundy-900 hover:bg-burgundy-800 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                        title="View mobile number & enter response"
                      >
                        <FileText className="w-3.5 h-3.5 text-gold-300" />
                        <span>Enter Response</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Reusable Pagination for Queue */}
            <Pagination
              currentPage={queuePage}
              totalItems={displayQueue.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setQueuePage}
              summaryLabel="leads in queue"
            />
          </div>
        </div>
      )}
        </>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: CALL LOGS & CALLING REPORTS                   */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Calling Report KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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

            <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-purple-800 block">5. Field Visits</span>
              <span className="text-2xl font-black text-purple-900">{outcomeCounts.FieldVisit}</span>
              <span className="text-[10px] text-purple-700 block mt-1">Client visits requested</span>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm col-span-2 sm:col-span-1">
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

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs mt-2">
                <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100">
                  OK: {outcomeCounts.OK}
                </span>
                <span className="px-2 py-1 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-100">
                  Reminder: {outcomeCounts.Reminder}
                </span>
                <span className="px-2 py-1 rounded bg-purple-50 text-purple-800 font-semibold border border-purple-100">
                  Field Visit: {outcomeCounts.FieldVisit}
                </span>
                <span className="px-2 py-1 rounded bg-blue-50 text-blue-800 font-semibold border border-blue-100">
                  Not Attend: {outcomeCounts.NotAttend}
                </span>
                <span className="px-2 py-1 rounded bg-rose-50 text-rose-800 font-semibold border border-rose-100 sm:col-span-2">
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
                      <option value="Field Visit">Field Visit</option>
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
                  {paginatedHistory.map(c => (
                    <tr key={c.id} className="hover:bg-[#FAF6EF]/60 transition">
                      <td className="px-4 py-3 font-mono font-bold text-burgundy-900">{c.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{c.customerName}</td>
                      <td className="px-4 py-3 font-mono font-medium">{c.mobile}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{c.employeeName}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{c.employeeId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{formatDate(c.callDate)}</span>
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

            {/* Reusable Pagination for Call History */}
            <Pagination
              currentPage={historyPage}
              totalItems={filteredCalls.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setHistoryPage}
              summaryLabel="call history records"
            />
          </div>
        </div>
      )}
    </div>
  );
};
