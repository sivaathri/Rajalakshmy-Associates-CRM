import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Filter,
  Download,
  Plus,
  PhoneCall,
  Eye,
  Database,
  Calendar,
  MapPin,
  Tag,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { formatDate, getStatusBadgeClass, exportToCSV } from '../utils/formatters';
import { CustomerDetailModal } from '../components/customers/CustomerDetailModal';
import { AddCustomerModal } from '../components/customers/AddCustomerModal';

export const CustomerDatabasePage = () => {
  const { dbType = 'old', custType = 'known' } = useParams();
  const { customers, startCallingCustomer } = useCRM();
  const { currentUser } = useAuth();

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCallingStatus, setSelectedCallingStatus] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Normalize route params
  const normalizedDb = dbType.toLowerCase(); // 'old' or 'new'
  const normalizedType = custType.toLowerCase(); // 'known' or 'unknown'

  // Titles
  const sectionTitle = `${normalizedDb === 'old' ? 'Old Database' : 'New Database'} – ${normalizedType === 'known' ? 'Known Customers' : 'Unknown Leads'}`;

  // Filter dataset
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // 1. Database and Type match
      if (c.databaseType !== normalizedDb || c.customerType !== normalizedType) {
        return false;
      }

      // 2. Role restriction: RM only sees assigned customers
      if (currentUser?.role === 'RM' && c.assignedTo !== currentUser.id) {
        return false;
      }

      // Role restriction: Sales Manager only sees their own created/submitted or assigned records
      if (
        currentUser?.role === 'Sales Manager' &&
        c.submittedBy !== currentUser.id &&
        !c.referenceFrom?.includes(currentUser.name) &&
        c.assignedTo !== currentUser.id
      ) {
        return false;
      }

      // 3. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = c.name && c.name.toLowerCase().includes(q);
        const matchesMobile = c.mobile && c.mobile.includes(q);
        const matchesBusiness = c.business && c.business.toLowerCase().includes(q);
        if (!matchesName && !matchesMobile && !matchesBusiness) return false;
      }

      // 4. State filter
      if (selectedState !== 'All' && c.state !== selectedState) {
        return false;
      }

      // 5. Calling status filter
      if (selectedCallingStatus !== 'All' && c.callingStatus !== selectedCallingStatus) {
        return false;
      }

      // 6. Source filter
      if (selectedSource !== 'All' && c.source !== selectedSource) {
        return false;
      }

      // 7. Date filter
      if (dateFilter && c.createdAt !== dateFilter) {
        return false;
      }

      return true;
    });
  }, [customers, normalizedDb, normalizedType, currentUser, searchTerm, selectedState, selectedCallingStatus, selectedSource, dateFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  const handleExport = () => {
    const exportData = filteredCustomers.map(c => ({
      "Customer ID": c.id,
      "Name": c.name,
      "Mobile Number": c.mobile,
      "Business": c.business,
      "State": c.state,
      "City": c.city,
      "Database Type": c.databaseType,
      "Customer Type": c.customerType,
      "Source": c.source,
      "Assigned RM": c.assignedName,
      "Calling Status": c.callingStatus,
      "Last Call Date": c.lastCallDate,
      "Reminder Date": c.reminderDate
    }));
    exportToCSV(exportData, `${normalizedDb}_${normalizedType}_customers.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-burgundy-900 flex-wrap">
            <Database className="w-4 h-4 text-gold-600" />
            <span>Customer Directory Module</span>
            <span>•</span>
            <span className="text-slate-500 font-mono">Total {filteredCustomers.length} Records</span>
            {currentUser?.role === 'Sales Manager' && (
              <span className="text-[10px] bg-gold-100 text-amber-900 border border-gold-300 px-2 py-0.5 rounded-full font-bold">
                Created / Sourced by {currentUser?.name}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1 font-corporate">
            {sectionTitle}
          </h2>
          <p className="text-xs text-slate-500 max-w-xl">
            {normalizedType === 'known'
              ? 'Complete profiles with proprietor names, registered enterprise details, KYC documents, and service histories.'
              : 'Direct mobile phone leads extracted from field activities and billing sources awaiting business qualification.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-burgundy-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-burgundy-800 transition"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Universal Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, mobile, business..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800"
            />
          </div>

          {/* State Filter */}
          <div>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 bg-white"
            >
              <option value="All">All States (TN & PY)</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Puducherry">Puducherry</option>
            </select>
          </div>

          {/* Calling Status Filter */}
          <div>
            <select
              value={selectedCallingStatus}
              onChange={(e) => {
                setSelectedCallingStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 bg-white"
            >
              <option value="All">All Calling Statuses</option>
              <option value="OK">OK (Interested)</option>
              <option value="Not Attend">Not Attend</option>
              <option value="No Need">No Need</option>
              <option value="Reminder">Reminder (Follow-up)</option>
              <option value="Pending">Pending (Not Called)</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <select
              value={selectedSource}
              onChange={(e) => {
                setSelectedSource(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 bg-white"
            >
              <option value="All">All Sources</option>
              <option value="Bills">Bills</option>
              <option value="Open Source">Open Source</option>
              <option value="Reference">Reference</option>
            </select>
          </div>
        </div>

        {/* Date Filter & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Filter by Creation Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs rounded-lg border border-slate-300 py-1 px-2 focus:outline-none focus:border-burgundy-800 bg-white"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-rose-600 hover:underline font-semibold"
              >
                Clear Date
              </button>
            )}
          </div>

          {(searchTerm || selectedState !== 'All' || selectedCallingStatus !== 'All' || selectedSource !== 'All' || dateFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedState('All');
                setSelectedCallingStatus('All');
                setSelectedSource('All');
                setDateFilter('');
                setCurrentPage(1);
              }}
              className="text-xs text-burgundy-800 font-bold hover:underline"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
            <thead className="bg-[#FAF6EF] text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Customer ID</th>
                {normalizedType === 'known' ? (
                  <>
                    <th className="px-4 py-3">Customer / Firm Name</th>
                    <th className="px-4 py-3">Mobile Contact</th>
                    <th className="px-4 py-3">Business / Occupation</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3">Mobile Contact</th>
                    <th className="px-4 py-3">Business Descriptor</th>
                  </>
                )}
                <th className="px-4 py-3">State / City</th>
                <th className="px-4 py-3">Assigned RM</th>
                <th className="px-4 py-3">Calling Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={normalizedType === 'known' ? 8 : 6} className="text-center py-12 text-slate-400">
                    No customer records found matching the active filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((cust) => (
                  <tr key={cust.id} className="hover:bg-[#FAF6EF]/60 transition">
                    <td className="px-4 py-3 font-mono font-bold text-burgundy-900">
                      {cust.id}
                    </td>

                    {normalizedType === 'known' ? (
                      <>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {cust.name}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium">
                          {cust.mobile}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {cust.business || 'General Client'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {cust.mobile}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {cust.business || 'Unverified Lead'}
                        </td>
                      </>
                    )}

                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{cust.city || cust.state}</span>
                      <span className="text-[10px] text-slate-400 block">{cust.state}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{cust.assignedName}</span>
                      <span className="text-[10px] font-mono text-slate-400 block">{cust.assignedTo}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(cust.callingStatus)}`}>
                        {cust.callingStatus || 'Pending'}
                      </span>
                      {cust.callingStatus === 'Reminder' && cust.reminderDate && (
                        <span className="block text-[10px] text-amber-800 font-semibold mt-0.5">
                          Due: {formatDate(cust.reminderDate)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startCallingCustomer(cust)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition"
                          title="Call Customer Now"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Call</span>
                        </button>

                        <button
                          onClick={() => setSelectedCustomer(cust)}
                          className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition"
                          title="View KYC & Service Details"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
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

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#FAF6EF]/50 border-t border-slate-200 text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredCustomers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredCustomers.length)}</span> of <span className="font-bold text-slate-900">{filteredCustomers.length}</span> records
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultDatabase={normalizedDb}
        defaultType={normalizedType}
      />
    </div>
  );
};
