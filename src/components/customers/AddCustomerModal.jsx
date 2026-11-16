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
  const [source, setSource] = useState('Bills');
  const [referenceFrom, setReferenceFrom] = useState('');

  // Documents list
  const [documents, setDocuments] = useState([]);
  const [docCategory, setDocCategory] = useState('KYC 1');
  const [docName, setDocName] = useState('');

  if (!isOpen) return null;

  const handleAddDocument = () => {
    if (!docName.trim()) {
      alert('Please specify a document name');
      return;
    }
    const newDoc = {
      id: `DOC-${Date.now().toString().slice(-4)}`,
      category: docCategory,
      name: `${docName}.pdf`,
      size: '1.2 MB',
      uploadDate: new Date().toISOString().split('T')[0]
    };
    setDocuments(prev => [...prev, newDoc]);
    setDocName('');
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
      source,
      referenceFrom,
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
                Register customer to {databaseType.toUpperCase()} Database
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
          {/* Database & Type Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Database Target
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDatabaseType('new')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition ${
                    databaseType === 'new'
                      ? 'bg-burgundy-900 text-white border-burgundy-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  New Database
                </button>
                <button
                  type="button"
                  onClick={() => setDatabaseType('old')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition ${
                    databaseType === 'old'
                      ? 'bg-burgundy-900 text-white border-burgundy-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Old Database
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Customer Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerType('known')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition ${
                    customerType === 'known'
                      ? 'bg-gold-500 text-amber-950 border-gold-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Known Contact
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType('unknown')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition ${
                    customerType === 'unknown'
                      ? 'bg-gold-500 text-amber-950 border-gold-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Unknown / Lead
                </button>
              </div>
            </div>
          </div>

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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Database Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 bg-white"
              >
                <option value="Bills">Bills</option>
                <option value="Open Source">Open Source</option>
                <option value="Reference">Reference</option>
              </select>
            </div>

            {source === 'Reference' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  Reference From / Who? *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Specify person or firm who gave reference"
                  value={referenceFrom}
                  onChange={(e) => setReferenceFrom(e.target.value)}
                  className="w-full text-xs rounded-xl border border-amber-300 py-2 px-3 bg-amber-50/50"
                />
              </div>
            )}

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
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Attach Verification Documents (KYC 1, 2, 3, Other)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#FAF6EF] p-3 rounded-xl border border-slate-200">
              <div>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2 bg-white"
                >
                  <option value="KYC 1">KYC 1 (Aadhaar / Passport / ID)</option>
                  <option value="KYC 2">KYC 2 (PAN Card Proof)</option>
                  <option value="KYC 3">KYC 3 (GST / Business License)</option>
                  <option value="Other Documents">Other Documents</option>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Document label (e.g. Aadhaar_Front)"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2 bg-white"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddDocument}
                  className="w-full rounded-lg bg-burgundy-900 text-white text-xs font-bold hover:bg-burgundy-800 transition py-1.5"
                >
                  + Add Document
                </button>
              </div>
            </div>

            {/* Document Badges */}
            {documents.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {documents.map(d => (
                  <span
                    key={d.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-800 shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-burgundy-800" />
                    <span className="font-semibold text-burgundy-900">[{d.category}]</span>
                    <span>{d.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDoc(d.id)}
                      className="text-slate-400 hover:text-rose-600 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
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
