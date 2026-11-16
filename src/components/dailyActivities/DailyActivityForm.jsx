import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { PlusCircle, Building2, User, Phone, MapPin, Tag, Share2 } from 'lucide-react';

export const DailyActivityForm = () => {
  const { addDailyActivity } = useCRM();
  const { currentUser } = useAuth();

  const [customerType, setCustomerType] = useState('known'); // 'known' | 'unknown'
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [business, setBusiness] = useState('');
  const [source, setSource] = useState('Bills'); // 'Bills' | 'Open Source' | 'Reference'
  const [referenceFrom, setReferenceFrom] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    if (source === 'Reference' && !referenceFrom.trim()) {
      alert('Please specify "Reference From / Who?" for reference sourced leads');
      return;
    }

    const digits = mobile.replace(/\D/g, '').slice(-10);
    const formattedMobile = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;

    addDailyActivity({
      customerName: customerType === 'known' ? customerName : 'Unknown / Lead',
      mobile: formattedMobile,
      business,
      customerType,
      state: 'Tamil Nadu',
      source,
      referenceFrom
    });

    // Reset form
    setCustomerName('');
    setMobile('');
    setBusiness('');
    setReferenceFrom('');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div>
          <h3 className="text-base font-bold text-burgundy-900 font-corporate">
            Field Sales Daily Entry Form
          </h3>
          <p className="text-xs text-slate-500">
            Submit field prospect details. Record automatically syncs to New Database.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Submitting Employee</span>
          <span className="text-xs font-bold text-burgundy-900">{currentUser?.name} ({currentUser?.id})</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Type Toggle */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Classification Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <button
              type="button"
              onClick={() => setCustomerType('known')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition border ${
                customerType === 'known'
                  ? 'border-burgundy-800 bg-burgundy-50 text-burgundy-950 ring-2 ring-burgundy-800/10'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <User className="w-4 h-4 text-burgundy-800" />
              <span>Known Customer</span>
            </button>

            <button
              type="button"
              onClick={() => setCustomerType('unknown')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition border ${
                customerType === 'unknown'
                  ? 'border-burgundy-800 bg-burgundy-50 text-burgundy-950 ring-2 ring-burgundy-800/10'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Tag className="w-4 h-4 text-amber-700" />
              <span>Unknown / Lead</span>
            </button>
          </div>
        </div>

        {/* Dynamic Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Customer Name (Shown for Known) */}
          {customerType === 'known' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer / Proprietor Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. S. Ramanathan"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Customer Name (Auto-Generated)
              </label>
              <input
                type="text"
                disabled
                value="Unknown / Lead"
                className="w-full text-xs rounded-xl border border-slate-200 bg-slate-100 py-2 px-3 text-slate-500 cursor-not-allowed"
              />
            </div>
          )}

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                required
                placeholder="10-digit mobile (e.g. 98401 23456)"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800"
              />
            </div>
          </div>

          {/* Business / Occupation */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Business / Occupation
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. Textiles, Rice Mill, Pharmacy"
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800"
              />
            </div>
          </div>

          {/* Database Source */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Database Source <span className="text-rose-500">*</span>
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 bg-white"
            >
              <option value="Bills">1. Bills</option>
              <option value="Open Source">2. Open Source</option>
              <option value="Reference">3. Reference</option>
            </select>
          </div>

          {/* Conditional Field: Reference From / Who? */}
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
                  placeholder="Enter recommender or client name"
                  value={referenceFrom}
                  onChange={(e) => setReferenceFrom(e.target.value)}
                  className="w-full text-xs rounded-xl border border-amber-300 py-2 pl-9 pr-3 bg-amber-50/50 focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-burgundy-900 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-burgundy-800 transition"
          >
            <PlusCircle className="w-4 h-4 text-gold-400" />
            <span>Submit Daily Field Activity</span>
          </button>
        </div>
      </form>
    </div>
  );
};
