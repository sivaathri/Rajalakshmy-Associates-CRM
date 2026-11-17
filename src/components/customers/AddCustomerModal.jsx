import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  User,
  Phone,
  Building,
  MapPin,
  Tag,
  Upload,
  FileText,
  Trash2,
  CheckCircle,
  Plus
} from 'lucide-react';

export const DOCUMENT_NAME_OPTIONS = [
  'Aadhaar Card',
  'PAN Card',
  'Voter ID',
  'Driving License',
  'Passport',
  'GST Registration Certificate',
  'Udyam / MSME Certificate',
  'Bank Statement (Last 6 Months)',
  'ITR / Form 16 (Last 2 Years)',
  'Trade License',
  'Rental Agreement / Lease Deed',
  'Property Tax Receipt / EB Bill',
  'Partnership Deed / MOA & AOA',
  'Board Resolution / Authority Letter',
  'Salary Slips (3 Months)',
  'Others'
];

const getDefaultDocNameForIndex = (index) => {
  const defaults = [
    'Aadhaar Card',
    'PAN Card',
    'GST Registration Certificate',
    'Bank Statement (Last 6 Months)',
    'ITR / Form 16 (Last 2 Years)'
  ];
  return defaults[index - 1] || 'Others';
};

export const AddCustomerModal = ({ isOpen, onClose, defaultDatabase = 'new', defaultType = 'known' }) => {
  const { addCustomer, customers } = useCRM();
  const { currentUser } = useAuth();

  const [customerType, setCustomerType] = useState(defaultType); // 'known' | 'unknown'
  const [databaseType, setDatabaseType] = useState(defaultDatabase); // 'old' | 'new'
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [altMobile, setAltMobile] = useState('');
  const [business, setBusiness] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('Tamil Nadu');
  const [city, setCity] = useState('Chennai');

  // Compute next guaranteed unique customer ID
  const nextCustomerId = React.useMemo(() => {
    let maxNum = 1000;
    (customers || []).forEach(c => {
      if (c.id && typeof c.id === 'string' && c.id.startsWith('CUST-')) {
        const num = parseInt(c.id.replace('CUST-', ''), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    return `CUST-${maxNum + 1}`;
  }, [customers]);

  const [customerId, setCustomerId] = useState(nextCustomerId);

  // Sync when modal opens or nextCustomerId updates
  React.useEffect(() => {
    if (isOpen) {
      setCustomerId(nextCustomerId);
    }
  }, [nextCustomerId, isOpen]);

  // Check if current entered customerId is unique
  const isIdUnique = React.useMemo(() => {
    if (!customerId || !customerId.trim()) return false;
    return !customers.some(c => c.id?.toLowerCase() === customerId.trim().toLowerCase());
  }, [customerId, customers]);

  // Dynamic Document Rows state (Sl. No, Category, Doc Name dropdown, Custom Name if Others, File, Actions)
  const [docRows, setDocRows] = useState([
    {
      id: 'row-1',
      category: 'KYC 1',
      docName: 'Aadhaar Card',
      customDocName: '',
      file: null,
      fileName: '',
      fileSize: ''
    }
  ]);

  if (!isOpen) return null;

  // Add next row with auto-incremented KYC category (KYC 1 -> KYC 2 -> KYC 3 -> KYC 4...)
  const handleAddRow = () => {
    const nextIndex = docRows.length + 1;
    const nextCategory = `KYC ${nextIndex}`;
    const nextDocName = getDefaultDocNameForIndex(nextIndex);
    setDocRows(prev => [
      ...prev,
      {
        id: `row-${Date.now()}-${nextIndex}`,
        category: nextCategory,
        docName: nextDocName,
        customDocName: '',
        file: null,
        fileName: '',
        fileSize: ''
      }
    ]);
  };

  const handleRowCategoryChange = (id, newCategory) => {
    setDocRows(prev =>
      prev.map(row => (row.id === id ? { ...row, category: newCategory } : row))
    );
  };

  const handleRowDocNameChange = (id, newDocName) => {
    setDocRows(prev =>
      prev.map(row => (row.id === id ? { ...row, docName: newDocName } : row))
    );
  };

  const handleRowCustomDocNameChange = (id, customName) => {
    setDocRows(prev =>
      prev.map(row => (row.id === id ? { ...row, customDocName: customName } : row))
    );
  };

  const handleRowFileChange = (id, file) => {
    if (!file) return;
    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(1)} KB`;

    setDocRows(prev =>
      prev.map(row =>
        row.id === id
          ? {
            ...row,
            file,
            fileName: file.name,
            fileSize: sizeStr
          }
          : row
      )
    );
  };

  const handleRemoveRow = (id) => {
    setDocRows(prev => prev.filter(row => row.id !== id));
  };

  // Generate category dropdown options dynamically up to current row count, plus Other
  const getCategoryOptions = () => {
    const maxCount = Math.max(3, docRows.length);
    const options = [];
    for (let i = 1; i <= maxCount; i++) {
      options.push(`KYC ${i}`);
    }
    options.push('Other');
    return options;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    // Validate if any row selected as 'Others' has empty document name
    for (let i = 0; i < docRows.length; i++) {
      const r = docRows[i];
      if (r.docName === 'Others' && !r.customDocName.trim()) {
        alert(`Please enter the document name for Sl No ${i + 1} (Others)`);
        return;
      }
    }

    // Process documents from rows
    const processedDocuments = docRows.map((r, idx) => {
      const resolvedDocName = r.docName === 'Others'
        ? r.customDocName.trim()
        : r.docName;

      const name = r.fileName || `${resolvedDocName.replace(/[^\w.-]/g, '_')}.pdf`;
      const size = r.fileSize || '1.2 MB';

      return {
        id: `DOC-${Date.now().toString().slice(-4)}-${idx + 1}`,
        category: r.category,
        name,
        docTitle: resolvedDocName,
        size,
        uploadDate: new Date().toISOString().split('T')[0]
      };
    });

    const digits = mobile.replace(/\D/g, '').slice(-10);
    const formattedMobile = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;

    const finalId = (customerId && customerId.trim()) ? customerId.trim().toUpperCase() : nextCustomerId;
    if (customers.some(c => c.id?.toLowerCase() === finalId.toLowerCase())) {
      alert(`Customer ID "${finalId}" is already taken. Please choose a unique ID.`);
      return;
    }

    addCustomer({
      id: finalId,
      name: customerType === 'known' ? name : 'Unknown / Lead',
      mobile: formattedMobile,
      altMobile,
      business,
      address,
      state,
      city,
      databaseType,
      customerType,
      source: 'Direct',
      referenceFrom: '',
      documents: processedDocuments,
      services: []
    });

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-burgundy-900 via-burgundy-800 to-burgundy-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400 text-burgundy-950 shadow-md font-bold">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">Add Customer Record</h3>
              <p className="text-xs text-gold-200">
                Register customer profile, KYC documents, and service history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Core Info Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer ID <span className="text-emerald-700 font-bold">(Unique ID)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value.toUpperCase())}
                  placeholder="e.g. CUST-1051"
                  className={`w-full text-xs font-mono font-bold rounded-xl border py-2 px-3 shadow-sm transition focus:outline-none ${
                    isIdUnique
                      ? 'text-burgundy-900 border-slate-300 bg-white focus:border-burgundy-800'
                      : 'text-rose-900 border-rose-400 bg-rose-50/50 focus:border-rose-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setCustomerId(nextCustomerId)}
                  title="Click to reset to Next Auto Unique ID"
                  className={`text-[10px] font-bold px-2 py-2 rounded-lg border shrink-0 transition ${
                    isIdUnique
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                      : 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  {isIdUnique ? '✓ Unique' : '✗ In Use'}
                </button>
              </div>
            </div>

            {customerType === 'known' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer / Enterprise Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S. Swaminathan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Customer Name (Auto Assigned)
                </label>
                <input
                  type="text"
                  disabled
                  value="Unknown / Lead"
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-100 py-2 px-3 text-slate-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="10-digit (e.g. 98401 23456)"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alternate Mobile Number
              </label>
              <input
                type="tel"
                placeholder="Optional backup contact"
                value={altMobile}
                onChange={(e) => setAltMobile(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business / Occupation
              </label>
              <input
                type="text"
                placeholder="e.g. Textiles, Auto Spares, Pharmacy"
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                State <span className="text-rose-500">*</span>
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 bg-white"
              >
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Puducherry">Puducherry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City / District
              </label>
              <input
                type="text"
                placeholder="e.g. Chennai, Madurai, Trichy"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Street Address
              </label>
              <input
                type="text"
                placeholder="Door No, Street Name, Commercial Complex, Pincode"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
              />
            </div>
          </div>

          {/* Verification Documents Section (Dynamic Rows: Sl No, Category, Custom Name for Other, File Upload) */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Attach Verification Documents
                </label>
               
              </div>
            </div>

            {/* Document Rows Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF6EF] border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 text-center w-16">Sl No</th>
                    <th className="py-2.5 px-3 w-40">Doc Category</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Document Name</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Upload File</th>
                    <th className="py-2.5 px-2 text-center w-14">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {docRows.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-xs text-slate-400 italic bg-slate-50/50">
                        No document rows added. Click "+ Add Row" below to attach documents.
                      </td>
                    </tr>
                  ) : (
                    docRows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition">
                        {/* Sl. No */}
                        <td className="py-3 px-3 text-center align-top">
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-burgundy-50 border border-burgundy-200 text-burgundy-900 font-bold text-xs">
                            {idx + 1}
                          </span>
                        </td>

                        {/* Doc Category Dropdown */}
                        <td className="py-3 px-3 align-top">
                          <select
                            value={row.category}
                            onChange={(e) => handleRowCategoryChange(row.id, e.target.value)}
                            className="w-full text-xs font-semibold rounded-lg border border-slate-300 py-1.5 px-2 bg-white text-slate-800 focus:outline-none focus:border-burgundy-800 shadow-sm"
                          >
                            {getCategoryOptions().map(opt => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            {row.category === 'KYC 1' && 'Aadhaar / ID'}
                            {row.category === 'KYC 2' && 'PAN Card'}
                            {row.category === 'KYC 3' && 'GST / Business'}
                            {row.category.startsWith('KYC') && !['KYC 1', 'KYC 2', 'KYC 3'].includes(row.category) && 'Identity / Proof'}
                            {row.category === 'Other' && 'Custom Doc'}
                          </span>
                        </td>

                        {/* Document Name: Choose in a dropdown. If 'Others' is selected, then only show the input to enter doc name */}
                        <td className="py-3 px-3 align-top">
                          <div className="space-y-1.5">
                            <select
                              value={row.docName}
                              onChange={(e) => handleRowDocNameChange(row.id, e.target.value)}
                              className={`w-full text-xs font-semibold rounded-lg border py-1.5 px-2 bg-white text-slate-800 focus:outline-none shadow-sm ${
                                row.docName === 'Others'
                                  ? 'border-amber-400 bg-amber-50/30 focus:border-amber-600'
                                  : 'border-slate-300 focus:border-burgundy-800'
                              }`}
                            >
                              {DOCUMENT_NAME_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>

                            {/* Only show input to enter document name if 'Others' is selected in this dropdown */}
                            {row.docName === 'Others' && (
                              <div className="space-y-1 animate-fade-in">
                                <input
                                  type="text"
                                  required
                                  placeholder="Enter document name *"
                                  value={row.customDocName}
                                  onChange={(e) => handleRowCustomDocNameChange(row.id, e.target.value)}
                                  className="w-full text-xs rounded-lg border border-amber-400 bg-amber-50/70 py-1.5 px-2.5 font-medium text-slate-800 placeholder-amber-700/60 focus:outline-none focus:border-amber-600 focus:bg-white shadow-sm"
                                  autoFocus
                                />
                                <span className="text-[10px] text-amber-700 font-bold block">
                                  * Required: Enter custom document name
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Choose / Upload File */}
                        <td className="py-3 px-3 align-top">
                          <div className="space-y-1">
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition">
                              <Upload className="w-3.5 h-3.5 text-burgundy-800 shrink-0" />
                              <span className="truncate max-w-[120px]">
                                {row.fileName ? 'Change File' : 'Choose File'}
                              </span>
                              <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                className="hidden"
                                onChange={(e) => handleRowFileChange(row.id, e.target.files[0])}
                              />
                            </label>

                            {row.fileName ? (
                              <div className="text-[11px] font-semibold text-emerald-700 truncate max-w-[210px]" title={row.fileName}>
                                ✓ {row.fileName} <span className="text-slate-400 font-normal">({row.fileSize})</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400">
                                PDF, PNG, JPG (Simulated if unpicked)
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Action: Delete Row */}
                        <td className="py-3 px-2 text-center align-top">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer: Add Row Button & Status */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 rounded-xl bg-burgundy-900 px-4 py-2 text-xs font-bold text-white hover:bg-burgundy-800 transition shadow-sm"
              >
                <Plus className="w-4 h-4 text-gold-400" />
                <span>Add Row</span>
              </button>
              <span className="text-xs font-semibold text-slate-500">
                {docRows.length} {docRows.length === 1 ? 'Row' : 'Rows'} Configured
              </span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-burgundy-900 hover:bg-burgundy-800 px-6 py-2.5 text-xs font-bold text-white shadow-md transition"
            >
              Save Customer Record
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
