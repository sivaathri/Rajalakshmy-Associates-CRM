import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { X, Award, IndianRupee, Calendar, User, Phone, FileText } from 'lucide-react';

export const CaseSubmissionModal = ({ isOpen, onClose }) => {
  const { submitPerformanceCase, customers } = useCRM();
  const { currentUser } = useAuth();

  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [caseAmount, setCaseAmount] = useState('');
  const [caseDate, setCaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [details, setDetails] = useState('');

  if (!isOpen) return null;

  const handleSelectExistingCustomer = (e) => {
    const custId = e.target.value;
    const found = customers.find(c => c.id === custId);
    if (found) {
      setCustomerName(found.name);
      setMobile(found.mobile);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerName || !mobile || !caseAmount) {
      alert('Please fill all required fields');
      return;
    }

    submitPerformanceCase({
      customerName,
      mobile,
      caseAmount,
      caseDate,
      details
    });

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400 text-burgundy-950 shadow-md font-bold">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">Submit Case Disposition</h3>
              <p className="text-xs text-gold-200">
                Performance tracking & manager approval
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick autofill from existing customer */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Select From Customer Database (Optional autofill)
            </label>
            <select
              onChange={handleSelectExistingCustomer}
              className="w-full text-xs rounded-xl border border-slate-300 py-1.5 px-3 bg-[#FAF6EF]/60 focus:outline-none focus:border-burgundy-800"
            >
              <option value="">-- Choose Existing Contact --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.mobile}) - {c.business || c.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. S. Swaminathan"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Mobile Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. +91 98401 22341"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Case Sanction Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                placeholder="e.g. 2500000"
                value={caseAmount}
                onChange={(e) => setCaseAmount(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Case Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={caseDate}
                onChange={(e) => setCaseDate(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Case Details / Remarks
            </label>
            <textarea
              rows={3}
              placeholder="Enter product details (Working capital, MSME credit, Term loan), bank branch, commission structure..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-burgundy-800"
            />
          </div>

          {/* Submitter info */}
          <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-200">
            Submitting as: <span className="font-bold text-slate-900">{currentUser?.name}</span> ({currentUser?.role})
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
              Submit Case for Approval
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
