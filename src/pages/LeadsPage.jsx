import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  Search,
  Filter,
  UserCheck,
  Building,
  Phone,
  MapPin,
  Calendar,
  IndianRupee,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  FileCheck,
  Download,
  X,
  PhoneCall
} from 'lucide-react';
import { formatCurrency, formatDate, exportToCSV } from '../utils/formatters';

export const LeadsPage = () => {
  const { leads, addLead, assignLead, updateLead, convertLeadToLogin, employees, startCallingCustomer } = useCRM();
  const { currentUser, showToast } = useAuth();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [onlyMyLeads, setOnlyMyLeads] = useState(false);
  const [dateRangeType, setDateRangeType] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [assigningLead, setAssigningLead] = useState(null);
  const [convertingLead, setConvertingLead] = useState(null);

  // Add Lead Form State
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadMobile, setNewLeadMobile] = useState('');
  const [newLeadBusiness, setNewLeadBusiness] = useState('');
  const [newLeadCity, setNewLeadCity] = useState('Chennai');
  const [newLeadService, setNewLeadService] = useState('Working Capital (CC/OD)');
  const [newLeadAmount, setNewLeadAmount] = useState('2500000');
  const [newLeadSource, setNewLeadSource] = useState('Direct / Reference');
  const [newLeadAssigneeId, setNewLeadAssigneeId] = useState(currentUser?.id || 'EMP004');
  const [newLeadRemarks, setNewLeadRemarks] = useState('');

  // Assign Modal State
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');

  // Convert to Login Modal State
  const [convertBankName, setConvertBankName] = useState('State Bank of India');
  const [convertLoanType, setConvertLoanType] = useState('');
  const [convertLoanAmount, setConvertLoanAmount] = useState('');
  const [convertNotes, setConvertNotes] = useState('');

  // Filter Sales Managers and RMs from employees
  const salesManagers = useMemo(() => {
    return employees.filter(e => e.role === 'Sales Manager' || e.role === 'Sales Executive');
  }, [employees]);

  const relationshipManagers = useMemo(() => {
    return employees.filter(e => e.role === 'RM');
  }, [employees]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // My Leads scope
      if (onlyMyLeads && lead.assignedToId !== currentUser?.id) {
        return false;
      }

      // Role filter
      if (roleFilter !== 'All' && lead.assignedToRole !== roleFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'All' && lead.status !== statusFilter) {
        return false;
      }

      // Date Range filter on assignedAt
      const leadDate = lead.assignedAt || lead.createdDate || lead.date;
      const todayStr = new Date().toISOString().split('T')[0];
      if (dateRangeType === 'today') {
        if (leadDate !== todayStr) return false;
      } else if (dateRangeType === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const sevenDaysAgoStr = d.toISOString().split('T')[0];
        if (!leadDate || leadDate < sevenDaysAgoStr || leadDate > todayStr) return false;
      } else if (dateRangeType === 'month') {
        const currentMonthPrefix = todayStr.slice(0, 7);
        if (!leadDate?.startsWith(currentMonthPrefix)) return false;
      } else if (dateRangeType === 'custom') {
        if (customStartDate && (!leadDate || leadDate < customStartDate)) return false;
        if (customEndDate && (!leadDate || leadDate > customEndDate)) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mName = lead.customerName?.toLowerCase().includes(q);
        const mMobile = lead.mobile?.includes(q);
        const mBiz = lead.business?.toLowerCase().includes(q);
        const mCity = lead.city?.toLowerCase().includes(q);
        const mService = lead.requiredService?.toLowerCase().includes(q);
        if (!mName && !mMobile && !mBiz && !mCity && !mService) return false;
      }

      return true;
    });
  }, [leads, onlyMyLeads, roleFilter, statusFilter, dateRangeType, customStartDate, customEndDate, searchTerm, currentUser]);

  // Metrics
  const totalLeadsCount = leads.length;
  const myAssignedCount = leads.filter(l => l.assignedToId === currentUser?.id).length;
  const salesManagerAssignedCount = leads.filter(l => l.assignedToRole === 'Sales Manager' || l.assignedToRole === 'Sales Executive').length;
  const readyForLoginCount = leads.filter(l => l.status === 'Ready for Login').length;

  const handleCreateLead = (e) => {
    e.preventDefault();
    if (!newLeadMobile.trim() || newLeadMobile.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    const assignedEmp = employees.find(e => e.id === newLeadAssigneeId) || currentUser;
    const digits = newLeadMobile.replace(/\D/g, '').slice(-10);
    const formattedMobile = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;

    addLead({
      customerName: newLeadName.trim() || 'Prospect Lead',
      mobile: formattedMobile,
      business: newLeadBusiness.trim() || 'General Business',
      city: newLeadCity,
      requiredService: newLeadService,
      estimatedAmount: Number(newLeadAmount) || 1000000,
      source: newLeadSource,
      assignedToId: assignedEmp.id,
      assignedToName: assignedEmp.name,
      assignedToRole: assignedEmp.role,
      remarks: newLeadRemarks.trim() || 'Direct lead creation'
    });

    // Reset
    setIsAddLeadModalOpen(false);
    setNewLeadName('');
    setNewLeadMobile('');
    setNewLeadBusiness('');
    setNewLeadRemarks('');
  };

  const handleConfirmAssignment = () => {
    if (!assigningLead || !selectedAssigneeId) return;
    const targetEmp = employees.find(e => e.id === selectedAssigneeId);
    if (!targetEmp) return;

    assignLead(assigningLead.id, targetEmp.id, targetEmp.name, targetEmp.role);
    setAssigningLead(null);
  };

  const handleOpenConvertModal = (lead) => {
    setConvertingLead(lead);
    setConvertBankName('State Bank of India');
    setConvertLoanType(lead.requiredService || 'Working Capital (CC/OD)');
    setConvertLoanAmount(lead.estimatedAmount || 2500000);
    setConvertNotes(`Converted from Lead #${lead.id} by ${currentUser?.name || 'RM'}`);
  };

  const handleConfirmConvert = (e) => {
    e.preventDefault();
    if (!convertingLead) return;

    convertLeadToLogin(convertingLead.id, {
      bankName: convertBankName,
      loanType: convertLoanType,
      loanAmount: Number(convertLoanAmount),
      notes: convertNotes
    });

    setConvertingLead(null);
  };

  const handleExport = () => {
    const exportData = filteredLeads.map(l => ({
      "Lead ID": l.id,
      "Customer Name": l.customerName,
      "Mobile": l.mobile,
      "Business": l.business,
      "Location": `${l.city}, ${l.state}`,
      "Required Service": l.requiredService,
      "Estimated Amount": l.estimatedAmount,
      "Status": l.status,
      "Assigned To": `${l.assignedToName} (${l.assignedToRole})`,
      "Assigned At": l.assignedAt,
      "Remarks": l.remarks
    }));
    exportToCSV(exportData, 'rajalakshmy_leads_pipeline.csv');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-300">
            <Compass className="w-4 h-4 text-gold-400" />
            <span>Sales & Client Acquisition Pipeline</span>
            <span>•</span>
            <span className="font-mono text-white/80">{filteredLeads.length} Leads Active</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            Lead Management Console
          </h2>
          <p className="text-xs text-white/70 mt-1 max-w-2xl">
            Assign prospects to yourself (RM) or hand off to Sales Managers for field visits. Push qualified leads straight to Bank Login.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAddLeadModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gold-500 hover:bg-gold-600 px-4 py-2.5 text-xs font-bold text-amber-950 shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Lead</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Active Leads</span>
          <span className="text-2xl font-black text-slate-900">{totalLeadsCount}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Across all branches & RMs</span>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-blue-800 block">My Assigned Leads</span>
          <span className="text-2xl font-black text-blue-900">{myAssignedCount}</span>
          <span className="text-[10px] text-blue-700 block mt-1">Under {currentUser?.name}</span>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-purple-800 block">With Sales Managers</span>
          <span className="text-2xl font-black text-purple-900">{salesManagerAssignedCount}</span>
          <span className="text-[10px] text-purple-700 block mt-1">Field visits & inspections</span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">Ready for Bank Login</span>
          <span className="text-2xl font-black text-emerald-900">{readyForLoginCount}</span>
          <span className="text-[10px] text-emerald-700 block mt-1">Documents verified</span>
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
              placeholder="Search by client, mobile, business, city..."
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
              <option value="All">All Lead Statuses</option>
              <option value="New Lead">New Lead</option>
              <option value="Discussion in Progress">Discussion in Progress</option>
              <option value="Field Visit Scheduled">Field Visit Scheduled</option>
              <option value="Ready for Login">Ready for Login</option>
              <option value="Converted to Login">Converted to Login</option>
            </select>
          </div>

          {/* Assignee Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 bg-white"
            >
              <option value="All">All Assignees</option>
              <option value="RM">Relationship Managers (RM)</option>
              <option value="Sales Manager">Sales Managers (Field Sales)</option>
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

          {/* My Leads Only Toggle */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setOnlyMyLeads(!onlyMyLeads)}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition ${
                onlyMyLeads
                  ? 'border-burgundy-800 bg-burgundy-50 text-burgundy-950 ring-2 ring-burgundy-800/20'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-4 h-4 text-burgundy-800" />
              <span>{onlyMyLeads ? '✓ My Leads Only' : 'My Leads Only'}</span>
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
                    const today = new Date().toISOString().split('T')[0];
                    setCustomStartDate(today);
                    setCustomEndDate(today);
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
                    setCustomEndDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="px-2 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    const firstDay = `${today.slice(0, 7)}-01`;
                    setCustomStartDate(firstDay);
                    setCustomEndDate(today);
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
        {(dateRangeType !== 'all' || statusFilter !== 'All' || roleFilter !== 'All' || searchTerm || onlyMyLeads) && (
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
              {roleFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                  Assignee: {roleFilter}
                  <button type="button" onClick={() => setRoleFilter('All')} className="ml-1 hover:text-rose-600">×</button>
                </span>
              )}
              {onlyMyLeads && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-burgundy-50 text-burgundy-900 border border-burgundy-200 text-[11px] font-semibold">
                  My Leads Only
                  <button type="button" onClick={() => setOnlyMyLeads(false)} className="ml-1 hover:text-rose-600">×</button>
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
                setRoleFilter('All');
                setOnlyMyLeads(false);
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

      {/* Main Leads Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
            <thead className="bg-[#FAF6EF] text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Lead ID</th>
                <th className="px-4 py-3">Customer / Enterprise</th>
                <th className="px-4 py-3">Requirement & Value</th>
                <th className="px-4 py-3">Lead Status</th>
                <th className="px-4 py-3">Assigned Executive (RM / Sales)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                    No leads found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map(lead => {
                  const isAssignedToMe = lead.assignedToId === currentUser?.id;
                  const isSalesManager = lead.assignedToRole === 'Sales Manager' || lead.assignedToRole === 'Sales Executive';

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition">
                      {/* ID */}
                      <td className="px-4 py-3 font-mono font-bold text-burgundy-900">
                        {lead.id}
                      </td>

                      {/* Customer / Business */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{lead.customerName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{lead.business}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                          {lead.mobile} • {lead.city}
                        </div>
                      </td>

                      {/* Requirement & Amount */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{lead.requiredService}</div>
                        <div className="text-xs font-bold text-emerald-700 mt-0.5">
                          {formatCurrency(lead.estimatedAmount)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Source: {lead.source}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          lead.status === 'Ready for Login'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20'
                            : lead.status === 'Converted to Login'
                            ? 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-500/20'
                            : lead.status === 'Field Visit Scheduled'
                            ? 'bg-purple-50 text-purple-800 border-purple-300 ring-1 ring-purple-500/20'
                            : 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-500/20'
                        }`}>
                          {lead.status}
                        </span>
                        {lead.remarks && (
                          <div className="text-[10px] text-slate-500 italic mt-1 line-clamp-1 max-w-xs">
                            "{lead.remarks}"
                          </div>
                        )}
                      </td>

                      {/* Assigned Executive */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isSalesManager
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-blue-100 text-blue-900 border border-blue-200'
                          }`}>
                            {lead.assignedToRole}
                          </span>
                          <span className="font-semibold text-slate-800">{lead.assignedToName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Assigned: {lead.assignedAt || 'Recent'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Reassign Button (Req 7) */}
                          <button
                            type="button"
                            onClick={() => {
                              setAssigningLead(lead);
                              setSelectedAssigneeId(lead.assignedToId);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition"
                            title="Assign to RM or Sales Manager"
                          >
                            Assign Lead
                          </button>

                          {/* Convert to Login Button */}
                          {lead.status !== 'Converted to Login' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenConvertModal(lead)}
                              className="px-2.5 py-1 rounded-lg bg-burgundy-900 hover:bg-burgundy-800 text-[11px] font-bold text-white shadow-xs transition flex items-center gap-1"
                              title="Push to Bank Login file"
                            >
                              <FileCheck className="w-3 h-3 text-gold-400" />
                              <span>Login</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              ✓ In Bank
                            </span>
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
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: ADD NEW LEAD                                */}
      {/* ---------------------------------------------------- */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gold-300 block">Lead Pipeline</span>
                <h3 className="text-base font-bold text-white">Register New Lead</h3>
              </div>
              <button
                onClick={() => setIsAddLeadModalOpen(false)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer / Enterprise Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S. Ramanathan / Ramanathan Textiles"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={newLeadMobile}
                    onChange={(e) => setNewLeadMobile(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business / Occupation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rice Mill, Pharmacy, Logistics"
                    value={newLeadBusiness}
                    onChange={(e) => setNewLeadBusiness(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Required Financial Service
                  </label>
                  <select
                    value={newLeadService}
                    onChange={(e) => setNewLeadService(e.target.value)}
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
                    Estimated Loan Requirement (₹)
                  </label>
                  <input
                    type="number"
                    value={newLeadAmount}
                    onChange={(e) => setNewLeadAmount(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
              </div>

              {/* Assignment Choice (Req 7: Assign himself or Sales Manager) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Lead To <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newLeadAssigneeId}
                  onChange={(e) => setNewLeadAssigneeId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white focus:outline-none focus:border-burgundy-800"
                >
                  <optgroup label="Relationship Managers (RM)">
                    {relationshipManagers.map(rm => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name} (RM - {rm.location})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Sales Managers (Field Sales)">
                    {salesManagers.map(sm => (
                      <option key={sm.id} value={sm.id}>
                        {sm.name} ({sm.role} - {sm.location})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Discussion Remarks & Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Add prospect requirement details, documentation readiness, etc."
                  value={newLeadRemarks}
                  onChange={(e) => setNewLeadRemarks(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-burgundy-900 hover:bg-burgundy-800 rounded-xl shadow-md transition"
                >
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: ASSIGN LEAD (Req 7)                          */}
      {/* ---------------------------------------------------- */}
      {assigningLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gold-300 block">Lead Assignment</span>
                <h3 className="text-base font-bold text-white">Assign: {assigningLead.customerName}</h3>
              </div>
              <button
                onClick={() => setAssigningLead(null)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="font-bold text-slate-800">{assigningLead.customerName}</div>
                <div className="text-slate-600 font-mono mt-0.5">{assigningLead.mobile} • {assigningLead.business}</div>
                <div className="text-emerald-700 font-semibold mt-1">
                  Req: {assigningLead.requiredService} ({formatCurrency(assigningLead.estimatedAmount)})
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Assignee Executive <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  {/* Quick Assign to Myself */}
                  <button
                    type="button"
                    onClick={() => setSelectedAssigneeId(currentUser?.id || 'EMP004')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition ${
                      selectedAssigneeId === currentUser?.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>Assign to Myself ({currentUser?.name})</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                      {currentUser?.role}
                    </span>
                  </button>

                  <select
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2.5 px-3 bg-white focus:outline-none focus:border-burgundy-800"
                  >
                    <option value="">-- Or Choose Another Person --</option>
                    <optgroup label="Sales Managers (Field Sales)">
                      {salesManagers.map(sm => (
                        <option key={sm.id} value={sm.id}>
                          {sm.name} (Sales Manager / Field Sales - {sm.location})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Relationship Managers (RM)">
                      {relationshipManagers.map(rm => (
                        <option key={rm.id} value={rm.id}>
                          {rm.name} (RM - {rm.location})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningLead(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  className="px-5 py-2 text-xs font-bold text-white bg-burgundy-900 hover:bg-burgundy-800 rounded-xl shadow-md transition"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: CONVERT LEAD TO BANK LOGIN                  */}
      {/* ---------------------------------------------------- */}
      {convertingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300 block">Bank Syndication</span>
                <h3 className="text-base font-bold text-white">Convert to Bank Login File</h3>
              </div>
              <button
                onClick={() => setConvertingLead(null)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmConvert} className="p-6 space-y-3.5">
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 text-xs">
                <div className="font-bold text-emerald-950">{convertingLead.customerName}</div>
                <div className="text-emerald-800 font-mono mt-0.5">{convertingLead.mobile} • {convertingLead.business}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Bank / NBFC Institution <span className="text-rose-500">*</span>
                </label>
                <select
                  value={convertBankName}
                  onChange={(e) => setConvertBankName(e.target.value)}
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
                  <input
                    type="text"
                    required
                    value={convertLoanType}
                    onChange={(e) => setConvertLoanType(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Logged-in Loan Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={convertLoanAmount}
                    onChange={(e) => setConvertLoanAmount(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Submission Notes
                </label>
                <textarea
                  rows={2}
                  value={convertNotes}
                  onChange={(e) => setConvertNotes(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConvertingLead(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4 text-emerald-300" />
                  <span>Confirm Bank Login</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
