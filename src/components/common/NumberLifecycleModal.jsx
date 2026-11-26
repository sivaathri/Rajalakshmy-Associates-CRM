import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  History,
  UserPlus,
  PhoneCall,
  Compass,
  UserCheck,
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { formatDate, formatMobileNumber } from '../../utils/formatters';

const clean10 = (val) => String(val || '').replace(/\D/g, '').slice(-10);

const getStageBadge = (stage = '') => {
  const s = stage.toLowerCase();
  if (s.includes('disburse')) {
    return {
      pill: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-600',
      icon: CheckCircle2
    };
  }
  if (s.includes('reject')) {
    return {
      pill: 'bg-rose-50 text-rose-800 border-rose-200',
      dot: 'bg-rose-600',
      icon: XCircle
    };
  }
  if (s.includes('login')) {
    return {
      pill: 'bg-burgundy-50 text-burgundy-900 border-burgundy-200',
      dot: 'bg-burgundy-900',
      icon: FileCheck
    };
  }
  if (s.includes('assign')) {
    return {
      pill: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      dot: 'bg-indigo-600',
      icon: UserCheck
    };
  }
  if (s.includes('lead')) {
    return {
      pill: 'bg-amber-50 text-amber-900 border-amber-200',
      dot: 'bg-amber-600',
      icon: Compass
    };
  }
  if (s.includes('call')) {
    return {
      pill: 'bg-sky-50 text-sky-800 border-sky-200',
      dot: 'bg-sky-600',
      icon: PhoneCall
    };
  }
  if (s.includes('follow')) {
    return {
      pill: 'bg-purple-50 text-purple-800 border-purple-200',
      dot: 'bg-purple-600',
      icon: Clock
    };
  }
  return {
    pill: 'bg-slate-100 text-slate-800 border-slate-200',
    dot: 'bg-slate-600',
    icon: UserPlus
  };
};

