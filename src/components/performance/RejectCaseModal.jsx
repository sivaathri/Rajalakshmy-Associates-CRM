import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCRM } from '../../context/CRMContext';
import { X, AlertCircle } from 'lucide-react';

export const RejectCaseModal = ({ caseItem, onClose }) => {
  const { rejectPerformanceCase } = useCRM();
  const [remarks, setRemarks] = useState('');

  if (!caseItem) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!remarks.trim()) {
      alert('Please enter reason for case rejection');
      return;
    }
    rejectPerformanceCase(caseItem.id, remarks);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-rose-200 overflow-hidden">
        <div className="bg-rose-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-300" />
            <h3 className="text-base font-bold">Reject Case Submission</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs text-slate-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
            Rejecting submission for <span className="font-bold text-slate-900">{caseItem.customerName}</span> (₹{caseItem.caseAmount.toLocaleString('en-IN')}) submitted by <span className="font-semibold">{caseItem.submittedByName}</span>.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Rejection Reason & Remarks <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. CIBIL score below cutoff, insufficient business turnover, unverified KYC docs..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-rose-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-rose-700 hover:bg-rose-800 px-5 py-2 text-xs font-bold text-white shadow-md transition"
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
