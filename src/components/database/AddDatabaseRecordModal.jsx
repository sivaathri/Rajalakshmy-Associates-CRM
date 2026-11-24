import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Database,
  User,
  Phone,
  Building,
  Tag,
  Share2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export const AddDatabaseRecordModal = ({
  isOpen,
  onClose,
  defaultDatabase = 'new',
  defaultType = 'known'
}) => {
  const { addCustomer, customers } = useCRM();
  const { currentUser, showToast } = useAuth();

  const [databaseType, setDatabaseType] = useState(defaultDatabase); // 'old' | 'new'
  const [customerType, setCustomerType] = useState(defaultType); // 'known' | 'unknown'
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [business, setBusiness] = useState('');
  const [source, setSource] = useState('Bills'); // 'Bills' | 'Open Source' | 'Reference'
  const [referenceFrom, setReferenceFrom] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Sync defaults when modal opens with new props
  React.useEffect(() => {
    if (isOpen) {
      setDatabaseType(defaultDatabase || 'new');
      setCustomerType(defaultType || 'known');
    }
  }, [isOpen, defaultDatabase, defaultType]);

  if (!isOpen) return null;

  // Check if mobile already exists in database
  const cleanEnteredMobile = mobile.replace(/\D/g, '').slice(-10);
  const existingRecord = cleanEnteredMobile.length === 10
    ? customers.find(c => c.mobile && c.mobile.replace(/\D/g, '').slice(-10) === cleanEnteredMobile)
    : null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!mobile.trim() || cleanEnteredMobile.length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    if (existingRecord) {
      alert(`Telephone number ${existingRecord.mobile} already exists in ${existingRecord.databaseType?.toUpperCase()} Database (${existingRecord.name || 'Unknown'})!`);
      return;
    }

    if (source === 'Reference' && !referenceFrom.trim()) {
      alert('Please specify who provided this reference');
      return;
    }

    const formattedMobile = `+91 ${cleanEnteredMobile.slice(0, 5)} ${cleanEnteredMobile.slice(5)}`;

    addCustomer({
      name: customerType === 'known' ? (name.trim() || 'Contact Lead') : 'Unknown / Lead',
      mobile: formattedMobile,
      business: business.trim() || 'General Business',
      databaseType,
      customerType,
      source,
      referenceFrom: source === 'Reference' ? referenceFrom.trim() : '',
      city: city.trim(),
      state: state.trim(),
      isCustomer: false, // Explicitly not a verified customer profile (database lead only)
      callingStatus: 'Pending',
      submittedBy: currentUser?.id,
      submittedByName: currentUser?.name,
      assignedTo: currentUser?.role === 'RM' ? currentUser.id : '',
      assignedName: currentUser?.role === 'RM' ? currentUser.name : '',
      documents: [],
      services: []
    });

    showToast(`Record added to ${databaseType.toUpperCase()} Database (${customerType})!`, 'success');

    // Reset & close
    setName('');
    setMobile('');
    setBusiness('');
    setReferenceFrom('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/20 border border-gold-300/30 text-gold-300 shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-gold-300 block">Database Partition</span>
              <h3 className="text-base font-bold text-white">Add Database Record (Old & New)</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Partition Selector: Old vs New Database */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Database Partition <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDatabaseType('old')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  databaseType === 'old'
                    ? 'border-burgundy-800 bg-burgundy-50 text-burgundy-950 ring-2 ring-burgundy-800/10'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Database className="w-4 h-4 text-amber-600" />
                <span>Old Database</span>
              </button>

              <button
                type="button"
                onClick={() => setDatabaseType('new')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  databaseType === 'new'
                    ? 'border-burgundy-800 bg-burgundy-50 text-burgundy-950 ring-2 ring-burgundy-800/10'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Database className="w-4 h-4 text-emerald-600" />
                <span>New Database</span>
              </button>
            </div>
          </div>

          {/* Classification Selector: Known vs Unknown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Classification Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCustomerType('known')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  customerType === 'known'
                    ? 'border-burgundy-800 bg-burgundy-50 text-burgundy-950 ring-2 ring-burgundy-800/10'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <User className="w-4 h-4 text-blue-600" />
                <span>Known Contact</span>
              </button>

              <button
                type="button"
                onClick={() => setCustomerType('unknown')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  customerType === 'unknown'
                    ? 'border-burgundy-800 bg-burgundy-50 text-burgundy-950 ring-2 ring-burgundy-800/10'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Tag className="w-4 h-4 text-amber-600" />
                <span>Unknown / Raw Lead</span>
              </button>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            {customerType === 'known' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact / Proprietor Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. S. Ramanathan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  disabled
                  value="Unknown / Lead"
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-100 py-2 px-3 text-slate-500 cursor-not-allowed"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className={`w-full text-xs rounded-xl border py-2 pl-9 pr-3 focus:outline-none ${
                    existingRecord ? 'border-rose-400 bg-rose-50' : 'border-slate-300 focus:border-burgundy-800'
                  }`}
                />
              </div>
              {existingRecord && (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-700 font-semibold mt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Number already exists in {existingRecord.databaseType?.toUpperCase()} Database ({existingRecord.name})</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business / Sector
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Textiles, Rice Mill, Pharmacy"
                    value={business}
                    onChange={(e) => setBusiness(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Database Source <span className="text-rose-500">*</span>
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white focus:outline-none focus:border-burgundy-800"
                >
                  <option value="Bills">1. Bills</option>
                  <option value="Open Source">2. Open Source</option>
                  <option value="Reference">3. Reference</option>
                </select>
              </div>
            </div>

            {source === 'Reference' && (
              <div className="animate-fade-in">
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  Reference From / Who? <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Share2 className="absolute left-3 top-2.5 w-4 h-4 text-amber-600" />
                  <input
                    type="text"
                    required
                    placeholder="Name of recommender or client"
                    value={referenceFrom}
                    onChange={(e) => setReferenceFrom(e.target.value)}
                    className="w-full text-xs rounded-xl border border-amber-300 py-2 pl-9 pr-3 bg-amber-50/50 focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            ℹ️ Record saves as a prospect into the {databaseType.toUpperCase()} Database. No Customer ID is assigned because raw database entries are not yet converted customers.
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!existingRecord}
              className="px-5 py-2 text-xs font-bold text-white bg-burgundy-900 hover:bg-burgundy-800 rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Database Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
