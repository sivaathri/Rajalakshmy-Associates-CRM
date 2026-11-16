import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  Award,
  CheckCircle,
  XCircle,
  Clock,
  PlusCircle,
  Filter,
  Download,
  IndianRupee,
  ShieldCheck,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate, getStatusBadgeClass, exportToCSV } from '../utils/formatters';
import { CaseSubmissionModal } from '../components/performance/CaseSubmissionModal';
import { RejectCaseModal } from '../components/performance/RejectCaseModal';

export const PerformancePage = () => {
  const { performanceCases, approvePerformanceCase } = useCRM();
  const { currentUser } = useAuth();

  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Pending Approval' | 'Approved' | 'Rejected'
  const [empFilter, setEmpFilter] = useState('All');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [rejectingCase, setRejectingCase] = useState(null);

  // Check if current user has permission to approve/reject
  const canApprove = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

  // Filter dataset
  const filteredCases = useMemo(() => {
    return performanceCases.filter(c => {
      // Role scope: regular RM or Sales Exec can view their own, or all if Admin/Manager
      if (!canApprove && empFilter === 'MyOnly' && c.submittedBy !== currentUser?.id) {
        return false;
      }

      if (empFilter !== 'All' && empFilter !== 'MyOnly' && c.submittedBy !== empFilter) {
        return false;
      }

      if (statusFilter !== 'All' && c.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [performanceCases, statusFilter, empFilter, canApprove, currentUser]);

  // Aggregate Metrics
  const totalVolume = performanceCases.reduce((sum, c) => sum + (c.caseAmount || 0), 0);
  const approvedCases = performanceCases.filter(c => c.status === 'Approved');
  const approvedVolume = approvedCases.reduce((sum, c) => sum + (c.caseAmount || 0), 0);
  const pendingCases = performanceCases.filter(c => c.status === 'Pending Approval');
  const pendingVolume = pendingCases.reduce((sum, c) => sum + (c.caseAmount || 0), 0);
  const rejectedCases = performanceCases.filter(c => c.status === 'Rejected');

  const handleExport = () => {
    const data = filteredCases.map(c => ({
      "Case ID": c.id,
      "Customer Name": c.customerName,
      "Mobile": c.mobile,
      "Sanction Amount": c.caseAmount,
      "Case Date": c.caseDate,
      "Details": c.details,
      "Submitted By": `${c.submittedByName} (${c.submittedBy})`,
      "Status": c.status,
      "Approved By": c.approvedBy || '-',
      "Approval Date": c.approvalDate || '-',
      "Rejection Remarks": c.rejectionRemarks || '-'
    }));
    exportToCSV(data, 'rajalakshmy_performance_case_dispositions.csv');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-gold-300 text-xs font-bold uppercase tracking-wider">
            <Award className="w-4 h-4" />
            <span>Business Performance & Case Disposition</span>
            <span>•</span>
            <span>{currentUser?.name} ({currentUser?.role})</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            Case Disposition & Approval Console
          </h2>
          <p className="text-xs text-white/80 max-w-xl">
            Log financial advisory cases, debt syndication, and loan sanctions. Admin and Managers review submissions with one-click approval workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gold-500 hover:bg-gold-600 px-5 py-2.5 text-xs font-bold text-amber-950 shadow-md transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Submit Case Disposition</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Total Cases Sourced</span>
            <Award className="w-4 h-4 text-purple-700" />
          </div>
          <div className="text-2xl font-black text-slate-900">{performanceCases.length}</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Value: {formatCurrency(totalVolume)}</span>
        </div>

        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-800">Approved Volume</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950">{formatCurrency(approvedVolume)}</div>
          <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
            {approvedCases.length} cases officially sanctioned
          </span>
        </div>

        <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-amber-800">Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950">{pendingCases.length}</div>
          <span className="text-[10px] text-amber-700 block mt-0.5">
            Pipeline: {formatCurrency(pendingVolume)}
          </span>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-rose-800">Rejected Cases</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-950">{rejectedCases.length}</div>
          <span className="text-[10px] text-rose-700 block mt-0.5">Below credit criteria</span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Pending Approval', 'Approved', 'Rejected'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                statusFilter === st
                  ? 'bg-burgundy-900 text-white border-burgundy-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st} ({performanceCases.filter(c => st === 'All' ? true : c.status === st).length})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Cases Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[760px]">
            <thead className="bg-[#FAF6EF] text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Case ID</th>
                <th className="px-4 py-3">Customer / Enterprise</th>
                <th className="px-4 py-3">Mobile Contact</th>
                <th className="px-4 py-3">Sanction Amount (₹)</th>
                <th className="px-4 py-3">Case Date</th>
                <th className="px-4 py-3">Submitted By</th>
                <th className="px-4 py-3">Approval Status</th>
                <th className="px-4 py-3 text-right">Admin / Manager Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No performance cases found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredCases.map(item => (
                  <tr key={item.id} className="hover:bg-[#FAF6EF]/60 transition">
                    <td className="px-4 py-3 font-mono font-bold text-burgundy-900">{item.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{item.customerName}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{item.details}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium">{item.mobile}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 text-sm">
                      {formatCurrency(item.caseAmount)}
                    </td>
                    <td className="px-4 py-3">{formatDate(item.caseDate)}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{item.submittedByName}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">{item.submittedBy}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                      {item.status === 'Approved' && (
                        <div className="text-[10px] text-emerald-800 font-semibold mt-1">
                          By: {item.approvedBy} on {formatDate(item.approvalDate)}
                        </div>
                      )}
                      {item.status === 'Rejected' && (
                        <div className="text-[10px] text-rose-700 italic mt-1 max-w-xs">
                          "{item.rejectionRemarks}"
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canApprove && item.status === 'Pending Approval' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => approvePerformanceCase(item.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => setRejectingCase(item)}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          {item.status !== 'Pending Approval' ? 'Review Finalized' : 'Awaiting Review'}
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

      {/* Modals */}
      <CaseSubmissionModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
      />

      {rejectingCase && (
        <RejectCaseModal
          caseItem={rejectingCase}
          onClose={() => setRejectingCase(null)}
        />
      )}
    </div>
  );
};
