import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  FileCheck,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Search,
  Filter,
  Download,
  IndianRupee,
  User,
  History,
  Eye,
  X,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { formatCurrency, formatDate, exportToCSV } from '../utils/formatters';

export const BankLoginPage = () => {
  const { bankLogins, addBankLogin, addLoginUpdate, disburseLogin, rejectLogin, customers } = useCRM();
  const { currentUser, showToast } = useAuth();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [bankFilter, setBankFilter] = useState('All');
  const [onlyDueReminders, setOnlyDueReminders] = useState(false);
  const [dateRangeType, setDateRangeType] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [updatingLogin, setUpdatingLogin] = useState(null);
  const [disbursingLogin, setDisbursingLogin] = useState(null);
  const [rejectingLogin, setRejectingLogin] = useState(null);
  const [viewHistoryLogin, setViewHistoryLogin] = useState(null);

  // Add Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerBusiness, setCustomerBusiness] = useState('');
  const [customerCity, setCustomerCity] = useState('Chennai');
  const [bankName, setBankName] = useState('State Bank of India');
  const [loanType, setLoanType] = useState('Working Capital (CC/OD)');
  const [loanAmount, setLoanAmount] = useState('2500000');
  const [loginDate, setLoginDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialNotes, setInitialNotes] = useState('');

  // Update Note State
  const [todayUpdateNote, setTodayUpdateNote] = useState('');

  // Disbursement Modal State (Req 5: bank name, loan amount, type of loan and click ok)
  const [disburseBankName, setDisburseBankName] = useState('');
  const [disburseLoanAmount, setDisburseLoanAmount] = useState('');
  const [disburseLoanType, setDisburseLoanType] = useState('');
  const [disburseDate, setDisburseDate] = useState(new Date().toISOString().split('T')[0]);
  const [disburseRemarks, setDisburseRemarks] = useState('');

  // Rejection Modal State (Req 5: if reject enter remarks)
  const [rejectionRemarks, setRejectionRemarks] = useState('');

  // Handle auto-filling when picking an existing customer (Req 6: Login persons all are as a customers)
  const handleSelectCustomer = (custId) => {
    setSelectedCustomerId(custId);
    const found = customers.find(c => c.id === custId);
    if (found) {
      setCustomerName(found.name || '');
      setCustomerMobile(found.mobile || '');
      setCustomerBusiness(found.business || '');
      setCustomerCity(found.city || 'Chennai');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper: check if a login is due for 2-day update
  const is2DayUpdateDue = (login) => {
    if (login.status !== 'In Progress') return false;
    if (!login.nextFollowUpDate) return true;
    return login.nextFollowUpDate <= todayStr;
  };

  // Filtered dataset
  const filteredLogins = useMemo(() => {
    return bankLogins.filter(item => {
      // 2-Day Due toggle
      if (onlyDueReminders && !is2DayUpdateDue(item)) {
        return false;
      }

      // Status
      if (statusFilter !== 'All' && item.status !== statusFilter) {
        return false;
      }

      // Bank
      if (bankFilter !== 'All' && item.bankName !== bankFilter) {
        return false;
      }

      // Date Range Filter (on loginDate)
      if (dateRangeType === 'today') {
        if (item.loginDate !== todayStr) return false;
      } else if (dateRangeType === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const sevenDaysAgoStr = d.toISOString().split('T')[0];
        if (item.loginDate < sevenDaysAgoStr || item.loginDate > todayStr) return false;
      } else if (dateRangeType === 'month') {
        const currentMonthPrefix = todayStr.slice(0, 7);
        if (!item.loginDate?.startsWith(currentMonthPrefix)) return false;
      } else if (dateRangeType === 'custom') {
        if (customStartDate && item.loginDate < customStartDate) return false;
        if (customEndDate && item.loginDate > customEndDate) return false;
      }

      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mName = item.customerName?.toLowerCase().includes(q);
        const mMobile = item.mobile?.includes(q);
        const mBiz = item.business?.toLowerCase().includes(q);
        const mBank = item.bankName?.toLowerCase().includes(q);
        const mLoan = item.loanType?.toLowerCase().includes(q);
        const mId = item.id?.toLowerCase().includes(q);
        if (!mName && !mMobile && !mBiz && !mBank && !mLoan && !mId) return false;
      }

      return true;
    });
  }, [bankLogins, onlyDueReminders, statusFilter, bankFilter, dateRangeType, customStartDate, customEndDate, searchTerm, todayStr]);

  // Distinct banks list for filter
  const distinctBanks = useMemo(() => {
    const set = new Set();
    bankLogins.forEach(b => {
      if (b.bankName) set.add(b.bankName);
    });
    return Array.from(set);
  }, [bankLogins]);

  // Aggregate Metrics
  const totalLoginsCount = bankLogins.length;
  const inProgressCount = bankLogins.filter(b => b.status === 'In Progress').length;
  const updatesDueCount = bankLogins.filter(is2DayUpdateDue).length;
  const disbursedLogins = bankLogins.filter(b => b.status === 'Disbursed');
  const disbursedVolume = disbursedLogins.reduce((sum, b) => sum + (b.disbursementDetails?.loanAmount || b.loanAmount || 0), 0);
  const rejectedCount = bankLogins.filter(b => b.status === 'Rejected').length;

  // Add Login Handler
  const handleCreateLogin = (e) => {
    e.preventDefault();
    if (!customerMobile.trim() || customerMobile.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    const digits = customerMobile.replace(/\D/g, '').slice(-10);
    const formattedMobile = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;

    addBankLogin({
      customerId: selectedCustomerId,
      customerName: customerName.trim() || 'New Loan Client',
      mobile: formattedMobile,
      business: customerBusiness.trim() || 'General Business',
      city: customerCity,
      bankName,
      loanType,
      loanAmount: Number(loanAmount),
      loginDate,
      notes: initialNotes.trim() || `Submitted file to ${bankName}`
    });

    // Reset
    setIsAddModalOpen(false);
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerMobile('');
    setCustomerBusiness('');
    setInitialNotes('');
  };

  // 2-Day Update Handler
  const handleSaveUpdate = (e) => {
    e.preventDefault();
    if (!updatingLogin || !todayUpdateNote.trim()) {
      alert('Please enter the current update/progress details from the bank');
      return;
    }

    addLoginUpdate(updatingLogin.id, todayUpdateNote.trim());
    setUpdatingLogin(null);
    setTodayUpdateNote('');
  };

  // Open Disbursement Modal
  const handleOpenDisburseModal = (login) => {
    setDisbursingLogin(login);
    setDisburseBankName(login.bankName || 'State Bank of India');
    setDisburseLoanAmount(login.loanAmount || '');
    setDisburseLoanType(login.loanType || 'Working Capital (CC/OD)');
    setDisburseDate(new Date().toISOString().split('T')[0]);
    setDisburseRemarks('Full loan sanctioned & disbursed into customer account');
  };

  // Confirm Disbursement (Req 5: bank name, loan amount, type of loan and click ok)
  const handleConfirmDisbursement = (e) => {
    e.preventDefault();
    if (!disbursingLogin) return;
    if (!disburseBankName.trim() || !disburseLoanAmount || !disburseLoanType.trim()) {
      alert('Please enter Bank Name, Loan Amount, and Type of Loan');
      return;
    }

    disburseLogin(disbursingLogin.id, {
      bankName: disburseBankName.trim(),
      loanAmount: Number(disburseLoanAmount),
      loanType: disburseLoanType.trim(),
      disbursementDate: disburseDate,
      remarks: disburseRemarks.trim()
    });

    setDisbursingLogin(null);
  };

  // Open Rejection Modal
  const handleOpenRejectModal = (login) => {
    setRejectingLogin(login);
    setRejectionRemarks('');
  };

  // Confirm Rejection (Req 5: if reject enter remarks)
  const handleConfirmRejection = (e) => {
    e.preventDefault();
    if (!rejectingLogin) return;
    if (!rejectionRemarks.trim()) {
      alert('Please enter rejection remarks / reason');
      return;
    }

    rejectLogin(rejectingLogin.id, {
      remarks: rejectionRemarks.trim()
    });

    setRejectingLogin(null);
  };

  // Export
  const handleExport = () => {
    const exportData = filteredLogins.map(l => ({
      "Login ID": l.id,
      "Customer ID": l.customerId,
      "Customer Name": l.customerName,
      "Mobile Contact": l.mobile,
      "Business": l.business,
      "Location": l.city,
      "Bank / Institution": l.bankName,
      "Loan Type": l.loanType,
      "Applied Amount": l.loanAmount,
      "Login Date": l.loginDate,
      "Last Update Date": l.lastUpdateDate,
      "Next 2-Day Due Date": l.nextFollowUpDate,
      "File Status": l.status,
      "Disbursed Bank": l.disbursementDetails?.bankName || '-',
      "Disbursed Amount": l.disbursementDetails?.loanAmount || '-',
      "Disbursed Loan Type": l.disbursementDetails?.loanType || '-',
      "Disbursed Date": l.disbursementDetails?.disbursementDate || '-',
      "Rejection Remarks": l.rejectionRemarks || '-'
    }));
    exportToCSV(exportData, 'rajalakshmy_bank_logins.csv');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-300">
            <Building2 className="w-4 h-4 text-gold-400" />
            <span>Bank Syndication & File Processing</span>
            <span>•</span>
            <span className="font-mono text-white/80">{filteredLogins.length} Files</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            Bank Login & Disbursement Console
          </h2>
          <p className="text-xs text-white/70 mt-1 max-w-2xl">
            Track bank submissions with mandatory 2-day routine follow-up updates. Convert files to Disbursement ("Disposement") or record Bank Rejection with remarks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gold-500 hover:bg-gold-600 px-4 py-2.5 text-xs font-bold text-amber-950 shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Bank Login</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-3.5 py-2.5 text-xs font-semibold text-white transition backdrop-blur-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Files Logged In</span>
          <span className="text-2xl font-black text-slate-900">{totalLoginsCount}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Across partner banks</span>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-blue-800 block">In Bank Processing</span>
          <span className="text-2xl font-black text-blue-900">{inProgressCount}</span>
          <span className="text-[10px] text-blue-700 block mt-1">Active file appraisals</span>
        </div>

        {/* 2-Day Routine Reminder KPI */}
        <div className={`rounded-2xl border p-4 shadow-sm transition ${
          updatesDueCount > 0
            ? 'border-amber-400 bg-amber-50/90 ring-2 ring-amber-400/20'
            : 'border-slate-200 bg-white'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-900 block">2-Day Updates Due</span>
            {updatesDueCount > 0 && (
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <span className="text-2xl font-black text-amber-900">{updatesDueCount}</span>
          <span className="text-[10px] text-amber-800 block mt-1 font-semibold">
            {updatesDueCount > 0 ? 'Action required today!' : 'All files up to date'}
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">Disbursed Volume</span>
          <span className="text-xl font-black text-emerald-900">{formatCurrency(disbursedVolume)}</span>
          <span className="text-[10px] text-emerald-700 block mt-1 font-semibold">{disbursedLogins.length} files successfully funded</span>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-rose-800 block">Rejected Files</span>
          <span className="text-2xl font-black text-rose-900">{rejectedCount}</span>
          <span className="text-[10px] text-rose-700 block mt-1">Declined with remarks</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Universal Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, mobile, bank, loan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 bg-white"
            >
              <option value="All">All File Statuses</option>
              <option value="In Progress">In Progress (Bank Appraisal)</option>
              <option value="Disbursed">Disbursed ("Disposement")</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Bank Filter */}
          <div>
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 bg-white"
            >
              <option value="All">All Partner Banks</option>
              {distinctBanks.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Date Range Selector */}
          <div>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={dateRangeType}
                onChange={(e) => setDateRangeType(e.target.value)}
                className={`w-full text-xs rounded-xl border py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800 bg-white transition ${
                  dateRangeType !== 'all' ? 'border-burgundy-800 text-burgundy-900 bg-burgundy-50/40 font-bold' : 'border-slate-300 text-slate-700'
                }`}
              >
                <option value="all">Date: All Time</option>
                <option value="today">Date: Today</option>
                <option value="week">Date: Last 7 Days</option>
                <option value="month">Date: This Month</option>
                <option value="custom">Date: Custom Date Range</option>
              </select>
            </div>
          </div>

          {/* 2-Day Due Toggle */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setOnlyDueReminders(!onlyDueReminders)}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition ${
                onlyDueReminders
                  ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-400/20'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-700" />
              <span>{onlyDueReminders ? '✓ 2-Day Updates Due' : 'Filter 2-Day Due'}</span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Panel (Visible when Custom Date Range is selected) */}
        {dateRangeType === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-[#FAF6EF]/60 p-3 rounded-xl border border-gold-200/50">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-burgundy-800" /> Start Date:
                </span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">End Date:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              {/* Quick Presets for Custom Picker */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate(todayStr);
                    setCustomEndDate(todayStr);
                  }}
                  className="px-2 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    setCustomStartDate(d.toISOString().split('T')[0]);
                    setCustomEndDate(todayStr);
                  }}
                  className="px-2 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstDay = `${todayStr.slice(0, 7)}-01`;
                    setCustomStartDate(firstDay);
                    setCustomEndDate(todayStr);
                  }}
                  className="px-2 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                >
                  This Month
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(customStartDate || customEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="flex items-center gap-1 text-xs text-rose-700 hover:text-rose-900 font-bold px-2 py-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Dates</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Filters Summary Strip */}
        {(dateRangeType !== 'all' || statusFilter !== 'All' || bankFilter !== 'All' || searchTerm || onlyDueReminders) && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-600">Active Filters:</span>
              {dateRangeType !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-burgundy-50 text-burgundy-900 border border-burgundy-200 text-[11px] font-semibold">
                  <Calendar className="w-3 h-3 text-burgundy-700" />
                  {dateRangeType === 'today' && 'Today'}
                  {dateRangeType === 'week' && 'Last 7 Days'}
                  {dateRangeType === 'month' && 'This Month'}
                  {dateRangeType === 'custom' && (
                    customStartDate || customEndDate
                      ? `${customStartDate || 'Any'} to ${customEndDate || 'Any'}`
                      : 'Custom Range'
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setDateRangeType('all');
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="ml-1 hover:text-rose-600"
                  >
                    ×
                  </button>
                </span>
              )}
              {statusFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                  Status: {statusFilter}
                  <button type="button" onClick={() => setStatusFilter('All')} className="ml-1 hover:text-rose-600">×</button>
                </span>
              )}
              {bankFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                  Bank: {bankFilter}
                  <button type="button" onClick={() => setBankFilter('All')} className="ml-1 hover:text-rose-600">×</button>
                </span>
              )}
              {onlyDueReminders && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold">
                  2-Day Due
                  <button type="button" onClick={() => setOnlyDueReminders(false)} className="ml-1 hover:text-rose-600">×</button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                  Query: "{searchTerm}"
                  <button type="button" onClick={() => setSearchTerm('')} className="ml-1 hover:text-rose-600">×</button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('All');
                setBankFilter('All');
                setOnlyDueReminders(false);
                setDateRangeType('all');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="text-xs text-rose-700 hover:text-rose-900 font-bold underline cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[950px]">
            <thead className="bg-[#FAF6EF] text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Login ID</th>
                <th className="px-4 py-3">Customer / Enterprise (CRM)</th>
                <th className="px-4 py-3">Bank & Loan Value</th>
                <th className="px-4 py-3">2-Day Reminder & Updates</th>
                <th className="px-4 py-3">File Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                    No bank login records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLogins.map(login => {
                  const isDue = is2DayUpdateDue(login);
                  const lastUpdate = login.updates?.[0];

                  return (
                    <tr key={login.id} className={`hover:bg-slate-50/80 transition ${
                      isDue ? 'bg-amber-50/30' : ''
                    }`}>
                      {/* Login ID & Date */}
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-burgundy-900 block">{login.id}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Logged: {formatDate(login.loginDate)}</span>
                      </td>

                      {/* Customer Info (Req 6: All are customers) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{login.customerName}</span>
                          <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-1 rounded font-mono">
                            {login.customerId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{login.business} • {login.city}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                          {login.mobile}
                        </div>
                      </td>

                      {/* Bank & Loan Value */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{login.bankName}</div>
                        <div className="text-xs font-bold text-burgundy-900 mt-0.5">
                          {formatCurrency(login.loanAmount)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {login.loanType}
                        </div>
                      </td>

                      {/* 2-Day Reminder & Status Update (Req 4) */}
                      <td className="px-4 py-3">
                        {login.status === 'In Progress' ? (
                          <div>
                            {isDue ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>2-Day Update Due! ({login.nextFollowUpDate})</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-600 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>Next Due: {formatDate(login.nextFollowUpDate)}</span>
                              </span>
                            )}

                            {lastUpdate && (
                              <div className="text-[10px] text-slate-500 italic mt-1 line-clamp-1 max-w-xs" title={lastUpdate.note}>
                                Last ({lastUpdate.date}): "{lastUpdate.note}"
                              </div>
                            )}
                          </div>
                        ) : login.status === 'Disbursed' ? (
                          <div className="text-[11px] text-emerald-800 font-semibold">
                            Disbursed: {formatCurrency(login.disbursementDetails?.loanAmount)} ({login.disbursementDetails?.bankName})
                          </div>
                        ) : (
                          <div className="text-[11px] text-rose-800 italic line-clamp-1 max-w-xs" title={login.rejectionRemarks}>
                            Reason: {login.rejectionRemarks || 'Declined by bank'}
                          </div>
                        )}
                      </td>

                      {/* File Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          login.status === 'Disbursed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20'
                            : login.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-500/20'
                            : 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-500/20'
                        }`}>
                          {login.status === 'Disbursed' ? '✓ Disbursed' : login.status}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          RM: {login.assignedRMName}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 2-Day Update Button (Req 4) */}
                          {login.status === 'In Progress' && (
                            <button
                              type="button"
                              onClick={() => {
                                setUpdatingLogin(login);
                                setTodayUpdateNote('');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                isDue
                                  ? 'bg-amber-500 hover:bg-amber-600 text-amber-950 shadow-xs ring-1 ring-amber-600/30'
                                  : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                              title="Add Today's Update / Next Action (Reminds every 2 days)"
                            >
                              <Clock className="w-3 h-3" />
                              <span>Update</span>
                            </button>
                          )}

                          {/* Disburse Button (Req 5: convert to Disposement) */}
                          {login.status === 'In Progress' && (
                            <button
                              type="button"
                              onClick={() => handleOpenDisburseModal(login)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-[11px] font-bold text-white shadow-xs transition flex items-center gap-1"
                              title="Convert to Disbursement"
                            >
                              <Check className="w-3 h-3" />
                              <span>Disburse</span>
                            </button>
                          )}

                          {/* Reject Button (Req 5: if reject enter remarks) */}
                          {login.status === 'In Progress' && (
                            <button
                              type="button"
                              onClick={() => handleOpenRejectModal(login)}
                              className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold transition"
                              title="Mark Rejected by Bank with remarks"
                            >
                              Reject
                            </button>
                          )}

                          {/* View Details & History Button */}
                          <button
                            type="button"
                            onClick={() => setViewHistoryLogin(login)}
                            className="p-1.5 text-slate-500 hover:text-burgundy-900 rounded-lg hover:bg-slate-100 transition"
                            title="View File Details & Follow-up Timeline"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: ADD BANK LOGIN (Req 4, 6)                   */}
      {/* ---------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gold-300 block">Bank Syndication</span>
                <h3 className="text-base font-bold text-white">Add New Bank File Login</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLogin} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {/* Pick from Existing Customer (Req 6) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Existing Customer (or enter details below)
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white focus:outline-none focus:border-burgundy-800"
                >
                  <option value="">-- Choose from Customer Directory (Optional) --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id}) • {c.mobile} • {c.business || 'General'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. S. Ramanathan"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business / Enterprise
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramanathan Silks & Exports"
                    value={customerBusiness}
                    onChange={(e) => setCustomerBusiness(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location / City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chennai, Madurai"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank / Lending Institution <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white focus:outline-none focus:border-burgundy-800"
                >
                  <option value="State Bank of India">State Bank of India (SBI)</option>
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Indian Bank">Indian Bank</option>
                  <option value="Canara Bank">Canara Bank</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  <option value="Bank of Baroda">Bank of Baroda</option>
                  <option value="Punjab National Bank">Punjab National Bank</option>
                  <option value="Federal Bank">Federal Bank</option>
                  <option value="Bajaj Finserv">Bajaj Finserv</option>
                  <option value="Cholamandalam Finance">Cholamandalam Finance</option>
                  <option value="Sundaram Finance">Sundaram Finance</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loan Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white focus:outline-none focus:border-burgundy-800"
                  >
                    <option value="Working Capital (CC/OD)">Working Capital (CC/OD)</option>
                    <option value="Term Loan for Machinery">Term Loan for Machinery</option>
                    <option value="Business Loan">Business Loan</option>
                    <option value="Commercial Vehicle Finance">Commercial Vehicle Finance</option>
                    <option value="LAP (Loan Against Property)">LAP (Loan Against Property)</option>
                    <option value="Solar Project Finance">Solar Project Finance</option>
                    <option value="Home Loan">Home Loan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loan Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Login Submission Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Branch ref no., submitted to branch manager, initial document checklist cleared"
                  value={initialNotes}
                  onChange={(e) => setInitialNotes(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Routine 2-day reminder will automatically trigger for bank follow-up after login.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-burgundy-900 hover:bg-burgundy-800 rounded-xl shadow-md transition"
                >
                  Create Bank Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: 2-DAY UPDATE & NEXT ACTION (Req 4)          */}
      {/* ---------------------------------------------------- */}
      {updatingLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-600 to-amber-800 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-200 block">2-Day Bank Follow-up</span>
                <h3 className="text-base font-bold text-white">Log Today's Bank Update</h3>
              </div>
              <button
                onClick={() => setUpdatingLogin(null)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUpdate} className="p-6 space-y-4">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs">
                <div className="font-bold text-amber-950">{updatingLogin.customerName}</div>
                <div className="text-amber-800 mt-0.5">{updatingLogin.bankName} • {updatingLogin.loanType} ({formatCurrency(updatingLogin.loanAmount)})</div>
                <div className="text-[11px] text-amber-900/80 font-mono mt-1">
                  Last Update: {updatingLogin.lastUpdateDate}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  What is Today's Update / Next Action? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Bank field officer completed inspection, valuation report cleared, sanction letter expected in 2 days..."
                  value={todayUpdateNote}
                  onChange={(e) => setTodayUpdateNote(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-200">
                💡 Submitting this update automatically resets the 2-day reminder timer and logs it in file history.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUpdatingLogin(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-md transition"
                >
                  Save Today's Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: CONVERT TO DISBURSEMENT (Req 5)             */}
      {/* ---------------------------------------------------- */}
      {disbursingLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300 block">Loan Funded</span>
                <h3 className="text-base font-bold text-white">Convert to Disbursement ("Disposement")</h3>
              </div>
              <button
                onClick={() => setDisbursingLogin(null)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDisbursement} className="p-6 space-y-3.5">
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 text-xs">
                <div className="font-bold text-emerald-950">{disbursingLogin.customerName}</div>
                <div className="text-emerald-800 font-mono mt-0.5">{disbursingLogin.mobile} • {disbursingLogin.business}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Disbursing Bank Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Bank of India"
                  value={disburseBankName}
                  onChange={(e) => setDisburseBankName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Disbursed Loan Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={disburseLoanAmount}
                    onChange={(e) => setDisburseLoanAmount(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-emerald-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Type of Loan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Working Capital, Term Loan"
                    value={disburseLoanType}
                    onChange={(e) => setDisburseLoanType(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Disbursement Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={disburseDate}
                  onChange={(e) => setDisburseDate(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sanction & Disbursement Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Rate of interest, tenure, loan account number, processing fee deducted..."
                  value={disburseRemarks}
                  onChange={(e) => setDisburseRemarks(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDisbursingLogin(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>OK • Confirm Disbursement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: REJECT LOGIN WITH REMARKS (Req 5)          */}
      {/* ---------------------------------------------------- */}
      {rejectingLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-800 to-rose-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-rose-300 block">File Rejection</span>
                <h3 className="text-base font-bold text-white">Bank Rejection Remarks</h3>
              </div>
              <button
                onClick={() => setRejectingLogin(null)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejection} className="p-6 space-y-4">
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs">
                <div className="font-bold text-rose-950">{rejectingLogin.customerName}</div>
                <div className="text-rose-800 mt-0.5">{rejectingLogin.bankName} • {rejectingLogin.loanType} ({formatCurrency(rejectingLogin.loanAmount)})</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Enter Rejection Remarks / Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. CIBIL score issue, income eligibility not met, collateral valuation shortfall, customer cancelled..."
                  value={rejectionRemarks}
                  onChange={(e) => setRejectionRemarks(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:outline-none focus:border-rose-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingLogin(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-md transition"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 5: VIEW 2-DAY UPDATE TIMELINE HISTORY          */}
      {/* ---------------------------------------------------- */}
      {viewHistoryLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gold-300 block">Audit Timeline</span>
                <h3 className="text-base font-bold text-white">{viewHistoryLogin.customerName} • Bank Log History</h3>
              </div>
              <button
                onClick={() => setViewHistoryLogin(null)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="font-bold text-slate-800">{viewHistoryLogin.bankName} • {viewHistoryLogin.loanType}</div>
                <div className="text-emerald-700 font-bold mt-0.5">{formatCurrency(viewHistoryLogin.loanAmount)}</div>
                <div className="text-slate-500 text-[11px] mt-1">Logged on: {formatDate(viewHistoryLogin.loginDate)}</div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Follow-up & Bank Update Log ({(viewHistoryLogin.updates || []).length})
                </h4>

                {(viewHistoryLogin.updates || []).length === 0 ? (
                  <div className="text-xs text-slate-400 italic">No update notes logged yet.</div>
                ) : (
                  <div className="space-y-2.5">
                    {viewHistoryLogin.updates.map((u, idx) => (
                      <div key={u.id || idx} className="p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-xs">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span className="font-semibold text-burgundy-900">{u.date}</span>
                          <span>by {u.updatedBy || 'RM'}</span>
                        </div>
                        <p className="text-slate-800 leading-relaxed font-medium">{u.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {viewHistoryLogin.disbursementDetails && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Disbursement Details</span>
                  </div>
                  <div className="text-emerald-900 mt-1">
                    Disbursed: {formatCurrency(viewHistoryLogin.disbursementDetails.loanAmount)} via {viewHistoryLogin.disbursementDetails.bankName} ({viewHistoryLogin.disbursementDetails.loanType})
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    Date: {viewHistoryLogin.disbursementDetails.disbursementDate} • {viewHistoryLogin.disbursementDetails.remarks}
                  </div>
                </div>
              )}

              {viewHistoryLogin.rejectionRemarks && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs">
                  <div className="font-bold text-rose-950 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Rejection Reason</span>
                  </div>
                  <div className="text-rose-900 mt-1">
                    {viewHistoryLogin.rejectionRemarks}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewHistoryLogin(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
