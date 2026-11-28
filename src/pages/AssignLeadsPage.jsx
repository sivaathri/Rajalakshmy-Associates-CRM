import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { Pagination } from '../components/common/Pagination';
import { NumberLifecycleModal } from '../components/common/NumberLifecycleModal';
import {
  Copy,
  Check,
  Search,
  MessageSquare,
  CheckCircle2,
  Building2,
  History,
  Clock,
  X,
  XCircle
} from 'lucide-react';
import { formatDate, formatMobileNumber, matchesMobileSearch } from '../utils/formatters';

const clean10 = (val) => String(val || '').replace(/\D/g, '').slice(-10);

export const AssignLeadsPage = () => {
  const {
    leads = [],
    customers = [],
    bankLogins = [],
    markAssignedDocsCompleted
  } = useCRM();
  const { currentUser, showToast } = useAuth();
  const navigate = useNavigate();

  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'collect_docs' | 'transfer_case'
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Document Collection Response Modal State (Option 1: Collect Only Document)
  const [collectingLead, setCollectingLead] = useState(null);
  const [responseStatus, setResponseStatus] = useState('Documents Collected');
  const [completionNote, setCompletionNote] = useState('');

  // Track Full Lifecycle Modal
  const [trackingLead, setTrackingLead] = useState(null);

  // Leads assigned to the currently logged-in user (Option 1: Collect Docs OR Option 2: Case Transfer)
  const assignedToMeLeads = useMemo(() => {
    if (!currentUser?.id) return [];
    return (leads || [])
      .filter(l => {
        const isAssignedDoc =
          l.assignmentType === 'collect_docs' &&
          (l.docCollectionAssigneeId === currentUser.id || l.assignedToId === currentUser.id);
        const isAssignedCase =
          l.assignmentType === 'transfer_case' &&
          l.assignedToId === currentUser.id;
        return isAssignedDoc || isAssignedCase;
      })
      .map(l => {
        const mob10 = clean10(l.mobile);
        const linkedCustomer = customers.find(
          c =>
            (l.sourceCustomerId && c.id === l.sourceCustomerId) ||
            (l.customerId && (c.id === l.customerId || c.customerId === l.customerId)) ||
            (mob10 && clean10(c.mobile) === mob10)
        );
        const linkedLogins = bankLogins.filter(
          b =>
            (mob10 && clean10(b.mobile) === mob10) ||
            (l.customerId && b.customerId === l.customerId)
        );
        const mergedDocs =
          (l.documents && l.documents.length > 0)
            ? l.documents
            : (linkedCustomer?.documents || []);

        return {
          ...l,
          linkedCustomer,
          linkedLogins,
          mergedDocs
        };
      });
  }, [leads, customers, bankLogins, currentUser?.id]);

  const filteredLeads = useMemo(() => {
    return assignedToMeLeads.filter(item => {
      if (filterMode === 'collect_docs' && item.assignmentType !== 'collect_docs') return false;
      if (filterMode === 'transfer_case' && item.assignmentType !== 'transfer_case') return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mName = item.customerName?.toLowerCase().includes(q);
        const mMob = matchesMobileSearch(item.mobile, searchTerm);
        const mBiz = item.business?.toLowerCase().includes(q);
        const mBy = (item.assignedByName || item.docCollectionAssignedByName || '').toLowerCase().includes(q);
        if (!mName && !mMob && !mBiz && !mBy) return false;
      }
      return true;
    });
  }, [assignedToMeLeads, filterMode, searchTerm]);

  const docCount = assignedToMeLeads.filter(l => l.assignmentType === 'collect_docs').length;
  const caseCount = assignedToMeLeads.filter(l => l.assignmentType === 'transfer_case').length;

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

  const handleCopyNumber = async (lead, afterCopyToast) => {
    const clean = clean10(lead.mobile) || String(lead.mobile || '').trim();
    if (!clean) return false;

    let copied = false;
    try {
      const textarea = document.createElement('textarea');
      textarea.value = clean;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch {
      // ignore fallback error
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(clean);
        copied = true;
      } catch {
        // ignore if execCommand already succeeded
      }
    }

    setCopiedId(lead.id);
    showToast(
      copied
        ? (afterCopyToast || `Copied ${clean} — paste it into Add New Bank File Login`)
        : `Mobile Number: ${clean}`,
      copied ? 'success' : 'info'
    );
    setTimeout(() => setCopiedId(null), 2500);
    return copied;
  };

  const handleOpenDocModal = (lead) => {
    setCollectingLead(lead);
    setResponseStatus(lead.docCollectionStatus === 'Not Collected' ? 'Not Collected' : 'Documents Collected');
    setCompletionNote(lead.docCollectionCompletionNote || '');
  };

  const handleSaveDocResponse = (e) => {
    e.preventDefault();
    if (!collectingLead) return;
    if (!completionNote.trim() && responseStatus !== 'Documents Collected') {
      alert('Please enter response details / remarks');
      return;
    }
    markAssignedDocsCompleted(
      collectingLead.id,
      completionNote.trim() || 'Documents collected',
      responseStatus
    );
    setCollectingLead(null);
  };

  // Refresh collectingLead live from assignedToMeLeads while modal is open
  const liveCollectingLead = useMemo(() => {
    if (!collectingLead) return null;
    return assignedToMeLeads.find(l => l.id === collectingLead.id) || collectingLead;
  }, [collectingLead, assignedToMeLeads]);

  return (
    <div className="space-y-6">
      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'all', label: `All Assigned (${assignedToMeLeads.length})` },
            { id: 'transfer_case', label: `Case Transfer / For Bank Login (${caseCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setFilterMode(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                filterMode === tab.id
                  ? 'bg-burgundy-900 text-white border-burgundy-900 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name, mobile, business, RM..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800"
          />
        </div>
      </div>

      {/* Assigned Leads Table View (All 3 Tabs) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[1000px]">
            <thead className="bg-[#FAF6EF] text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center w-14">Sl.No</th>
                <th className="px-4 py-3">Customer Details</th>
                <th className="px-4 py-3">Mobile Number</th>
                <th className="px-4 py-3">Business &amp; Location</th>
                <th className="px-4 py-3">Assign Option &amp; RM</th>
                <th className="px-4 py-3">Docs collection Location</th>
                <th className="px-4 py-3">Workflow Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-slate-400 italic">
                    No assigned leads found matching your selected tab or search.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((item, idx) => {
                  const slNo = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isDocOnly = item.assignmentType === 'collect_docs';
                  const docsCollected = item.docCollectionStatus === 'Documents Collected';
                  const latestLogin = item.linkedLogins?.[0] || null;
                  const assignedByDisplay = item.docCollectionAssignedByName || item.assignedByName || item.originalRmName || 'RM';
                  const assignedDateDisplay = formatDate(item.docCollectionAssignedAt || item.assignedAt);

                  return (
                    <tr key={item.id} className="hover:bg-[#FAF6EF]/60 transition align-top">
                      {/* Sl.No */}
                      <td className="px-4 py-3 text-center font-bold text-slate-700">{slNo}</td>

                      {/* Customer Details */}
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-slate-900 text-xs">{item.customerName}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {item.source || 'Database'}
                          {item.databaseType ? ` (${item.databaseType.toUpperCase()})` : ''}
                          {item.callOutcome ? ` • Call: ${item.callOutcome}` : ''}
                        </div>
                        {item.customerId && (
                          <span className="inline-block font-mono text-[10px] font-bold text-burgundy-900 mt-0.5">
                            {item.customerId}
                          </span>
                        )}
                      </td>

                      {/* Mobile Number + Copy */}
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-burgundy-200 bg-[#FAF6EF] px-2.5 py-1">
                          <span className="font-mono font-bold text-burgundy-950 select-all whitespace-nowrap">
                            {formatMobileNumber(item.mobile)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyNumber(item)}
                            className="inline-flex items-center gap-1 rounded bg-burgundy-900 hover:bg-burgundy-800 text-white px-2 py-0.5 text-[10px] font-bold transition shrink-0"
                            title="Copy 10-digit mobile number"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-300" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-gold-300" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Business & Location */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{item.business || '—'}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {[item.city, item.state].filter(Boolean).join(', ') || '—'}
                        </div>
                        {item.referenceFrom && (
                          <div className="text-[10px] text-amber-800 truncate max-w-[160px]">Ref: {item.referenceFrom}</div>
                        )}
                      </td>

                      {/* Assign Option & By */}
                      <td className="px-4 py-3">
                        {isDocOnly ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                            1. Collect Only Doc
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-burgundy-50 text-burgundy-900 border border-burgundy-200 whitespace-nowrap">
                            2. Case Assigned
                          </span>
                        )}
                        <div className="text-[11px] text-slate-600 mt-1">
                          By: <strong className="text-slate-800">{assignedByDisplay}</strong>
                          {item.originalRmRole ? ` (${item.originalRmRole})` : ''}
                        </div>
                        <div className="text-[10px] text-slate-400">{assignedDateDisplay}</div>
                      </td>

                      {/* Remarks & Response */}
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="text-[11px] text-slate-700 line-clamp-2" title={item.remarks || ''}>
                          {item.remarks || '—'}
                        </div>
                        {item.docCollectionCompletionNote && (
                          <div className="text-[10px] text-emerald-800 font-semibold mt-0.5 line-clamp-2" title={item.docCollectionCompletionNote}>
                            Response: {item.docCollectionCompletionNote}
                          </div>
                        )}
                      </td>

                      {/* Workflow Status */}
                      <td className="px-4 py-3">
                        {isDocOnly ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                            item.docCollectionStatus === 'Documents Collected'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : item.docCollectionStatus === 'Not Collected'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}>
                            {item.docCollectionStatus === 'Documents Collected' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : item.docCollectionStatus === 'Not Collected' ? (
                              <XCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            <span>{item.docCollectionStatus || 'Pending Collection'}</span>
                          </span>
                        ) : latestLogin ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                            latestLogin.status === 'Disbursed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : latestLogin.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}>
                            <Building2 className="w-3 h-3" />
                            <span>{latestLogin.bankName}: {latestLogin.status}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            <span>Pending Bank Login</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5 flex-nowrap">
                          {isDocOnly ? (
                            <button
                              type="button"
                              onClick={() => handleOpenDocModal(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-burgundy-900 hover:bg-burgundy-800 text-white px-3 py-1.5 text-[11px] font-bold shadow-2xs transition whitespace-nowrap"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-gold-300" />
                              <span>{docsCollected ? 'Update Response' : 'Response'}</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  await handleCopyNumber(
                                    item,
                                    `Copied ${clean10(item.mobile) || item.mobile} — paste it in Add New Bank File Login`
                                  );
                                  navigate('/bank-logins');
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-burgundy-900 hover:bg-burgundy-800 text-white px-2.5 py-1.5 text-[11px] font-bold shadow-2xs transition whitespace-nowrap"
                                title="Copy mobile number & go to Add Bank Login"
                              >
                                <Copy className="w-3 h-3 text-gold-300" />
                                <span>Add Bank Login</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setTrackingLead(item)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-slate-600 hover:text-amber-900 transition"
                                title="Track Flow & Audit Trail"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredLeads.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          summaryLabel="assigned leads"
        />
      </div>

      {/* Option 1 Modal: Document Collection Response (No File Upload) */}
      {liveCollectingLead && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-300 block">
                  Option 1 • Document Collection Response
                </span>
                <h3 className="text-base font-bold text-white">
                  {liveCollectingLead.customerName} ({formatMobileNumber(liveCollectingLead.mobile)})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCollectingLead(null)}
                className="text-white/75 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDocResponse} className="p-6 space-y-4 text-xs">
              {liveCollectingLead.remarks && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
                  <strong className="block text-[10px] uppercase text-slate-500 mb-0.5">RM Call Remarks:</strong>
                  {liveCollectingLead.remarks}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Collection Status <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'Documents Collected', label: 'Docs Collected', active: 'border-emerald-600 bg-emerald-50 text-emerald-900' },
                    { id: 'Pending Collection', label: 'Follow-up / Pending', active: 'border-amber-600 bg-amber-50 text-amber-900' },
                    { id: 'Not Collected', label: 'Not Collected', active: 'border-rose-600 bg-rose-50 text-rose-900' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setResponseStatus(opt.id)}
                      className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition text-center ${
                        responseStatus === opt.id
                          ? `${opt.active} shadow-xs`
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Response Remarks / Update Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter document collection response (e.g. Collected Aadhaar, PAN & 6-month Bank Statement from client)..."
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white text-xs focus:outline-none focus:border-burgundy-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCollectingLead(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-gold-300" />
                  <span>Save Response</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Number Lifecycle & Audit Trail Modal */}
      <NumberLifecycleModal
        target={trackingLead}
        onClose={() => setTrackingLead(null)}
      />
    </div>
  );
};

