import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Plus, CheckCircle, XCircle, IndianRupee, Clock } from 'lucide-react';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';

export const AdvanceAmountPage = () => {
  const { advanceAmounts, submitAdvance, updateAdvanceStatus } = useCRM();
  const { currentUser } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [requestedAmount, setRequestedAmount] = useState('');
  const [reason, setReason] = useState('');

  const canReview = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!requestedAmount || !reason) {
      alert('Please fill all fields');
      return;
    }
    submitAdvance({
      requestedAmount,
      reason
    });
    setRequestedAmount('');
    setReason('');
    setShowModal(false);
  };

  const totalAdvanceApproved = advanceAmounts
    .filter(a => a.status === 'Approved')
    .reduce((sum, a) => sum + (a.requestedAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-gold-300 text-xs font-bold uppercase tracking-wider">
            <CreditCard className="w-4 h-4" />
            <span>Employee Payroll & Advances</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            Advance Amount Management
          </h2>
          <p className="text-xs text-white/80 max-w-xl">
            Request salary advance for medical emergencies, equipment repairs, or leases. Admin and Managers approve disbursals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-1.5 text-center hidden sm:block">
            <span className="text-[10px] text-white/60 block uppercase font-bold">Total Approved</span>
            <span className="text-sm font-extrabold text-emerald-300">{formatCurrency(totalAdvanceApproved)}</span>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gold-500 hover:bg-gold-600 px-4 py-2.5 text-xs font-bold text-amber-950 shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Request Advance</span>
          </button>
        </div>
      </div>

      {/* Advance Requests Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-3 bg-[#FAF6EF] border-b border-slate-200 text-xs font-bold text-slate-800">
          All Advance Requisitions ({advanceAmounts.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">Requested Amount</th>
                <th className="px-4 py-3">Request Date</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {advanceAmounts.map(a => (
                <tr key={a.id} className="hover:bg-[#FAF6EF]/60 transition">
                  <td className="px-4 py-3 font-mono font-bold text-burgundy-900">{a.id}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-900">{a.employeeName}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">{a.employeeId}</span>
                  </td>
                  <td className="px-4 py-3 font-extrabold text-slate-900 text-sm">
                    {formatCurrency(a.requestedAmount)}
                  </td>
                  <td className="px-4 py-3">{formatDate(a.requestDate)}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs">{a.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(a.status)}`}>
                      {a.status}
                    </span>
                    {a.reviewedBy && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">By {a.reviewedBy}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canReview && a.status === 'Pending Approval' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => updateAdvanceStatus(a.id, 'Approved')}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateAdvanceStatus(a.id, 'Rejected')}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        {a.status !== 'Pending Approval' ? 'Processed' : 'Awaiting Review'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-800 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Request Salary Advance</h3>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border">
                Applicant: <span className="font-bold text-slate-900">{currentUser?.name}</span> ({currentUser?.id} - {currentUser?.role})
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Required Advance Amount (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 25000"
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Purpose of Advance *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Annual house lease renewal advance requirement, medical treatment..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-burgundy-900 px-5 py-2 text-xs font-bold text-white hover:bg-burgundy-800"
                >
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
