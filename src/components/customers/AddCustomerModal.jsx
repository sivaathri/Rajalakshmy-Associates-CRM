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

  // Documents list & upload state
  const [documents, setDocuments] = useState([]);
  const [docCategory, setDocCategory] = useState('KYC 1');
  const [docName, setDocName] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleAddDocument = () => {
    if (docCategory === 'Other' && !docName.trim()) {
      alert('Please enter the document name for "Other" category');
      return;
    }

    if (!uploadedFile && !docName.trim()) {
      alert('Please choose a file to upload or enter a document name');
      return;
    }

    const defaultNames = {
      'KYC 1': 'Aadhaar_ID_Proof.pdf',
      'KYC 2': 'PAN_Card_Proof.pdf',
      'KYC 3': 'GST_Business_License.pdf',
      'Other': `${docName.trim() || 'Document'}.pdf`
    };

    const fileName = uploadedFile
      ? uploadedFile.name
      : (docCategory === 'Other' ? `${docName.trim()}.pdf` : defaultNames[docCategory]);

    const fileSize = uploadedFile
      ? `${(uploadedFile.size / 1024).toFixed(1)} KB`
      : '1.2 MB';

    const categoryLabel = docCategory === 'Other' && docName.trim()
      ? `Other: ${docName.trim()}`
      : docCategory;

    const newDoc = {
      id: `DOC-${Date.now().toString().slice(-4)}`,
      category: categoryLabel,
      name: fileName,
      size: fileSize,
      uploadDate: new Date().toISOString().split('T')[0]
    };

    setDocuments(prev => [...prev, newDoc]);
    setDocName('');
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveDoc = (id) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

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
      documents,
      services: []
    });

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
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

          {/* Document Upload Section */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Attach Verification Documents (KYC 1, 2, 3, Other)
              </label>
              <span className="text-[11px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
            </div>

            <div className="bg-[#FAF6EF] p-4 rounded-xl border border-slate-200 space-y-3">
              {/* Category Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Document Category:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'KYC 1', label: 'KYC 1', desc: 'Aadhaar / ID' },
                    { id: 'KYC 2', label: 'KYC 2', desc: 'PAN Card' },
                    { id: 'KYC 3', label: 'KYC 3', desc: 'GST / Business' },
                    { id: 'Other', label: 'Other', desc: 'Custom Title' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setDocCategory(cat.id)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border transition text-left sm:text-center ${
                        docCategory === cat.id
                          ? 'bg-burgundy-900 text-white border-burgundy-900 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span className="block text-[10px] font-normal opacity-80 truncate">{cat.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* If click Other, show the input to enter document name */}
              {docCategory === 'Other' && (
                <div className="animate-fade-in bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                  <label className="block text-xs font-bold text-amber-950 mb-1">
                    Enter Document Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rental Agreement, Trade License, Board Resolution"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full text-xs rounded-lg border border-amber-300 py-2 px-3 bg-white focus:outline-none focus:border-amber-600 shadow-sm"
                  />
                </div>
              )}

              {/* File upload input & Attach button */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Upload File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-burgundy-50 file:text-burgundy-900 hover:file:bg-burgundy-100 cursor-pointer border border-slate-300 rounded-xl bg-white p-1"
                  />
                  {uploadedFile && (
                    <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                      ✓ Selected file: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>

                <div className="flex items-end pt-5 sm:pt-0">
                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-burgundy-900 text-white text-xs font-bold hover:bg-burgundy-800 transition py-2 px-4 shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5 text-gold-400" />
                    <span>Attach Document</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Document Badges */}
            {documents.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Attached Verification Documents ({documents.length}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {documents.map(d => (
                    <span
                      key={d.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-300 px-3 py-1.5 text-xs text-slate-800 shadow-sm"
                    >
                      <FileText className="w-4 h-4 text-burgundy-800 shrink-0" />
                      <span className="font-bold text-burgundy-900">[{d.category}]</span>
                      <span className="font-medium truncate max-w-xs">{d.name}</span>
                      <span className="text-[10px] text-slate-400">({d.size})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(d.id)}
                        className="text-slate-400 hover:text-rose-600 ml-1 p-0.5"
                        title="Remove Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
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
