import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import {
  CalendarCheck,
  PhoneCall,
  Calendar,
  Clock,
  CheckCircle,
  X,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const FollowUpReminderModal = () => {
  const { showFollowUpModal, setShowFollowUpModal, currentUser } = useAuth();
  const { customers, logCall, updateCustomer, startCallingCustomer } = useCRM();

  const [reschedulingId, setReschedulingId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newRemark, setNewRemark] = useState('');

  if (!showFollowUpModal) return null;

  // Filter pending reminders
  const myReminders = customers.filter(c => {
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

  const handleComplete = (customerId) => {
    logCall({
      customerId,
      outcome: 'OK',
      duration: '2m 15s',
      remarks: 'Follow-up completed successfully. Customer agreed to move forward.'
    });
  };

  const handleSaveReschedule = (customerId) => {
    if (!newDate) return;
    updateCustomer(customerId, {
      callingStatus: 'Reminder',
      reminderDate: newDate,
      reminderRemark: newRemark || 'Rescheduled follow-up call'
    });
    setReschedulingId(null);
    setNewDate('');
    setNewRemark('');
  };

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
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
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
                <span className="text-xs text-slate-400">Review & Update</span>
              </div>

              <div className="space-y-3">
                {myReminders.map(c => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-slate-200 bg-[#FAF6EF]/50 p-4 transition hover:border-gold-300 hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-burgundy-900">{c.name}</span>
                          <span className="text-[10px] uppercase font-bold bg-burgundy-50 text-burgundy-800 border border-burgundy-200 px-2 py-0.5 rounded-full">
                            {c.databaseType} / {c.customerType}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          <span className="font-semibold text-slate-800">{c.mobile}</span> • {c.business || c.city} ({c.state})
                        </div>
                      </div>

                      {/* Reminder Due Badge */}
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-100/70 border border-amber-300 px-2.5 py-1 rounded-lg self-start sm:self-center">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Scheduled: {formatDate(c.reminderDate) || 'Immediate'}</span>
                      </div>
                    </div>

                    {/* Remark notes */}
                    {c.reminderRemark && (
                      <div className="mt-2.5 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 italic">
                        "{c.reminderRemark}"
                      </div>
                    )}

                    {/* Reschedule inline form */}
                    {reschedulingId === c.id ? (
                      <div className="mt-3 p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2">
                        <div className="text-xs font-bold text-amber-900">Reschedule Next Follow-up</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Follow-up Date</label>
                            <input
                              type="date"
                              value={newDate}
                              onChange={(e) => setNewDate(e.target.value)}
                              className="w-full text-xs rounded-lg border border-slate-300 px-2 py-1.5 bg-white focus:outline-none focus:border-burgundy-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Remarks / Reason</label>
                            <input
                              type="text"
                              placeholder="e.g. Call after audit, requested evening callback"
                              value={newRemark}
                              onChange={(e) => setNewRemark(e.target.value)}
                              className="w-full text-xs rounded-lg border border-slate-300 px-2 py-1.5 bg-white focus:outline-none focus:border-burgundy-800"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setReschedulingId(null)}
                            className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveReschedule(c.id)}
                            className="px-3 py-1 text-xs font-bold bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition"
                          >
                            Save Reschedule
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Action Buttons */
                      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                        <button
                          onClick={() => handleComplete(c.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Mark Completed
                        </button>

                        <button
                          onClick={() => {
                            setReschedulingId(c.id);
                            setNewDate(c.reminderDate || '');
                            setNewRemark(c.reminderRemark || '');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-gold-300 text-gold-900 hover:bg-gold-50 transition"
                        >
                          <Calendar className="w-3.5 h-3.5 text-gold-700" />
                          Reschedule
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between bg-slate-50 px-6 py-3 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            You can access follow-ups anytime from the top navigation bar.
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
