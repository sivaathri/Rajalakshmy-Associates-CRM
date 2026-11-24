import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import {
  CalendarCheck,
  Calendar,
  Clock,
  CheckCircle2,
  PhoneMissed,
  XCircle,
  CalendarClock,
  MapPin,
  X,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const FollowUpReminderModal = () => {
  const { showFollowUpModal, setShowFollowUpModal, currentUser, showToast } = useAuth();
  const { customers, logCall, updateCustomer } = useCRM();

  // Per-contact selected outcome state
  const [selectedOutcomes, setSelectedOutcomes] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [rescheduleDates, setRescheduleDates] = useState({});

  // Filter pending reminders
  const myReminders = customers.filter(c => {
    if (currentUser?.role === 'RM') {
      return c.callingStatus === 'Reminder' && (c.assignedTo === currentUser.id || c.actionedBy === currentUser.id);
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

  // If no follow-up modal requested OR there are no follow-ups pending, do NOT show this modal!
  if (!showFollowUpModal || myReminders.length === 0) return null;

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

      showToast(`Follow-up rescheduled for ${cName(customer)} to ${remDate}`, 'info');
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

      showToast(`Follow-up saved: ${cName(customer)} marked as ${outcome}`, 'success');
    }

    // Reset this contact's state
    handleCancelOutcome(customerId);
  };

  const cName = (c) => c?.name || 'Customer';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-gold-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-burgundy-900 via-burgundy-800 to-burgundy-950 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400 text-burgundy-950 shadow-md">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Action Required: Pending Follow-ups</h2>
              <p className="text-xs text-gold-200">
                Logged in as <span className="font-semibold text-white">{currentUser?.name}</span> ({currentUser?.role})
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowFollowUpModal(false)}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          {myReminders.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-800">All Follow-ups Cleared!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                You have no pending reminders scheduled at this moment. You can proceed directly to your CRM dashboard.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>You have {myReminders.length} pending follow-up call(s) waiting for action.</span>
                </div>
                <span className="text-xs text-slate-400">Select Outcome Below</span>
              </div>

              <div className="space-y-4">
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
                            <span className="font-semibold text-slate-800 font-mono">{c.mobile}</span> • {c.business || c.city} ({c.state})
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

                      {/* 4 Outcome Selection Buttons */}
                      <div className="pt-2 border-t border-slate-200/70 space-y-2">
                        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                          <span>Select Follow-up Call Outcome:</span>
                          {activeOutcome && (
                            <span className="text-[10px] text-burgundy-900 font-bold bg-burgundy-50 px-2 py-0.5 rounded border border-burgundy-200">
                              Selected: {activeOutcome}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {/* 1. OK */}
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
                            <span className="text-[10px] text-slate-500">Interested / Converted</span>
                          </button>

                          {/* 2. Not Attend */}
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
                            <span className="text-[10px] text-slate-500">Ringing / Busy / Off</span>
                          </button>

                          {/* 3. No Need */}
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
                            <span className="text-[10px] text-slate-500">Not Interested / DND</span>
                          </button>

                          {/* 4. Reminder */}
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
                            <span className="text-[10px] text-slate-500">Schedule Follow-up</span>
                          </button>

                          {/* 5. Field Visit */}
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
                            <span className="text-[10px] text-slate-500">In-Person / Meeting</span>
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
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between bg-slate-50 px-6 py-3 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            Open pending follow-ups anytime from the top navigation bar.
          </span>
          <button
            onClick={() => setShowFollowUpModal(false)}
            className="flex items-center gap-2 rounded-xl bg-burgundy-900 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-burgundy-800 transition"
          >
            <span>Proceed to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
