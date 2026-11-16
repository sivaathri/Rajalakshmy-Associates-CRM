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

export const AddCustomerModal = ({ isOpen, onClose, defaultDatabase = 'new', defaultType = 'known' }) => {
  const { addCustomer } = useCRM();
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

  // Dynamic Document Rows state (Sl. No, Category, Custom Name, File, Actions)
  const [docRows, setDocRows] = useState([
    {
      id: 'row-1',
      category: 'KYC 1',
      customName: '',
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
    setDocRows(prev => [
      ...prev,
      {
        id: `row-${Date.now()}-${nextIndex}`,
        category: nextCategory,
        customName: '',
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

  const handleRowCustomNameChange = (id, newName) => {
    setDocRows(prev =>
      prev.map(row => (row.id === id ? { ...row, customName: newName } : row))
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

    // Validate if any row selected as 'Other' has empty document name
    for (let i = 0; i < docRows.length; i++) {
      const r = docRows[i];
      if (r.category === 'Other' && !r.customName.trim()) {
        alert(`Please enter the document name for Sl. No ${i + 1} (Other)`);
        return;
      }
    }

    // Process documents from rows
    const processedDocuments = docRows.map((r, idx) => {
      const categoryLabel = r.category === 'Other' && r.customName.trim()
        ? `Other: ${r.customName.trim()}`
        : r.category;

      const defaultNames = {
        'KYC 1': 'Aadhaar_ID_Proof.pdf',
        'KYC 2': 'PAN_Card_Proof.pdf',
        'KYC 3': 'GST_Business_License.pdf'
      };

      const name = r.fileName || (r.customName.trim() ? `${r.customName.trim()}.pdf` : (defaultNames[r.category] || `${r.category}_Document.pdf`));
      const size = r.fileSize || '1.2 MB';

      return {
        id: `DOC-${Date.now().toString().slice(-4)}-${idx + 1}`,
        category: categoryLabel,
        name,
        size,
        uploadDate: new Date().toISOString().split('T')[0]
      };
    });

    const digits = mobile.replace(/\D/g, '').slice(-10);
    const formattedMobile = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;

    addCustomer({
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
                  Attach Verification Documents (KYC 1, 2, 3, Other)
                </label>
                <p className="text-[11px] text-slate-500">
                  Manage document rows: select category, enter title if Other, and attach verification files
                </p>
              </div>
              <span className="text-[11px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
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

                        {/* Document Name: Shows active input if 'Other', or optional title input for KYC */}
                        <td className="py-3 px-3 align-top">
                          {row.category === 'Other' ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                required
                                placeholder="Enter document name *"
                                value={row.customName}
                                onChange={(e) => handleRowCustomNameChange(row.id, e.target.value)}
                                className="w-full text-xs rounded-lg border border-amber-400 bg-amber-50/60 py-1.5 px-2.5 font-medium text-slate-800 placeholder-amber-700/60 focus:outline-none focus:border-amber-600 focus:bg-white shadow-sm"
                              />
                              <span className="text-[10px] text-amber-700 font-bold block">
                                * Required for Other (e.g. Rental Agreement, Trade License)
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder={`Optional label (Auto: ${row.category} Document)`}
                                value={row.customName}
                                onChange={(e) => handleRowCustomNameChange(row.id, e.target.value)}
                                className="w-full text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-slate-50 hover:bg-white focus:bg-white focus:border-burgundy-800 focus:outline-none transition"
                              />
                              <span className="text-[10px] text-slate-400 block">
                                Auto-assigned if left blank
                              </span>
                            </div>
                          )}
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
                <span>+ Add Row</span>
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
