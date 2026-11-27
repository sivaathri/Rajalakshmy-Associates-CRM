import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  CreditCard,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  RotateCcw,
  Calendar,
  Check,
  X,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { Pagination } from '../components/common/Pagination';

export const AdvanceAmountPage = () => {
  const { advanceAmounts, submitAdvance, updateAdvanceStatus } = useCRM();
  const { currentUser, showToast } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [requestedAmount, setRequestedAmount] = useState('');
  const [reason, setReason] = useState('');

  // Confirmation Modals for Approval and Rejection
  const [approvingItem, setApprovingItem] = useState(null);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Filters State
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Pending' | 'Approved' | 'Rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const canReview = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
  const isAdmin = currentUser?.role === 'Admin' || String(currentUser?.role || '').toLowerCase() === 'admin';

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

  // For Admin or Reviewer, show all employee advance requests; for employees, show only their personal requests
  const displayedAdvances = useMemo(() => {
    return canReview
      ? advanceAmounts
      : advanceAmounts.filter(a => a.employeeId === currentUser?.id);
  }, [canReview, advanceAmounts, currentUser?.id]);

  // Filtered dataset
  const filteredAdvances = useMemo(() => {
    return displayedAdvances.filter(a => {
      // Status filter
      if (statusFilter !== 'All') {
        const isPending = a.status?.toLowerCase().includes('pending');
        const isApproved = a.status?.toLowerCase().includes('approved');
        const isRejected = a.status?.toLowerCase().includes('rejected');
        if (statusFilter === 'Pending' && !isPending) return false;
        if (statusFilter === 'Approved' && !isApproved) return false;
        if (statusFilter === 'Rejected' && !isRejected) return false;
      }

      // Date filter (YYYY-MM-DD)
      if (dateFilter && !a.requestDate?.startsWith(dateFilter)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = a.employeeName?.toLowerCase().includes(q);
        const matchesId = a.id?.toLowerCase().includes(q);
        const matchesEmpId = a.employeeId?.toLowerCase().includes(q);
        const matchesReason = a.reason?.toLowerCase().includes(q);
        const matchesAmt = a.requestedAmount?.toString().includes(q);
        if (!matchesName && !matchesId && !matchesEmpId && !matchesReason && !matchesAmt) return false;
      }

      return true;
    });
  }, [displayedAdvances, statusFilter, dateFilter, searchQuery]);

  // Pagination (minimum 15 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const paginatedAdvances = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAdvances.slice(start, start + itemsPerPage);
  }, [filteredAdvances, currentPage, itemsPerPage]);

  const totalAdvanceApproved = useMemo(() => {
    return displayedAdvances
      .filter(a => a.status?.toLowerCase().includes('approved'))
      .reduce((sum, a) => sum + (Number(a.requestedAmount) || 0), 0);
  }, [displayedAdvances]);

  const pendingCount = useMemo(() => {
    return displayedAdvances.filter(a => a.status?.toLowerCase().includes('pending')).length;
  }, [displayedAdvances]);

  const approvedCount = useMemo(() => {
    return displayedAdvances.filter(a => a.status?.toLowerCase().includes('approved')).length;
  }, [displayedAdvances]);

  const rejectedCount = useMemo(() => {
    return displayedAdvances.filter(a => a.status?.toLowerCase().includes('rejected')).length;
  }, [displayedAdvances]);

  const hasActiveFilters = statusFilter !== 'All' || Boolean(searchQuery.trim()) || Boolean(dateFilter);

  const resetFilters = () => {
    setStatusFilter('All');
    setSearchQuery('');
    setDateFilter('');
    setCurrentPage(1);
  };

  const confirmApprove = () => {
    if (!approvingItem) return;
    updateAdvanceStatus(approvingItem.id, 'Approved');
    setApprovingItem(null);
    if (showToast) showToast(`Advance request ${approvingItem.id} approved successfully!`, 'success');
  };

  const confirmReject = () => {
    if (!rejectingItem) return;
    if (!rejectReason.trim()) {
      alert('Please enter a reason for rejecting this advance request.');
      return;
    }
    updateAdvanceStatus(rejectingItem.id, 'Rejected');
    setRejectingItem(null);
    setRejectReason('');
    if (showToast) showToast(`Advance request ${rejectingItem.id} rejected.`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            {canReview ? 'Advance Amount Requests & Approvals' : 'Advance Amount Management'}
          </h2>
         
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-1.5 text-center hidden sm:block">
            <span className="text-[10px] text-white/60 block uppercase font-bold">Total Approved</span>
            <span className="text-sm font-extrabold text-emerald-300">{formatCurrency(totalAdvanceApproved)}</span>
          </div>

          {!isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gold-500 hover:bg-gold-600 px-4 py-2.5 text-xs font-bold text-amber-950 shadow-md transition active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Request Advance</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Applications</span>
          <span className="text-2xl font-black text-slate-900">{displayedAdvances.length}</span>
          <span className="text-[10px] text-slate-500 block mt-1 font-semibold">Total advance requisitions</span>
        </div>

        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-white via-amber-50/50 to-amber-100/30 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-amber-900 block flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Pending Action
          </span>
          <span className="text-2xl font-black text-amber-900">{pendingCount}</span>
          <span className="text-[10px] text-amber-800 font-semibold block mt-1">Awaiting review & sanction</span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total Approved</span>
          <span className="text-2xl font-black text-emerald-900">{approvedCount}</span>
          <span className="text-[10px] text-emerald-700 block mt-1 font-semibold">
            {formatCurrency(totalAdvanceApproved)} sanctioned
          </span>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-rose-800 block">Rejected Requests</span>
          <span className="text-2xl font-black text-rose-900">{rejectedCount}</span>
          <span className="text-[10px] text-rose-700 block mt-1 font-semibold">Declined applications</span>
        </div>
      </div>

      {/* Advance Requests Table with Filter Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-3.5 bg-[#FAF6EF] border-b border-slate-200 text-xs font-bold text-slate-800 flex flex-wrap items-center justify-between gap-2">
          <span>{canReview ? 'Employee Advance Requisitions' : 'Personal Advance Requests'} ({filteredAdvances.length})</span>
          <span className="text-[11px] text-burgundy-900 font-semibold bg-burgundy-50 px-2.5 py-0.5 rounded-full border border-burgundy-200">
            Logged In: {currentUser?.name} ({currentUser?.id} • {currentUser?.role})
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-50/60 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Status:
              </span>
              {[
                { label: 'All', count: displayedAdvances.length },
                { label: 'Pending', count: pendingCount },
                { label: 'Approved', count: approvedCount },
                { label: 'Rejected', count: rejectedCount }
              ].map(({ label, count }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setStatusFilter(label);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    statusFilter === label
                      ? label === 'Pending'
                        ? 'bg-amber-500 text-amber-950 font-black shadow-xs ring-2 ring-amber-400/40'
                        : 'bg-burgundy-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === label ? 'bg-black/15 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-rose-700 hover:text-rose-900 font-bold px-2.5 py-1 rounded-lg hover:bg-rose-50 transition border border-rose-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Search and Date Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            {/* Search Input */}
            <div className="sm:col-span-8 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Employee Name, ID, Reason, or Amount..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800 bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Filter */}
            <div className="sm:col-span-4 relative flex items-center">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 bg-white"
                title="Filter by Request Date"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">Requested Amount</th>
                <th className="px-4 py-3">Request Date</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Review Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdvances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="text-sm font-semibold text-slate-700">No Advance Requests Found</div>
                    <div className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {hasActiveFilters
                        ? 'No advance applications match your active filter criteria. Try resetting filters.'
                        : 'No salary advance requisitions have been recorded yet.'}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAdvances.map(a => {
                  const isPending = a.status?.toLowerCase().includes('pending');
                  return (
                    <tr key={a.id} className={`hover:bg-[#FAF6EF]/60 transition ${isPending ? 'bg-amber-50/20' : ''}`}>
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
                        {isPending ? (
                          canReview ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setApprovingItem(a)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingItem(a);
                                  setRejectReason('');
                                }}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" /> Pending HR Review
                            </span>
                          )
                        ) : a.status?.toLowerCase().includes('approved') ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Disbursed / Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" /> Rejected
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Reusable Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredAdvances.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          summaryLabel="advance requests"
        />
      </div>

      {/* Modal 1: Request Advance Form (Employees only) */}
      {!isAdmin && showModal && createPortal(
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

      {/* Modal 2: Admin Confirmation - Approve Advance */}
      {approvingItem && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-200" />
                <h3 className="text-base font-bold">Confirm Advance Sanction</h3>
              </div>
              <button onClick={() => setApprovingItem(null)} className="text-white/70 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950">
                <p className="text-sm font-extrabold text-emerald-900">
                  Are you sure you want to approve this salary advance?
                </p>
                <div className="mt-2.5 pt-2 border-t border-emerald-200/60 space-y-1 text-slate-800">
                  <p><strong>Employee:</strong> {approvingItem.employeeName} ({approvingItem.employeeId})</p>
                  <p><strong>Sanction Amount:</strong> <span className="font-bold text-emerald-800 text-sm">{formatCurrency(approvingItem.requestedAmount)}</span></p>
                  <p><strong>Request Date:</strong> {formatDate(approvingItem.requestDate)}</p>
                  <p className="text-slate-600"><strong>Reason:</strong> "{approvingItem.reason}"</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApprovingItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmApprove}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Yes, Approve & Disburse</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 3: Admin Confirmation - Reject Advance (Reason required) */}
      {rejectingItem && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-rose-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-200" />
                <h3 className="text-base font-bold">Decline Advance Request</h3>
              </div>
              <button onClick={() => setRejectingItem(null)} className="text-white/70 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900">
                <p className="font-semibold">
                  Declining advance request <strong>{rejectingItem.id}</strong> of <strong>{formatCurrency(rejectingItem.requestedAmount)}</strong> for <strong>{rejectingItem.employeeName}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for declining advance requisition (e.g. Existing unsettled advance, probation period)..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmReject}
                  className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold transition shadow-sm"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
