import React, { useState, useMemo, useEffect } from 'react';
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
import { formatDate, getStatusBadgeClass, exportToCSV, formatMobileNumber, matchesMobileSearch } from '../utils/formatters';
import { CustomerDetailModal } from '../components/customers/CustomerDetailModal';
import { AddDatabaseRecordModal } from '../components/database/AddDatabaseRecordModal';
import { Pagination } from '../components/common/Pagination';

export const CustomerDatabasePage = () => {
  const { dbType = 'old', custType = 'known' } = useParams();
  const { customers } = useCRM();
  const { currentUser } = useAuth();

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCallingStatus, setSelectedCallingStatus] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedState, selectedCallingStatus, selectedSource, dbType, custType]);

  // Modals
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Normalize route params
  const normalizedDb = dbType.toLowerCase(); // 'old' or 'new'
  const normalizedType = custType.toLowerCase(); // 'known' or 'unknown'

  // Titles
  const sectionTitle = `${normalizedDb === 'old' ? 'Old Database' : 'New Database'} – ${normalizedType === 'known' ? 'Known Numbers' : 'Unknown Numbers'}`;

  // Filter dataset
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // 1. Database and Type match
      if (c.databaseType !== normalizedDb || c.customerType !== normalizedType) {
        return false;
      }

      // 2. Role restriction:
      // In New Database: RM has full visibility to all prospect records added by Sales Manager from daily activities
      // In Old Database: RM sees records assigned to them
      if (currentUser?.role === 'RM') {
        const isOpenShared = c.callingStatus === 'Not Attend' || c.callingStatus === 'No Need';
        const isFresh = (c.callingStatus === 'Pending' || !c.callingStatus) && (!c.assignedTo || c.assignedTo === currentUser.id);
        const isMine = c.assignedTo === currentUser.id || c.actionedBy === currentUser.id;
        if (!isFresh && !isMine && !isOpenShared) {
          return false;
        }
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
        const matchesMobile = matchesMobileSearch(c.mobile, searchTerm);
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

      return true;
    });
  }, [customers, normalizedDb, normalizedType, currentUser, searchTerm, selectedState, selectedCallingStatus, selectedSource]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  const handleExport = () => {
    const exportData = filteredCustomers.map((c, idx) => ({
      "Sl No": idx + 1,
      "Mobile Number": formatMobileNumber(c.mobile),
      "Contact Name": c.name || '-',
      "Business": c.business || '-',
      "State": c.state,
      "City": c.city,
      "Database Type": c.databaseType,
      "Type": c.customerType,
      "Source": c.source,
      "Assigned RM": c.assignedName || '-',
      "Calling Status": c.callingStatus,
      "Last Call Date": c.lastCallDate || '-',
      "Reminder Date": c.reminderDate || '-'
    }));
    exportToCSV(exportData, `${normalizedDb}_${normalizedType}_database_records.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-burgundy-900 flex-wrap">
            <Database className="w-4 h-4 text-gold-600" />
            <span>Database Partition</span>
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
         
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 text-white px-3.5 py-2 text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            <span>Add Record</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
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
              placeholder="Search by contact name, mobile number, business..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800"
            />
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

        {(searchTerm || selectedSource !== 'All') && (
          <div className="flex justify-end pt-2 border-t border-slate-100 text-xs">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSource('All');
                setCurrentPage(1);
              }}
              className="text-xs text-burgundy-800 font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
            <thead className="bg-[#FAF6EF] text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center w-16">Sl No</th>
                {normalizedType === 'known' ? (
                  <>
                    <th className="px-4 py-3">Contact Name</th>
                    <th className="px-4 py-3">Mobile Contact</th>
                    <th className="px-4 py-3">Business</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3">Mobile Contact</th>
                    <th className="px-4 py-3">Business Descriptor</th>
                  </>
                )}
                <th className="px-4 py-3">Calling Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={normalizedType === 'known' ? 6 : 4} className="text-center py-12 text-slate-400">
                    No database records found matching the active filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((cust, idx) => {
                  const slNo = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={cust.id} className="hover:bg-[#FAF6EF]/60 transition">
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-burgundy-50 border border-burgundy-200 text-burgundy-900 font-bold text-xs">
                          {slNo}
                        </span>
                      </td>

                    {normalizedType === 'known' ? (
                      <>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {cust.name}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium">
                          {formatMobileNumber(cust.mobile)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {cust.business || 'General Client'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {formatMobileNumber(cust.mobile)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {cust.business || 'Unverified Lead'}
                        </td>
                      </>
                    )}

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(cust.callingStatus)}`}>
                        {cust.callingStatus || 'Pending'}
                      </span>
                      {cust.callingStatus === 'Reminder' && cust.reminderDate && (
                        <span className="block text-[10px] text-amber-800 font-semibold mt-0.5">
                          Due: {formatDate(cust.reminderDate)}
                        </span>
                      )}
                      {cust.callingStatus === 'Field Visit' && cust.reminderDate && (
                        <span className="block text-[10px] text-purple-800 font-semibold mt-0.5">
                          Visit: {formatDate(cust.reminderDate)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
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
                );
              })
            )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredCustomers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          summaryLabel="database records"
        />
      </div>

      {/* Modals */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {/* Add Database Record Modal (Req 3: RM able to add in Old and New database) */}
      <AddDatabaseRecordModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultDatabase={normalizedDb}
        defaultType={normalizedType}
      />
    </div>
  );
};
