import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCRM } from '../context/CRMContext';
import { Pagination } from '../components/common/Pagination';
import { formatMobileNumber, matchesMobileSearch, formatDate, formatCurrency } from '../utils/formatters';
import {
  Users,
  UserPlus,
  UserCog,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  Key,
  Mail,
  Phone,
  MapPin,
  Building2,
  Plus,
  X,
  AlertCircle,
  Check,
  LogIn,
  Calendar,
  Clock,
  PhoneCall,
  Briefcase,
  Landmark,
  ArrowLeft,
  Download,
  RotateCcw,
  ChevronRight,
  Activity,
  FileText,
  BadgeCheck
} from 'lucide-react';

export const UserManagementPage = () => {
  const { currentUser, switchUser, showToast } = useAuth();
  const {
    employees = [],
    customers = [],
    activities = [],
    calls = [],
    bankLogins = [],
    attendance = [],
    auditTrail = [],
    addEmployee,
    updateEmployee,
    deleteEmployee,
    toggleEmployeeStatus
  } = useCRM();

  const isAdmin = currentUser?.role === 'Admin';

  // Sub-tabs for Admin: 'activities' (Employee Work Dossier) vs 'accounts' (Directory & User Management)
  const [activeAdminTab, setActiveAdminTab] = useState(isAdmin ? 'activities' : 'accounts');

  // ========================================================
  // EMPLOYEE WORK & DAILY ACTIVITIES STATE
  // ========================================================
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [dossierSearch, setDossierSearch] = useState('');
  const [dossierRoleFilter, setDossierRoleFilter] = useState('ALL');

  // Date Range Filters for Employee Work Inspection
  const todayIso = new Date().toISOString().split('T')[0];
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom'
  const [categoryFilter, setCategoryFilter] = useState('All'); // 'All' | 'Phone Call' | 'Field Activity' | 'Bank File Login' | 'Attendance Punch'
  const [actionSearch, setActionSearch] = useState('');

  // Handle Quick Date Presets
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDateFilter(todayStr);
      setEndDateFilter(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDateFilter(yStr);
      setEndDateFilter(yStr);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDateFilter(past.toISOString().split('T')[0]);
      setEndDateFilter(todayStr);
    } else if (preset === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDateFilter(startOfMonth);
      setEndDateFilter(todayStr);
    } else if (preset === 'all') {
      setStartDateFilter('');
      setEndDateFilter('');
    }
  };

  // Filtered employees in Search Dossier view
  const matchingDossierEmployees = useMemo(() => {
    return employees.filter(emp => {
      const q = dossierSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        emp.name?.toLowerCase().includes(q) ||
        emp.id?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        matchesMobileSearch(emp.mobile, dossierSearch);

      const matchesRole = dossierRoleFilter === 'ALL' || emp.role === dossierRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [employees, dossierSearch, dossierRoleFilter]);

  // Combine and normalize all actions done by the selected employee
  const employeeActions = useMemo(() => {
    if (!selectedEmployee) return [];
    const empId = selectedEmployee.id;
    const empName = selectedEmployee.name?.toLowerCase().trim();

    const items = [];

    // 1. Phone Calls Logged
    (calls || []).forEach(c => {
      if (c.employeeId === empId || (empName && c.employeeName?.toLowerCase().includes(empName))) {
        items.push({
          id: c.id || `call-${c.callDate}-${c.callTime}`,
          category: 'Phone Call',
          date: c.callDate,
          time: c.callTime || '10:00 AM',
          title: `Call with ${c.customerName || 'Client'}`,
          customerName: c.customerName,
          mobile: c.mobile,
          status: c.outcome || 'Completed',
          duration: c.duration,
          details: c.remarks || 'No discussion notes provided.',
          reminderDate: c.reminderDate,
          icon: 'phone',
          badgeColor: c.outcome === 'OK' || c.outcome === 'Interested' ? 'emerald' : c.outcome === 'Reminder' ? 'amber' : 'slate'
        });
      }
    });

    // 2. Field Sales & Daily Activities Logged
    (activities || []).forEach(a => {
      if (
        a.submittedBy === empId ||
        a.employeeId === empId ||
        (empName && (a.submittedByName?.toLowerCase().includes(empName) || a.employeeName?.toLowerCase().includes(empName)))
      ) {
        items.push({
          id: a.id || `act-${a.submissionDate || a.date}-${a.submissionTime || a.time}`,
          category: 'Field Activity',
          date: a.submissionDate || a.date,
          time: a.submissionTime || a.time || '11:00 AM',
          title: `${a.activityType || 'Field Activity'}: ${a.customerName || 'Business Contact'}`,
          customerName: a.customerName,
          mobile: a.mobile,
          location: a.location || a.city || a.state,
          status: a.status || 'Saved',
          details: a.remarks || `Classified into ${a.classifiedTo || 'CRM Database'}.`,
          loanAmount: a.loanAmount,
          icon: 'briefcase',
          badgeColor: 'indigo'
        });
      }
    });

    // 3. Bank Logins Logged / Managed
    (bankLogins || []).forEach(b => {
      if (
        b.submittedBy === empId ||
        b.assignedRMId === empId ||
        (empName && (b.submittedByName?.toLowerCase().includes(empName) || b.assignedRMName?.toLowerCase().includes(empName)))
      ) {
        items.push({
          id: b.id || `login-${b.loginDate}`,
          category: 'Bank File Login',
          date: b.loginDate,
          time: b.loginTime || '12:00 PM',
          title: `Bank Login: ${b.bankName || 'Partner Bank'} - ${formatCurrency(b.loanAmount || 0)}`,
          customerName: b.customerName,
          mobile: b.mobile,
          status: b.status || 'In Progress',
          details: `Loan Type: ${b.loanType || 'Business Loan'} • Bank Application Ref: ${b.bankId || 'N/A'}${b.updates?.length ? ` • Latest Note: "${b.updates[b.updates.length - 1].note}"` : ''}`,
          loanAmount: b.loanAmount,
          icon: 'building',
          badgeColor: b.status === 'Disbursed' ? 'emerald' : b.status === 'Rejected' ? 'rose' : 'blue'
        });
      }
    });

    // 4. Attendance In-Times
    (attendance || []).forEach(att => {
      if (att.employeeId === empId) {
        let isoDate = att.date;
        if (/^\d{2}-\d{2}-\d{4}$/.test(att.date)) {
          const [d, m, y] = att.date.split('-');
          isoDate = `${y}-${m}-${d}`;
        }
        items.push({
          id: att.id || `att-${att.date}`,
          category: 'Attendance Punch',
          date: isoDate,
          displayDate: att.date,
          time: att.inTime || '09:00 AM',
          title: `Daily Attendance In-Time Registered`,
          customerName: null,
          mobile: null,
          status: att.status || 'Present',
          details: `Punch mode: ${att.punchMode || 'Web In-Punch'} • Timestamp recorded at ${att.inTime}`,
          icon: 'clock',
          badgeColor: 'teal'
        });
      }
    });

    // 5. Audit Trail & Stage Transitions
    (auditTrail || []).forEach(aud => {
      if (aud.actorId === empId || (empName && aud.actorName?.toLowerCase().includes(empName))) {
        items.push({
          id: aud.id || `aud-${aud.date}-${aud.time}`,
          category: 'CRM Action',
          date: aud.date,
          time: aud.time || '01:00 PM',
          title: `${aud.action || 'CRM Event'}: ${aud.stage || 'Pipeline'}`,
          customerName: aud.customerName,
          mobile: aud.mobile,
          status: aud.toStatus || aud.action || 'Updated',
          details: aud.details || aud.reason || `Action recorded in stage ${aud.stage}`,
          icon: 'shield',
          badgeColor: 'purple'
        });
      }
    });

    // Sort descending by date and time
    return items.sort((a, b) => {
      const dtA = `${a.date || '1970-01-01'} ${a.time || '00:00'}`;
      const dtB = `${b.date || '1970-01-01'} ${b.time || '00:00'}`;
      return dtB.localeCompare(dtA);
    });
  }, [selectedEmployee, calls, activities, bankLogins, attendance, auditTrail]);

  // Filter actions by Date Range, Category & Action Search
  const filteredEmployeeActions = useMemo(() => {
    return employeeActions.filter(item => {
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (startDateFilter && item.date && item.date < startDateFilter) return false;
      if (endDateFilter && item.date && item.date > endDateFilter) return false;
      if (actionSearch.trim()) {
        const q = actionSearch.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchCust = item.customerName?.toLowerCase().includes(q);
        const matchMob = item.mobile?.includes(q);
        const matchDetails = item.details?.toLowerCase().includes(q);
        if (!matchTitle && !matchCust && !matchMob && !matchDetails) return false;
      }
      return true;
    });
  }, [employeeActions, categoryFilter, startDateFilter, endDateFilter, actionSearch]);

  // Group actions by Day
  const actionsGroupedByDay = useMemo(() => {
    const map = {};
    filteredEmployeeActions.forEach(act => {
      const dayKey = act.date || 'Unspecified Date';
      if (!map[dayKey]) map[dayKey] = [];
      map[dayKey].push(act);
    });
    return Object.entries(map).sort(([dA], [dB]) => dB.localeCompare(dA));
  }, [filteredEmployeeActions]);

  // Export Work Audit to CSV
  const handleExportEmployeeWork = () => {
    if (!selectedEmployee || filteredEmployeeActions.length === 0) return;
    const rows = filteredEmployeeActions.map(a => ({
      'Employee ID': selectedEmployee.id,
      'Employee Name': selectedEmployee.name,
      'Role': selectedEmployee.role,
      'Date (YYYY-MM-DD)': a.date,
      'Time': a.time,
      'Category': a.category,
      'Activity Title': a.title,
      'Customer / Client': a.customerName || '-',
      'Mobile Contact': a.mobile || '-',
      'Status / Outcome': a.status,
      'Duration': a.duration || '-',
      'Details / Remarks': a.details
    }));
    const filename = `${selectedEmployee.name.replace(/\s+/g, '_')}_Daily_Work_Report_${startDateFilter || 'All'}_to_${endDateFilter || 'All'}.csv`;
    const csvContent = "data:text/csv;charset=utf-8," + [
      Object.keys(rows[0]).join(","),
      ...rows.map(r => Object.values(r).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ========================================================
  // USER MANAGEMENT / ACCOUNTS STATE (Original Form State)
  // ========================================================
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const initialForm = {
    id: '',
    name: '',
    role: 'RM',
    title: '',
    department: 'Telecalling & Client Relations',
    location: 'Chennai Head Office',
    email: '',
    mobile: '',
    password: 'password123',
    status: 'Active'
  };

  const [formData, setFormData] = useState(initialForm);

  const handleOpenAddModal = () => {
    setEditingUserId(null);
    const nextNum = employees.length + 1;
    const generatedId = `EMP${String(nextNum).padStart(3, '0')}`;
    setFormData({
      ...initialForm,
      id: generatedId,
      title: 'Relationship Manager',
      email: `emp${String(nextNum).padStart(3, '0')}@rajalakshmy.com`
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp) => {
    setEditingUserId(emp.id);
    setFormData({
      id: emp.id,
      name: emp.name,
      role: emp.role || 'RM',
      title: emp.title || '',
      department: emp.department || '',
      location: emp.location || 'Chennai Head Office',
      email: emp.email || '',
      mobile: emp.mobile ? formatMobileNumber(emp.mobile) : '',
      password: emp.password || 'password123',
      status: emp.status || 'Active'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showToast('Please enter employee full name', 'error');
      return;
    }
    const formattedMobile = formData.mobile.trim() ? formatMobileNumber(formData.mobile.trim()) : '';

    if (editingUserId) {
      updateEmployee(editingUserId, {
        name: formData.name.trim(),
        role: formData.role,
        title: formData.title.trim(),
        department: formData.department.trim(),
        location: formData.location.trim(),
        email: formData.email.trim(),
        mobile: formattedMobile,
        password: formData.password || 'password123',
        status: formData.status
      });
      setIsModalOpen(false);
    } else {
      const res = addEmployee({
        id: formData.id.trim().toUpperCase(),
        name: formData.name.trim(),
        role: formData.role,
        title: formData.title.trim() || `${formData.role} Specialist`,
        department: formData.department.trim(),
        location: formData.location.trim(),
        email: formData.email.trim() || `${formData.id.toLowerCase()}@rajalakshmy.com`,
        mobile: formattedMobile,
        password: formData.password || 'password123',
        status: formData.status
      });
      if (res?.success) {
        setIsModalOpen(false);
      }
    }
  };

  const handleDelete = (emp) => {
    if (emp.id === 'EMP001') {
      showToast('Managing Director (Principal Admin) cannot be deleted', 'error');
      return;
    }
    if (window.confirm(`Are you sure you want to delete staff account ${emp.name} (${emp.id})?`)) {
      deleteEmployee(emp.id);
    }
  };

  // Role Color Badges
  const getRoleBadge = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'Manager':
        return 'bg-blue-100 text-blue-900 border-blue-200';
      case 'RM':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'Sales Manager':
      case 'Sales Executive':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'Ops':
        return 'bg-indigo-100 text-indigo-900 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Filtered employees for Accounts table
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        emp.name?.toLowerCase().includes(q) ||
        emp.id?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        matchesMobileSearch(emp.mobile, searchQuery) ||
        emp.department?.toLowerCase().includes(q) ||
        emp.role?.toLowerCase().includes(q);

      const matchesRole = selectedRoleFilter === 'ALL' || emp.role === selectedRoleFilter;
      const matchesStatus = selectedStatusFilter === 'ALL' || emp.status === selectedStatusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // Pagination for Accounts table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(start, start + itemsPerPage);
  }, [filteredEmployees, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          
          <h2 className="text-xl md:text-2xl font-extrabold text-white font-corporate">
            {isAdmin ? 'Employee Details & Daily Activity Tracker' : 'Staff Directory & Access Control'}
          </h2>
         
        </div>

        {/* Tab Switcher for Admin */}
        {isAdmin && (
          <div className="flex items-center gap-2 bg-black/30 p-1.5 rounded-2xl border border-white/10 self-start md:self-auto">
            <button
              type="button"
              onClick={() => {
                setActiveAdminTab('activities');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeAdminTab === 'activities'
                  ? 'bg-gold-500 text-amber-950 shadow-md'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Employee Work Dossier</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveAdminTab('accounts');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeAdminTab === 'accounts'
                  ? 'bg-gold-500 text-amber-950 shadow-md'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <UserCog className="w-4 h-4" />
              <span>User Accounts Directory</span>
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: ADMIN EMPLOYEE WORK DOSSIER (DEFAULT FOR ADMIN)  */}
      {/* ======================================================== */}
      {isAdmin && activeAdminTab === 'activities' && (
        <div className="space-y-6">
          {!selectedEmployee ? (
            /* SUB-VIEW 1A: SEARCH & SELECT EMPLOYEE */
            <div className="space-y-6">
              {/* Search & Filter Toolbar */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-corporate flex items-center gap-2">
                      <Search className="w-4 h-4 text-burgundy-900" />
                      <span>Search Employee</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Search by user name, employee ID, mobile number, or email to inspect daily work details
                    </p>
                  </div>
                  <span className="text-xs font-bold text-burgundy-900 bg-burgundy-50 px-3 py-1 rounded-full border border-burgundy-200 self-start">
                    {matchingDossierEmployees.length} Employee{matchingDossierEmployees.length !== 1 ? 's' : ''} Found
                  </span>
                </div>

                {/* Big Search Input */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by User Name, Employee ID (e.g. EMP004), Mobile (+91...), or Email..."
                    value={dossierSearch}
                    onChange={(e) => setDossierSearch(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 py-2.5 pl-11 pr-10 text-sm focus:border-burgundy-900 focus:outline-none transition shadow-inner font-medium"
                    autoFocus
                  />
                  {dossierSearch && (
                    <button
                      type="button"
                      onClick={() => setDossierSearch('')}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Role Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-slate-400" /> Role:
                  </span>
                  {['ALL', 'RM', 'Sales Manager', 'Ops', 'Manager'].map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setDossierRoleFilter(role)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        dossierRoleFilter === role
                          ? 'bg-burgundy-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {role === 'ALL' ? 'All Roles' : role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Employee Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchingDossierEmployees.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No matching employees found</p>
                    <p className="text-xs text-slate-400 mt-1">Try refining your search keyword or selecting a different role filter.</p>
                  </div>
                ) : (
                  matchingDossierEmployees.map(emp => {
                    const empCallsCount = calls.filter(c => c.employeeId === emp.id).length;
                    const empActCount = activities.filter(a => a.submittedBy === emp.id || a.employeeId === emp.id).length;
                    const empLoginsCount = bankLogins.filter(b => b.submittedBy === emp.id || b.assignedRMId === emp.id).length;

                    return (
                      <div
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmployee(emp);
                          applyDatePreset('all');
                        }}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-gold-300 transition cursor-pointer flex flex-col justify-between group transform active:scale-98"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-burgundy-900 to-burgundy-950 text-gold-300 font-black text-base shadow-md group-hover:scale-105 transition-transform">
                                {emp.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-burgundy-900 transition flex items-center gap-1.5">
                                  <span>{emp.name}</span>
                                </h4>
                                <span className="font-mono text-xs font-bold text-burgundy-800 block">
                                  {emp.id}
                                </span>
                              </div>
                            </div>
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(emp.role)}`}>
                              {emp.role}
                            </span>
                          </div>

                          <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{emp.title || 'Staff Specialist'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-mono font-semibold text-slate-800">{formatMobileNumber(emp.mobile)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate text-slate-500">{emp.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate text-slate-500">{emp.location || 'Chennai'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Activity Preview Badges */}
                        <div className="mt-5 pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between text-[11px] text-slate-600 mb-2">
                            <span>Logged Actions:</span>
                            <span className="font-bold text-slate-800">
                              {empCallsCount} calls • {empActCount} activities • {empLoginsCount} logins
                            </span>
                          </div>
                          <button
                            type="button"
                            className="w-full py-2 px-3 rounded-xl bg-slate-50 group-hover:bg-burgundy-900 group-hover:text-white text-burgundy-900 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <span>Inspect Daily Work & Activities</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* SUB-VIEW 1B: DETAILED WORK & ACTIVITY TIMELINE FOR SELECTED EMPLOYEE */
            <div className="space-y-6">
              {/* Back Bar & Employee Profile Card */}
              <div className="rounded-2xl border-2 border-gold-300 bg-gradient-to-br from-white via-gold-50/20 to-[#FAF6EF] p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gold-200">
                  <button
                    type="button"
                    onClick={() => setSelectedEmployee(null)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 transition shadow-xs"
                  >
                    <ArrowLeft className="w-4 h-4 text-burgundy-900" />
                    <span>Back to Employee Search</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportEmployeeWork}
                      disabled={filteredEmployeeActions.length === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export Work Report (CSV)</span>
                    </button>
                  </div>
                </div>

                {/* Profile Header Details */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-burgundy-900 to-burgundy-950 text-gold-300 font-black text-xl shadow-lg">
                      {selectedEmployee.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-extrabold text-slate-900 font-corporate">
                          {selectedEmployee.name}
                        </h3>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRoleBadge(selectedEmployee.role)}`}>
                          {selectedEmployee.role}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-burgundy-900 font-mono mt-0.5">
                        Employee ID: {selectedEmployee.id} • {selectedEmployee.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedEmployee.department} • {selectedEmployee.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium bg-white p-3 rounded-xl border border-gold-200 shadow-inner">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Phone className="w-4 h-4 text-burgundy-900" />
                      <span className="font-mono font-bold">{formatMobileNumber(selectedEmployee.mobile)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Mail className="w-4 h-4 text-burgundy-900" />
                      <span>{selectedEmployee.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BadgeCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-emerald-700">{selectedEmployee.status || 'Active'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DATE RANGE SELECTOR & WORK FILTERS */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-burgundy-900" />
                      <span>Date Range & Activity Filter</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Select date range to inspect everything {selectedEmployee.name} has performed on every day
                    </p>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'all', label: 'All Time' },
                      { id: 'today', label: 'Today' },
                      { id: 'yesterday', label: 'Yesterday' },
                      { id: '7days', label: 'Last 7 Days' },
                      { id: 'month', label: 'This Month' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyDatePreset(p.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          datePreset === p.id
                            ? 'bg-burgundy-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Inputs & Search Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 border-t border-slate-100">
                  {/* From Date */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">From Date</label>
                    <input
                      type="date"
                      value={startDateFilter}
                      onChange={(e) => {
                        setStartDateFilter(e.target.value);
                        setDatePreset('custom');
                      }}
                      className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                    />
                  </div>

                  {/* To Date */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">To Date</label>
                    <input
                      type="date"
                      value={endDateFilter}
                      onChange={(e) => {
                        setEndDateFilter(e.target.value);
                        setDatePreset('custom');
                      }}
                      className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                    />
                  </div>

                  {/* Category Filter */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Activity Type</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 font-medium text-slate-800"
                    >
                      <option value="All">All Activity Types</option>
                      <option value="Phone Call">Phone Calls (Telecalling)</option>
                      <option value="Field Activity">Field Activities & Visits</option>
                      <option value="Bank File Login">Bank File Logins</option>
                      <option value="Attendance Punch">Attendance Punch-Ins</option>
                      <option value="CRM Action">CRM Stage Changes</option>
                    </select>
                  </div>

                  {/* Search within actions */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Keyword Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Customer, mobile, notes..."
                        value={actionSearch}
                        onChange={(e) => setActionSearch(e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-8 pr-3 focus:outline-none focus:border-burgundy-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI Summary for this Employee in Date Range */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Work Actions</span>
                  <span className="text-xl font-black text-slate-900">{filteredEmployeeActions.length}</span>
                  <span className="text-[10px] text-slate-500 block">In selected period</span>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 shadow-sm text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Calls Completed</span>
                  <span className="text-xl font-black text-emerald-900">
                    {filteredEmployeeActions.filter(a => a.category === 'Phone Call').length}
                  </span>
                  <span className="text-[10px] text-emerald-700 block font-semibold">Telecalling volume</span>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 shadow-sm text-center">
                  <span className="text-[10px] uppercase font-bold text-indigo-800 block">Field Activities</span>
                  <span className="text-xl font-black text-indigo-900">
                    {filteredEmployeeActions.filter(a => a.category === 'Field Activity').length}
                  </span>
                  <span className="text-[10px] text-indigo-700 block font-semibold">Visits & meetings</span>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 shadow-sm text-center">
                  <span className="text-[10px] uppercase font-bold text-blue-800 block">Bank Logins</span>
                  <span className="text-xl font-black text-blue-900">
                    {filteredEmployeeActions.filter(a => a.category === 'Bank File Login').length}
                  </span>
                  <span className="text-[10px] text-blue-700 block font-semibold">Logged file submissions</span>
                </div>

                <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 shadow-sm text-center col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-teal-800 block">Attendance Punches</span>
                  <span className="text-xl font-black text-teal-900">
                    {filteredEmployeeActions.filter(a => a.category === 'Attendance Punch').length}
                  </span>
                  <span className="text-[10px] text-teal-700 block font-semibold">Recorded in-times</span>
                </div>
              </div>

              {/* DAY-BY-DAY ACTIVITY TIMELINE ("wt he done on every day with date and time") */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-extrabold text-slate-900 font-corporate flex items-center gap-2">
                    <Clock className="w-5 h-5 text-burgundy-900" />
                    <span>Daily Work Timeline ({filteredEmployeeActions.length} Actions Logged)</span>
                  </h4>
                  <span className="text-xs text-slate-500">
                    {startDateFilter && endDateFilter
                      ? `Range: ${formatDate(startDateFilter)} to ${formatDate(endDateFilter)}`
                      : 'Showing All Recorded Days'}
                  </span>
                </div>

                {actionsGroupedByDay.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                    <Activity className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No activities recorded for this date range</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No calls, visits, file logins, or attendance records found matching current criteria.
                    </p>
                  </div>
                ) : (
                  actionsGroupedByDay.map(([dayDate, dayActions]) => (
                    <div key={dayDate} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      {/* Day Header */}
                      <div className="px-5 py-3 bg-[#FAF6EF] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-burgundy-900" />
                          <span className="text-xs font-extrabold text-slate-900 font-corporate">
                            {formatDate(dayDate)} ({dayDate})
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-burgundy-900 bg-white px-2.5 py-0.5 rounded-full border border-gold-300">
                          {dayActions.length} Action{dayActions.length !== 1 ? 's' : ''} on this day
                        </span>
                      </div>

                      {/* Day's Chronological Work Items */}
                      <div className="divide-y divide-slate-100 p-2">
                        {dayActions.map(action => (
                          <div
                            key={action.id}
                            className="p-3.5 hover:bg-slate-50/80 transition rounded-xl flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                          >
                            <div className="flex items-start gap-3">
                              {/* Icon Badge */}
                              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-xs ${
                                action.category === 'Phone Call'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : action.category === 'Field Activity'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : action.category === 'Bank File Login'
                                  ? 'bg-blue-100 text-blue-800'
                                  : action.category === 'Attendance Punch'
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {action.category === 'Phone Call' && <PhoneCall className="w-4 h-4" />}
                                {action.category === 'Field Activity' && <Briefcase className="w-4 h-4" />}
                                {action.category === 'Bank File Login' && <Landmark className="w-4 h-4" />}
                                {action.category === 'Attendance Punch' && <Clock className="w-4 h-4" />}
                                {action.category === 'CRM Action' && <ShieldCheck className="w-4 h-4" />}
                              </div>

                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900">
                                    {action.title}
                                  </span>
                                  <span className={`inline-block px-2 py-0.2 rounded-md text-[10px] font-extrabold uppercase border ${
                                    action.category === 'Phone Call'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : action.category === 'Field Activity'
                                      ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                      : action.category === 'Bank File Login'
                                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                                      : action.category === 'Attendance Punch'
                                      ? 'bg-teal-50 text-teal-800 border-teal-200'
                                      : 'bg-purple-50 text-purple-800 border-purple-200'
                                  }`}>
                                    {action.category}
                                  </span>
                                </div>

                                {/* Customer & Contact Details */}
                                {(action.customerName || action.mobile) && (
                                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                    {action.customerName && (
                                      <span>Customer: <strong className="text-slate-800">{action.customerName}</strong></span>
                                    )}
                                    {action.mobile && (
                                      <span className="font-mono text-slate-700">Mobile: <strong>{formatMobileNumber(action.mobile)}</strong></span>
                                    )}
                                    {action.duration && (
                                      <span className="text-slate-500 font-mono">Duration: {action.duration}</span>
                                    )}
                                    {action.location && (
                                      <span className="text-slate-500">Location: {action.location}</span>
                                    )}
                                  </div>
                                )}

                                {/* Specific Work Details / Notes / Remarks */}
                                <p className="text-xs text-slate-700 mt-1.5 leading-relaxed bg-slate-50/80 p-2 rounded-lg border border-slate-100 max-w-2xl">
                                  {action.details}
                                </p>
                              </div>
                            </div>

                            {/* Date, Time & Status Pill */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0 pt-1 sm:pt-0">
                              <span className="font-mono text-xs font-extrabold text-burgundy-900 bg-gold-50 px-2 py-0.5 rounded border border-gold-200">
                                {action.time}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatDate(action.date)}
                              </span>
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                action.status === 'OK' || action.status === 'Interested' || action.status === 'Disbursed' || action.status === 'Present'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : action.status === 'Reminder' || action.status === 'In Progress'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {action.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: DIRECTORY & USER ACCOUNTS (ORIGINAL CONSOLE)     */}
      {/* ======================================================== */}
      {(!isAdmin || activeAdminTab === 'accounts') && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff by Name, ID, Mobile, Email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-burgundy-800 bg-slate-50 focus:bg-white transition"
                />
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-burgundy-800 font-medium"
                >
                  <option value="ALL">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="RM">RM (Relationship Manager)</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="Sales Executive">Sales Executive</option>
                  <option value="Ops">Ops</option>
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-burgundy-800 font-medium"
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 text-white text-xs font-bold shadow-md transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[900px]">
                <thead className="bg-[#FAF6EF] text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Role & Designation</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <span className="text-xs">No employees found matching criteria</span>
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map(emp => {
                      const isCurrent = currentUser?.id === emp.id;
                      return (
                        <tr key={emp.id} className="hover:bg-[#FAF6EF]/60 transition">
                          {/* Employee Identity */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-burgundy-900 text-gold-300 font-bold text-xs shadow-xs">
                                {emp.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                                  {emp.name}
                                  {isCurrent && (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">You</span>
                                  )}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">{emp.id}</span>
                              </div>
                            </div>
                          </td>

                          {/* Role & Title */}
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mb-0.5 ${getRoleBadge(emp.role)}`}>
                              {emp.role}
                            </span>
                            <span className="text-[11px] text-slate-600 block truncate max-w-[180px]">{emp.title || '-'}</span>
                          </td>

                          {/* Department */}
                          <td className="px-4 py-3 text-slate-700 font-medium">
                            {emp.department || 'General'}
                          </td>

                          {/* Contact Info */}
                          <td className="px-4 py-3">
                            <div className="space-y-0.5 font-mono text-[11px]">
                              <div className="text-slate-800 font-semibold">{formatMobileNumber(emp.mobile)}</div>
                              <div className="text-slate-400 text-[10px] truncate max-w-[170px]">{emp.email}</div>
                            </div>
                          </td>

                          {/* Location */}
                          <td className="px-4 py-3 text-slate-600">
                            {emp.location || 'Chennai'}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => toggleEmployeeStatus(emp.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                                emp.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                              }`}
                            >
                              {emp.status === 'Active' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                              <span>{emp.status || 'Active'}</span>
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Inspect Work Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setActiveAdminTab('activities');
                                  applyDatePreset('all');
                                }}
                                className="p-1.5 rounded-lg border border-gold-300 bg-gold-50 hover:bg-gold-100 text-burgundy-900 transition"
                                title="Inspect Employee Daily Work Timeline"
                              >
                                <Activity className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Modal */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(emp)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
                                title="Edit Staff Profile"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDelete(emp)}
                                className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
                                title="Delete Staff Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

            {/* Pagination Component */}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredEmployees.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              summaryLabel="employees"
            />
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Employee */}
      {isModalOpen && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-950 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-gold-300" />
                <h3 className="text-base font-bold text-white font-corporate">
                  {editingUserId ? `Edit Employee Account (${editingUserId})` : 'Register New Employee Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Employee ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingUserId)}
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-xs bg-slate-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-burgundy-800"
                    placeholder="EMP021"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    System Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      let suggestedTitle = formData.title;
                      let suggestedDept = formData.department;

                      if (newRole === 'RM') {
                        suggestedTitle = 'Relationship Manager';
                        suggestedDept = 'Telecalling & Client Relations';
                      } else if (newRole === 'Sales Manager') {
                        suggestedTitle = 'Field Sales Manager';
                        suggestedDept = 'Field Sales & Acquisitions';
                      } else if (newRole === 'Sales Executive') {
                        suggestedTitle = 'Field Sales Executive';
                        suggestedDept = 'Field Sales & Acquisitions';
                      } else if (newRole === 'Ops') {
                        suggestedTitle = 'CRM Database & Ops Executive';
                        suggestedDept = 'CRM Operations';
                      } else if (newRole === 'Manager') {
                        suggestedTitle = 'Branch Operations Manager';
                        suggestedDept = 'Operations & Administration';
                      } else if (newRole === 'Admin') {
                        suggestedTitle = 'Principal Administrator';
                        suggestedDept = 'Executive Management';
                      }

                      setFormData({
                        ...formData,
                        role: newRole,
                        title: suggestedTitle,
                        department: suggestedDept
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-burgundy-800"
                  >
                    <option value="RM">RM (Relationship Manager - Telecalling)</option>
                    <option value="Sales Manager">Sales Manager (Field & Approvals)</option>
                    <option value="Sales Executive">Sales Executive (Field Activities)</option>
                    <option value="Ops">Ops (Database & Distribution)</option>
                    <option value="Manager">Manager (Branch Operations)</option>
                    <option value="Admin">Admin (Executive Partner)</option>
                  </select>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Employee Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-burgundy-800 font-semibold text-slate-900"
                  placeholder="e.g. S. Jayachandran"
                />
              </div>

              {/* Designation & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-burgundy-800"
                    placeholder="Senior RM / Specialist"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-burgundy-800"
                    placeholder="Telecalling & Client Relations"
                  />
                </div>
              </div>

              {/* Mobile Contact & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mobile Phone (10-Digits)
                  </label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-burgundy-800"
                    placeholder="98401 23456"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-burgundy-800"
                    placeholder="name@rajalakshmy.com"
                  />
                </div>
              </div>

              {/* Office Location & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Office Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-burgundy-800"
                    placeholder="Chennai Head Office"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Account Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-burgundy-800"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingUserId ? 'Save Profile Changes' : 'Create Staff Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
