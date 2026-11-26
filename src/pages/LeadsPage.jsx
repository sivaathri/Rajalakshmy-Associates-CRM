import React, { useState, useMemo, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { Pagination } from '../components/common/Pagination';
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
  X,
  PhoneCall,
  Eye,
  Edit,
  RotateCcw,
  FileText,
  Upload,
  Trash2
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

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

  // Pagination (minimum 15 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter, onlyMyLeads, dateRangeType, customStartDate, customEndDate]);

  // Modals
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [assigningLead, setAssigningLead] = useState(null);
  const [loginAssignLead, setLoginAssignLead] = useState(null);
  const [loginAssignMode, setLoginAssignMode] = useState(''); // '' | 'self' | 'other'
  const [loginAssigneeId, setLoginAssigneeId] = useState('');
  const [confirmConvertData, setConfirmConvertData] = useState(null); // { lead, assignee }
  const [convertingLeadData, setConvertingLeadData] = useState(null); // { lead, assignee }
  const [viewingLeadId, setViewingLeadId] = useState(null);
  const [isLeadEditMode, setIsLeadEditMode] = useState(false);

  const viewingLead = useMemo(() => {
    if (!viewingLeadId) return null;
    return leads.find(l => l.id === viewingLeadId) || null;
  }, [leads, viewingLeadId]);

  // Edit / Add Lead Details Form State
  const [editLeadName, setEditLeadName] = useState('');
  const [editLeadMobile, setEditLeadMobile] = useState('');
  const [editLeadAltMobile, setEditLeadAltMobile] = useState('');
  const [editLeadBusiness, setEditLeadBusiness] = useState('');
  const [editLeadCity, setEditLeadCity] = useState('');
  const [editLeadState, setEditLeadState] = useState('');
  const [editLeadAddress, setEditLeadAddress] = useState('');
  const [editLeadService, setEditLeadService] = useState('');
  const [editLeadAmount, setEditLeadAmount] = useState('');
  const [editLeadSource, setEditLeadSource] = useState('');
  const [editLeadRemarks, setEditLeadRemarks] = useState('');
  const [editLeadDocuments, setEditLeadDocuments] = useState([]);
  const [editDocCategory, setEditDocCategory] = useState('KYC 1');
  const [editDocName, setEditDocName] = useState('');
  const [editDocFileObj, setEditDocFileObj] = useState(null);

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

  // Group all active employees by role so leads can be assigned to any role
  const activeEmployeesByRole = useMemo(() => {
    const groups = {};
    (employees || [])
      .filter(e => e.status !== 'Inactive')
      .forEach(emp => {
        const roleLabel = emp.role || 'Other';
        if (!groups[roleLabel]) groups[roleLabel] = [];
        groups[roleLabel].push(emp);
      });
    return Object.entries(groups);
  }, [employees]);

  // Base accessible leads:
  // Strictly ONLY show the data of the particular logged-in user!
  // No other user's leads or details will be shown.
  const accessibleLeads = useMemo(() => {
    if (!currentUser) return [];
    return leads.filter(l =>
      l.assignedToId === currentUser.id ||
      l.actionedBy === currentUser.id ||
      (currentUser.name && (l.assignedToName === currentUser.name || l.actionedByName === currentUser.name))
    );
  }, [leads, currentUser]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return accessibleLeads.filter(lead => {
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
  }, [accessibleLeads, statusFilter, dateRangeType, customStartDate, customEndDate, searchTerm]);

  // Metrics (Strictly scoped to logged-in user)
  const totalLeadsCount = accessibleLeads.length;
  const inProgressCount = accessibleLeads.filter(l => l.status === 'Discussion in Progress' || l.status === 'New Lead').length;
  const fieldVisitsCount = accessibleLeads.filter(l => l.status === 'Field Visit Scheduled').length;
  const readyForLoginCount = accessibleLeads.filter(l => l.status === 'Ready for Login').length;

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

  const handleCreateLead = (e) => {
    e.preventDefault();
    if (!newLeadMobile.trim() || newLeadMobile.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    const assignedEmp = employees.find(e => e.id === newLeadAssigneeId) || currentUser;
    const digits = newLeadMobile.replace(/\D/g, '').slice(-10);
    const formattedMobile = `+91 ${digits}`;

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
    setLoginAssignLead(lead);
    setLoginAssignMode('');
    setLoginAssigneeId('');
  };

  const selectedLoginAssignee = useMemo(() => {
    if (!loginAssigneeId) return null;
    if (loginAssigneeId === currentUser?.id) return currentUser;
    return employees.find(e => e.id === loginAssigneeId) || null;
  }, [loginAssigneeId, currentUser, employees]);

  const handleAssignOnlyFromLoginStep = () => {
    if (!loginAssignLead || !selectedLoginAssignee) return;
    assignLead(
      loginAssignLead.id,
      selectedLoginAssignee.id,
      selectedLoginAssignee.name,
      selectedLoginAssignee.role
    );
    setLoginAssignLead(null);
    setLoginAssignMode('');
    setLoginAssigneeId('');
  };

  const handleProceedFromAssignToConfirm = () => {
    if (!loginAssignLead || !selectedLoginAssignee) return;
    setConfirmConvertData({
      lead: loginAssignLead,
      assignee: selectedLoginAssignee
    });
    setLoginAssignLead(null);
    setLoginAssignMode('');
    setLoginAssigneeId('');
  };

  const proceedToConvertModal = (data) => {
    if (!data?.lead) return;
    const { lead, assignee } = data;
    setConfirmConvertData(null);
    setConvertingLeadData({ lead, assignee });
    setConvertBankName('State Bank of India');
    setConvertLoanType(lead.requiredService || 'Working Capital (CC/OD)');
    setConvertLoanAmount(lead.estimatedAmount || 2500000);
    setConvertNotes(`Converted to Bank Login by ${assignee?.name || currentUser?.name || 'RM'}`);
  };

  const handleConfirmConvert = (e) => {
    e.preventDefault();
    if (!convertingLeadData?.lead) return;
    const { lead, assignee } = convertingLeadData;

    convertLeadToLogin(lead.id, {
      bankName: convertBankName,
      loanType: convertLoanType,
      loanAmount: Number(convertLoanAmount),
      notes: convertNotes,
      assignedRMId: assignee?.id || currentUser?.id,
      assignedRMName: assignee?.name || currentUser?.name,
      assignedToRole: assignee?.role || currentUser?.role
    });

    setConvertingLeadData(null);
  };

  const enterLeadEditMode = (lead) => {
    if (!lead) return;
    setViewingLeadId(lead.id);
    setEditLeadName(lead.customerName || '');
    setEditLeadMobile(lead.mobile || '');
    setEditLeadAltMobile(lead.altMobile || '');
    setEditLeadBusiness(lead.business || '');
    setEditLeadCity(lead.city || '');
    setEditLeadState(lead.state || '');
    setEditLeadAddress(lead.address || '');
    setEditLeadService(lead.requiredService || '');
    setEditLeadAmount(lead.estimatedAmount || '');
    setEditLeadSource(lead.source || 'Direct');
    setEditLeadRemarks(lead.remarks || '');
    setEditLeadDocuments(Array.isArray(lead.documents) ? lead.documents : []);
    setEditDocCategory('KYC 1');
    setEditDocName('');
    setEditDocFileObj(null);
    setIsLeadEditMode(true);
  };

  const closeLeadDetailsModal = () => {
    setViewingLeadId(null);
    setIsLeadEditMode(false);
  };

  const handleAddLeadDocument = () => {
    if (editDocCategory === 'Other' && !editDocName.trim()) {
      alert('Please enter the document name for "Other" category');
      return;
    }
    if (!editDocName.trim() && !editDocFileObj) {
      alert('Please enter a document name or select a file');
      return;
    }

    const fileName = editDocFileObj
      ? editDocFileObj.name
      : `${editDocName.trim()}.pdf`;
    const fileSize = editDocFileObj
      ? `${(editDocFileObj.size / (1024 * 1024)).toFixed(2)} MB`
      : '1.2 MB';
    const categoryLabel = editDocCategory === 'Other' && editDocName.trim()
      ? `Other: ${editDocName.trim()}`
      : editDocCategory;

    const newDoc = {
      id: `DOC-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 100)}`,
      category: categoryLabel,
      name: fileName,
      size: fileSize,
      uploadDate: new Date().toISOString().split('T')[0]
    };

    setEditLeadDocuments(prev => [...prev, newDoc]);
    setEditDocName('');
    setEditDocFileObj(null);
  };

  const handleRemoveLeadDocument = (docId) => {
    setEditLeadDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const handleSaveEditLead = (e) => {
    e.preventDefault();
    if (!viewingLead) return;

    updateLead(viewingLead.id, {
      customerName: editLeadName.trim() || viewingLead.customerName,
      mobile: editLeadMobile.trim() || viewingLead.mobile,
      altMobile: editLeadAltMobile.trim(),
      business: editLeadBusiness.trim(),
      city: editLeadCity.trim(),
      state: editLeadState.trim(),
      address: editLeadAddress.trim(),
      requiredService: editLeadService,
      estimatedAmount: Number(editLeadAmount) || 0,
      source: editLeadSource.trim() || viewingLead.source,
      remarks: editLeadRemarks.trim(),
      documents: editLeadDocuments
    });

    setIsLeadEditMode(false);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setDateRangeType('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <button
          onClick={() => setIsAddLeadModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-gold-500 hover:bg-gold-600 px-4 py-2.5 text-xs font-bold text-amber-950 shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Lead</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">My Active Leads</span>
          <span className="text-2xl font-black text-slate-900">{totalLeadsCount}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Under {currentUser?.name}</span>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-blue-800 block">Discussions in Progress</span>
          <span className="text-2xl font-black text-blue-900">{inProgressCount}</span>
          <span className="text-[10px] text-blue-700 block mt-1">Ongoing discussions</span>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-purple-800 block">Field Visits Scheduled</span>
          <span className="text-2xl font-black text-purple-900">{fieldVisitsCount}</span>
          <span className="text-[10px] text-purple-700 block mt-1">Site inspections & meetings</span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">Ready for Bank Login</span>
          <span className="text-2xl font-black text-emerald-900">{readyForLoginCount}</span>
          <span className="text-[10px] text-emerald-700 block mt-1">Documents verified</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

          {/* Reset Filters */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Filters</span>
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
                <th className="px-4 py-3">Sl.No</th>
                <th className="px-4 py-3">Customer / Enterprise</th>
                <th className="px-4 py-3">Requirement & Value</th>
                <th className="px-4 py-3">Customer Response</th>
                <th className="px-4 py-3">Assigned Executive </th>
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
                paginatedLeads.map((lead, idx) => {
                  const slNo = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isAssignedToMe = lead.assignedToId === currentUser?.id;
                  const isSalesManager = lead.assignedToRole === 'Sales Manager' || lead.assignedToRole === 'Sales Executive';
                  const isAssigned = Boolean(
                    (lead.assignedToId && String(lead.assignedToId).trim() !== '') ||
                    (lead.assignedToName && String(lead.assignedToName).trim() !== '' && lead.assignedToName !== 'Unassigned')
                  );

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition">
                      {/* Sl.No */}
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {slNo}
                      </td>

                      {/* Customer / Business */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">
                          {lead.customerType === 'unknown' ? 'Unknown / Lead' : (lead.customerName || 'Lead Contact')}
                        </div>
                        {lead.business && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{lead.business}</span>
                          </div>
                        )}
                        <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                          {lead.mobile}
                          {lead.city && lead.city.trim() ? ` • ${lead.city}` : ''}
                        </div>
                      </td>

                      {/* Requirement & Amount */}
                      <td className="px-4 py-3">
                        {lead.requiredService ? (
                          <div className="font-semibold text-slate-800">{lead.requiredService}</div>
                        ) : (
                          <div className="text-slate-400 text-[11px] italic">-</div>
                        )}
                        {lead.estimatedAmount && Number(lead.estimatedAmount) > 0 ? (
                          <div className="text-xs font-bold text-emerald-700 mt-0.5">
                            {formatCurrency(lead.estimatedAmount)}
                          </div>
                        ) : null}
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Source: {lead.source || 'Database'}
                        </div>
                      </td>

                      {/* Customer Response */}
                      <td className="px-4 py-3">
                        {lead.remarks ? (
                          <div className="text-xs text-slate-700 font-medium line-clamp-2 max-w-xs">
                            {lead.remarks.replace(/\s*\(Converted from telecalling:[^)]*\)/gi, '')}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Assigned Executive */}
                      <td className="px-4 py-3">
                        {isAssigned ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isSalesManager
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : 'bg-blue-100 text-blue-900 border border-blue-200'
                              }`}>
                                {lead.assignedToRole || 'Assigned'}
                              </span>
                              <span className="font-semibold text-slate-800">{lead.assignedToName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Assigned: {lead.assignedAt ? formatDate(lead.assignedAt) : 'Recent'}
                              {lead.actionedByName && lead.actionedByName !== lead.assignedToName && (
                                <span className="block text-emerald-700 font-semibold mt-0.5">
                                  Actioned by: {lead.actionedByName}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Assign Lead Button: Shown if lead is not yet assigned */}
                          {!isAssigned && lead.status !== 'Converted to Login' && (
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningLead(lead);
                                setSelectedAssigneeId(lead.assignedToId || currentUser?.id || '');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition"
                              title="Assign to any staff member"
                            >
                              Assign Lead
                            </button>
                          )}

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
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                ✓ In Bank
                              </span>
                              {lead.customerId && (
                                <span className="text-[9px] font-mono font-bold text-burgundy-900 mt-0.5">
                                  {lead.customerId}
                                </span>
                              )}
                            </div>
                          )}

                          {/* View Lead Details Eye Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setViewingLeadId(lead.id);
                              setIsLeadEditMode(false);
                            }}
                            className="p-1.5 text-slate-500 hover:text-burgundy-900 rounded-lg hover:bg-slate-100 transition"
                            title="View Lead Details"
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

        {/* Reusable Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredLeads.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          summaryLabel="leads"
        />
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: ADD NEW LEAD                                */}
      {/* ---------------------------------------------------- */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gold-300 block">Lead </span>
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
                  {activeEmployeesByRole.map(([roleName, members]) => (
                    <optgroup key={roleName} label={roleName}>
                      {members.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role} - {emp.location || 'Head Office'})
                        </option>
                      ))}
                    </optgroup>
                  ))}
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
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
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
                    <option value="">-- Or Choose Another Person (Any Role) --</option>
                    {activeEmployeesByRole.map(([roleName, members]) => (
                      <optgroup key={roleName} label={roleName}>
                        {members.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.role} - {emp.location || 'Head Office'})
                          </option>
                        ))}
                      </optgroup>
                    ))}
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
      {/* MODAL 3A-1: STEP 1 - ASSIGN BEFORE LOGIN             */}
      {/* ---------------------------------------------------- */}
      {loginAssignLead && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gold-300 block">
                  Step 1 • Select Assignee
                </span>
                <h3 className="text-base font-bold text-white">
                  Assign Before Login
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLoginAssignLead(null);
                  setLoginAssignMode('');
                  setLoginAssigneeId('');
                }}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[#FAF6EF] p-3 rounded-xl border border-gold-200/70 text-xs">
                <div className="font-bold text-slate-900">{loginAssignLead.customerName}</div>
                <div className="text-slate-600 font-mono mt-0.5">
                  {loginAssignLead.mobile}
                  {loginAssignLead.business ? ` • ${loginAssignLead.business}` : ''}
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Assign To <span className="text-rose-500">*</span>
                </label>

                {/* Choice 1: Assign to Myself */}
                <button
                  type="button"
                  onClick={() => {
                    setLoginAssignMode('self');
                    setLoginAssigneeId(currentUser?.id || '');
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-xs font-bold transition ${
                    loginAssignMode === 'self'
                      ? 'border-burgundy-900 bg-burgundy-50 text-burgundy-950 ring-2 ring-burgundy-900/15'
                      : 'border-slate-200 hover:border-burgundy-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className={`w-4 h-4 ${loginAssignMode === 'self' ? 'text-burgundy-900' : 'text-slate-400'}`} />
                    <span>Assign to Myself ({currentUser?.name})</span>
                  </div>
                  <span className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                    {currentUser?.role}
                  </span>
                </button>

                {/* Choice 2: Assign to Any Other User */}
                <button
                  type="button"
                  onClick={() => {
                    setLoginAssignMode('other');
                    if (loginAssigneeId === currentUser?.id) {
                      setLoginAssigneeId('');
                    }
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-xs font-bold transition ${
                    loginAssignMode === 'other'
                      ? 'border-burgundy-900 bg-burgundy-50 text-burgundy-950 ring-2 ring-burgundy-900/15'
                      : 'border-slate-200 hover:border-burgundy-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className={`w-4 h-4 ${loginAssignMode === 'other' ? 'text-burgundy-900' : 'text-slate-400'}`} />
                    <span>Assign to Any Other User</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">Any Role</span>
                </button>

                {loginAssignMode === 'other' && (
                  <div className="pt-1 animate-fade-in">
                    <select
                      value={loginAssigneeId}
                      onChange={(e) => setLoginAssigneeId(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 py-2.5 px-3 bg-white focus:outline-none focus:border-burgundy-800"
                    >
                      <option value="">-- Select Staff Member (Any Role) --</option>
                      {activeEmployeesByRole.map(([roleName, members]) => {
                        const filteredMembers = members.filter(m => m.id !== currentUser?.id);
                        if (filteredMembers.length === 0) return null;
                        return (
                          <optgroup key={roleName} label={roleName}>
                            {filteredMembers.map(emp => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name} ({emp.role} - {emp.location || 'Head Office'})
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setLoginAssignLead(null);
                    setLoginAssignMode('');
                    setLoginAssigneeId('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  {loginAssignMode === 'other' ? (
                    <button
                      type="button"
                      disabled={!selectedLoginAssignee}
                      onClick={handleAssignOnlyFromLoginStep}
                      title={!selectedLoginAssignee ? 'Select a user first' : 'Assign lead to selected user'}
                      className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        selectedLoginAssignee
                          ? 'bg-burgundy-900 hover:bg-burgundy-800 text-white shadow-md cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <UserCheck className={`w-3.5 h-3.5 ${selectedLoginAssignee ? 'text-gold-400' : 'text-slate-400'}`} />
                      <span>Assign Only</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!selectedLoginAssignee}
                      onClick={handleProceedFromAssignToConfirm}
                      title={!selectedLoginAssignee ? 'Select Myself first to enable Login' : 'Proceed to Bank Login'}
                      className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        selectedLoginAssignee
                          ? 'bg-burgundy-900 hover:bg-burgundy-800 text-white shadow-md cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <FileCheck className={`w-3.5 h-3.5 ${selectedLoginAssignee ? 'text-gold-400' : 'text-slate-400'}`} />
                      <span>Login</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3A-2: STEP 2 - CONFIRM LOGIN CONVERSION        */}
      {/* ---------------------------------------------------- */}
      {confirmConvertData && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden p-6 text-center">
            <button
              type="button"
              onClick={() => setConfirmConvertData(null)}
              className="absolute top-3.5 right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-full bg-burgundy-50 text-burgundy-900 flex items-center justify-center mx-auto mb-3.5 border border-burgundy-200 shadow-sm">
              <FileCheck className="w-6 h-6 text-burgundy-800" />
            </div>

            <h3 className="text-base font-bold text-slate-900 font-corporate">
              Are you sure you want to proceed to Login?
            </h3>

            <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
              This will move <strong className="text-slate-800">{confirmConvertData.lead.customerName}</strong> ({confirmConvertData.lead.mobile}) to Bank Login under{' '}
              <strong className="text-burgundy-900">{confirmConvertData.assignee?.name} ({confirmConvertData.assignee?.role})</strong> and generate an official Customer ID.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmConvertData(null)}
                className="w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => proceedToConvertModal(confirmConvertData)}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-burgundy-800 to-burgundy-950 hover:from-burgundy-900 hover:to-burgundy-950 text-white font-bold text-xs transition shadow-md active:scale-95"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: CONVERT LEAD TO BANK LOGIN                  */}
      {/* ---------------------------------------------------- */}
      {convertingLeadData && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300 block">Bank Syndication</span>
                <h3 className="text-base font-bold text-white">Convert to Bank Login File</h3>
              </div>
              <button
                onClick={() => setConvertingLeadData(null)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmConvert} className="p-6 space-y-3.5">
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-emerald-950">{convertingLeadData.lead.customerName}</div>
                  <span className="font-mono text-[10px] font-bold text-burgundy-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                    {convertingLeadData.lead.status === 'Converted to Login' && convertingLeadData.lead.customerId
                      ? convertingLeadData.lead.customerId
                      : 'Auto-Generates RA-CUST-'}
                  </span>
                </div>
                <div className="text-emerald-800 font-mono">
                  {convertingLeadData.lead.mobile}
                  {convertingLeadData.lead.business ? ` • ${convertingLeadData.lead.business}` : ''}
                </div>
                <div className="text-[10px] text-emerald-800 font-semibold">
                  Handler: {convertingLeadData.assignee?.name} ({convertingLeadData.assignee?.role})
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold pt-1 border-t border-emerald-200/60">
                  ✓ Automatically generates official Customer ID (RA-CUST-) upon Bank Login registration (No Login ID)
                </div>
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
                  onClick={() => setConvertingLeadData(null)}
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

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: LEAD DETAILS (VIEW & INLINE EDIT MODE)      */}
      {/* ---------------------------------------------------- */}
      {viewingLead && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gold-300 block">
                    {isLeadEditMode ? 'Edit Lead Details' : 'Lead Details'}
                  </span>
                  <span className="text-[10px] font-mono bg-white/20 text-white px-1.5 py-0.5 rounded">{viewingLead.id}</span>
                  {isLeadEditMode && (
                    <span className="text-[10px] font-bold bg-gold-400 text-burgundy-950 px-2 py-0.5 rounded-full">
                      Edit Mode
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">{viewingLead.customerName}</h3>
              </div>
              <button
                type="button"
                onClick={closeLeadDetailsModal}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLeadEditMode ? (
              <form onSubmit={handleSaveEditLead} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
                {/* Editable Top Profile Card */}
                <div className="bg-[#FAF6EF] p-4 rounded-xl border border-gold-200/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Client Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editLeadName}
                        onChange={(e) => setEditLeadName(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white focus:outline-none focus:border-burgundy-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={editLeadMobile}
                        onChange={(e) => setEditLeadMobile(e.target.value)}
                        className="w-full text-xs font-mono rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white focus:outline-none focus:border-burgundy-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Alternate Mobile
                      </label>
                      <input
                        type="tel"
                        placeholder="Optional backup number"
                        value={editLeadAltMobile}
                        onChange={(e) => setEditLeadAltMobile(e.target.value)}
                        className="w-full text-xs font-mono rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white focus:outline-none focus:border-burgundy-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Business / Occupation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Textiles, Rice Mill"
                        value={editLeadBusiness}
                        onChange={(e) => setEditLeadBusiness(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white focus:outline-none focus:border-burgundy-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        City / District
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Chennai"
                        value={editLeadCity}
                        onChange={(e) => setEditLeadCity(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white focus:outline-none focus:border-burgundy-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Tamil Nadu"
                        value={editLeadState}
                        onChange={(e) => setEditLeadState(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white focus:outline-none focus:border-burgundy-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Address / Location Details
                    </label>
                    <input
                      type="text"
                      placeholder="Door No, Street Name, Area, Pincode"
                      value={editLeadAddress}
                      onChange={(e) => setEditLeadAddress(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white focus:outline-none focus:border-burgundy-800"
                    />
                  </div>
                </div>

                {/* Editable Service & Estimated Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Requested Service
                    </label>
                    <select
                      value={editLeadService}
                      onChange={(e) => setEditLeadService(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white focus:outline-none focus:border-burgundy-800 font-semibold"
                    >
                      <option value="">Select Financial Service</option>
                      <option value="Working Capital (CC/OD)">Working Capital (CC/OD)</option>
                      <option value="Term Loan for Machinery">Term Loan for Machinery</option>
                      <option value="Business Loan">Business Loan</option>
                      <option value="Commercial Vehicle Finance">Commercial Vehicle Finance</option>
                      <option value="LAP (Loan Against Property)">LAP (Loan Against Property)</option>
                      <option value="Solar Project Finance">Solar Project Finance</option>
                      <option value="Home Loan">Home Loan</option>
                    </select>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <label className="text-[10px] uppercase font-bold text-emerald-800 block mb-1">
                      Estimated Amount (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 2500000"
                      value={editLeadAmount}
                      onChange={(e) => setEditLeadAmount(e.target.value)}
                      className="w-full text-xs font-bold rounded-lg border border-emerald-300 py-1.5 px-2.5 bg-white focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                </div>

                {/* Editable Source & Read-only Executive */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Lead Source
                    </label>
                    <input
                      type="text"
                      value={editLeadSource}
                      onChange={(e) => setEditLeadSource(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white focus:outline-none focus:border-burgundy-800"
                    />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Executive</span>
                    <span className="text-xs font-bold text-slate-800 block mt-0.5">
                      {viewingLead.assignedToName} ({viewingLead.assignedToRole})
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Assigned on: {viewingLead.assignedAt ? formatDate(viewingLead.assignedAt) : 'Recent'}
                    </span>
                  </div>
                </div>

                {/* Editable Attached Documents */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Attached Documents ({editLeadDocuments.length})
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <select
                      value={editDocCategory}
                      onChange={(e) => setEditDocCategory(e.target.value)}
                      className="sm:col-span-3 text-xs rounded-lg border border-slate-300 py-1.5 px-2 bg-white focus:outline-none focus:border-burgundy-800"
                    >
                      <option value="KYC 1">KYC 1</option>
                      <option value="KYC 2">KYC 2</option>
                      <option value="KYC 3">KYC 3</option>
                      <option value="Other">Other</option>
                    </select>

                    <input
                      type="text"
                      placeholder={editDocCategory === 'Other' ? 'Document name *' : 'Doc label (optional)'}
                      value={editDocName}
                      onChange={(e) => setEditDocName(e.target.value)}
                      className="sm:col-span-4 text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white focus:outline-none focus:border-burgundy-800"
                    />

                    <label className="sm:col-span-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg py-1.5 px-2 cursor-pointer hover:bg-slate-50 truncate">
                      <Upload className="w-3.5 h-3.5 text-burgundy-800 shrink-0" />
                      <span className="truncate">{editDocFileObj ? editDocFileObj.name : 'Choose File'}</span>
                      <input
                        type="file"
                        onChange={(e) => setEditDocFileObj(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleAddLeadDocument}
                      className="sm:col-span-2 py-1.5 px-2.5 rounded-lg bg-burgundy-900 hover:bg-burgundy-800 text-white text-xs font-bold transition"
                    >
                      Add Doc
                    </button>
                  </div>

                  {editLeadDocuments.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {editLeadDocuments.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-burgundy-800 shrink-0" />
                            <span className="font-bold text-slate-700 shrink-0">{doc.category}:</span>
                            <span className="text-slate-600 truncate">{doc.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveLeadDocument(doc.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 shrink-0"
                            title="Remove document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Editable Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Discussion Notes & Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={editLeadRemarks}
                    onChange={(e) => setEditLeadRemarks(e.target.value)}
                    placeholder="Enter discussion summary, requirements, follow-up notes..."
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-burgundy-800"
                  />
                </div>

                {/* Edit Mode Footer: Cancel & Update */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsLeadEditMode(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-burgundy-900 hover:bg-burgundy-800 rounded-xl shadow-md transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-gold-300" />
                    <span>Update</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Top Summary Card */}
                <div className="bg-[#FAF6EF] p-4 rounded-xl border border-gold-200/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-900">{viewingLead.customerName}</div>
                    <div className="text-xs text-slate-600 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{viewingLead.business || '-'}</span>
                    </div>
                    <div className="text-xs font-mono text-slate-700 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{viewingLead.mobile}</span>
                      </span>
                      {viewingLead.altMobile && (
                        <span className="text-[11px] text-slate-500">• Alt: {viewingLead.altMobile}</span>
                      )}
                    </div>
                    {[viewingLead.city, viewingLead.state].filter(Boolean).length > 0 && (
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{[viewingLead.city, viewingLead.state].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {viewingLead.address && (
                      <div className="text-[11px] text-slate-500">
                        Address: {viewingLead.address}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${
                      viewingLead.status === 'Ready for Login'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : viewingLead.status === 'Converted to Login'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : viewingLead.status === 'Field Visit Scheduled'
                        ? 'bg-purple-50 text-purple-800 border-purple-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      {viewingLead.status}
                    </span>
                    {viewingLead.status === 'Converted to Login' && viewingLead.customerId && (
                      <div className="text-[11px] font-mono font-bold text-burgundy-900 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded mt-2">
                        Cust ID: {viewingLead.customerId}
                      </div>
                    )}
                  </div>
                </div>

                {/* Requirement & Value */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Requested Service</span>
                    <span className="text-xs font-bold text-slate-800 block mt-0.5">{viewingLead.requiredService || '-'}</span>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Estimated Amount</span>
                    <span className="text-sm font-extrabold text-emerald-900 block mt-0.5">
                      {Number(viewingLead.estimatedAmount) > 0 ? formatCurrency(viewingLead.estimatedAmount) : '-'}
                    </span>
                  </div>
                </div>

                {/* Lead Origin & Assignment */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Lead Source</span>
                    <span className="text-xs font-semibold text-slate-700 block mt-0.5">{viewingLead.source || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Executive</span>
                    <span className="text-xs font-bold text-slate-800 block mt-0.5">
                      {viewingLead.assignedToName} ({viewingLead.assignedToRole})
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Assigned on: {viewingLead.assignedAt ? formatDate(viewingLead.assignedAt) : 'Recent'}
                    </span>
                    {viewingLead.actionedByName && (
                      <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                        Actioned by: {viewingLead.actionedByName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Attached Documents */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Attached Documents ({viewingLead.documents?.length || 0})
                    </h4>
                    <button
                      type="button"
                      onClick={() => enterLeadEditMode(viewingLead)}
                      className="text-[11px] font-bold text-burgundy-800 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Document / Details</span>
                    </button>
                  </div>
                  {viewingLead.documents && viewingLead.documents.length > 0 ? (
                    <div className="space-y-1.5">
                      {viewingLead.documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-burgundy-800 shrink-0" />
                            <span className="font-bold text-slate-700 shrink-0">{doc.category}:</span>
                            <span className="text-slate-600 truncate">{doc.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">{doc.size}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 italic">
                      No documents attached yet. Click "Edit" to add service, amount, address, or KYC documents.
                    </div>
                  )}
                </div>

                {/* Remarks & Discussion Notes */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Discussion Notes & Remarks
                  </h4>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed shadow-xs">
                    {viewingLead.remarks || 'No discussion remarks recorded yet.'}
                  </div>
                </div>

                {/* Quick Actions Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => enterLeadEditMode(viewingLead)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Edit className="w-3.5 h-3.5 text-burgundy-800" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={closeLeadDetailsModal}
                    className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
