import React, { useState, useMemo } from 'react';
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
  CalendarCheck
} from 'lucide-react';
import { formatDate, exportToCSV, getStatusBadgeClass } from '../utils/formatters';
import { AddCustomerModal } from '../components/customers/AddCustomerModal';
import { CustomerDetailModal } from '../components/customers/CustomerDetailModal';

export const CustomerManagementPage = () => {
  const { customers, startCallingCustomer } = useCRM();
  const { currentUser } = useAuth();

  const isSalesManager = currentUser?.role === 'Sales Manager';

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All'); // 'All' | 'known' | 'unknown'
  const [selectedState, setSelectedState] = useState('All');
  const [selectedDb, setSelectedDb] = useState('All'); // 'All' | 'old' | 'new'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Scoped customers for role
  const scopedCustomers = useMemo(() => {
    if (isSalesManager) {
      return customers.filter(
        c =>
          c.submittedBy === currentUser?.id ||
          c.referenceFrom?.includes(currentUser?.name) ||
          c.assignedTo === currentUser?.id
      );
    }
    if (currentUser?.role === 'RM') {
      return customers.filter(c => c.assignedTo === currentUser?.id);
    }
    return customers;
  }, [customers, isSalesManager, currentUser]);

  // Filtered dataset
  const filteredCustomers = useMemo(() => {
    return scopedCustomers.filter(c => {
      // Type filter
      if (selectedType !== 'All' && c.customerType !== selectedType) {
        return false;
      }

      // State filter
      if (selectedState !== 'All' && c.state !== selectedState) {
        return false;
      }

      // Database filter
      if (selectedDb !== 'All' && c.databaseType !== selectedDb) {
        return false;
      }

      // Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = c.name && c.name.toLowerCase().includes(q);
        const matchesMobile = c.mobile && c.mobile.includes(q);
        const matchesBusiness = c.business && c.business.toLowerCase().includes(q);
        const matchesCity = c.city && c.city.toLowerCase().includes(q);
        if (!matchesName && !matchesMobile && !matchesBusiness && !matchesCity) {
          return false;
        }
      }

      return true;
    });
  }, [scopedCustomers, selectedType, selectedState, selectedDb, searchTerm]);

  // Aggregate Metrics
  const knownCount = scopedCustomers.filter(c => c.customerType === 'known').length;
  const unknownCount = scopedCustomers.filter(c => c.customerType === 'unknown').length;
  const totalServicesCount = scopedCustomers.reduce((acc, c) => acc + (c.services?.length || 0), 0);
  const totalDocsCount = scopedCustomers.reduce((acc, c) => acc + (c.documents?.length || 0), 0);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  const handleExport = () => {
    const data = filteredCustomers.map(c => ({
      "Customer ID": c.id,
      "Name": c.name,
      "Mobile Contact": c.mobile,
      "Alt Mobile": c.altMobile || '-',
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
          <p className="text-xs text-white/80 max-w-xl">
            Register new customers, upload KYC verification documents, manage customer profiles, and record ongoing multi-service engagement histories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-gold-300" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gold-500 hover:bg-gold-600 px-4 py-2 text-xs font-bold text-amber-950 shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Customers</span>
          <span className="text-2xl font-black text-slate-900">{scopedCustomers.length}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Active directory accounts</span>
        </div>

        <div className="rounded-xl border border-burgundy-200 bg-burgundy-50/60 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-burgundy-800 block">Known Customers</span>
          <span className="text-2xl font-black text-burgundy-950">{knownCount}</span>
          <span className="text-[10px] text-burgundy-700 block mt-0.5">Verified enterprises</span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-amber-800 block">Unknown Leads</span>
          <span className="text-2xl font-black text-amber-950">{unknownCount}</span>
          <span className="text-[10px] text-amber-700 block mt-0.5">Field mobile contacts</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">Service History Entries</span>
          <span className="text-2xl font-black text-emerald-950">{totalServicesCount}</span>
          <span className="text-[10px] text-emerald-700 block mt-0.5">{totalDocsCount} KYC documents attached</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search input */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Search Directory</label>
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, business..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-300 py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:border-burgundy-800"
              />
            </div>
          </div>

          {/* Customer Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Classification</label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-xl border border-slate-300 py-1.5 px-3 bg-white focus:outline-none focus:border-burgundy-800"
            >
              <option value="All">All Classifications</option>
              <option value="known">Known Customers</option>
              <option value="unknown">Unknown Leads</option>
            </select>
          </div>

          {/* State Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">State / Territory</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-xl border border-slate-300 py-1.5 px-3 bg-white focus:outline-none focus:border-burgundy-800"
            >
              <option value="All">All States (Tamil Nadu & Puducherry)</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Puducherry">Puducherry</option>
            </select>
          </div>

          {/* Database Source */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Database Partition</label>
            <select
              value={selectedDb}
              onChange={(e) => {
                setSelectedDb(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-xl border border-slate-300 py-1.5 px-3 bg-white focus:outline-none focus:border-burgundy-800"
            >
              <option value="All">All Databases (Old & New)</option>
              <option value="old">Old Database</option>
              <option value="new">New Database</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Master Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 bg-[#FAF6EF] border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-burgundy-800" />
            <span>Customer Master Records ({filteredCustomers.length})</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
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
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                    No customers found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map(c => (
                  <tr key={c.id} className="hover:bg-[#FAF6EF]/60 transition">
                    <td className="px-4 py-3 font-mono font-bold text-burgundy-900">{c.id}</td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{c.business || 'General Business'}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{c.mobile}</span>
                      {c.altMobile && (
                        <span className="text-[10px] text-slate-400 block">Alt: {c.altMobile}</span>
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 bg-[#FAF6EF]/60 border-t border-slate-200 text-xs">
            <span className="text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} records
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="font-bold text-slate-800">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Customer Detail & Service History Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
};
