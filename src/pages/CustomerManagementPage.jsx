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
    if (!searchTerm.trim()) return scopedCustomers;
    const q = searchTerm.toLowerCase();
    return scopedCustomers.filter(c => {
      const matchesName = c.name && c.name.toLowerCase().includes(q);
      const matchesMobile = c.mobile && c.mobile.includes(q);
      const matchesBusiness = c.business && c.business.toLowerCase().includes(q);
      const matchesCity = c.city && c.city.toLowerCase().includes(q);
      return matchesName || matchesMobile || matchesBusiness || matchesCity;
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
                  );
                })
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
