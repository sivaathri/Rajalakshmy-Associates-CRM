import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { Pagination } from '../components/common/Pagination';
import { NumberLifecycleModal } from '../components/common/NumberLifecycleModal';
import {
  UserCheck,
  FileText,
  Copy,
  Check,
  Search,
  Upload,
  CheckCircle2,
  Building2,
  PhoneCall,
  MapPin,
  Briefcase,
  History,
  ArrowRight,
  Clock,
  X,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { formatDate, formatMobileNumber, matchesMobileSearch } from '../utils/formatters';

const clean10 = (val) => String(val || '').replace(/\D/g, '').slice(-10);

export const AssignLeadsPage = () => {
  const {
    leads = [],
    customers = [],
    bankLogins = [],
    collectAssignedLeadDocument,
    markAssignedDocsCompleted
  } = useCRM();
  const { currentUser, showToast } = useAuth();
  const navigate = useNavigate();

  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'collect_docs' | 'transfer_case'
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Document Collection Modal State (Option 1: Collect Only Document)
  const [collectingLead, setCollectingLead] = useState(null);
  const [docCategory, setDocCategory] = useState('KYC 1');
  const [docFileName, setDocFileName] = useState('');
  const [docFileObj, setDocFileObj] = useState(null);
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

  const handleCopyNumber = async (lead) => {
    const clean = clean10(lead.mobile) || lead.mobile || '';
    try {
      await navigator.clipboard.writeText(clean);
      setCopiedId(lead.id);
      showToast(`Copied ${clean} — paste it into Add New Bank File Login`, 'success');
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      showToast(`Mobile Number: ${clean}`, 'info');
    }
  };

  const handleOpenDocModal = (lead) => {
    setCollectingLead(lead);
    setDocCategory('KYC 1');
    setDocFileName('');
    setDocFileObj(null);
    setCompletionNote(lead.docCollectionCompletionNote || '');
  };

  const handleUploadDoc = (e) => {
    e.preventDefault();
    if (!collectingLead) return;
    if (docCategory === 'Other' && !docFileName.trim()) {
      alert('Please enter document name for "Other" category');
      return;
    }
    if (!docFileName.trim() && !docFileObj) {
      alert('Please select a file or enter a document name');
      return;
    }
    const label = docCategory === 'Other' && docFileName.trim() ? `Other: ${docFileName.trim()}` : docCategory;
    const name = docFileObj ? docFileObj.name : `${docFileName.trim()}.pdf`;
    const size = docFileObj ? `${(docFileObj.size / (1024 * 1024)).toFixed(2)} MB` : '1.2 MB';

    collectAssignedLeadDocument(collectingLead.id, {
      category: label,
      name,
      size
    });

    setDocFileName('');
    setDocFileObj(null);
  };

  const handleCompleteDocCollection = () => {
    if (!collectingLead) return;
    markAssignedDocsCompleted(collectingLead.id, completionNote.trim());
    setCollectingLead(null);
  };

  // Refresh collectingLead live from assignedToMeLeads while modal is open
  const liveCollectingLead = useMemo(() => {
    if (!collectingLead) return null;
    return assignedToMeLeads.find(l => l.id === collectingLead.id) || collectingLead;
  }, [collectingLead, assignedToMeLeads]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/20 border border-gold-300/30 text-gold-300 shadow-sm shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold-300 block">
              Telecalling Assignments & Handoffs • {currentUser?.name} ({currentUser?.role})
            </span>
            <h2 className="text-xl md:text-2xl font-extrabold text-white font-corporate">
              Assign Lead Inbox
            </h2>
            <p className="text-xs text-white/75 mt-0.5 max-w-2xl">
              View complete customer information for leads assigned to you: either collect documents only (Option 1) or copy the mobile number to create a Bank Login file (Option 2).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/bank-logins')}
          className="inline-flex items-center gap-2 rounded-xl bg-gold-500 hover:bg-gold-600 px-4 py-2.5 text-xs font-extrabold text-amber-950 shadow-md transition self-start md:self-center shrink-0"
        >
          <FileCheck className="w-4 h-4" />
          <span>Open Bank Login Console</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'all', label: `All Assigned (${assignedToMeLeads.length})` },
            { id: 'collect_docs', label: `1. Collect Document Only (${docCount})` },
            { id: 'transfer_case', label: `2. Case Transfer / For Bank Login (${caseCount})` }
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

                      {/* Remarks & Docs */}
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="text-[11px] text-slate-700 line-clamp-2" title={item.remarks || ''}>
                          {item.remarks || '—'}
                        </div>
                        {item.mergedDocs.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.mergedDocs.slice(0, 2).map((d, i) => (
                              <span
                                key={d.id || i}
                                className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900 truncate max-w-[160px]"
                              >
                                <FileText className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                <span className="truncate">{d.category}: {d.name}</span>
                              </span>
                            ))}
                            {item.mergedDocs.length > 2 && (
                              <span className="text-[10px] font-bold text-emerald-800">
                                +{item.mergedDocs.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Workflow Status */}
                      <td className="px-4 py-3">
                        {isDocOnly ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                            docsCollected
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}>
                            {docsCollected ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            <span>{docsCollected ? `Docs Collected (${item.mergedDocs.length})` : 'Pending Collection'}</span>
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
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 text-[11px] font-bold shadow-2xs transition whitespace-nowrap"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>{docsCollected ? 'Docs' : 'Upload Docs'}</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  handleCopyNumber(item);
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

      {/* Option 1 Modal: Collect Documents Only */}
      {liveCollectingLead && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-300 block">
                  Option 1 • Collect Only Document
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

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {liveCollectingLead.docCollectionNote && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
                  <strong className="block text-[10px] uppercase text-amber-800">RM Requested Documents:</strong>
                  {liveCollectingLead.docCollectionNote}
                </div>
              )}

              {/* Upload Document Form */}
              <form onSubmit={handleUploadDoc} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-burgundy-800" />
                  <span>Upload Collected Document</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Document Category</label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white text-xs"
                    >
                      <option value="KYC 1">KYC 1 (Aadhaar / ID)</option>
                      <option value="KYC 2">KYC 2 (PAN Card)</option>
                      <option value="KYC 3">KYC 3 (GST / Business Proof)</option>
                      <option value="Bank Statement">Bank Statement</option>
                      <option value="ITR / Financials">ITR / Financials</option>
                      <option value="Other">Other Document</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Document Name {docCategory === 'Other' && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Aadhaar_Front"
                      value={docFileName}
                      onChange={(e) => setDocFileName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Attach File (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) => setDocFileObj(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-burgundy-50 file:text-burgundy-900 hover:file:bg-burgundy-100"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                >
                  <Upload className="w-3.5 h-3.5 text-gold-300" />
                  <span>Save Uploaded Document</span>
                </button>
              </form>

              {/* Existing Docs List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-700">
                  Uploaded Documents ({liveCollectingLead.mergedDocs.length})
                </h4>
                {liveCollectingLead.mergedDocs.length === 0 ? (
                  <div className="p-3 rounded-xl border border-dashed border-slate-200 text-slate-400 italic flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>No documents uploaded yet.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {liveCollectingLead.mergedDocs.map((d, i) => (
                      <div key={d.id || i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 truncate">{d.name}</div>
                            <div className="text-[10px] text-slate-500">{d.category} • {formatDate(d.uploadDate)}</div>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{d.size}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completion Note */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Collection Status Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Collected all hard copies & PDF from client office"
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCollectingLead(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCompleteDocCollection}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Document Collection Complete</span>
                </button>
              </div>
            </div>
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

