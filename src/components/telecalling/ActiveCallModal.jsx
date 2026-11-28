import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { formatMobileNumber } from '../../utils/formatters';
import {
  FileText,
  User,
  Building,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  PhoneMissed,
  XCircle,
  CalendarClock,
  UserCheck,
  X
} from 'lucide-react';

export const ActiveCallModal = () => {
  const {
    activeCallContact,
    setActiveCallContact,
    isCallingModalOpen,
    setIsCallingModalOpen,
    logCall,
    calls,
    employees = []
  } = useCRM();
  const { currentUser } = useAuth();

  const [selectedOutcome, setSelectedOutcome] = useState('OK');
  const [remarks, setRemarks] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [assignOption, setAssignOption] = useState('none');
  const [assigneeId, setAssigneeId] = useState('');
  const [docCollectionNote, setDocCollectionNote] = useState('');

  const activeEmployeesByRole = React.useMemo(() => {
    const groups = {};
    (employees || [])
      .filter(e => e.status !== 'Inactive' && e.id !== currentUser?.id)
      .forEach(emp => {
        const roleLabel = emp.role || 'Staff';
        if (!groups[roleLabel]) groups[roleLabel] = [];
        groups[roleLabel].push(emp);
      });
    return Object.entries(groups);
  }, [employees, currentUser?.id]);

  useEffect(() => {
    if (isCallingModalOpen && activeCallContact) {
      setSelectedOutcome(
        ['OK', 'Not Attend', 'No Need', 'Reminder', 'Field Visit'].includes(activeCallContact.callingStatus)
          ? activeCallContact.callingStatus
          : 'OK'
      );
      setRemarks(activeCallContact.reminderRemark || '');
      setReminderDate(activeCallContact.reminderDate || '');
      setAssignOption('none');
      setAssigneeId('');
      setDocCollectionNote('');
    }
  }, [isCallingModalOpen, activeCallContact]);

  if (!isCallingModalOpen || !activeCallContact) return null;

  const handleSaveResponse = () => {
    if (!selectedOutcome) {
      alert('Please select a Call Outcome (OK, Not Attend, No Need, Reminder, or Field Visit)');
      return;
    }

    if (selectedOutcome === 'Reminder' && !reminderDate) {
      alert('Please pick a Follow-up Date for Reminder');
      return;
    }

    const isPositive = selectedOutcome === 'OK' || selectedOutcome === 'Field Visit';
    if (isPositive && (assignOption === 'collect_docs' || assignOption === 'transfer_case') && !assigneeId) {
      alert('Please select a user to assign this customer to');
      return;
    }

    logCall({
      customerId: activeCallContact.id,
      outcome: selectedOutcome,
      duration: 'Manual Call',
      remarks: remarks.trim() || `Customer call response: ${selectedOutcome}`,
      reminderDate: (selectedOutcome === 'Reminder' || selectedOutcome === 'Field Visit') ? reminderDate : '',
      assignmentType: isPositive ? assignOption : 'none',
      assigneeId: isPositive && assignOption !== 'none' ? assigneeId : '',
      docCollectionNote: isPositive && assignOption === 'collect_docs' ? docCollectionNote.trim() : ''
    });

    setIsCallingModalOpen(false);
    setActiveCallContact(null);
  };

  // Find customer's previous call history
  const customerPastCalls = calls.filter(c => c.customerId === activeCallContact.id);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-burgundy-200 overflow-hidden">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gold-600/30 border border-gold-300/40 text-white shadow-lg">
                <FileText className="w-5 h-5 text-gold-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-gold-300">
                    Manual Call Response Entry
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white leading-tight">
                  {activeCallContact.name}
                </h3>
              </div>
            </div>

            <button
              onClick={() => {
                setIsCallingModalOpen(false);
                setActiveCallContact(null);
              }}
              className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Contact Details Banner */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-black/20 p-2.5 rounded-xl border border-white/10">
            <div>
              <span className="text-white/60 block text-[10px]">Mobile to Dial:</span>
              <span className="font-bold text-gold-300 text-sm font-mono tracking-wider">
                {formatMobileNumber(activeCallContact.mobile)}
              </span>
            </div>
            <div>
              <span className="text-white/60 block text-[10px]">Business / Trade:</span>
              <span className="font-semibold text-white truncate block">
                {activeCallContact.business || 'General Client'}
              </span>
            </div>
            <div>
              <span className="text-white/60 block text-[10px]">Location:</span>
              <span className="font-semibold text-white">
                {activeCallContact.city || 'Tamil Nadu'}, {activeCallContact.state}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5">
          {/* Outcome Selection Required */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Select Call Outcome <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {/* OK */}
              <button
                type="button"
                onClick={() => setSelectedOutcome('OK')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition ${selectedOutcome === 'OK'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50 text-slate-700'
                  }`}
              >
                <CheckCircle2 className={`w-6 h-6 mb-1 ${selectedOutcome === 'OK' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-sm font-bold">1. OK</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Interested / Converted</span>
              </button>

              {/* Not Attend */}
              <button
                type="button"
                onClick={() => setSelectedOutcome('Not Attend')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition ${selectedOutcome === 'Not Attend'
                  ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700'
                  }`}
              >
                <PhoneMissed className={`w-6 h-6 mb-1 ${selectedOutcome === 'Not Attend' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-sm font-bold">2. Not Attend</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Ringing / Busy / Off</span>
              </button>

              {/* No Need */}
              <button
                type="button"
                onClick={() => setSelectedOutcome('No Need')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition ${selectedOutcome === 'No Need'
                  ? 'border-rose-600 bg-rose-50 text-rose-950 font-bold ring-2 ring-rose-500/20'
                  : 'border-slate-200 hover:border-rose-300 hover:bg-slate-50 text-slate-700'
                  }`}
              >
                <XCircle className={`w-6 h-6 mb-1 ${selectedOutcome === 'No Need' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span className="text-sm font-bold">3. No Need</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Not Interested / DND</span>
              </button>

              {/* Reminder */}
              <button
                type="button"
                onClick={() => setSelectedOutcome('Reminder')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition ${selectedOutcome === 'Reminder'
                  ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20'
                  : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50 text-slate-700'
                  }`}
              >
                <CalendarClock className={`w-6 h-6 mb-1 ${selectedOutcome === 'Reminder' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className="text-sm font-bold">4. Reminder</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Schedule Follow-up</span>
              </button>

              {/* Field Visit */}
              <button
                type="button"
                onClick={() => setSelectedOutcome('Field Visit')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition ${
                  selectedOutcome === 'Field Visit'
                    ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <MapPin className={`w-6 h-6 mb-1 ${selectedOutcome === 'Field Visit' ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className="text-sm font-bold">5. Field Visit</span>
                <span className="text-[10px] text-slate-500 mt-0.5">In-Person / Meeting</span>
              </button>
            </div>
          </div>

          {/* Conditional Reminder Section */}
          {selectedOutcome === 'Reminder' && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <CalendarClock className="w-4 h-4 text-amber-700" />
                <span>Follow-up Reminder Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Reminder Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:border-burgundy-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reminder Reason / Purpose
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Call after 4 PM, client reviewing proposal"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:border-burgundy-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional Field Visit Section */}
          {selectedOutcome === 'Field Visit' && (
            <div className="rounded-xl border border-purple-300 bg-purple-50/80 p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                <MapPin className="w-4 h-4 text-purple-700" />
                <span>Field Visit Schedule & Location Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Meeting Location / Purpose
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. In-person visit at client office / factory"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:border-burgundy-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* General Remarks Input */}
          {selectedOutcome !== 'Reminder' && selectedOutcome !== 'Field Visit' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Call Remarks & Discussion Notes
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

          {/* Conditional Lead Assignment Options */}
          {(selectedOutcome === 'OK' || selectedOutcome === 'Field Visit') && (
            <div className="rounded-xl border border-burgundy-200 bg-[#FAF6EF] p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-burgundy-950">
                <UserCheck className="w-4 h-4 text-burgundy-800" />
                <span>Lead Assignment Option (Optional)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'none', title: 'Handle Myself', desc: 'Keep with yourself' },
                  { id: 'transfer_case', title: 'Assign Case', desc: 'Transfer for Bank Login' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setAssignOption(opt.id);
                      if (opt.id === 'none') {
                        setAssigneeId('');
                        setDocCollectionNote('');
                      }
                    }}
                    className={`p-2 rounded-lg border text-left text-[11px] transition ${
                      assignOption === opt.id
                        ? 'border-burgundy-800 bg-white ring-1 ring-burgundy-800 font-bold text-burgundy-950'
                        : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div>{opt.title}</div>
                    <div className="text-[10px] font-normal text-slate-500">{opt.desc}</div>
                  </button>
                ))}
              </div>
              {assignOption !== 'none' && (
                <div className="pt-1">
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                  >
                    <option value="">-- Select Staff User --</option>
                    {activeEmployeesByRole.map(([roleName, empList]) => (
                      <optgroup key={roleName} label={roleName}>
                        {empList.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.role})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Past Call History for this contact */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Prior Calling History ({customerPastCalls.length})</span>
            </div>
            {customerPastCalls.length === 0 ? (
              <div className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                No previous calls logged for this customer.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {customerPastCalls.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-800">{formatDate(c.callDate)} ({c.callTime})</span>
                      <span className="text-slate-500 ml-2">by {c.employeeName}</span>
                      <div className="text-[11px] text-slate-600 italic">"{c.remarks}"</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200">
                      {c.outcome} ({c.duration})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="flex items-center justify-between bg-slate-50 px-6 py-4 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            Relationship Manager: <span className="font-semibold text-slate-800">{currentUser?.name}</span> ({currentUser?.id})
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsCallingModalOpen(false);
                setActiveCallContact(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveResponse}
              className="flex items-center gap-2 rounded-xl bg-burgundy-900 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-burgundy-800 transition"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Save Response</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
