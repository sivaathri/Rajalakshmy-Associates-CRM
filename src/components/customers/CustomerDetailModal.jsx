import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  User,
  Phone,
  Building,
  MapPin,
  Calendar,
  FileText,
  FileCheck,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  Briefcase,
  History,
  PhoneCall,
  Upload
} from 'lucide-react';
import { formatDate, getStatusBadgeClass } from '../../utils/formatters';

export const CustomerDetailModal = ({ customer, onClose }) => {
  const {
    addCustomerDocument,
    deleteCustomerDocument,
    addCustomerService,
    startCallingCustomer,
    calls
  } = useCRM();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'documents' | 'services' | 'calls'

  // Document upload state
  const [docCategory, setDocCategory] = useState('KYC 1');
  const [docFileName, setDocFileName] = useState('');
  const [docFileObj, setDocFileObj] = useState(null);

  // New Service request state
  const [showAddService, setShowAddService] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDetails, setServiceDetails] = useState('');
  const [serviceRemarks, setServiceRemarks] = useState('');

  if (!customer) return null;

  const handleDocUpload = (e) => {
    e.preventDefault();
    if (docCategory === 'Other' && !docFileName.trim()) {
      alert('Please enter the document name for "Other" category');
      return;
    }

    if (!docFileName.trim() && !docFileObj) {
      alert('Please specify a document name or pick a file');
      return;
    }

    const defaultNames = {
      'KYC 1': 'Aadhaar_ID_Proof.pdf',
      'KYC 2': 'PAN_Card_Proof.pdf',
      'KYC 3': 'GST_Business_License.pdf',
      'Other': `${docFileName.trim() || 'Document'}.pdf`
    };

    const name = docFileObj 
      ? docFileObj.name 
      : (docFileName.trim() ? `${docFileName.trim()}.pdf` : defaultNames[docCategory]);
    const size = docFileObj ? `${(docFileObj.size / (1024 * 1024)).toFixed(1)} MB` : '1.4 MB';

    const categoryLabel = docCategory === 'Other' && docFileName.trim()
      ? `Other: ${docFileName.trim()}`
      : docCategory;

    addCustomerDocument(customer.id, {
      category: categoryLabel,
      name,
      size
    });

    setDocFileName('');
    setDocFileObj(null);
  };

  const handleServiceSubmit = (e) => {
    e.preventDefault();
    if (!serviceName.trim()) return;

    addCustomerService(customer.id, {
      serviceName,
      details: serviceDetails,
      status: 'In Review',
      remarks: serviceRemarks
    });

    setServiceName('');
    setServiceDetails('');
    setServiceRemarks('');
    setShowAddService(false);
  };

  const customerCalls = calls.filter(c => c.customerId === customer.id);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-burgundy-900 via-burgundy-800 to-burgundy-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-400 text-burgundy-950 shadow-md font-bold text-lg">
              {customer.name ? customer.name.charAt(0) : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{customer.name}</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full border border-white/30 text-gold-300">
                  {customer.databaseType} / {customer.customerType}
                </span>
              </div>
              <div className="text-xs text-white/70">
                Customer ID: <span className="font-mono text-gold-300 font-semibold">{customer.id}</span> • Assigned to: <span className="text-white font-medium">{customer.assignedName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-[#FAF6EF] px-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'details'
                ? 'border-burgundy-800 text-burgundy-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            Profile & Overview
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'documents'
                ? 'border-burgundy-800 text-burgundy-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            KYC & Documents ({customer.documents?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'services'
                ? 'border-burgundy-800 text-burgundy-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Service History ({customer.services?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'calls'
                ? 'border-burgundy-800 text-burgundy-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            Calling History ({customerCalls.length})
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-burgundy-900 pb-2 border-b border-slate-200">
                    Contact & Personal Information
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mobile Number:</span>
                      <span className="font-bold text-slate-800">{customer.mobile}</span>
                    </div>
                    {customer.altMobile && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Alternate Mobile:</span>
                        <span className="font-semibold text-slate-800">{customer.altMobile}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Business / Occupation:</span>
                      <span className="font-semibold text-slate-800">{customer.business || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">State & Region:</span>
                      <span className="font-semibold text-slate-800">{customer.city}, {customer.state}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Registered Address:</span>
                      <span className="font-medium text-slate-800 text-right max-w-xs">{customer.address || 'Standard Registered Zone'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-burgundy-900 pb-2 border-b border-slate-200">
                    CRM Categorization & Status
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Current Calling Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(customer.callingStatus)}`}>
                        {customer.callingStatus || 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Database Source:</span>
                      <span className="font-semibold text-slate-800">{customer.source}</span>
                    </div>
                    {customer.referenceFrom && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Reference From:</span>
                        <span className="font-semibold text-amber-900">{customer.referenceFrom}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Telecall Date:</span>
                      <span className="font-semibold text-slate-800">{formatDate(customer.lastCallDate) || 'No call yet'}</span>
                    </div>
                    {customer.reminderDate && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Scheduled Reminder:</span>
                        <span className="font-bold text-amber-800">{formatDate(customer.reminderDate)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account Created:</span>
                      <span className="font-medium text-slate-800">{formatDate(customer.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {customer.reminderRemark && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                  <div className="text-xs font-bold text-amber-900 mb-1">Active Follow-up Reminder Note:</div>
                  <p className="text-xs text-amber-800 italic">"{customer.reminderRemark}"</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOCUMENTS (KYC 1, KYC 2, KYC 3, Other) */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Upload Document Box */}
              <form onSubmit={handleDocUpload} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Upload Customer Verification Document
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Document Category</label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2 bg-white"
                    >
                      <option value="KYC 1">KYC 1 (Aadhaar / ID)</option>
                      <option value="KYC 2">KYC 2 (PAN Card Proof)</option>
                      <option value="KYC 3">KYC 3 (GST / Business License)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {docCategory === 'Other' ? (
                        <span className="text-amber-700 font-bold">Document Name *</span>
                      ) : (
                        'Document Label (Optional)'
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder={docCategory === 'Other' ? 'Enter document name (e.g. Bank Statement, ITR)' : 'Auto-assigned if empty'}
                      value={docFileName}
                      onChange={(e) => setDocFileName(e.target.value)}
                      className={`w-full text-xs rounded-lg border py-1.5 px-2 bg-white ${
                        docCategory === 'Other' ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Choose File</label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => setDocFileObj(e.target.files[0])}
                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:bg-burgundy-900 file:text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-lg bg-burgundy-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-burgundy-800 transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-gold-400" />
                    <span>Upload Document</span>
                  </button>
                </div>
              </form>

              {/* Uploaded Documents List */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Uploaded Verification Files
                </div>
                {(!customer.documents || customer.documents.length === 0) ? (
                  <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                    No documents uploaded yet for this customer.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customer.documents.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-gold-300 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-burgundy-50 text-burgundy-800">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800">{doc.name}</div>
                            <div className="text-[10px] text-slate-500">
                              <span className="font-semibold text-burgundy-800 bg-burgundy-50 px-1.5 py-0.5 rounded border border-burgundy-100 mr-1.5">
                                {doc.category}
                              </span>
                              {doc.size} • Uploaded {formatDate(doc.uploadDate)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => alert(`Previewing ${doc.name} (Simulated in Prototype)`)}
                            className="text-xs font-semibold text-gold-700 hover:text-gold-900 underline"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => deleteCustomerDocument(customer.id, doc.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Remove Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SERVICE HISTORY */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Customer Service Engagements & Requests
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Track lifetime advisory services, loan consultations, and compliance filing history.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddService(!showAddService)}
                  className="flex items-center gap-1.5 rounded-xl bg-gold-500 hover:bg-gold-600 px-3 py-1.5 text-xs font-bold text-amber-950 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Request New Service</span>
                </button>
              </div>

              {/* Add Service Inline Form */}
              {showAddService && (
                <form onSubmit={handleServiceSubmit} className="rounded-xl border border-gold-300 bg-gold-50/50 p-4 space-y-3 animate-fade-in">
                  <div className="text-xs font-bold text-amber-950">Add Service Request for {customer.name}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Service Name / Type *</label>
                      <select
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        required
                        className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2 bg-white"
                      >
                        <option value="">Select Service...</option>
                        <option value="MSME Udyam Registration & Subsidy">MSME Udyam Registration & Subsidy</option>
                        <option value="Working Capital / CC Loan Advisory">Working Capital / CC Loan Advisory</option>
                        <option value="Project Loan & Machinery Finance">Project Loan & Machinery Finance</option>
                        <option value="GST & Financial Audit Compliance">GST & Financial Audit Compliance</option>
                        <option value="Export Credit Insurance & LC Advisory">Export Credit Insurance & LC Advisory</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Remarks & Target Amount</label>
                      <input
                        type="text"
                        placeholder="e.g. Target ₹25 Lakhs, Canara Bank"
                        value={serviceRemarks}
                        onChange={(e) => setServiceRemarks(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Detailed Description</label>
                    <textarea
                      rows={2}
                      placeholder="Enter specific requirements, bank branches involved, milestones..."
                      value={serviceDetails}
                      onChange={(e) => setServiceDetails(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddService(false)}
                      className="px-3 py-1 text-xs text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold bg-burgundy-900 text-white rounded-lg hover:bg-burgundy-800"
                    >
                      Save Service Request
                    </button>
                  </div>
                </form>
              )}

              {/* Service History Timeline */}
              <div className="space-y-3">
                {(!customer.services || customer.services.length === 0) ? (
                  <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                    No service engagements registered yet.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {customer.services.map(srv => (
                      <div key={srv.id} className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="absolute -left-[23px] top-4 h-3 w-3 rounded-full bg-burgundy-800 ring-4 ring-white"></div>
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="text-xs font-bold text-slate-900">{srv.serviceName}</h5>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(srv.status)}`}>
                            {srv.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mb-2">
                          Requested: {formatDate(srv.requestDate)}
                        </div>
                        {srv.details && (
                          <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            {srv.details}
                          </p>
                        )}
                        {srv.remarks && (
                          <div className="mt-2 text-[11px] text-slate-500 italic">
                            Note: {srv.remarks}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CALLING HISTORY */}
          {activeTab === 'calls' && (
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Customer Call Record History ({customerCalls.length})
              </div>
              {customerCalls.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                  No telecalls have been conducted with this contact yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {customerCalls.map(c => (
                    <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-slate-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{c.callDate} at {c.callTime}</span>
                          <span className="text-[11px] text-slate-500">by {c.employeeName}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(c.outcome)}`}>
                          {c.outcome} ({c.duration})
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        "{c.remarks}"
                      </div>
                      {c.reminderDate && (
                        <div className="mt-1 text-[11px] font-semibold text-amber-800">
                          Follow-up Scheduled for: {formatDate(c.reminderDate)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end bg-slate-50 px-6 py-3 border-t border-slate-200">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-200 hover:bg-slate-300 px-5 py-2 text-xs font-semibold text-slate-800 transition"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
