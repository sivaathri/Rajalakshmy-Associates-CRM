import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import {
  PhoneCall,
  PhoneOff,
  User,
  Building,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  PhoneMissed,
  XCircle,
  CalendarClock,
  FileText,
  X,
  ShieldCheck
} from 'lucide-react';

export const ActiveCallModal = () => {
  const {
    activeCallContact,
    setActiveCallContact,
    isCallingModalOpen,
    setIsCallingModalOpen,
    logCall,
    calls
  } = useCRM();
  const { currentUser } = useAuth();

  const [callStatus, setCallStatus] = useState('calling'); // 'calling' | 'connected' | 'ended'
  const [seconds, setSeconds] = useState(0);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [reminderDate, setReminderDate] = useState('');

  // Call timer simulation
  useEffect(() => {
    let interval = null;
    if (isCallingModalOpen) {
      setSeconds(0);
      setCallStatus('connected');
      setSelectedOutcome(null);
      setRemarks('');
      setReminderDate('');
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCallingModalOpen, activeCallContact]);

  if (!isCallingModalOpen || !activeCallContact) return null;

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndAndSubmit = () => {
    if (!selectedOutcome) {
      alert('Please select a Call Outcome (OK, Not Attend, No Need, or Reminder)');
      return;
    }

    if (selectedOutcome === 'Reminder' && !reminderDate) {
      alert('Please pick a Follow-up Date for Reminder');
      return;
    }

    const durationText = `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

    logCall({
      customerId: activeCallContact.id,
      outcome: selectedOutcome,
      duration: durationText,
      remarks: remarks || `Customer call outcome: ${selectedOutcome}`,
      reminderDate: selectedOutcome === 'Reminder' ? reminderDate : ''
    });

    setIsCallingModalOpen(false);
    setActiveCallContact(null);
  };

  // Find customer's previous call history
  const customerPastCalls = calls.filter(c => c.customerId === activeCallContact.id);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-burgundy-200 overflow-hidden">
        {/* Calling Top Header with Waveform and Timer */}
        <div className="bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg animate-pulse">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-gold-300">
                    Active Telecall Session
                  </span>
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                </div>
                <h3 className="text-lg font-bold text-white leading-tight">
                  {activeCallContact.name}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Call Waveform */}
              <div className="hidden sm:flex items-center gap-1 h-8">
                <span className="w-1 bg-gold-400 rounded-full animate-call-wave-1"></span>
                <span className="w-1 bg-gold-300 rounded-full animate-call-wave-2"></span>
                <span className="w-1 bg-gold-400 rounded-full animate-call-wave-3"></span>
                <span className="w-1 bg-gold-300 rounded-full animate-call-wave-4"></span>
                <span className="w-1 bg-gold-400 rounded-full animate-call-wave-5"></span>
              </div>

              {/* Duration Timer */}
              <div className="flex items-center gap-1.5 rounded-xl bg-black/30 px-3 py-1.5 font-mono text-sm font-bold text-white border border-white/10">
                <Clock className="w-4 h-4 text-gold-300" />
                <span>{formatTimer(seconds)}</span>
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
          </div>

          {/* Quick Contact Details Banner */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-black/20 p-2.5 rounded-xl border border-white/10">
            <div>
              <span className="text-white/60 block text-[10px]">Mobile Number:</span>
              <span className="font-bold text-gold-300 text-sm tracking-wider">
                {activeCallContact.mobile}
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* OK */}
              <button
                type="button"
                onClick={() => setSelectedOutcome('OK')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition ${
                  selectedOutcome === 'OK'
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
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition ${
                  selectedOutcome === 'Not Attend'
                    ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <PhoneMissed className={`w-6 h-6 mb-1 ${selectedOutcome === 'Not Attend' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-sm font-bold">2. Not Attend</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Ringing / Busy / Switched off</span>
              </button>

              {/* No Need */}
              <button
                type="button"
                onClick={() => setSelectedOutcome('No Need')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition ${
                  selectedOutcome === 'No Need'
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
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition ${
                  selectedOutcome === 'Reminder'
                    ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <CalendarClock className={`w-6 h-6 mb-1 ${selectedOutcome === 'Reminder' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className="text-sm font-bold">4. Reminder</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Schedule Follow-up</span>
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

          {/* General Remarks Input */}
          {selectedOutcome !== 'Reminder' && (
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
                      <span className="font-semibold text-slate-800">{c.callDate} ({c.callTime})</span>
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
            Caller ID: <span className="font-semibold text-slate-800">{currentUser?.name}</span> ({currentUser?.id})
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
              Cancel Call
            </button>
            <button
              type="button"
              onClick={handleEndAndSubmit}
              className="flex items-center gap-2 rounded-xl bg-burgundy-900 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-burgundy-800 transition"
            >
              <PhoneOff className="w-4 h-4 text-rose-400" />
              <span>End & Save Call Log</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