export const NumberLifecycleModal = ({ target, onClose }) => {
  const {
    customers = [],
    activities = [],
    calls = [],
    leads = [],
    bankLogins = [],
    auditTrail = []
  } = useCRM();

  const lifecycle = useMemo(() => {
    if (!target) return null;

    const targetMobile = clean10(target.mobile);
    const targetCustId = target.customerId || (target.id?.startsWith('RA-CUST-') ? target.id : '');
    const targetLeadId = target.leadId || (target.id?.startsWith('LEAD-') ? target.id : '');
    const targetLoginId = target.loginId || (target.id?.includes('-BL-') ? target.id : '');
    const targetSourceCustId = target.sourceCustomerId || (!target.id?.startsWith('LEAD-') ? target.id : '');

    const matchesRecord = (rec) => {
      if (!rec) return false;
      const recMob = clean10(rec.mobile);
      if (targetMobile && recMob && recMob === targetMobile) return true;
      if (targetCustId && (rec.customerId === targetCustId || rec.id === targetCustId)) return true;
      if (targetSourceCustId && (rec.id === targetSourceCustId || rec.sourceCustomerId === targetSourceCustId)) return true;
      if (targetLeadId && (rec.id === targetLeadId || rec.leadId === targetLeadId)) return true;
      if (targetLoginId && (rec.id === targetLoginId || rec.loginId === targetLoginId)) return true;
      return false;
    };

    const linkedCustomer = customers.find(matchesRecord);
    const linkedActivities = activities.filter(matchesRecord);
    const linkedCalls = calls.filter(matchesRecord);
    const linkedLeads = leads.filter(matchesRecord);
    const linkedLogins = bankLogins.filter(matchesRecord);

    const officialCustId =
      linkedCustomer?.isCustomer
        ? (linkedCustomer.customerId || linkedCustomer.id)
        : linkedLogins[0]?.customerId || linkedLeads.find(l => l.customerId)?.customerId || '';

    const displayName =
      linkedCustomer?.name ||
      linkedLeads[0]?.customerName ||
      linkedLogins[0]?.customerName ||
      linkedActivities[0]?.customerName ||
      target.customerName ||
      target.name ||
      'Contact Record';

    const displayMobile =
      target.mobile ||
      linkedCustomer?.mobile ||
      linkedLeads[0]?.mobile ||
      linkedLogins[0]?.mobile ||
      linkedActivities[0]?.mobile ||
      '';

    // 1. Gather recorded events from auditTrail
    const recordedEvents = (auditTrail || []).filter((e) => {
      if (targetMobile && e.cleanMobile && e.cleanMobile === targetMobile) return true;
      if (officialCustId && e.customerId === officialCustId) return true;
      if (targetLeadId && e.leadId === targetLeadId) return true;
      if (targetLoginId && e.loginId === targetLoginId) return true;
      return false;
    });

    // 2. Fallback reconstruction for legacy records created before auditTrail logging
    const fallbackEvents = [];
    const hasStageInAudit = (keyword) =>
      recordedEvents.some((e) => (e.stage || '').toLowerCase().includes(keyword) || (e.action || '').toLowerCase().includes(keyword));

    const firstActivity = linkedActivities[linkedActivities.length - 1];
    if (!hasStageInAudit('created') && !hasStageInAudit('database') && !hasStageInAudit('added')) {
      if (linkedCustomer || firstActivity) {
        fallbackEvents.push({
          id: 'fb-created',
          date: firstActivity?.submissionDate || linkedCustomer?.createdAt || '',
          time: firstActivity?.submissionTime || '',
          timestamp: `${firstActivity?.submissionDate || linkedCustomer?.createdAt || '1970-01-01'}T00:00:00`,
          stage: 'Database Entry',
          action: firstActivity ? 'Number Created (Field Activity / Entry)' : 'Number Created in Database',
          toStatus: linkedCustomer?.callingStatus || 'Pending',
          actorName: firstActivity?.submittedByName || linkedCustomer?.submittedByName || 'System',
          actorId: firstActivity?.submittedBy || linkedCustomer?.submittedBy || '',
          details: `Source: ${linkedCustomer?.source || firstActivity?.source || 'Database'}`
        });
      }
    }

    if (!hasStageInAudit('call')) {
      linkedCalls.forEach((c, idx) => {
        fallbackEvents.push({
          id: `fb-call-${c.id || idx}`,
          date: c.callDate || '',
          time: c.callTime || '',
          timestamp: `${c.callDate || '1970-01-01'}T00:01:${String(idx).padStart(2, '0')}`,
          stage: 'Telecalling',
          action: `Call Attended (${c.outcome || 'Logged'})`,
          toStatus: c.outcome || '',
          actorName: c.employeeName || 'RM',
          actorId: c.employeeId || '',
          details: c.remarks ? `Response: "${c.remarks}"` : `Duration: ${c.duration || '—'}`
        });
      });
    }

    if (!hasStageInAudit('lead') && linkedLeads.length > 0) {
      linkedLeads.forEach((l, idx) => {
        fallbackEvents.push({
          id: `fb-lead-${l.id || idx}`,
          date: l.assignedAt || '',
          time: '',
          timestamp: `${l.assignedAt || '1970-01-01'}T00:02:${String(idx).padStart(2, '0')}`,
          stage: 'Lead Pipeline',
          action: `Lead Status: ${l.status}`,
          toStatus: l.status,
          actorName: l.assignedByName || l.actionedByName || 'System',
          assigneeName: l.assignedToName || '',
          assigneeRole: l.assignedToRole || '',
          details: l.remarks || ''
        });
      });
    }

    linkedLogins.forEach((bl, idx) => {
      if (!hasStageInAudit('login')) {
        fallbackEvents.push({
          id: `fb-login-${bl.id || idx}`,
          date: bl.loginDate || '',
          time: '',
          timestamp: bl.createdAt || `${bl.loginDate || '1970-01-01'}T00:03:${String(idx).padStart(2, '0')}`,
          stage: 'Bank Login',
          action: `Logged In (${bl.bankName})`,
          toStatus: 'In Progress',
          actorName: bl.createdByName || bl.submittedByName || bl.assignedRMName || 'RM',
          actorRole: bl.createdByRole || bl.assignedToRole || 'RM',
          assigneeName: bl.assignedRMName || '',
          assigneeRole: bl.assignedToRole || '',
          bankName: bl.bankName,
          loanAmount: bl.loanAmount,
          details: `${bl.loanType || 'Loan'} • Cust ID: ${bl.customerId || officialCustId || '—'}`
        });
      }

      if (bl.status === 'Disbursed' && !hasStageInAudit('disburs')) {
        fallbackEvents.push({
          id: `fb-disb-${bl.id || idx}`,
          date: bl.disbursementDetails?.disbursementDate || bl.lastUpdateDate || '',
          time: bl.disbursementDetails?.disbursedTime || '',
          timestamp: `${bl.disbursementDetails?.disbursementDate || bl.lastUpdateDate || '1970-01-01'}T23:59:00`,
          stage: 'Disbursement',
          action: `Disbursed (${bl.disbursementDetails?.bankName || bl.bankName})`,
          toStatus: 'Disbursed',
          actorName: bl.disbursementDetails?.disbursedByName || bl.assignedRMName || 'RM',
          actorRole: bl.disbursementDetails?.disbursedByRole || '',
          bankName: bl.disbursementDetails?.bankName || bl.bankName,
          loanAmount: bl.disbursementDetails?.loanAmount || bl.loanAmount,
          details: bl.disbursementDetails?.remarks || 'Loan Disbursement Completed'
        });
      }

      if (bl.status === 'Rejected' && !hasStageInAudit('reject')) {
        fallbackEvents.push({
          id: `fb-rej-${bl.id || idx}`,
          date: bl.rejectedDate || bl.lastUpdateDate || '',
          time: bl.rejectedTime || '',
          timestamp: `${bl.rejectedDate || bl.lastUpdateDate || '1970-01-01'}T23:59:00`,
          stage: 'Rejected',
          action: `Rejected (${bl.bankName})`,
          toStatus: 'Rejected',
          actorName: bl.rejectedByName || bl.assignedRMName || 'RM',
          actorRole: bl.rejectedByRole || '',
          bankName: bl.bankName,
          reason: bl.rejectionRemarks || '',
          details: bl.rejectionRemarks ? `Reason: ${bl.rejectionRemarks}` : 'Marked as Rejected'
        });
      }
    });

    const combined = [...recordedEvents, ...fallbackEvents].sort((a, b) => {
      const tA = new Date(a.timestamp || a.date || 0).getTime();
      const tB = new Date(b.timestamp || b.date || 0).getTime();
      return tA - tB;
    });

    const primaryLogin = linkedLogins[0];
    const primaryLead = linkedLeads[0];

    const createdBySummary =
      firstActivity?.submittedByName ||
      linkedCustomer?.submittedByName ||
      recordedEvents.find(e => (e.action || '').toLowerCase().includes('created'))?.actorName ||
      primaryLead?.assignedByName ||
      '—';
    const createdDateSummary =
      firstActivity?.submissionDate ||
      linkedCustomer?.createdAt ||
      recordedEvents.find(e => (e.action || '').toLowerCase().includes('created'))?.date ||
      '—';

    return {
      displayName,
      displayMobile,
      officialCustId,
      createdBySummary,
      createdDateSummary,
      callsCount: linkedCalls.length,
      lastCall: linkedCalls[0] || null,
      primaryLead,
      primaryLogin,
      linkedLogins,
      timeline: combined
    };
  }, [target, customers, activities, calls, leads, bankLogins, auditTrail]);

  if (!target || !lifecycle) return null;

  return createPortal(
    <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 px-6 py-4 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-400/20 border border-gold-300/30 text-gold-300">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-300 block">
                End-to-End Number Audit Trail
              </span>
              <h3 className="text-lg font-extrabold text-white truncate">
                {lifecycle.displayName} • {lifecycle.displayMobile ? formatMobileNumber(lifecycle.displayMobile) : 'No Mobile'}
              </h3>
              {lifecycle.officialCustId && (
                <span className="text-[11px] font-mono text-gold-300 font-semibold">
                  Customer ID: {lifecycle.officialCustId}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/75 hover:bg-white/15 hover:text-white transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#FAF8F5]">
          {/* 4 Lifecycle Stage Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Created By & When */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                1. Created By & When
              </span>
              <div className="text-xs font-bold text-slate-900 truncate">{lifecycle.createdBySummary}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{lifecycle.createdDateSummary !== '—' ? formatDate(lifecycle.createdDateSummary) : '—'}</span>
              </div>
            </div>

            {/* 2. Telecalling Calls */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                2. Calls Attended ({lifecycle.callsCount})
              </span>
              {lifecycle.lastCall ? (
                <>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {lifecycle.lastCall.employeeName} ({lifecycle.lastCall.outcome})
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {formatDate(lifecycle.lastCall.callDate)} {lifecycle.lastCall.callTime ? `• ${lifecycle.lastCall.callTime}` : ''}
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 italic">No calls logged yet</div>
              )}
            </div>

            {/* 3. Lead & Assignment */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                3. Lead & Assignment
              </span>
              {lifecycle.primaryLead ? (
                <>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {lifecycle.primaryLead.assignedToName || 'Unassigned'}
                    {lifecycle.primaryLead.assignedToRole ? ` (${lifecycle.primaryLead.assignedToRole})` : ''}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {lifecycle.primaryLead.status}
                    {lifecycle.primaryLead.assignedByName ? ` • By ${lifecycle.primaryLead.assignedByName}` : ''}
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 italic">Not in Lead pipeline</div>
              )}
            </div>

            {/* 4. Bank Login / Disbursed / Rejected */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                4. Login / Final Outcome
              </span>
              {lifecycle.primaryLogin ? (
                <>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {lifecycle.primaryLogin.status} • {lifecycle.primaryLogin.bankName}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Login by {lifecycle.primaryLogin.createdByName || lifecycle.primaryLogin.assignedRMName || 'RM'}
                    {lifecycle.primaryLogin.loginDate ? ` (${formatDate(lifecycle.primaryLogin.loginDate)})` : ''}
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 italic">Not converted to Login</div>
              )}
            </div>
          </div>

          {/* Highlighted Final Decision Banner (Disbursed or Rejected with Who/When/Why) */}
          {lifecycle.linkedLogins.some(b => b.status === 'Disbursed' || b.status === 'Rejected') && (
            <div className="space-y-2">
              {lifecycle.linkedLogins.map((bl) => {
                if (bl.status === 'Disbursed') {
                  return (
                    <div
                      key={`dec-${bl.id}`}
                      className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-emerald-950">
                            Disbursed — {bl.disbursementDetails?.bankName || bl.bankName} ({bl.disbursementDetails?.loanAmount || bl.loanAmount})
                          </div>
                          <div className="text-emerald-800 text-[11px] mt-0.5">
                            By <span className="font-bold">{bl.disbursementDetails?.disbursedByName || bl.assignedRMName || 'RM'}</span>
                            {bl.disbursementDetails?.disbursedByRole ? ` (${bl.disbursementDetails.disbursedByRole})` : ''} on{' '}
                            <span className="font-semibold">
                              {formatDate(bl.disbursementDetails?.disbursementDate || bl.lastUpdateDate)}
                            </span>
                            {bl.disbursementDetails?.disbursedTime ? ` at ${bl.disbursementDetails.disbursedTime}` : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                if (bl.status === 'Rejected') {
                  return (
                    <div
                      key={`dec-${bl.id}`}
                      className="rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-xs space-y-1"
                    >
                      <div className="flex items-center gap-2 font-bold text-rose-950">
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          Rejected — {bl.bankName} • By {bl.rejectedByName || bl.assignedRMName || 'RM'}
                          {bl.rejectedByRole ? ` (${bl.rejectedByRole})` : ''} on {formatDate(bl.rejectedDate || bl.lastUpdateDate)}
                          {bl.rejectedTime ? ` at ${bl.rejectedTime}` : ''}
                        </span>
                      </div>
                      {bl.rejectionRemarks && (
                        <div className="text-rose-900 bg-white/80 rounded-lg border border-rose-200/70 px-3 py-1.5 text-[11px]">
                          <span className="font-bold">Why Rejected:</span> {bl.rejectionRemarks}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Chronological Full Audit Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-burgundy-900">
                <Clock className="w-4 h-4 text-burgundy-900" />
                <span>Complete Chronological Lifecycle ({lifecycle.timeline.length} Events)</span>
              </div>
              <span className="text-[11px] text-slate-400">Oldest to Newest</span>
            </div>

            {lifecycle.timeline.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                No lifecycle events recorded yet for this contact.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {lifecycle.timeline.map((ev, index) => {
                  const style = getStageBadge(ev.stage || ev.action);
                  const StageIcon = style.icon;
                  return (
                    <div key={ev.id || index} className="relative">
                      <span
                        className={`absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white text-white ${style.dot}`}
                      >
                        <StageIcon className="w-3 h-3" />
                      </span>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-1.5 hover:bg-white transition">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.pill}`}>
                              {ev.stage}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{ev.action}</span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500">
                            {ev.date ? formatDate(ev.date) : '—'}
                            {ev.time ? ` • ${ev.time}` : ''}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>
                              By: <strong className="text-slate-800">{ev.actorName || 'System'}</strong>
                              {ev.actorRole ? ` (${ev.actorRole})` : ''}
                            </span>
                          </span>

                          {ev.assigneeName && (
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-indigo-500" />
                              <span>
                                Assigned To: <strong className="text-indigo-900">{ev.assigneeName}</strong>
                                {ev.assigneeRole ? ` (${ev.assigneeRole})` : ''}
                              </span>
                            </span>
                          )}

                          {ev.bankName && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-burgundy-700" />
                              <strong className="text-burgundy-900">{ev.bankName}</strong>
                            </span>
                          )}

                          {(ev.fromStatus || ev.toStatus) && (
                            <span>
                              Status:{' '}
                              {ev.fromStatus ? <span className="text-slate-500">{ev.fromStatus} → </span> : null}
                              <strong className="text-slate-900">{ev.toStatus}</strong>
                            </span>
                          )}
                        </div>

                        {ev.reason && (
                          <div className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-900 font-medium">
                            Rejection Reason: {ev.reason}
                          </div>
                        )}

                        {ev.details && !ev.reason && (
                          <p className="text-[11px] text-slate-600 leading-relaxed">{ev.details}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end bg-white px-6 py-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-burgundy-900 hover:bg-burgundy-800 px-5 py-2 text-xs font-bold text-white transition shadow-xs"
          >
            Close Tracker
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

