import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  PhoneMissed,
  XCircle,
  CalendarClock,
  MapPin,
  X,
  AlertTriangle,
  ArrowRight,
  LogIn,
  ShieldCheck,
  Building2,
  FileCheck,
  IndianRupee
} from 'lucide-react';
import { formatDate, formatDateDDMMYYYY, formatMobileNumber, formatCurrency } from '../../utils/formatters';

const MANDATORY_ROLES = ['RM', 'Sales Manager', 'Ops'];
const LOGIN_FOLLOWUP_ROLES = ['RM', 'Sales Manager'];
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const parseAttendanceTimestamp = (rec) => {
  if (!rec) return null;
  if (typeof rec.punchedAt === 'number' && !isNaN(rec.punchedAt)) return rec.punchedAt;
  if (rec.punchedAtIso) {
    const t = new Date(rec.punchedAtIso).getTime();
    if (!isNaN(t)) return t;
  }
  if (rec.date && /^\d{2}-\d{2}-\d{4}$/.test(rec.date)) {
    const [dd, mm, yyyy] = rec.date.split('-').map(Number);
    let hours = 9;
    let minutes = 0;
    let seconds = 0;
    if (rec.inTime) {
      const m = rec.inTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (m) {
        hours = parseInt(m[1], 10);
        minutes = parseInt(m[2], 10);
        seconds = m[3] ? parseInt(m[3], 10) : 0;
        const mer = (m[4] || '').toLowerCase();
        if (mer === 'pm' && hours < 12) hours += 12;
        if (mer === 'am' && hours === 12) hours = 0;
      }
    }
    const parsed = new Date(yyyy, mm - 1, dd, hours, minutes, seconds).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return null;
};

export const FollowUpReminderModal = () => {
  const { showFollowUpModal, setShowFollowUpModal, currentUser, showToast, loginSessionNonce } = useAuth();
  const {
    customers,
    bankLogins = [],
    logCall,
    updateCustomer,
    addLoginUpdate,
    disburseLogin,
    rejectLogin,
    attendance = [],
    punchIn
  } = useCRM();

  // Per-contact selected outcome state
  const [selectedOutcomes, setSelectedOutcomes] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [rescheduleDates, setRescheduleDates] = useState({});
  // Track follow-ups responded in the current login session (handles rescheduling via "4. Reminder")
  const [respondedIds, setRespondedIds] = useState([]);

  // Per-bank-login 2-day routine follow-up action state (for RM and Sales Manager)
  const [respondedLoginIds, setRespondedLoginIds] = useState([]);
  const [selectedLoginActions, setSelectedLoginActions] = useState({}); // { [loginId]: 'update' | 'disburse' | 'reject' }
  const [loginForms, setLoginForms] = useState({});

  // Live clock to trigger 24-hour Punch In check automatically
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Reset per-login session state whenever user changes or re-logs in
  useEffect(() => {
    setRespondedIds([]);
    setSelectedOutcomes({});
    setRemarksMap({});
    setRescheduleDates({});
    setRespondedLoginIds([]);
    setSelectedLoginActions({});
    setLoginForms({});
    setNowMs(Date.now());
  }, [currentUser?.id, loginSessionNonce]);

  const isMandatoryFollowUpRole = Boolean(currentUser && MANDATORY_ROLES.includes(currentUser.role));
  const isLoginFollowUpRole = Boolean(currentUser && LOGIN_FOLLOWUP_ROLES.includes(currentUser.role));
  const todayIsoStr = new Date(nowMs).toISOString().split('T')[0];

  // Filter pending telecalling follow-up reminders scoped to current user (mandatory step on login for RM, Sales Manager, Ops)
  const myReminders = useMemo(() => {
    if (!currentUser) return [];
    return (customers || []).filter(c => {
      if (c.callingStatus !== 'Reminder') return false;
      if (respondedIds.includes(c.id)) return false;

      if (currentUser.role === 'RM') {
        return c.assignedTo === currentUser.id || c.actionedBy === currentUser.id;
      }
      if (currentUser.role === 'Sales Manager') {
        return (
          c.submittedBy === currentUser.id ||
          c.referenceFrom?.includes(currentUser.name) ||
          c.assignedTo === currentUser.id
        );
      }
      if (currentUser.role === 'Ops') {
        return (
          c.assignedTo === currentUser.id ||
          c.actionedBy === currentUser.id ||
          c.submittedBy === currentUser.id
        );
      }
      return true;
    });
  }, [customers, currentUser, respondedIds]);

  // Filter 2-day due Bank Login customer follow-ups for RM & Sales Manager roles
  const myDueBankLogins = useMemo(() => {
    if (!currentUser || !isLoginFollowUpRole) return [];
    const myNameLower = (currentUser.name || '').trim().toLowerCase();

    return (bankLogins || []).filter(b => {
      if (b.status !== 'In Progress') return false;
      if (respondedLoginIds.includes(b.id)) return false;

      const matchId =
        (b.assignedRMId && b.assignedRMId === currentUser.id) ||
        (b.createdBy && b.createdBy === currentUser.id) ||
        (b.submittedBy && b.submittedBy === currentUser.id);
      const matchName = Boolean(
        myNameLower &&
          ((b.assignedRMName && b.assignedRMName.trim().toLowerCase() === myNameLower) ||
            (b.createdByName && b.createdByName.trim().toLowerCase() === myNameLower) ||
            (b.submittedByName && b.submittedByName.trim().toLowerCase() === myNameLower))
      );
      if (!matchId && !matchName) return false;

      if (!b.nextFollowUpDate) {
        const refDate = b.lastUpdateDate || b.loginDate || b.createdAt;
        if (!refDate) return true;
        const diffMs = new Date(todayIsoStr) - new Date(String(refDate).slice(0, 10));
        return diffMs / (1000 * 60 * 60 * 24) >= 2;
      }
      return b.nextFollowUpDate <= todayIsoStr;
    });
  }, [bankLogins, currentUser, isLoginFollowUpRole, respondedLoginIds, todayIsoStr]);

  // Determine 24-hour Punch-In status for ANY logged-in user (Admin accounts are strictly exempted)
  const punchStatus = useMemo(() => {
    if (!currentUser || currentUser.role === 'Admin') return { isPunchDue: false, lastPunch: null };
    const userPunches = (attendance || [])
      .filter(a => a.employeeId === currentUser.id)
      .map(rec => ({ rec, ts: parseAttendanceTimestamp(rec) }))
      .filter(entry => entry.ts !== null)
      .sort((a, b) => b.ts - a.ts);

    const latest = userPunches[0] || null;
    if (!latest) {
      return { isPunchDue: true, lastPunch: null };
    }
    const elapsed = nowMs - latest.ts;
    return {
      isPunchDue: elapsed >= TWENTY_FOUR_HOURS_MS,
      lastPunch: latest.rec
    };
  }, [attendance, currentUser, nowMs]);

  const totalPendingFollowUps = myReminders.length + myDueBankLogins.length;
  const isPunchDueForUser = Boolean(currentUser && currentUser.role !== 'Admin' && punchStatus.isPunchDue);
  const hasMandatoryFollowUps = isMandatoryFollowUpRole && totalPendingFollowUps > 0;
  const hasVisibleFollowUps = totalPendingFollowUps > 0 && (isMandatoryFollowUpRole || showFollowUpModal);

  // Mandatory modal behavior:
  // 1) For RM / Sales Manager / Ops: if follow-ups exist -> complete all follow-ups first (no Close button)
  // 2) For other roles (except Admin): every 24 hrs, without Punch In -> cannot close popup or start work until Punch In is completed
  // 3) Admin role is completely exempted from mandatory punch in and reminder popup
  const shouldForceOpen = Boolean(currentUser && currentUser.role !== 'Admin' && (isPunchDueForUser || (showFollowUpModal && hasMandatoryFollowUps)));
  const shouldOpen = shouldForceOpen || (showFollowUpModal && totalPendingFollowUps > 0);

  if (!currentUser || currentUser.role === 'Admin' || !shouldOpen) return null;

  // Step mode: for RM/Sales Manager/Ops follow-ups come first; for other roles show follow-ups only if manually opened, otherwise mandatory Punch In
  const currentStep = hasMandatoryFollowUps || (showFollowUpModal && hasVisibleFollowUps && !isPunchDueForUser)
    ? 'followups'
    : 'punchin';
  const canClosePopup = currentStep === 'punchin'
    ? !isPunchDueForUser
    : (!hasMandatoryFollowUps && !isPunchDueForUser);

  const handleSelectOutcome = (customerId, outcome) => {
    setSelectedOutcomes(prev => ({ ...prev, [customerId]: outcome }));
    const customer = customers.find(c => c.id === customerId);
    if (outcome === 'Reminder' && customer?.reminderDate) {
      setRescheduleDates(prev => ({ ...prev, [customerId]: customer.reminderDate }));
    }
  };

  const handleCancelOutcome = (customerId) => {
    setSelectedOutcomes(prev => {
      const copy = { ...prev };
      delete copy[customerId];
      return copy;
    });
  };

  const handleSaveDisposition = (customerId) => {
    const outcome = selectedOutcomes[customerId];
    if (!outcome) return;

    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const cName = customer?.name || 'Customer';

    if (outcome === 'Reminder') {
      const remDate = rescheduleDates[customerId] || '';
      if (!remDate) {
        alert('Please select a Follow-up Date for Reminder');
        return;
      }
      const remNote = remarksMap[customerId]?.trim() || customer.reminderRemark || 'Rescheduled follow-up call';

      logCall({
        customerId,
        outcome: 'Reminder',
        duration: 'Manual Call',
        remarks: remNote,
        reminderDate: remDate
      });

      updateCustomer(customerId, {
        callingStatus: 'Reminder',
        reminderDate: remDate,
        reminderRemark: remNote,
        lastCalledDate: new Date().toISOString().split('T')[0]
      });

      showToast(`Follow-up rescheduled for ${cName} to ${remDate}`, 'info');
    } else {
      const defaultNotes = {
        'OK': 'Interested / Converted - Customer confirmed interest in advisory services',
        'Not Attend': 'Not Attend - Ringing / Busy / Switched Off',
        'No Need': 'No Need - Not Interested / DND requested',
        'Field Visit': 'Field Visit - Customer requested direct / in-person meeting or site inspection'
      };
      const note = remarksMap[customerId]?.trim() || defaultNotes[outcome] || `Outcome: ${outcome}`;

      logCall({
        customerId,
        outcome,
        duration: 'Manual Call',
        remarks: note,
        reminderDate: outcome === 'Field Visit' ? (rescheduleDates[customerId] || '') : ''
      });

      updateCustomer(customerId, {
        callingStatus: outcome,
        lastCalledDate: new Date().toISOString().split('T')[0]
      });

      showToast(`Follow-up saved: ${cName} marked as ${outcome}`, 'success');
    }

    // Mark responded in current login flow so next step (Punch In) unlocks once all are answered
    const updatedResponded = [...respondedIds, customerId];
    setRespondedIds(updatedResponded);
    handleCancelOutcome(customerId);

    // If that was the last follow-up and Punch In is already satisfied (< 24h), auto-close smoothly
    const remainingRemindersCount = myReminders.filter(r => r.id !== customerId).length;
    if (remainingRemindersCount + myDueBankLogins.length === 0 && !isPunchDueForUser) {
      setShowFollowUpModal(false);
    }
  };

  // Bank Login 2-Day Reminder Action Handlers (for RM and Sales Manager)
  const handleSelectLoginAction = (login, actionType) => {
    setSelectedLoginActions(prev => ({ ...prev, [login.id]: actionType }));
    setLoginForms(prev => ({
      ...prev,
      [login.id]: prev[login.id] || {
        updateNote: '',
        bankName: login.bankName || '',
        loanAmount: login.loanAmount || '',
        loanType: login.loanType || 'Personal Loan',
        interestRate: login.interestRate || '',
        disbursementDate: todayIsoStr,
        disburseRemarks: '',
        rejectionRemarks: ''
      }
    }));
  };

  const handleCancelLoginAction = (loginId) => {
    setSelectedLoginActions(prev => {
      const copy = { ...prev };
      delete copy[loginId];
      return copy;
    });
  };

  const updateLoginFormField = (loginId, field, value) => {
    setLoginForms(prev => ({
      ...prev,
      [loginId]: {
        ...(prev[loginId] || {}),
        [field]: value
      }
    }));
  };

  const handleSaveLoginAction = (login) => {
    const actionType = selectedLoginActions[login.id];
    const form = loginForms[login.id] || {};
    if (!actionType) return;

    if (actionType === 'update') {
      if (!form.updateNote?.trim()) {
        alert('Please enter today\'s update / bank progress note');
        return;
      }
      addLoginUpdate(login.id, form.updateNote.trim());
    } else if (actionType === 'disburse') {
      if (!form.bankName?.trim() || !String(form.loanAmount || '').trim() || !form.loanType?.trim()) {
        alert('Please enter Bank Name, Disbursed Amount, and Loan Type');
        return;
      }
      disburseLogin(login.id, {
        bankName: form.bankName.trim(),
        loanAmount: String(form.loanAmount).trim(),
        loanType: form.loanType.trim(),
        interestRate: (form.interestRate || '').trim(),
        disbursementDate: form.disbursementDate || todayIsoStr,
        remarks: (form.disburseRemarks || '').trim()
      });
    } else if (actionType === 'reject') {
      if (!form.rejectionRemarks?.trim()) {
        alert('Please enter rejection remarks / reason');
        return;
      }
      rejectLogin(login.id, {
        remarks: form.rejectionRemarks.trim()
      });
    }

    setRespondedLoginIds(prev => [...prev, login.id]);
    handleCancelLoginAction(login.id);

    const remainingLoginCount = myDueBankLogins.filter(b => b.id !== login.id).length;
    if (myReminders.length + remainingLoginCount === 0 && !isPunchDueForUser) {
      setShowFollowUpModal(false);
    }
  };

  const handleMandatoryPunchIn = () => {
    const res = punchIn();
    if (res?.success || res?.alreadyPunched) {
      setNowMs(Date.now());
      setShowFollowUpModal(false);
    }
  };

  const todayDisplay = formatDateDDMMYYYY(new Date(nowMs));
  const liveClockStr = new Date(nowMs).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return createPortal(
    <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-gold-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-burgundy-900 via-burgundy-800 to-burgundy-950 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400 text-burgundy-950 shadow-md">
              {currentStep === 'followups' ? (
                <CalendarCheck className="w-6 h-6" />
              ) : (
                <Clock className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {currentStep === 'followups'
                  ? 'Action Required: Pending Follow-ups'
                  : 'Daily Attendance: Punch In Required'}
              </h2>
              <p className="text-xs text-gold-200">
                Logged in as <span className="font-semibold text-white">{currentUser?.name}</span> ({currentUser?.role})
              </p>
            </div>
          </div>

          {canClosePopup && (
            <button
              onClick={() => setShowFollowUpModal(false)}
              className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* STEP 1: MANDATORY FOLLOW-UPS */}
        {currentStep === 'followups' ? (
          <>
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex-wrap">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Respond to all <strong>{totalPendingFollowUps}</strong> pending follow-up(s) to continue
                    {isPunchDueForUser ? ' to Daily Punch In.' : '.'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {myDueBankLogins.length > 0 && (
                    <span className="text-[11px] font-bold text-burgundy-900 bg-burgundy-50 border border-burgundy-200 px-2.5 py-1 rounded-lg">
                      Login 2-Day Due ({myDueBankLogins.length})
                    </span>
                  )}
                  {myReminders.length > 0 && (
                    <span className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                      Call Reminders ({myReminders.length})
                    </span>
                  )}
                </div>
              </div>

              {/* 2-Day Bank Login Customer Follow-ups (for RM & Sales Manager) */}
              {myDueBankLogins.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-burgundy-900">
                    <Building2 className="w-4 h-4 text-burgundy-700" />
                    <span>2-Day Login Customer Follow-ups ({myDueBankLogins.length})</span>
                  </div>

                  {myDueBankLogins.map(b => {
                    const activeLoginAction = selectedLoginActions[b.id];
                    const form = loginForms[b.id] || {};
                    const lastUpdate = b.updates?.[0];
                    const displayAmount = b.loanAmount
                      ? (typeof b.loanAmount === 'number'
                          ? formatCurrency(b.loanAmount)
                          : /^\d+(\.\d+)?$/.test(String(b.loanAmount).replace(/,/g, '').trim())
                          ? formatCurrency(Number(String(b.loanAmount).replace(/,/g, '').trim()))
                          : String(b.loanAmount).startsWith('₹')
                          ? b.loanAmount
                          : `₹ ${b.loanAmount}`)
                      : '-';

                    return (
                      <div
                        key={`login-${b.id}`}
                        className="rounded-2xl border-2 border-burgundy-200 bg-gradient-to-br from-burgundy-50/40 via-white to-amber-50/40 p-4 transition hover:border-burgundy-400 hover:shadow-md space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-extrabold uppercase bg-burgundy-900 text-gold-300 px-2 py-0.5 rounded-full">
                                Bank Login
                              </span>
                              <span className="text-sm font-bold text-burgundy-950">{b.customerName}</span>
                              {b.customerId && (
                                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                  {b.customerId}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-800 font-mono">{formatMobileNumber(b.mobile)}</span>
                              <span>•</span>
                              <span className="font-bold text-burgundy-900">{b.bankName}</span>
                              <span>•</span>
                              <span>{b.loanType || 'Loan'} ({displayAmount})</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg self-start sm:self-center">
                            <Clock className="w-3.5 h-3.5 text-rose-600" />
                            <span>
                              2-Day Due: {b.nextFollowUpDate ? formatDate(b.nextFollowUpDate) : 'Immediate'}
                            </span>
                          </div>
                        </div>

                        {lastUpdate && (
                          <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 italic">
                            <span className="not-italic font-bold text-slate-500 mr-1">
                              Last ({formatDate(lastUpdate.date)}):
                            </span>
                            "{lastUpdate.note}"
                          </div>
                        )}

                        {/* Login Action Selection Buttons */}
                        <div className="pt-2 border-t border-slate-200/70 space-y-2">
                          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                            <span>Take Action on Login File (Any One):</span>
                            {activeLoginAction && (
                              <span className="text-[10px] text-burgundy-900 font-bold bg-burgundy-50 px-2 py-0.5 rounded border border-burgundy-200 uppercase">
                                Selected: {activeLoginAction === 'update' ? '2-Day Update' : activeLoginAction}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectLoginAction(b, 'update')}
                              className={`p-2.5 rounded-xl border-2 transition flex flex-col items-center text-center ${
                                activeLoginAction === 'update'
                                  ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20 shadow-sm'
                                  : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <CalendarClock className={`w-4 h-4 mb-1 ${activeLoginAction === 'update' ? 'text-amber-600' : 'text-slate-400'}`} />
                              <span className="text-xs font-bold">1. 2-Day Update</span>
                              <span className="text-[10px] text-slate-500">Add progress &amp; +2d reminder</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectLoginAction(b, 'disburse')}
                              className={`p-2.5 rounded-xl border-2 transition flex flex-col items-center text-center ${
                                activeLoginAction === 'disburse'
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20 shadow-sm'
                                  : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <CheckCircle2 className={`w-4 h-4 mb-1 ${activeLoginAction === 'disburse' ? 'text-emerald-600' : 'text-slate-400'}`} />
                              <span className="text-xs font-bold">2. Disbursed</span>
                              <span className="text-[10px] text-slate-500">Loan sanctioned / closed</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectLoginAction(b, 'reject')}
                              className={`p-2.5 rounded-xl border-2 transition flex flex-col items-center text-center ${
                                activeLoginAction === 'reject'
                                  ? 'border-rose-600 bg-rose-50 text-rose-950 font-bold ring-2 ring-rose-500/20 shadow-sm'
                                  : 'border-slate-200 bg-white hover:border-rose-300 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <XCircle className={`w-4 h-4 mb-1 ${activeLoginAction === 'reject' ? 'text-rose-600' : 'text-slate-400'}`} />
                              <span className="text-xs font-bold">3. Rejected</span>
                              <span className="text-[10px] text-slate-500">File declined by bank</span>
                            </button>
                          </div>

                          {activeLoginAction && (
                            <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2.5 animate-fade-in">
                              {activeLoginAction === 'update' && (
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Today's Bank Update / Progress Note <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Credit verification completed, sanction expected in 2 days"
                                    value={form.updateNote || ''}
                                    onChange={(e) => updateLoginFormField(b.id, 'updateNote', e.target.value)}
                                    className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-burgundy-800"
                                  />
                                </div>
                              )}

                              {activeLoginAction === 'disburse' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                      Bank Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={form.bankName || ''}
                                      onChange={(e) => updateLoginFormField(b.id, 'bankName', e.target.value)}
                                      className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-burgundy-800"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                      Disbursed Amount (₹) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={form.loanAmount || ''}
                                      onChange={(e) => updateLoginFormField(b.id, 'loanAmount', e.target.value)}
                                      className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-burgundy-800"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                      Loan Type <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={form.loanType || ''}
                                      onChange={(e) => updateLoginFormField(b.id, 'loanType', e.target.value)}
                                      className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-burgundy-800"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                      Rate of Interest (%)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. 9.25% p.a."
                                      value={form.interestRate || ''}
                                      onChange={(e) => updateLoginFormField(b.id, 'interestRate', e.target.value)}
                                      className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-burgundy-800"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                      Disbursement Date
                                    </label>
                                    <input
                                      type="date"
                                      value={form.disbursementDate || todayIsoStr}
                                      onChange={(e) => updateLoginFormField(b.id, 'disbursementDate', e.target.value)}
                                      className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-burgundy-800"
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                      Remarks (Optional)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Sanctioned and disbursed to customer account"
                                      value={form.disburseRemarks || ''}
                                      onChange={(e) => updateLoginFormField(b.id, 'disburseRemarks', e.target.value)}
                                      className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-burgundy-800"
                                    />
                                  </div>
                                </div>
                              )}

                              {activeLoginAction === 'reject' && (
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Rejection Reason / Remarks <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Low CIBIL score / insufficient ITR eligibility"
                                    value={form.rejectionRemarks || ''}
                                    onChange={(e) => updateLoginFormField(b.id, 'rejectionRemarks', e.target.value)}
                                    className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-burgundy-800"
                                  />
                                </div>
                              )}

                              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => handleCancelLoginAction(b.id)}
                                  className="px-3 py-1 text-xs text-slate-500 hover:text-slate-800 font-semibold"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveLoginAction(b)}
                                  className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition ${
                                    activeLoginAction === 'disburse'
                                      ? 'bg-emerald-700 hover:bg-emerald-800'
                                      : activeLoginAction === 'reject'
                                      ? 'bg-rose-700 hover:bg-rose-800'
                                      : 'bg-amber-700 hover:bg-amber-800'
                                  }`}
                                >
                                  {activeLoginAction === 'update'
                                    ? 'Save 2-Day Update'
                                    : activeLoginAction === 'disburse'
                                    ? 'Confirm Disbursed'
                                    : 'Confirm Rejected'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {myReminders.length > 0 && (
                <div className="space-y-4">
                  {myDueBankLogins.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-900 pt-2">
                      <CalendarCheck className="w-4 h-4 text-amber-700" />
                      <span>Telecalling Follow-up Reminders ({myReminders.length})</span>
                    </div>
                  )}
                {myReminders.map(c => {
                  const activeOutcome = selectedOutcomes[c.id];

                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-200 bg-[#FAF6EF]/60 p-4 transition hover:border-gold-300 hover:shadow-md space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-burgundy-900">{c.name}</span>
                            <span className="text-[10px] uppercase font-bold bg-burgundy-50 text-burgundy-800 border border-burgundy-200 px-2 py-0.5 rounded-full">
                              {c.databaseType} / {c.customerType}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            <span className="font-semibold text-slate-800 font-mono">{formatMobileNumber(c.mobile)}</span> • {c.business || c.city} {c.state ? `(${c.state})` : ''}
                          </div>
                        </div>

                        {/* Reminder Due Badge */}
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-100/70 border border-amber-300 px-2.5 py-1 rounded-lg self-start sm:self-center">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>Scheduled: {formatDate(c.reminderDate) || 'Immediate'}</span>
                        </div>
                      </div>

                      {/* Previous Reminder Remark */}
                      {c.reminderRemark && (
                        <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 italic">
                          "{c.reminderRemark}"
                        </div>
                      )}

                      {/* 5 Outcome Selection Buttons */}
                      <div className="pt-2 border-t border-slate-200/70 space-y-2">
                        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                          <span>Select Follow-up Call Outcome (Any One):</span>
                          {activeOutcome && (
                            <span className="text-[10px] text-burgundy-900 font-bold bg-burgundy-50 px-2 py-0.5 rounded border border-burgundy-200">
                              Selected: {activeOutcome}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectOutcome(c.id, 'OK')}
                            className={`p-2.5 rounded-xl border-2 transition flex flex-col items-center text-center ${
                              activeOutcome === 'OK'
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <CheckCircle2 className={`w-4 h-4 mb-1 ${activeOutcome === 'OK' ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold">1. OK</span>
                            <span className="text-[10px] text-slate-500">Interested</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectOutcome(c.id, 'Not Attend')}
                            className={`p-2.5 rounded-xl border-2 transition flex flex-col items-center text-center ${
                              activeOutcome === 'Not Attend'
                                ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold ring-2 ring-blue-500/20 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <PhoneMissed className={`w-4 h-4 mb-1 ${activeOutcome === 'Not Attend' ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold">2. Not Attend</span>
                            <span className="text-[10px] text-slate-500">Ringing / Busy</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectOutcome(c.id, 'No Need')}
                            className={`p-2.5 rounded-xl border-2 transition flex flex-col items-center text-center ${
                              activeOutcome === 'No Need'
                                ? 'border-rose-600 bg-rose-50 text-rose-950 font-bold ring-2 ring-rose-500/20 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-rose-300 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <XCircle className={`w-4 h-4 mb-1 ${activeOutcome === 'No Need' ? 'text-rose-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold">3. No Need</span>
                            <span className="text-[10px] text-slate-500">Not Interested</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectOutcome(c.id, 'Reminder')}
                            className={`p-2.5 rounded-xl border-2 transition flex flex-col items-center text-center ${
                              activeOutcome === 'Reminder'
                                ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <CalendarClock className={`w-4 h-4 mb-1 ${activeOutcome === 'Reminder' ? 'text-amber-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold">4. Reminder</span>
                            <span className="text-[10px] text-slate-500">Follow-up</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectOutcome(c.id, 'Field Visit')}
                            className={`p-2.5 rounded-xl border-2 transition flex flex-col items-center text-center ${
                              activeOutcome === 'Field Visit'
                                ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold ring-2 ring-purple-500/20 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <MapPin className={`w-4 h-4 mb-1 ${activeOutcome === 'Field Visit' ? 'text-purple-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold">5. Field Visit</span>
                            <span className="text-[10px] text-slate-500">Meeting</span>
                          </button>
                        </div>

                        {/* Inline Input & Confirmation Bar */}
                        {activeOutcome && (
                          <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2 animate-fade-in">
                            {activeOutcome === 'Reminder' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    New Follow-up Date <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="date"
                                    value={rescheduleDates[c.id] || ''}
                                    onChange={(e) => setRescheduleDates({ ...rescheduleDates, [c.id]: e.target.value })}
                                    className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-burgundy-800"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Reminder Reason / Time Note
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Call back at 4:30 PM, client reviewing file"
                                    value={remarksMap[c.id] || ''}
                                    onChange={(e) => setRemarksMap({ ...remarksMap, [c.id]: e.target.value })}
                                    className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-burgundy-800"
                                  />
                                </div>
                              </div>
                            ) : activeOutcome === 'Field Visit' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Planned Visit Date (Optional)
                                  </label>
                                  <input
                                    type="date"
                                    value={rescheduleDates[c.id] || ''}
                                    onChange={(e) => setRescheduleDates({ ...rescheduleDates, [c.id]: e.target.value })}
                                    className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-burgundy-800"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Visit Location / Agenda
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. In-person visit at client office / factory"
                                    value={remarksMap[c.id] || ''}
                                    onChange={(e) => setRemarksMap({ ...remarksMap, [c.id]: e.target.value })}
                                    className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-burgundy-800"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Discussion Notes & Remarks (Optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder={
                                    activeOutcome === 'OK'
                                      ? 'e.g. Customer agreed to terms, proceeding with documentation'
                                      : activeOutcome === 'Not Attend'
                                      ? 'e.g. Ringing no response / busy / switched off'
                                      : 'e.g. Customer not interested, requested DND'
                                  }
                                  value={remarksMap[c.id] || ''}
                                  onChange={(e) => setRemarksMap({ ...remarksMap, [c.id]: e.target.value })}
                                  className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-burgundy-800"
                                />
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleCancelOutcome(c.id)}
                                className="px-3 py-1 text-xs text-slate-500 hover:text-slate-800 font-semibold"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveDisposition(c.id)}
                                className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition ${
                                  activeOutcome === 'OK'
                                    ? 'bg-emerald-700 hover:bg-emerald-800'
                                    : activeOutcome === 'Not Attend'
                                    ? 'bg-blue-700 hover:bg-blue-800'
                                    : activeOutcome === 'No Need'
                                    ? 'bg-rose-700 hover:bg-rose-800'
                                    : activeOutcome === 'Field Visit'
                                    ? 'bg-purple-700 hover:bg-purple-800'
                                    : 'bg-amber-700 hover:bg-amber-800'
                                }`}
                              >
                                Confirm {activeOutcome}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>

            {/* Footer: Only show Proceed/Close if NOT mandatory role */}
            <div className="flex items-center justify-between bg-slate-50 px-6 py-3 border-t border-slate-200">
              <span className="text-xs font-medium text-amber-800">
                {!canClosePopup
                  ? `${totalPendingFollowUps} follow-up(s) remaining before closing${isPunchDueForUser ? ' / Punch In' : ''}.`
                  : 'Open pending follow-ups anytime from the top navigation bar.'}
              </span>
              {canClosePopup && (
                <button
                  onClick={() => setShowFollowUpModal(false)}
                  className="flex items-center gap-2 rounded-xl bg-burgundy-900 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-burgundy-800 transition"
                >
                  <span>Proceed to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        ) : (
          /* STEP 2: MANDATORY 24-HOUR PUNCH IN (NO CLOSE BUTTON UNTIL PUNCHED) */
          <>
            <div className="p-8 space-y-6 bg-[#FAF8F5]">
              {(respondedIds.length > 0 || respondedLoginIds.length > 0) && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All pending follow-ups completed! Complete Punch In to enter the CRM.</span>
                </div>
              )}

              <div className="rounded-2xl border-2 border-burgundy-100 bg-white p-6 shadow-sm text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-burgundy-900 to-burgundy-950 text-gold-300 shadow-lg">
                  <ShieldCheck className="w-8 h-8" />
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-950 border border-amber-300">
                    <Clock className="w-3 h-3" />
                    <span>24-Hour Attendance Check</span>
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-2 font-corporate">
                    Mandatory Daily Punch In
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                    Hello <strong>{currentUser?.name}</strong>, please register your attendance Punch In to access the workspace. This prompt appears every 24 hours.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-xs pt-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Date</span>
                    <span className="font-mono font-bold text-slate-900">{todayDisplay}</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Time</span>
                    <span className="font-mono font-bold text-burgundy-900">{liveClockStr}</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Last Punch In</span>
                    <span className="font-semibold text-slate-700">
                      {punchStatus.lastPunch
                        ? `${punchStatus.lastPunch.date} • ${punchStatus.lastPunch.inTime}`
                        : 'Over 24h / None'}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleMandatoryPunchIn}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 hover:from-burgundy-800 hover:to-burgundy-900 px-8 py-3.5 text-sm font-extrabold text-white shadow-xl transition active:scale-95"
                  >
                    <LogIn className="w-5 h-5 text-gold-300" />
                    <span>Punch In Now</span>
                  </button>
                </div>
              </div>
            </div>

           
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
