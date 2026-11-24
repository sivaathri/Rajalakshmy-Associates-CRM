import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  CalendarCheck,
  FileSpreadsheet,
  PlusCircle,
  BarChart2,
  Users,
  Download,
  Filter,
  CheckCircle,
  Tag,
  Building,
  Layers
} from 'lucide-react';
import { DailyActivityForm } from '../components/dailyActivities/DailyActivityForm';
import { ExcelBulkUploader } from '../components/dailyActivities/ExcelBulkUploader';
import { formatDate, exportToCSV } from '../utils/formatters';

export const DailyActivitiesPage = () => {
  const { activities, employees } = useCRM();
  const { currentUser } = useAuth();

  const isSalesManager = currentUser?.role === 'Sales Manager';

  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'excel' | 'reports'

  // Reports Filter state
  const [selectedEmp, setSelectedEmp] = useState(isSalesManager ? (currentUser?.id || 'EMP005') : 'All');
  const [dateFilterMode, setDateFilterMode] = useState('today'); // 'today' | 'month' | 'range' | 'all'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSource, setSelectedSource] = useState('All');

  // Base activities scoped by role (Sales Manager only sees their own created/submitted data)
  const baseActivities = useMemo(() => {
    if (isSalesManager) {
      return activities.filter(
        act => act.submittedBy === currentUser?.id || act.submittedByName === currentUser?.name
      );
    }
    return activities;
  }, [activities, isSalesManager, currentUser]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    const todayStr = '2026-11-16'; // Local system current date

    return baseActivities.filter(act => {
      // Employee filter (for non-Sales Manager)
      if (!isSalesManager && selectedEmp !== 'All' && act.submittedBy !== selectedEmp) {
        return false;
      }

      // Source filter
      if (selectedSource !== 'All' && act.source !== selectedSource) {
        return false;
      }

      // Date filter mode
      if (dateFilterMode === 'today') {
        if (act.submissionDate !== todayStr && act.submissionDate !== new Date().toISOString().split('T')[0]) {
          return false;
        }
      } else if (dateFilterMode === 'month') {
        if (!act.submissionDate.startsWith('2026-11')) return false;
      } else if (dateFilterMode === 'range') {
        if (startDate && act.submissionDate < startDate) return false;
        if (endDate && act.submissionDate > endDate) return false;
      }

      return true;
    });
  }, [baseActivities, isSalesManager, selectedEmp, selectedSource, dateFilterMode, startDate, endDate]);

  // Aggregate Metrics (Scoped to user if Sales Manager)
  const todayRecordsCount = baseActivities.filter(
    a => a.submissionDate === '2026-11-16' || a.submissionDate === new Date().toISOString().split('T')[0]
  ).length;

  const monthlyRecordsCount = baseActivities.filter(
    a => a.submissionDate.startsWith('2026-11')
  ).length;

  const sourceCounts = {
    Bills: filteredActivities.filter(a => a.source === 'Bills').length,
    OpenSource: filteredActivities.filter(a => a.source === 'Open Source').length,
    Reference: filteredActivities.filter(a => a.source === 'Reference').length
  };

  const handleExport = () => {
    const data = filteredActivities.map(a => ({
      "Activity ID": a.id,
      "Customer Name": a.customerName,
      "Mobile Contact": a.mobile,
      "Business": a.business,
      "Customer Type": a.customerType,
      "State": a.state,
      "Source": a.source,
      "Reference From": a.referenceFrom || '-',
      "Submitted By": `${a.submittedByName} (${a.submittedBy})`,
      "Date": formatDate(a.submissionDate),
      "Time": a.submissionTime,
      "Classified To": a.classifiedTo
    }));
    exportToCSV(data, 'rajalakshmy_daily_field_activities.csv');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-gold-300 text-xs font-bold uppercase tracking-wider flex-wrap">
            <CalendarCheck className="w-4 h-4" />
            <span>Field Sales Lead Intake</span>
            <span>•</span>
            <span>{currentUser?.name} ({currentUser?.role})</span>
            {isSalesManager && (
              <span className="bg-gold-500/20 text-gold-300 border border-gold-400/40 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                Personal Submissions Only
              </span>
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            Daily Field Activities & Lead Ingestion
          </h2>
          <p className="text-xs text-white/80 max-w-xl">
            {isSalesManager
              ? `Displaying field sales records created and submitted exclusively by ${currentUser?.name}. Entries from other representatives are filtered out.`
              : 'Register single prospect leads from field visits or upload bulk Excel spreadsheets. All entries automatically categorize into New Database.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-1.5 text-center">
            <span className="text-[10px] text-white/60 block uppercase font-bold">Entered Today</span>
            <span className="text-sm font-extrabold text-emerald-300">{todayRecordsCount}</span>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-1.5 text-center">
            <span className="text-[10px] text-white/60 block uppercase font-bold">Entered This Month</span>
            <span className="text-sm font-extrabold text-gold-300">{monthlyRecordsCount}</span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl px-2 sm:px-4 text-xs font-bold shadow-sm overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('form')}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'form'
              ? 'border-burgundy-800 text-burgundy-900 bg-[#FAF6EF]/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-burgundy-800" />
          <span>Single Field Entry Form</span>
        </button>

        <button
          onClick={() => setActiveTab('excel')}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'excel'
              ? 'border-burgundy-800 text-burgundy-900 bg-[#FAF6EF]/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Excel Bulk Upload (.xlsx / .xls)</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'border-burgundy-800 text-burgundy-900 bg-[#FAF6EF]/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4 text-blue-600" />
          <span>Activity Reports & Logs ({filteredActivities.length})</span>
        </button>
      </div>

      {/* TAB 1: FORM */}
      {activeTab === 'form' && (
        <DailyActivityForm />
      )}

      {/* TAB 2: EXCEL BULK UPLOAD */}
      {activeTab === 'excel' && (
        <ExcelBulkUploader />
      )}

      {/* TAB 3: REPORTS & AUDIT LOGS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Records (Filtered)</span>
              <span className="text-2xl font-black text-slate-900">{filteredActivities.length}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Leads submitted</span>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-blue-800 block">Source: 1. Bills</span>
              <span className="text-2xl font-black text-blue-900">{sourceCounts.Bills}</span>
              <span className="text-[10px] text-blue-700 block mt-0.5">Retail invoices</span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Source: 2. Open Source</span>
              <span className="text-2xl font-black text-amber-900">{sourceCounts.OpenSource}</span>
              <span className="text-[10px] text-amber-700 block mt-0.5">Market walk-ins</span>
            </div>

            <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-purple-800 block">Source: 3. Reference</span>
              <span className="text-2xl font-black text-purple-900">{sourceCounts.Reference}</span>
              <span className="text-[10px] text-purple-700 block mt-0.5">Referred clients</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Employee Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Filter by Submitting Employee</label>
                {isSalesManager ? (
                  <div className="w-full text-xs rounded-xl border border-gold-300 bg-gold-50/70 py-2 px-3 text-slate-800 font-bold flex items-center justify-between">
                    <span className="truncate">{currentUser?.name} ({currentUser?.id})</span>
                    <span className="text-[10px] text-burgundy-900 bg-white/80 px-2 py-0.5 rounded-full border border-burgundy-200 shrink-0 font-extrabold">
                      Only My Entries
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedEmp}
                    onChange={(e) => setSelectedEmp(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white"
                  >
                    <option value="All">All Field Representatives</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.id} - {emp.role})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Time Period Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Time Period</label>
                <select
                  value={dateFilterMode}
                  onChange={(e) => setDateFilterMode(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white"
                >
                  <option value="today">Today's Records</option>
                  <option value="month">This Month (November 2026)</option>
                  <option value="range">Custom Date Range</option>
                  <option value="all">All Lifetime Submissions</option>
                </select>
              </div>

              {/* Source Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Source Filter</label>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white"
                >
                  <option value="All">All Sources</option>
                  <option value="Bills">Bills</option>
                  <option value="Open Source">Open Source</option>
                  <option value="Reference">Reference</option>
                </select>
              </div>

              {/* Action Button */}
              <div className="flex items-end">
                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-burgundy-900 px-4 py-2 text-xs font-bold text-white hover:bg-burgundy-800 transition"
                >
                  <Download className="w-3.5 h-3.5 text-gold-300" />
                  <span>Export Report CSV</span>
                </button>
              </div>
            </div>

            {/* Custom Date Range Row */}
            {dateFilterMode === 'range' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-1.5 px-3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-1.5 px-3"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Activities Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-[#FAF6EF] border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>
                Field Sales Submission Records ({filteredActivities.length})
                {isSalesManager && <span className="text-burgundy-900 font-semibold ml-1.5">• Sourced by {currentUser?.name}</span>}
              </span>
              {isSalesManager && (
                <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Sales Manager Private View
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[760px]">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Mobile Contact</th>
                    <th className="px-4 py-3">Business</th>
                    <th className="px-4 py-3">Source & Reference</th>
                    <th className="px-4 py-3">Submitted By</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Database Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredActivities.map(act => (
                    <tr key={act.id} className="hover:bg-[#FAF6EF]/60 transition">
                      <td className="px-4 py-3 font-mono font-bold text-burgundy-900">{act.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{act.customerName}</td>
                      <td className="px-4 py-3 font-mono font-medium">{act.mobile}</td>
                      <td className="px-4 py-3">{act.business || 'General Client'}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{act.source}</span>
                        {act.referenceFrom && (
                          <span className="text-[10px] text-amber-900 block font-medium">
                            Ref: {act.referenceFrom}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{act.submittedByName}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{act.submittedBy}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{formatDate(act.submissionDate)}</span>
                        <span className="text-[10px] text-slate-500 block">{act.submissionTime}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {act.classifiedTo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
