import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { UserX, Plus, CheckCircle, XCircle, Clock, Calendar, AlertCircle } from 'lucide-react';
import { formatDate, getStatusBadgeClass } from '../utils/formatters';

export const ResignationPage = () => {
  const { resignations, submitResignation, updateResignationStatus } = useCRM();
  const { currentUser } = useAuth();

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [lastWorkingDate, setLastWorkingDate] = useState('');
  const [reason, setReason] = useState('');

  const canReview = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

  // Strictly show only the logged-in user's personal resignation details
  const displayedResignations = resignations.filter(r => r.employeeId === currentUser?.id);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!lastWorkingDate || !reason) {
      alert('Please fill all fields');
      return;
    }
    submitResignation({
      lastWorkingDate,
      reason
    });
    setLastWorkingDate('');
    setReason('');
    setShowSubmitModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-gold-300 text-xs font-bold uppercase tracking-wider">
            <UserX className="w-4 h-4" />
            <span>Human Resources Administration</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            Resignation Management
          </h2>
          <p className="text-xs text-white/80 max-w-xl">
            Track employee separation notices, notice period timelines, and formal approvals.
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-gold-500 hover:bg-gold-600 px-4 py-2.5 text-xs font-bold text-amber-950 shadow-md transition self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Submit Resignation</span>
        </button>
      </div>

      {/* Resignation Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 bg-[#FAF6EF] border-b border-slate-200 text-xs font-bold text-slate-800 flex flex-wrap items-center justify-between gap-2">
          <span>Personal Resignation Records ({displayedResignations.length})</span>
          <span className="text-[11px] text-burgundy-900 font-semibold bg-burgundy-50 px-2.5 py-0.5 rounded-full border border-burgundy-200">
            Logged In: {currentUser?.name} ({currentUser?.id} • {currentUser?.role})
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">Role / Department</th>
                <th className="px-4 py-3">Resignation Date</th>
                <th className="px-4 py-3">Last Working Date</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Review Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedResignations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="text-sm font-semibold text-slate-700">No Personal Resignation Records Found</div>
                    <div className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Only your personal resignation details are displayed here. You currently have no separation requests submitted.
                    </div>
                  </td>
                </tr>
              ) : (
                displayedResignations.map(r => (
                  <tr key={r.id} className="hover:bg-[#FAF6EF]/60 transition">
                    <td className="px-4 py-3 font-mono font-bold text-burgundy-900">{r.id}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">{r.employeeName}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">{r.employeeId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{r.role}</span>
                      <span className="text-[10px] text-slate-500 block">{r.department}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatDate(r.resignationDate)}</td>
                    <td className="px-4 py-3 font-medium">{formatDate(r.lastWorkingDate)}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">{r.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(r.status)}`}>
                        {r.status}
                      </span>
                      {r.reviewedBy && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">By {r.reviewedBy}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'Pending Approval' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> Pending HR Review
                        </span>
                      ) : r.status === 'Approved' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" /> Rejected
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showSubmitModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-800 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Submit Resignation Notice</h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-white/70 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border">
                Submitting for: <span className="font-bold text-slate-900">{currentUser?.name}</span> ({currentUser?.id} - {currentUser?.role})
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Last Working Date *</label>
                <input
                  type="date"
                  required
                  value={lastWorkingDate}
                  onChange={(e) => setLastWorkingDate(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Separation *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State reason for resignation (Relocation, higher education, career growth)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-burgundy-900 px-5 py-2 text-xs font-bold text-white hover:bg-burgundy-800"
                >
                  Submit Notice
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
