import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  Users,
  PhoneCall,
  CalendarCheck,
  Award,
  TrendingUp,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { formatCurrency, formatDate, exportToCSV } from '../utils/formatters';

export const ReportsPage = () => {
  const { customers, calls, activities, performanceCases, employees } = useCRM();
  const { currentUser } = useAuth();

  // Filters
  const [datePreset, setDatePreset] = useState('this-month'); // 'today' | 'this-week' | 'this-month' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // 1. Database breakdown
  const oldKnown = customers.filter(c => c.databaseType === 'old' && c.customerType === 'known').length;
  const oldUnknown = customers.filter(c => c.databaseType === 'old' && c.customerType === 'unknown').length;
  const newKnown = customers.filter(c => c.databaseType === 'new' && c.customerType === 'known').length;
  const newUnknown = customers.filter(c => c.databaseType === 'new' && c.customerType === 'unknown').length;

  // 2. Source-wise submissions
  const billsCount = customers.filter(c => c.source === 'Bills').length;
  const openSourceCount = customers.filter(c => c.source === 'Open Source').length;
  const referenceCount = customers.filter(c => c.source === 'Reference').length;

  const sourceChartData = [
    { name: '1. Bills', count: billsCount, fill: '#79091D' },
    { name: '2. Open Source', count: openSourceCount, fill: '#D9A52E' },
    { name: '3. Reference', count: referenceCount, fill: '#3B82F6' }
  ];

  // 3. Employee-wise breakdown
  const employeePerformanceReport = useMemo(() => {
    return employees.map(emp => {
      const empCalls = calls.filter(c => c.employeeId === emp.id);
      const empActivities = activities.filter(a => a.submittedBy === emp.id);
      const empCases = performanceCases.filter(c => c.submittedBy === emp.id);
      const approvedCases = empCases.filter(c => c.status === 'Approved');
      const approvedAmount = approvedCases.reduce((sum, c) => sum + (c.caseAmount || 0), 0);

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        department: emp.department,
        totalCalls: empCalls.length,
        okCalls: empCalls.filter(c => c.outcome === 'OK').length,
        activitiesCount: empActivities.length,
        casesSubmitted: empCases.length,
        casesApproved: approvedCases.length,
        approvedAmount
      };
    }).sort((a, b) => b.approvedAmount - a.approvedAmount);
  }, [employees, calls, activities, performanceCases]);

  // Top 6 performers for Chart
  const topPerformersChart = employeePerformanceReport
    .filter(e => e.approvedAmount > 0 || e.totalCalls > 0)
    .slice(0, 6)
    .map(e => ({
      name: e.name.split(' ')[0],
      amountLakhs: Math.round(e.approvedAmount / 100000),
      calls: e.totalCalls
    }));

  const handleExportFullReport = () => {
    const data = employeePerformanceReport.map(e => ({
      "Employee ID": e.id,
      "Name": e.name,
      "Role": e.role,
      "Department": e.department,
      "Total Calls": e.totalCalls,
      "OK Outcomes": e.okCalls,
      "Daily Activities Sourced": e.activitiesCount,
      "Cases Filed": e.casesSubmitted,
      "Cases Approved": e.casesApproved,
      "Sanctioned Volume (₹)": e.approvedAmount
    }));
    exportToCSV(data, 'rajalakshmy_comprehensive_crm_report.csv');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-gold-300 text-xs font-bold uppercase tracking-wider">
            <BarChart3 className="w-4 h-4" />
            <span>Corporate Executive Intelligence</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            CRM Reports & Performance Analytics
          </h2>
          <p className="text-xs text-white/80 max-w-xl">
            Detailed employee calling productivity, field lead source attribution, database composition, and case sanction leaderboards.
          </p>
        </div>

        <button
          onClick={handleExportFullReport}
          className="flex items-center gap-2 rounded-xl bg-gold-500 hover:bg-gold-600 px-5 py-2.5 text-xs font-bold text-amber-950 shadow-md transition self-start md:self-center"
        >
          <Download className="w-4 h-4" />
          <span>Export Master CSV Report</span>
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Timeframe:</span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'this-week', label: 'This Week' },
            { id: 'this-month', label: 'This Month' },
            { id: 'custom', label: 'Custom Date Range' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setDatePreset(p.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                datePreset === p.id
                  ? 'bg-burgundy-900 text-white border-burgundy-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-slate-300 py-1 px-2"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-slate-300 py-1 px-2"
            />
          </div>
        )}
      </div>

      {/* Grid: Database Split & Source Attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Database Split Matrix (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 font-corporate">
              Database Composition (Old vs New & Known vs Unknown)
            </h4>
            <p className="text-xs text-slate-500">Live counts across all 4 customer database partitions</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border border-burgundy-200 bg-burgundy-50/40">
              <span className="text-[10px] font-bold uppercase text-burgundy-900 block">Old Known Customers</span>
              <span className="text-2xl font-black text-burgundy-950">{oldKnown}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Established KYC accounts</span>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40">
              <span className="text-[10px] font-bold uppercase text-amber-900 block">Old Unknown Customers</span>
              <span className="text-2xl font-black text-amber-950">{oldUnknown}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Unverified legacy contacts</span>
            </div>

            <div className="p-4 rounded-xl border border-gold-300 bg-gold-50/40">
              <span className="text-[10px] font-bold uppercase text-amber-950 block">New Known Customers</span>
              <span className="text-2xl font-black text-amber-950">{newKnown}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Fresh field verified leads</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] font-bold uppercase text-slate-600 block">New Unknown Customers</span>
              <span className="text-2xl font-black text-slate-900">{newUnknown}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Bulk Excel & open intake</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF6EF] border border-[#E8E1D5] text-xs">
            <span className="font-bold text-slate-700">Total System Customers:</span>
            <span className="font-black text-burgundy-900 text-base">{customers.length} Contacts</span>
          </div>
        </div>

        {/* Source-wise Submissions Bar Chart (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 font-corporate">
              Source-wise Lead Distribution
            </h4>
            <p className="text-xs text-slate-500">Intake volume by Bills, Open Source, and Reference</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1ECE1" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val} Contacts`, 'Total']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
                  {sourceChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-100">
            <span className="text-burgundy-900 font-bold">Bills: {billsCount}</span>
            <span className="text-amber-800 font-bold">Open Source: {openSourceCount}</span>
            <span className="text-blue-800 font-bold">Reference: {referenceCount}</span>
          </div>
        </div>
      </div>

      {/* Employee Productivity & Case Approval Leaderboard */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#FAF6EF] border-b border-slate-200">
          <div>
            <h4 className="text-sm font-bold text-burgundy-900 font-corporate">
              Employee Performance & Case Approval Leaderboard (20 Personnel)
            </h4>
            <p className="text-xs text-slate-500">
              Comprehensive report detailing telecalls made, field activities sourced, and sanctioned case portfolio.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">Ranked by Sanctioned Volume</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Rank / ID</th>
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">Role & Department</th>
                <th className="px-4 py-3 text-center">Total Calls</th>
                <th className="px-4 py-3 text-center">OK Outcomes</th>
                <th className="px-4 py-3 text-center">Field Activities</th>
                <th className="px-4 py-3 text-center">Cases Approved / Filed</th>
                <th className="px-4 py-3 text-right">Approved Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employeePerformanceReport.map((emp, idx) => (
                <tr key={emp.id} className="hover:bg-[#FAF6EF]/60 transition">
                  <td className="px-4 py-3 font-mono font-bold text-burgundy-900">
                    #{idx + 1} <span className="text-slate-400 font-normal">({emp.id})</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">{emp.name}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800">{emp.role}</span>
                    <span className="text-[10px] text-slate-400 block">{emp.department}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-900">{emp.totalCalls}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {emp.okCalls}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700">{emp.activitiesCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-emerald-800">{emp.casesApproved}</span>
                    <span className="text-slate-400"> / {emp.casesSubmitted}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-sm text-slate-900">
                    {formatCurrency(emp.approvedAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
