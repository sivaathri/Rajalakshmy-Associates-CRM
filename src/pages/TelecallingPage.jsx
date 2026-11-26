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
  RotateCcw,
  Search,
  Download,
  Calendar,
  Layers,
  History,
  TrendingUp,
  FileText,
  Database,
  UserCheck,
  MapPin,
  Plus
} from 'lucide-react';
import { AddDatabaseRecordModal } from '../components/database/AddDatabaseRecordModal';
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
import { formatDate, formatDateTime, getStatusBadgeClass, exportToCSV, formatMobileNumber, matchesMobileSearch } from '../utils/formatters';
import { Pagination } from '../components/common/Pagination';

export const TelecallingPage = () => {
  const {
    customers,
    calls,
    logCall,
    employees = [],
    callLocks,
    claimCallLock,
    releaseCallLock,
    refreshCallLock,
    isLockedByOther
  } = useCRM();
  const { currentUser, showToast } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState('focused'); // 'focused' | 'queue' | 'my-numbers' | 'history' | 'analytics'
  const [queueFilter, setQueueFilter] = useState('reminders'); // 'reminders' | 'completed'
  const [searchQueue, setSearchQueue] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(null);

  // Added Numbers Tracking State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchMyNumbers, setSearchMyNumbers] = useState('');
  const [myNumbersPage, setMyNumbersPage] = useState(1);

  // Manual Response Entry State for Focused Mode
  const [outcome, setOutcome] = useState('');
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

  // Helper: check if a customer is a fresh, un-actioned number (excludes converted leads, actioned numbers, and numbers currently locked by another RM)
  const isFreshNumber = (c) => {
    const isPending = (c.callingStatus === 'Pending' || !c.callingStatus) && !c.actionedBy && c.status !== 'Lead' && c.callingStatus !== 'OK' && c.callingStatus !== 'Field Visit';
    if (isLockedByOther(c.id)) {
      return false;
    }
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
  }, [customers, currentUser, callLocks]);

  // Fresh number counts for Step 1 and Step 2 selections
  const oldKnownFreshCount = useMemo(() => 
    customers.filter(c => c.databaseType === 'old' && c.customerType === 'known' && isFreshNumber(c)).length,
    [customers, currentUser, callLocks]
  );
  const oldUnknownFreshCount = useMemo(() => 
    customers.filter(c => c.databaseType === 'old' && c.customerType === 'unknown' && isFreshNumber(c)).length,
    [customers, currentUser, callLocks]
  );
  const newKnownFreshCount = useMemo(() => 
    customers.filter(c => c.databaseType === 'new' && c.customerType === 'known' && isFreshNumber(c)).length,
    [customers, currentUser, callLocks]
  );
  const newUnknownFreshCount = useMemo(() => 
    customers.filter(c => c.databaseType === 'new' && c.customerType === 'unknown' && isFreshNumber(c)).length,
    [customers, currentUser, callLocks]
  );

  const oldTotalCount = oldKnownFreshCount + oldUnknownFreshCount;
  const newTotalCount = newKnownFreshCount + newUnknownFreshCount;
  const oldKnownCount = oldKnownFreshCount;
  const oldUnknownCount = oldUnknownFreshCount;
  const newKnownCount = newKnownFreshCount;
  const newUnknownCount = newUnknownFreshCount;

  // Filter assigned contacts:
  // For Assigned Queue: show all baseCustomers if no partition is selected; filter if user selects Database and/or Classification
  const assignedCustomers = useMemo(() => {
    return baseCustomers.filter(c => {
      if (selectedDb && c.databaseType !== selectedDb) return false;
      if (selectedType && c.customerType !== selectedType) return false;
      return true;
    });
  }, [baseCustomers, selectedDb, selectedType]);

  // For Focused Mode: strictly requires both Step 1 (Database) and Step 2 (Classification)
  const focusedCustomers = useMemo(() => {
    if (!selectedDb || !selectedType) return [];
    return baseCustomers.filter(c => c.databaseType === selectedDb && c.customerType === selectedType);
  }, [baseCustomers, selectedDb, selectedType]);

  const myRemindersCount = useMemo(() => {
    return assignedCustomers.filter(c => c.callingStatus === 'Reminder' && (c.actionedBy === currentUser?.id || c.assignedTo === currentUser?.id)).length;
  }, [assignedCustomers, currentUser]);

  const myActionedCount = useMemo(() => {
    return assignedCustomers.filter(c => ['OK', 'Not Attend', 'No Need', 'Field Visit'].includes(c.callingStatus) && c.actionedBy === currentUser?.id).length;
  }, [assignedCustomers, currentUser]);

  // Active RMs sorted deterministically so each RM gets a distinct Queue Leads order
  // and concurrent RMs don't dial the same #1 contact at the same time
  const rmQueueInfo = useMemo(() => {
    const activeRMs = (employees || [])
      .filter(e => e.role === 'RM' && e.status !== 'Inactive')
      .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));

    const rmCount = Math.max(activeRMs.length, 1);
    let rmIndex = currentUser?.id
      ? activeRMs.findIndex(e => e.id === currentUser.id)
      : -1;

    if (rmIndex === -1 && currentUser?.id) {
      let hash = 0;
      const uid = String(currentUser.id);
      for (let i = 0; i < uid.length; i++) {
        hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
      }
      rmIndex = hash % rmCount;
    }

    return { rmCount, rmIndex: Math.max(rmIndex, 0) };
  }, [employees, currentUser?.id]);

  // Stable bucket index per customer ID so actioning a lead doesn't reshuffle other RMs' queues
  const getCustomerBucket = (customer, rmCount) => {
    const rawKey = String(customer.id || customer.mobile || customer.name || '');
    const trailingDigits = rawKey.match(/\d+$/);
    if (trailingDigits) {
      return parseInt(trailingDigits[0], 10) % rmCount;
    }
    let hash = 2166136261;
    for (let i = 0; i < rawKey.length; i++) {
      hash ^= rawKey.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash % rmCount;
  };

  // Queue filtered items:
  // In Focused Telecalling Mode: STRICTLY show ONLY fresh numbers, partitioned/rotated per RM!
  // In Assigned Queue Table: Toggle between My Due Reminders and My Actioned Calls
  const displayQueue = useMemo(() => {
    const sourceCustomers = activeTab === 'focused' ? focusedCustomers : assignedCustomers;
    const filtered = sourceCustomers.filter(c => {
      if (activeTab === 'focused') {
        // Focused Calling strictly shows fresh numbers
        if (!isFreshNumber(c)) return false;
      } else if (queueFilter === 'completed') {
        if (!['OK', 'Not Attend', 'No Need', 'Field Visit'].includes(c.callingStatus)) return false;
        if (currentUser?.role === 'RM' && c.actionedBy !== currentUser.id) return false;
      } else {
        // 'reminders' (default in Assigned Queue)
        if (c.callingStatus !== 'Reminder') return false;
        if (currentUser?.role === 'RM' && c.actionedBy !== currentUser.id && c.assignedTo !== currentUser.id) return false;
      }

      if (searchQueue.trim()) {
        const q = searchQueue.toLowerCase();
        const mName = c.name && c.name.toLowerCase().includes(q);
        const mPhone = matchesMobileSearch(c.mobile, searchQueue);
        const mBiz = c.business && c.business.toLowerCase().includes(q);
        if (!mName && !mPhone && !mBiz) return false;
      }
      return true;
    });

    if (activeTab === 'focused' && currentUser?.role === 'RM') {
      const { rmCount, rmIndex } = rmQueueInfo;
      return filtered
        .map((item, originalIdx) => {
          const isDirectlyAssigned = item.assignedTo === currentUser.id ? 0 : 1;
          const bucket = getCustomerBucket(item, rmCount);
          const rotatedBucket = (bucket - rmIndex + rmCount) % rmCount;
          return { item, originalIdx, isDirectlyAssigned, rotatedBucket };
        })
        .sort((a, b) => {
          if (a.isDirectlyAssigned !== b.isDirectlyAssigned) {
            return a.isDirectlyAssigned - b.isDirectlyAssigned;
          }
          if (a.rotatedBucket !== b.rotatedBucket) {
            return a.rotatedBucket - b.rotatedBucket;
          }
          return a.originalIdx - b.originalIdx;
        })
        .map(entry => entry.item);
    }

    return filtered;
  }, [focusedCustomers, assignedCustomers, activeTab, queueFilter, searchQueue, currentUser, rmQueueInfo, callLocks]);

  // Derived focused contact from explicit selectedContactId
  const focusedIndex = useMemo(() => {
    if (!selectedContactId) return -1;
    return displayQueue.findIndex(c => c.id === selectedContactId);
  }, [displayQueue, selectedContactId]);

  const currentFocusedContact = focusedIndex >= 0 ? displayQueue[focusedIndex] : null;

  const selectContactForCall = (contact) => {
    if (!contact) return;
    const res = claimCallLock(contact.id);
    if (!res.ok) {
      showToast(`This contact is currently selected by ${res.lockedByName} for calling.`, 'info');
      return;
    }
    setSelectedContactId(contact.id);
  };

  const clearSelectedContact = () => {
    setSelectedContactId(null);
    releaseCallLock();
  };

  // Heartbeat to keep the lock alive while the RM is actively viewing/dialing the contact
  useEffect(() => {
    if (!selectedContactId || activeTab !== 'focused') return;
    const interval = setInterval(() => {
      refreshCallLock(selectedContactId);
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedContactId, activeTab]);

  // Release call lock when leaving the Telecalling page
  useEffect(() => {
    return () => {
      releaseCallLock();
    };
  }, []);

  // Release selection if user switches accounts, leaves Focused tab, or changes DB/classification
  useEffect(() => {
    setSelectedContactId(null);
    releaseCallLock();
  }, [currentUser?.id, selectedDb, selectedType]);

  useEffect(() => {
    if (activeTab !== 'focused' && selectedContactId) {
      setSelectedContactId(null);
      releaseCallLock();
    }
  }, [activeTab]);

  // Clear selectedContactId if it disappears from displayQueue (e.g., after action or external update)
  useEffect(() => {
    if (selectedContactId && focusedIndex === -1) {
      setSelectedContactId(null);
      releaseCallLock(selectedContactId);
    }
  }, [selectedContactId, focusedIndex]);

  // Sync manual response form with current selected contact
  useEffect(() => {
    if (currentFocusedContact) {
      setOutcome(
        ['OK', 'Not Attend', 'No Need', 'Reminder', 'Field Visit'].includes(currentFocusedContact.callingStatus)
          ? currentFocusedContact.callingStatus
          : ''
      );
      setRemarks(currentFocusedContact.reminderRemark || '');
      setReminderDate(currentFocusedContact.reminderDate || '');
    }
  }, [currentFocusedContact?.id]);

  const handleSaveResponse = (andNext = false) => {
    if (!currentFocusedContact) return;

    if (!outcome) {
      alert('Please select a Call Outcome');
      return;
    }

    if (outcome === 'Reminder' && !reminderDate) {
      alert('Please select a Follow-up Date for Reminder');
      return;
    }

    const currentIdx = focusedIndex;
    const remainingContacts = displayQueue.filter(c => c.id !== currentFocusedContact.id);

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
    setOutcome('');

    if (andNext && remainingContacts.length > 0) {
      const nextCandidate = remainingContacts[Math.min(Math.max(currentIdx, 0), remainingContacts.length - 1)] || remainingContacts[0];
      const res = claimCallLock(nextCandidate.id);
      setSelectedContactId(res.ok ? nextCandidate.id : null);
    } else {
      clearSelectedContact();
    }
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

  // Numbers added/submitted by current RM / logged-in user
  // Shows all added numbers by default; if user selects Database and/or Classification, filters accordingly
  const myAddedCustomers = useMemo(() => {
    return customers.filter(c => {
      const isMine = (currentUser?.id && c.submittedBy === currentUser.id) ||
                     (currentUser?.name && c.submittedByName === currentUser.name);
      if (!isMine) return false;
      if (selectedDb && c.databaseType !== selectedDb) return false;
      if (selectedType && c.customerType !== selectedType) return false;
      return true;
    });
  }, [customers, currentUser, selectedDb, selectedType]);

  const myAddedCount = myAddedCustomers.length;

  useEffect(() => {
    setMyNumbersPage(1);
  }, [searchMyNumbers]);

  const filteredMyNumbers = useMemo(() => {
    return myAddedCustomers.filter(c => {
      if (!searchMyNumbers.trim()) return true;
      const q = searchMyNumbers.toLowerCase();
      const mName = c.name && c.name.toLowerCase().includes(q);
      const mPhone = matchesMobileSearch(c.mobile, searchMyNumbers);
      const mBiz = c.business && c.business.toLowerCase().includes(q);
      const mCity = c.city && c.city.toLowerCase().includes(q);
      const mSource = c.source && c.source.toLowerCase().includes(q);
      return mName || mPhone || mBiz || mCity || mSource;
    });
  }, [myAddedCustomers, searchMyNumbers]);

  const paginatedMyNumbers = useMemo(() => {
    const start = (myNumbersPage - 1) * itemsPerPage;
    return filteredMyNumbers.slice(start, start + itemsPerPage);
  }, [filteredMyNumbers, myNumbersPage, itemsPerPage]);
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

  const handleResetCallingFilters = () => {
    setReportDateRange('this-month');
    setSelectedOutcomeFilter('All');
    setCustomStartDate('');
    setCustomEndDate('');
    setHistoryPage(1);
  };

  const handleExportCalls = () => {
    const data = filteredCalls.map((c, idx) => ({
      "Sl No": idx + 1,
      "Customer Name": c.customerName,
      "Mobile Contact": formatMobileNumber(c.mobile),
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
      {/* 2-Step Database & Classification Selector Card */}
      <div className="rounded-2xl border-2 border-burgundy-100 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Database & Classification Filter
            </span>
            {(activeTab === 'queue' || activeTab === 'my-numbers') && (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Optional: Showing all data by default
              </span>
            )}
           
          </div>

          {(selectedDb || selectedType) && (
            <button
              onClick={() => {
                setSelectedDb(null);
                setSelectedType(null);
                clearSelectedContact();
              }}
              className="text-xs font-bold text-burgundy-900 hover:text-burgundy-700 underline self-start sm:self-auto flex items-center gap-1"
            >
              <span>✕ Clear Filter (Show All)</span>
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
                {activeTab === 'focused' && <span className="text-rose-500">*</span>}
              </label>
              {selectedDb ? (
                <span className="text-[11px] font-bold text-emerald-700">
                  Selected: {selectedDb === 'old' ? 'Old Database' : 'New Database'}
                </span>
              ) : (
                (activeTab === 'queue' || activeTab === 'my-numbers') && (
                  <span className="text-[10px] text-slate-400 font-semibold">(All Databases)</span>
                )
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedDb(selectedDb === 'old' ? null : 'old');
                  clearSelectedContact();
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
                  setSelectedDb(selectedDb === 'new' ? null : 'new');
                  clearSelectedContact();
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
                  selectedType ? 'bg-gold-500 text-amber-950' : 'bg-slate-300 text-slate-600'
                }`}>2</span>
                <span>Select Classification</span>
                {activeTab === 'focused' && <span className="text-rose-500">*</span>}
              </label>
              {selectedType ? (
                <span className="text-[11px] font-bold text-emerald-700">
                  Selected: {selectedType === 'known' ? 'Known' : 'Unknown'}
                </span>
              ) : (
                (activeTab === 'queue' || activeTab === 'my-numbers') ? (
                  <span className="text-[10px] text-slate-400 font-semibold">(All Classifications)</span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-semibold">(Pick Step 1 first)</span>
                )
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedType(selectedType === 'known' ? null : 'known');
                  clearSelectedContact();
                }}
                className={`p-3 rounded-xl border-2 transition text-left flex flex-col justify-between ${
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
                  {selectedDb ? (selectedDb === 'old' ? oldKnownCount : newKnownCount) : (oldKnownCount + newKnownCount)} Fresh Numbers
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedType(selectedType === 'unknown' ? null : 'unknown');
                  clearSelectedContact();
                }}
                className={`p-3 rounded-xl border-2 transition text-left flex flex-col justify-between ${
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
                  {selectedDb ? (selectedDb === 'old' ? oldUnknownCount : newUnknownCount) : (oldUnknownCount + newUnknownCount)} Fresh Numbers
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
          <span>Assigned Queue ({myRemindersCount + myActionedCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('my-numbers')}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'my-numbers'
              ? 'border-burgundy-800 text-burgundy-900 bg-[#FAF6EF]/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span>My Added Numbers ({myAddedCount})</span>
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

      {/* If neither or only one is selected and on focused tab, show selection guidance */}
      {(!selectedDb || !selectedType) && activeTab === 'focused' ? (
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

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={clearSelectedContact}
                      className="flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition"
                      title="Release this contact without saving so other RMs can see and call it"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Release</span>
                    </button>
                    <button
                      onClick={() => selectContactForCall(displayQueue[focusedIndex - 1])}
                      disabled={focusedIndex <= 0}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>
                    <button
                      onClick={() => selectContactForCall(displayQueue[focusedIndex + 1])}
                      disabled={focusedIndex < 0 || focusedIndex >= displayQueue.length - 1}
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
                      </div>
                      <div className="text-sm font-semibold text-gold-700 mt-1">
                        {currentFocusedContact.business || 'Commercial Enterprise'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {[currentFocusedContact.city, currentFocusedContact.state].filter(Boolean).join(', ')}
                        {[currentFocusedContact.city, currentFocusedContact.state].filter(Boolean).length > 0 ? ' • ' : ''}
                        Source: {currentFocusedContact.source}
                      </div>
                    </div>

                    {/* Customer Mobile Number to Dial Manually */}
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                        Mobile Number to Dial:
                      </div>
                      <div className="inline-block bg-burgundy-50 border border-burgundy-200 px-4 py-2 rounded-xl shadow-sm">
                        <span className="text-xl font-mono font-extrabold text-burgundy-900 tracking-wider">
                          {formatMobileNumber(currentFocusedContact.mobile)}
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
            ) : displayQueue.length > 0 ? (
              <div className="text-center py-16 px-4 space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-burgundy-50 text-burgundy-900 border border-burgundy-200 shadow-sm">
                  <PhoneCall className="w-7 h-7 text-burgundy-800" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800 font-corporate">
                    Select a Contact from Queue Leads
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                    Click any contact in the <strong>Queue Leads</strong> panel to open its mobile number and dial. Once selected, that contact is hidden from other RMs until you save or release it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => selectContactForCall(displayQueue[0])}
                  className="inline-flex items-center gap-2 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 px-5 py-2.5 text-xs font-bold text-white shadow-md transition"
                >
                  <PhoneCall className="w-4 h-4 text-gold-300" />
                  <span>Select First Available Lead</span>
                </button>
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
                displayQueue.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => selectContactForCall(item)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                      item.id === selectedContactId
                        ? 'border-burgundy-800 bg-burgundy-50/60 ring-2 ring-burgundy-800/15'
                        : 'border-slate-200 hover:bg-[#FAF6EF]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{item.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        item.id === selectedContactId
                          ? 'border-burgundy-300 bg-burgundy-50 text-burgundy-900'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      }`}>
                        {item.id === selectedContactId ? '● Selected' : '★ Fresh Number'}
                      </span>
                    </div>
                    <div className="font-mono text-slate-600 text-[11px] mt-0.5">{formatMobileNumber(item.mobile)}</div>
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
                onClick={() => setQueueFilter('reminders')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 ${
                  queueFilter === 'reminders'
                    ? 'bg-amber-700 text-white border-amber-700 shadow-sm'
                    : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
                }`}
              >
                <span>My Due Reminders ({myRemindersCount})</span>
              </button>
              <button
                onClick={() => setQueueFilter('completed')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 ${
                  queueFilter === 'completed'
                    ? 'bg-burgundy-900 text-white border-burgundy-900 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>My Actioned Calls ({myActionedCount})</span>
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
                  <th className="px-4 py-3">Sl.No</th>
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
                {paginatedQueue.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                      {queueFilter === 'reminders' ? 'No due reminders found.' : 'No actioned calls found.'}
                    </td>
                  </tr>
                ) : (
                  paginatedQueue.map((item, idx) => {
                    const slNo = (queuePage - 1) * itemsPerPage + idx + 1;
                    return (
                      <tr key={item.id} className="hover:bg-[#FAF6EF]/60 transition">
                        <td className="px-4 py-3 font-semibold text-slate-700">{slNo}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.name}</td>
                        <td className="px-4 py-3 font-mono font-medium">{formatMobileNumber(item.mobile)}</td>
                        <td className="px-4 py-3">{item.business || 'General Client'}</td>
                        <td className="px-4 py-3">{item.city || item.state || '-'}</td>
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
                              const qIdx = displayQueue.findIndex(q => q.id === item.id);
                              if (qIdx !== -1) setFocusedIndex(qIdx);
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
                    );
                  })
                )}
              </tbody>
            </table>
            </div>

            {/* Reusable Pagination for Queue */}
            <Pagination
              currentPage={queuePage}
              totalItems={displayQueue.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setQueuePage}
              summaryLabel={queueFilter === 'reminders' ? 'reminders' : 'actioned calls'}
            />
          </div>
        </div>
      )}
        </>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB: MY ADDED NUMBERS TRACKING & AUDIT               */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'my-numbers' && (
        <div className="space-y-4">
          {/* Header & Filter Controls */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>My Added Numbers</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-burgundy-50 text-burgundy-900 border border-burgundy-200">
                  {myAddedCount} Total
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Track all direct telephone numbers and leads submitted by you ({currentUser?.name || 'RM'})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search your added numbers..."
                  value={searchMyNumbers}
                  onChange={(e) => setSearchMyNumbers(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-1.5 pl-8 pr-3 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-sm shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-gold-300" />
                <span>Add Number</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[750px]">
                <thead className="bg-[#FAF6EF] text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Sl.No</th>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Mobile Contact</th>
                    <th className="px-4 py-3">Business</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Database</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Calling Status</th>
                    <th className="px-4 py-3">Date Added</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedMyNumbers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-xs text-slate-500">
                        <div className="max-w-sm mx-auto space-y-2">
                          <p className="font-semibold text-slate-700">No numbers added yet</p>
                          <p className="text-slate-400 text-[11px]">
                            You can add new direct numbers to the database anytime. Click below to add your first number.
                          </p>
                          <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 text-white px-4 py-2 text-xs font-bold shadow-sm transition mt-2"
                          >
                            <Plus className="w-3.5 h-3.5 text-gold-300" />
                            <span>Add New Number</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedMyNumbers.map((item, idx) => {
                      const slNo = (myNumbersPage - 1) * itemsPerPage + idx + 1;
                      return (
                        <tr key={item.id} className="hover:bg-[#FAF6EF]/60 transition">
                          <td className="px-4 py-3 font-semibold text-slate-700">{slNo}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{item.name}</td>
                          <td className="px-4 py-3 font-mono font-medium">{formatMobileNumber(item.mobile)}</td>
                          <td className="px-4 py-3">{item.business || 'General Client'}</td>
                          <td className="px-4 py-3">{[item.city, item.state].filter(Boolean).join(', ') || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {item.databaseType || 'new'} / {item.customerType || 'known'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                              {item.source || 'Bills'}{item.referenceFrom ? ` (${item.referenceFrom})` : ''}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(item.callingStatus)}`}>
                              {item.callingStatus || 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                            {item.createdAt ? formatDate(item.createdAt) : 'Recent'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedDb(item.databaseType || 'new');
                                setSelectedType(item.customerType || 'known');
                                setActiveTab('focused');
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-burgundy-900 hover:bg-burgundy-800 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                              title="Go to focused calling for this lead"
                            >
                              <PhoneCall className="w-3.5 h-3.5 text-gold-300" />
                              <span>Call Now</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Reusable Pagination for My Added Numbers */}
            <Pagination
              currentPage={myNumbersPage}
              totalItems={filteredMyNumbers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setMyNumbersPage}
              summaryLabel="added numbers"
            />
          </div>
        </div>
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
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">1. OK </span>
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Time Horizon</label>
                    <select
                      value={reportDateRange}
                      onChange={(e) => setReportDateRange(e.target.value)}
                      className="w-full h-9 text-xs rounded-xl border border-slate-300 px-3 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-burgundy-800"
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
                      className="w-full h-9 text-xs rounded-xl border border-slate-300 px-3 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-burgundy-800"
                    >
                      <option value="All">All Outcomes</option>
                      <option value="OK">OK</option>
                      <option value="Not Attend">Not Attend</option>
                      <option value="No Need">No Need</option>
                      <option value="Reminder">Reminder</option>
                      <option value="Field Visit">Field Visit</option>
                    </select>
                  </div>

                  {/* Reset Filters Button */}
                  <div>
                    <label className="block text-xs font-semibold text-transparent mb-1 select-none pointer-events-none">
                      Reset
                    </label>
                    <button
                      type="button"
                      onClick={handleResetCallingFilters}
                      className="w-full h-9 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 px-4 text-xs font-bold transition shadow-sm"
                      title="Reset filters to default"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reset Filters</span>
                    </button>
                  </div>
                </div>

                {reportDateRange === 'range' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full h-9 text-xs rounded-xl border border-slate-300 px-3 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-burgundy-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full h-9 text-xs rounded-xl border border-slate-300 px-3 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-burgundy-800"
                      />
                    </div>
                  </div>
                )}
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
                    <th className="px-4 py-3">Sl.No</th>
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
                  {paginatedHistory.map((c, idx) => {
                    const slNo = (historyPage - 1) * itemsPerPage + idx + 1;
                    return (
                      <tr key={c.id} className="hover:bg-[#FAF6EF]/60 transition">
                        <td className="px-4 py-3 font-semibold text-slate-700">{slNo}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{c.customerName}</td>
                      <td className="px-4 py-3 font-mono font-medium">{formatMobileNumber(c.mobile)}</td>
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
                    );
                  })}
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

      {/* Add Database Record Modal for RM */}
      <AddDatabaseRecordModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultDatabase={selectedDb || 'new'}
        defaultType={selectedType || 'known'}
      />
    </div>
  );
};
