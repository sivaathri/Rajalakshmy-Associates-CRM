import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCRM } from '../context/CRMContext';
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
  Sparkles,
  Plus,
  X,
  AlertCircle,
  Check,
  LogIn
} from 'lucide-react';

export const UserManagementPage = () => {
  const { currentUser, switchUser, showToast } = useAuth();
  const {
    employees = [],
    customers = [],
    activities = [],
    addEmployee,
    updateEmployee,
    deleteEmployee,
    toggleEmployeeStatus
  } = useCRM();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null); // null means adding new user

  // Form State
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

  // Auto calculate next sequential EMP ID
  const nextEmployeeId = useMemo(() => {
    let max = 0;
    employees.forEach(emp => {
      const match = emp.id?.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > max) max = num;
      }
    });
    return `EMP${String(max + 1).padStart(3, '0')}`;
  }, [employees]);

  // Open modal for Adding
  const handleOpenAddModal = () => {
    setEditingUserId(null);
    setFormData({
      ...initialForm,
      id: nextEmployeeId,
      title: 'Relationship Manager',
      email: `${nextEmployeeId.toLowerCase()}@rajalakshmy.com`
    });
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const handleOpenEditModal = (emp) => {
    setEditingUserId(emp.id);
    setFormData({
      id: emp.id,
      name: emp.name || '',
      role: emp.role || 'RM',
      title: emp.title || '',
      department: emp.department || 'Operations',
      location: emp.location || 'Chennai Head Office',
      email: emp.email || '',
      mobile: emp.mobile || '',
      password: emp.password || 'password123',
      status: emp.status || 'Active'
    });
    setIsModalOpen(true);
  };

  // Handle Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      showToast('Please enter employee full name', 'error');
      return;
    }

    if (editingUserId) {
      // Update existing
      updateEmployee(editingUserId, {
        name: formData.name.trim(),
        role: formData.role,
        title: formData.title.trim(),
        department: formData.department.trim(),
        location: formData.location.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim(),
        password: formData.password || 'password123',
        status: formData.status
      });
      setIsModalOpen(false);
    } else {
      // Add new
      const res = addEmployee({
        id: formData.id.trim().toUpperCase(),
        name: formData.name.trim(),
        role: formData.role,
        title: formData.title.trim() || `${formData.role} Specialist`,
        department: formData.department.trim(),
        location: formData.location.trim(),
        email: formData.email.trim() || `${formData.id.toLowerCase()}@rajalakshmy.com`,
        mobile: formData.mobile.trim(),
        password: formData.password || 'password123',
        status: formData.status
      });

      if (res?.success) {
        setIsModalOpen(false);
      }
    }
  };

  // Handle Delete Confirmation
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

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        emp.name?.toLowerCase().includes(q) ||
        emp.id?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.mobile?.toLowerCase().includes(q) ||
        emp.department?.toLowerCase().includes(q) ||
        emp.role?.toLowerCase().includes(q);

      const matchesRole =
        selectedRoleFilter === 'ALL' || emp.role === selectedRoleFilter;

      const matchesStatus =
        selectedStatusFilter === 'ALL' || emp.status === selectedStatusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // Metric counts
  const totalCount = employees.length;
  const activeCount = employees.filter(e => e.status === 'Active').length;
  const rmCount = employees.filter(e => e.role === 'RM').length;
  const salesCount = employees.filter(e => e.role === 'Sales Manager' || e.role === 'Sales Executive').length;
  const adminManagerCount = employees.filter(e => e.role === 'Admin' || e.role === 'Manager').length;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-burgundy-900 via-burgundy-800 to-burgundy-950 p-6 md:p-8 text-white shadow-xl border border-gold-300/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400 text-burgundy-950 shadow-md">
                <UserCog className="w-5 h-5" />
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gold-300 backdrop-blur-sm border border-gold-400/20">
                Staff & Access Directory
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-2 font-corporate">
              User Management Console
            </h1>
            <p className="text-xs md:text-sm text-gold-100/90 mt-1 max-w-xl">
              Create corporate accounts, assign roles, configure permissions, and monitor active CRM personnel across branches.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 rounded-xl bg-gold-400 hover:bg-gold-500 text-burgundy-950 px-5 py-3 text-xs md:text-sm font-bold shadow-lg transition transform active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New User</span>
            </button>
          </div>
        </div>

        {/* Decorative background logo shimmer */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-gold-400/10 blur-3xl pointer-events-none" />
      </div>

      {/* 2. Key Personnel Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Authorized Staff</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-burgundy-50 text-burgundy-900">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-corporate">{totalCount}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{activeCount} Active Accounts</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Relationship Managers (RM)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Phone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-800 font-corporate">{rmCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Telecalling & Lead Handlers</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Field Sales Executives</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-800 font-corporate">{salesCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Field visits & Open Source</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Executive & Management</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-purple-900 font-corporate">{adminManagerCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Principal Partners & Admins</div>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Universal Search Bar */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID (e.g. EMP004), email, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-[#FAF6EF]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-burgundy-800 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-burgundy-800 font-semibold"
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active Accounts</option>
              <option value="Inactive">Inactive Accounts</option>
            </select>
          </div>
        </div>

        {/* Role Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
          {['ALL', 'Admin', 'Manager', 'Ops', 'RM', 'Sales Manager', 'Sales Executive'].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                selectedRoleFilter === role
                  ? 'bg-burgundy-900 text-gold-300 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {role === 'ALL' ? 'All Roles' : role}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Personnel Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-burgundy-900" />
            <h3 className="text-sm font-bold text-slate-900 font-corporate">
              Authorized Personnel Directory ({filteredEmployees.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Current Session: <strong className="text-burgundy-900">{currentUser?.name}</strong> ({currentUser?.role})
          </span>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No personnel match your search</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Try adjusting your role filter or search term, or click "Add New User" to register a new employee.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF6EF] text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Role & Permissions</th>
                  <th className="py-3 px-4">Department & Title</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4 text-center">Contacts Added</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => {
                  const isCurrent = currentUser?.id === emp.id;
                  const initials = (emp.name || 'U')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-[#FAF6EF]/50 transition ${
                        isCurrent ? 'bg-gold-50/40' : ''
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-burgundy-900 text-gold-300 font-bold text-xs shadow-sm">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{emp.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full border border-emerald-200">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {emp.location || 'Head Office'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded-md border border-slate-200 text-[11px]">
                          {emp.id}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${getRoleBadge(emp.role)}`}>
                          {emp.role}
                        </span>
                      </td>

                      {/* Department & Title */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{emp.title || 'Staff'}</div>
                        <div className="text-[11px] text-slate-500">{emp.department || 'Operations'}</div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{emp.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{emp.mobile || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Contacts Added Count */}
                      <td className="py-3 px-4 text-center">
                        {(() => {
                          const empCusts = customers.filter(c => c.submittedBy === emp.id || c.submittedByName === emp.name);
                          const empActs = activities.filter(a => a.submittedBy === emp.id || a.submittedByName === emp.name);
                          const seen = new Set();
                          let count = 0;
                          [...empActs, ...empCusts].forEach(item => {
                            const m = (item.mobile || '').replace(/\D/g, '').slice(-10);
                            if (!m || !seen.has(m)) {
                              if (m) seen.add(m);
                              count++;
                            }
                          });

                          return (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              count > 0
                                ? 'bg-amber-50 text-amber-900 border border-amber-300 font-extrabold'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              <Phone className="w-3 h-3 text-amber-700" />
                              <span>{count} Added</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleEmployeeStatus(emp.id)}
                          title="Click to toggle status"
                          disabled={emp.id === 'EMP001'}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                            emp.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          } ${emp.id === 'EMP001' ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{emp.status || 'Active'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Test Login as this User */}
                          <button
                            onClick={() => switchUser(emp)}
                            title={`Instant Login as ${emp.name} (${emp.role})`}
                            className="flex items-center gap-1 rounded-lg border border-gold-300 bg-gold-50 text-amber-900 px-2 py-1 text-[11px] font-bold hover:bg-gold-100 transition shadow-xs"
                          >
                            <LogIn className="w-3 h-3 text-amber-700" />
                            <span className="hidden sm:inline">Switch</span>
                          </button>

                          {/* Edit User */}
                          <button
                            onClick={() => handleOpenEditModal(emp)}
                            title="Edit user details"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          {emp.id !== 'EMP001' && (
                            <button
                              onClick={() => handleDelete(emp)}
                              title="Delete user"
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gold-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-burgundy-900 via-burgundy-800 to-burgundy-950 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400 text-burgundy-950 shadow-md">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-corporate">
                    {editingUserId ? `Edit Staff Member (${formData.id})` : 'Add New Corporate User'}
                  </h3>
                  <p className="text-xs text-gold-200">
                    {editingUserId ? 'Update employee profile & permissions' : 'Create new employee credentials for CRM access'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Employee ID */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.id}
                    disabled={!!editingUserId}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                    placeholder="e.g. EMP006"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#FAF6EF]/60 font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-burgundy-800 disabled:opacity-70 disabled:cursor-not-allowed"
                  />
                  {!editingUserId && (
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Auto-suggested next ID: {nextEmployeeId}
                    </span>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">System Role *</label>
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-burgundy-800"
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
                <label className="block text-slate-700 font-bold mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#FAF6EF]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-burgundy-800 text-slate-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Designation / Title */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Designation / Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Senior RM"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#FAF6EF]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-burgundy-800"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Telecalling"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#FAF6EF]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-burgundy-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Official Email */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Official Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. suresh.k@rajalakshmy.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#FAF6EF]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-burgundy-800"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Mobile Contact</label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="+91 98405 55005"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#FAF6EF]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-burgundy-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Branch Location */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Branch / Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Chennai Head Office"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#FAF6EF]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-burgundy-800"
                  />
                </div>

                {/* Account Status */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-burgundy-800"
                  >
                    <option value="Active">Active (Can Login & Access CRM)</option>
                    <option value="Inactive">Inactive (Suspended / On Leave)</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Login Password</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="password123"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#FAF6EF]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-burgundy-800 font-mono text-slate-700"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Default prototype password is <code className="bg-slate-100 px-1 py-0.5 rounded text-burgundy-900 font-bold">password123</code>
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-burgundy-900 to-burgundy-800 hover:from-burgundy-850 hover:to-burgundy-750 px-6 py-2.5 font-bold text-white shadow-md transition"
                >
                  {editingUserId ? 'Save Profile Changes' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
