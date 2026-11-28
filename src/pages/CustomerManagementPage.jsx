import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Search,
  Filter,
  Download,
  Plus,
  PhoneCall,
  Eye,
  FileText,
  Briefcase,
  Layers,
  CheckCircle,
  Building2,
  CalendarCheck,
  Edit3,
  X
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { formatDate, exportToCSV, getStatusBadgeClass, formatMobileNumber, matchesMobileSearch } from '../utils/formatters';
import { AddCustomerModal } from '../components/customers/AddCustomerModal';
import { CustomerDetailModal } from '../components/customers/CustomerDetailModal';
import { Pagination } from '../components/common/Pagination';

export const CustomerManagementPage = () => {
  const { customers, updateCustomer } = useCRM();
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSalesManager = currentUser?.role === 'Sales Manager';
  const canEditCustomer = ['admin', 'ops', 'operations'].includes(String(currentUser?.role || '').toLowerCase());

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    mobile: '',
    altMobile: '',
    dob: '',
    panNumber: '',
    business: '',
    city: '',
    state: '',
    address: ''
  });

  const handleOpenEditModal = (c) => {
    if (!c) return;
    let normalizedDob = c.dob || c.dateOfBirth || '';
    if (normalizedDob && /^\d{2}[/-]\d{2}[/-]\d{4}$/.test(normalizedDob)) {
      const [dd, mm, yyyy] = normalizedDob.split(/[/-]/);
      normalizedDob = `${yyyy}-${mm}-${dd}`;
    }
    setEditForm({
      name: c.name || '',
      mobile: formatMobileNumber(c.mobile || ''),
      altMobile: c.altMobile ? formatMobileNumber(c.altMobile) : '',
      dob: normalizedDob,
      panNumber: (c.panNumber || c.pan || '').toUpperCase(),
      business: c.business || '',
      city: c.city || '',
      state: c.state || '',
      address: c.address || ''
    });
    setEditingCustomer(c);
  };

  const handleSaveCustomerEdit = (e) => {
    e.preventDefault();
    if (!editingCustomer) return;
    const digits = String(editForm.mobile || '').replace(/\D/g, '');
    if (digits.length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }
    const formattedMobile = `+91 ${digits.slice(-10)}`;
    const formattedAltMobile = editForm.altMobile.trim()
      ? formatMobileNumber(editForm.altMobile.trim())
      : '';

    updateCustomer(editingCustomer.id, {
      name: editForm.name.trim() || editingCustomer.name,
      mobile: formattedMobile,
      altMobile: formattedAltMobile,
      dob: editForm.dob || '',
      panNumber: editForm.panNumber.trim().toUpperCase(),
      business: editForm.business.trim(),
      city: editForm.city.trim(),
      state: editForm.state.trim(),
      address: editForm.address.trim()
    });
    setEditingCustomer(null);
  };

  // Scoped customers for Customer Directory
  // Only actual verified/converted customers (converted from Lead -> Bank Login or added directly as Customers) appear here.
  const scopedCustomers = useMemo(() => {
    const verifiedCustomersOnly = customers.filter(
      c => c.isCustomer || (c.services && c.services.length > 0)
    );

    if (isSalesManager) {
      return verifiedCustomersOnly.filter(
        c =>
          c.submittedBy === currentUser?.id ||
          c.referenceFrom?.includes(currentUser?.name) ||
          c.assignedTo === currentUser?.id
      );
    }
    if (currentUser?.role === 'RM') {
      return verifiedCustomersOnly.filter(c => c.assignedTo === currentUser?.id);
    }
    return verifiedCustomersOnly;
  }, [customers, isSalesManager, currentUser]);

  // Deep-link support from notifications (/customers?customerId=...&mobile=...)
  const queryCustomerId = searchParams.get('customerId') || '';
  const queryMobile = (searchParams.get('mobile') || '').replace(/\D/g, '').slice(-10);

  useEffect(() => {
    if (!queryCustomerId && !queryMobile) return;
    const matched = scopedCustomers.find(c => {
      if (queryCustomerId && (c.customerId === queryCustomerId || c.id === queryCustomerId)) {
        return true;
      }
      if (queryMobile) {
        const custMob = String(c.mobile || '').replace(/\D/g, '').slice(-10);
        if (custMob && custMob === queryMobile) return true;
      }
      return false;
    });

    if (matched) {
      setSearchTerm(matched.customerId || matched.id || matched.name || '');
      setSelectedCustomer(matched);
      // Clear deep-link query params once opened so closing the modal stays cleanly on /customers
      setSearchParams({}, { replace: true });
    } else if (queryMobile || queryCustomerId) {
      setSearchTerm(queryCustomerId || queryMobile);
    }
  }, [queryCustomerId, queryMobile, scopedCustomers, setSearchParams]);

  // Filtered dataset
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return scopedCustomers;
    const q = searchTerm.toLowerCase();
    return scopedCustomers.filter(c => {
      const matchesId = (c.customerId && c.customerId.toLowerCase().includes(q)) || (c.id && c.id.toLowerCase().includes(q));
      const matchesName = c.name && c.name.toLowerCase().includes(q);
      const matchesMobile = matchesMobileSearch(c.mobile, searchTerm) || matchesMobileSearch(c.altMobile, searchTerm);
      const matchesBusiness = c.business && c.business.toLowerCase().includes(q);
      const matchesCity = c.city && c.city.toLowerCase().includes(q);
      return matchesId || matchesName || matchesMobile || matchesBusiness || matchesCity;
    });
  }, [scopedCustomers, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  const handleExport = () => {
    const data = filteredCustomers.map(c => ({
      "Customer ID": c.customerId || c.id,
      "Name": c.name,
      "Mobile Contact": formatMobileNumber(c.mobile),
      "Alt Mobile": c.altMobile ? formatMobileNumber(c.altMobile) : '-',
      "Business": c.business || '-',
      "City": c.city || '-',
      "State": c.state,
      "Customer Type": c.customerType,
      "Database": c.databaseType,
      "Source": c.source,
      "Assigned RM": `${c.assignedName} (${c.assignedTo})`,
      "KYC Docs Count": c.documents?.length || 0,
      "Service Requests Count": c.services?.length || 0,
      "Created Date": c.createdAt
    }));
    exportToCSV(data, 'rajalakshmy_customers_master.csv');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-gold-300 text-xs font-bold uppercase tracking-wider flex-wrap">
            <Users className="w-4 h-4" />
            <span>Customer Management Module</span>
            <span>•</span>
            <span>{currentUser?.name} ({currentUser?.role})</span>
            {isSalesManager && (
              <span className="bg-gold-500/20 text-gold-300 border border-gold-400/40 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                Personal Clients Only
              </span>
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            Customer Directory & Profiles
          </h2>
          
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-gold-300" />
            <span>Export CSV</span>
          </button>

          {/* Add Customer Button: Disabled/Hidden for RM role (Req: RM not able to add customer, able to add only in database menu) */}
          {currentUser?.role !== 'RM' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gold-500 hover:bg-gold-600 px-4 py-2 text-xs font-bold text-amber-950 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Total Customers Metric & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Total Customers Count Stat */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-burgundy-50 border border-burgundy-200 text-burgundy-900 shadow-sm">
            <Users className="w-6 h-6 text-burgundy-800" />
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">
              Total Customers
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {scopedCustomers.length}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Active Profiles
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer name, mobile, business, city..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-xs bg-[#FAF6EF]/30 focus:bg-white focus:outline-none focus:border-burgundy-800 transition"
          />
        </div>
      </div>

      {/* Customer Master Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 bg-[#FAF6EF] border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-burgundy-800" />
            <span>Customer Master Records</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-burgundy-100 text-burgundy-900 text-[11px] font-bold">
              Total: {scopedCustomers.length}
            </span>
            {searchTerm && (
              <span className="text-[11px] font-normal text-slate-500">
                ({filteredCustomers.length} matching)
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center w-16">Sl No</th>
                <th className="px-4 py-3">Customer ID</th>
                <th className="px-4 py-3">Customer / Enterprise</th>
                <th className="px-4 py-3">Mobile Contact</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                    No customers found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((c, idx) => {
                  const slNo = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={c.id} className="hover:bg-[#FAF6EF]/60 transition">
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-burgundy-50 border border-burgundy-200 text-burgundy-900 font-bold text-xs">
                          {slNo}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono font-bold text-burgundy-900">{c.customerId || c.id}</td>

                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{c.business || 'General Business'}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{formatMobileNumber(c.mobile)}</span>
                        {c.altMobile && (
                          <span className="text-[10px] text-slate-400 block">Alt: {formatMobileNumber(c.altMobile)}</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700">{c.city || 'Tamil Nadu'}</span>
                        <span className="text-[10px] text-slate-400 block">{c.state}</span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedCustomer(c)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-burgundy-900 text-white hover:bg-burgundy-800 transition"
                            title="View Full Profile, Documents & Service History"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          {canEditCustomer && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(c)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition"
                              title="Edit Customer Details"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
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

        {/* Pagination Footer */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredCustomers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          summaryLabel="customers"
        />
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultDatabase="old"
      />

      {/* Customer Detail & Service History Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {/* Edit Customer Profile Modal (Admin & Ops Roles) */}
      {editingCustomer && canEditCustomer && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gold-300 block">
                  {editingCustomer.customerId || editingCustomer.id} • Admin &amp; Ops Edit
                </span>
                <h3 className="text-base font-bold text-white">Edit Customer Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.mobile}
                    onChange={(e) => setEditForm(prev => ({ ...prev, mobile: e.target.value }))}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 font-mono focus:outline-none focus:border-burgundy-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alternate Mobile
                  </label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={editForm.altMobile}
                    onChange={(e) => setEditForm(prev => ({ ...prev, altMobile: e.target.value }))}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 font-mono focus:outline-none focus:border-burgundy-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) => setEditForm(prev => ({ ...prev, dob: e.target.value }))}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PAN Card Number
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                    value={editForm.panNumber}
                    onChange={(e) =>
                      setEditForm(prev => ({
                        ...prev,
                        panNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
                      }))
                    }
                    className="w-full text-xs font-mono font-bold uppercase rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business / Enterprise
                  </label>
                  <input
                    type="text"
                    value={editForm.business}
                    onChange={(e) => setEditForm(prev => ({ ...prev, business: e.target.value }))}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location / City
                  </label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Address
                </label>
                <textarea
                  rows={2}
                  value={editForm.address}
                  onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-burgundy-900 hover:bg-burgundy-800 rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4 text-gold-300" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
