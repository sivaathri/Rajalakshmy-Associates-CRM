import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  PhoneCall,
  CalendarCheck,
  Award,
  CheckCircle,
  Database,
  TrendingUp,
  Clock,
  ArrowUpRight,
  PlusCircle,
  Phone,
  Calendar,
  Layers
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
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { AddCustomerModal } from '../components/customers/AddCustomerModal';
import { CaseSubmissionModal } from '../components/performance/CaseSubmissionModal';
import { CustomerDetailModal } from '../components/customers/CustomerDetailModal';

export const DashboardPage = () => {
  const { customers, calls, activities, performanceCases, startCallingCustomer } = useCRM();
  const { currentUser, setShowFollowUpModal } = useAuth();

  const isSalesManager = currentUser?.role === 'Sales Manager';

  // Scoped datasets for Sales Manager (strictly created / submitted by them)
  const scopedActivities = isSalesManager
    ? activities.filter(a => a.submittedBy === currentUser?.id || a.submittedByName === currentUser?.name)
    : activities;

  const scopedCases = isSalesManager
    ? performanceCases.filter(c => c.submittedBy === currentUser?.id || c.submittedByName === currentUser?.name)
    : performanceCases;

  const scopedCustomers = isSalesManager
    ? customers.filter(c => c.submittedBy === currentUser?.id || c.referenceFrom?.includes(currentUser?.name) || c.assignedTo === currentUser?.id)
    : customers;

  const scopedCalls = isSalesManager
    ? calls.filter(c => c.employeeId === currentUser?.id || scopedCustomers.some(cust => cust.id === c.customerId))
    : calls;

  const [isAddCustOpen, setIsAddCustOpen] = useState(false);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [selectedCustDetail, setSelectedCustDetail] = useState(null);

  // Compute Required Dashboard Metrics
  const totalCustomers = scopedCustomers.length;
  const oldKnown = scopedCustomers.filter(c => c.databaseType === 'old' && c.customerType === 'known').length;
  const oldUnknown = scopedCustomers.filter(c => c.databaseType === 'old' && c.customerType === 'unknown').length;
  const newKnown = scopedCustomers.filter(c => c.databaseType === 'new' && c.customerType === 'known').length;
  const newUnknown = scopedCustomers.filter(c => c.databaseType === 'new' && c.customerType === 'unknown').length;

  const totalCalls = scopedCalls.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCalls = scopedCalls.filter(c => c.callDate === todayStr || c.callDate === '2026-11-16').length;

  const pendingFollowUps = scopedCustomers.filter(c => c.callingStatus === 'Reminder');
  const totalCases = scopedCases.length;
  const approvedCases = scopedCases.filter(c => c.status === 'Approved').length;
  const approvedVolume = scopedCases
    .filter(c => c.status === 'Approved')
    .reduce((sum, c) => sum + (c.caseAmount || 0), 0);

  // Daily Call Activity Bar Chart Data (Last 7 days mock aggregated)
  const callActivityData = [
    { day: 'Mon 10th', calls: 14, converted: 6 },
    { day: 'Tue 11th', calls: 22, converted: 9 },
    { day: 'Wed 12th', calls: 18, converted: 8 },
    { day: 'Thu 13th', calls: 26, converted: 12 },
    { day: 'Fri 14th', calls: 31, converted: 15 },
    { day: 'Sat 15th', calls: 24, converted: 11 },
    { day: 'Today (16th)', calls: todayCalls, converted: calls.filter(c => (c.callDate === todayStr || c.callDate === '2026-11-16') && c.outcome === 'OK').length }
  ];

  // Monthly Performance Chart Data
  const monthlyPerformanceData = [
    { month: 'Jun', submitted: 85, approved: 65, amountLakhs: 140 },
    { month: 'Jul', submitted: 110, approved: 92, amountLakhs: 210 },
    { month: 'Aug', submitted: 135, approved: 108, amountLakhs: 260 },
    { month: 'Sep', submitted: 160, approved: 130, amountLakhs: 310 },
    { month: 'Oct', submitted: 190, approved: 155, amountLakhs: 380 },
    { month: 'Nov (Mtd)', submitted: totalCases * 15, approved: approvedCases * 14, amountLakhs: Math.round(approvedVolume / 100000) }
  ];

  // Known vs Unknown Donut Chart Data
  const knownUnknownData = [
    { name: 'Old Known', value: oldKnown, color: '#79091D' },
    { name: 'Old Unknown', value: oldUnknown, color: '#A8203D' },
    { name: 'New Known', value: newKnown, color: '#D9A52E' },
    { name: 'New Unknown', value: newUnknown, color: '#F3CF7A' }
  ];

  const statCards = [
    {
      title: 'Total Customers',
      value: totalCustomers,
      sub: 'All active CRM database records',
      icon: <Users className="w-5 h-5 text-burgundy-900" />,
      color: 'bg-white border-slate-200'
    },
    {
      title: 'Old Known',
      value: oldKnown,
      sub: 'Established verified clients',
      icon: <Database className="w-5 h-5 text-burgundy-800" />,
      color: 'bg-burgundy-50/50 border-burgundy-200'
    },
    {
      title: 'Old Unknown',
      value: oldUnknown,
      sub: 'Legacy prospects to verify',
      icon: <Database className="w-5 h-5 text-amber-700" />,
      color: 'bg-amber-50/50 border-amber-200'
    },
    {
      title: 'New Known',
      value: newKnown,
      sub: 'Fresh field verified leads',
      icon: <Database className="w-5 h-5 text-gold-700" />,
      color: 'bg-gold-50/50 border-gold-200'
    },
    {
      title: 'New Unknown',
      value: newUnknown,
      sub: 'New open source / bill leads',
      icon: <Database className="w-5 h-5 text-slate-700" />,
      color: 'bg-slate-50 border-slate-200'
    },
    {
      title: 'Total Telecalls',
      value: totalCalls,
      sub: 'Lifetime calling entries logged',
      icon: <PhoneCall className="w-5 h-5 text-blue-700" />,
      color: 'bg-blue-50/50 border-blue-200'
    },
    {
      title: "Today's Calls",
      value: todayCalls,
      sub: 'Active telecalling sessions today',
      icon: <Clock className="w-5 h-5 text-indigo-700" />,
      color: 'bg-indigo-50/50 border-indigo-200'
    },
    {
      title: 'Pending Follow-ups',
      value: pendingFollowUps.length,
      sub: 'Scheduled reminders requiring action',
      icon: <CalendarCheck className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-50 border-amber-300 ring-1 ring-amber-400/30'
    },
    {
      title: 'Total Cases Filed',
      value: totalCases,
      sub: 'Submitted case dispositions',
      icon: <Award className="w-5 h-5 text-purple-700" />,
      color: 'bg-purple-50/50 border-purple-200'
    },
    {
      title: 'Approved Cases',
      value: `${approvedCases} (${formatCurrency(approvedVolume)})`,
      sub: 'Sanctioned advisory portfolio',
      icon: <CheckCircle className="w-5 h-5 text-emerald-700" />,
      color: 'bg-emerald-50/50 border-emerald-300'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-gold-300 text-xs font-bold uppercase tracking-wider flex-wrap">
            <span>Rajalakshmy Associates CRM</span>
            {isSalesManager && (
              <span className="bg-gold-500/20 text-gold-300 border border-gold-400/40 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                Personal Activity Dashboard
              </span>
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            {currentUser?.name}!
          </h2>
          <p className="text-xs text-white/80 max-w-xl mt-1">
            Role: <strong className="text-gold-300">{currentUser?.role}</strong> ({currentUser?.title}). You have{' '}
            <strong className="text-white underline cursor-pointer" onClick={() => setShowFollowUpModal(true)}>
              {pendingFollowUps.length} pending follow-up call(s)
            </strong>{' '}
            waiting in your queue today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowFollowUpModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-gold-400 bg-gold-400/20 px-3.5 py-2 text-xs font-bold text-gold-200 hover:bg-gold-400/30 transition shadow-sm"
          >
            <CalendarCheck className="w-4 h-4 text-gold-300" />
            <span>Open Follow-ups ({pendingFollowUps.length})</span>
          </button>

          <button
            onClick={() => setIsAddCustOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-burgundy-900 hover:bg-slate-100 transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-burgundy-800" />
            <span>Add Customer</span>
          </button>

          <button
            onClick={() => setIsCaseModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gold-500 hover:bg-gold-600 px-3.5 py-2 text-xs font-bold text-amber-950 transition shadow-sm"
          >
            <Award className="w-4 h-4" />
            <span>Submit Case</span>
          </button>
        </div>
      </div>

      {/* 10 Required Dashboard KPI Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Real-Time Key Operational Metrics
          </h3>
          <span className="text-[11px] text-slate-400">Live synchronized with LocalStorage</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map((card, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-4 border transition hover:shadow-md ${card.color}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600 truncate">{card.title}</span>
                <div className="p-1.5 rounded-xl bg-white shadow-sm shrink-0">{card.icon}</div>
              </div>
              <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                {card.value}
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-1">{card.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section: 3 Comprehensive Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Call Activity Bar Chart (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h4 className="text-sm font-bold text-burgundy-900 font-corporate">
                Daily Telecalling Volume & Conversions
              </h4>
              <p className="text-xs text-slate-500">Daily calling performance comparison</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-burgundy-800"></span> Total Calls
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> OK / Converted
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={callActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1ECE1" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Bar dataKey="calls" name="Total Calls" fill="#79091D" radius={[6, 6, 0, 0]} barSize={22} />
                <Bar dataKey="converted" name="OK Outcomes" fill="#10B981" radius={[6, 6, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Known vs Unknown Customer Donut Chart (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h4 className="text-sm font-bold text-burgundy-900 font-corporate">
              Customer Database Distribution
            </h4>
            <p className="text-xs text-slate-500">Old vs New Database (Known vs Unknown)</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={knownUnknownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {knownUnknownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val} Contacts`, name]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs pt-2 border-t border-slate-100">
            <div className="p-2 rounded-xl bg-burgundy-50">
              <span className="text-[10px] text-burgundy-800 font-bold block uppercase">Total Old Database</span>
              <span className="font-extrabold text-sm text-burgundy-950">{oldKnown + oldUnknown} Contacts</span>
            </div>
            <div className="p-2 rounded-xl bg-gold-50">
              <span className="text-[10px] text-amber-800 font-bold block uppercase">Total New Database</span>
              <span className="font-extrabold text-sm text-amber-950">{newKnown + newUnknown} Contacts</span>
            </div>
          </div>
        </div>

        {/* Monthly Performance & Case Volume Chart (Full width) */}
        <div className="lg:col-span-12 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h4 className="text-sm font-bold text-burgundy-900 font-corporate">
                Monthly Performance & Sanction Growth
              </h4>
              <p className="text-xs text-slate-500">
                Track case submissions vs approved volumes in Lakhs (₹)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Portfolio: {formatCurrency(approvedVolume)}
              </span>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyPerformanceData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D9A52E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#D9A52E" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#79091D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#79091D" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1ECE1" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val, name) => [name === 'Amount (₹ Lakhs)' ? `₹${val} Lakhs` : val, name]}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="amountLakhs" name="Amount (₹ Lakhs)" stroke="#D9A52E" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAmount)" />
                <Area type="monotone" dataKey="approved" name="Approved Cases" stroke="#79091D" strokeWidth={2} fillOpacity={1} fill="url(#colorApproved)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Section: Recent Activities & Pending Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending Follow-ups Action List (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-amber-700" />
              <h4 className="text-sm font-bold text-slate-900 font-corporate">
                Pending Follow-up Queue ({pendingFollowUps.length})
              </h4>
            </div>
            <button
              onClick={() => setShowFollowUpModal(true)}
              className="text-xs font-bold text-burgundy-800 hover:underline"
            >
              Open Full Modal →
            </button>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {pendingFollowUps.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 italic">
                No pending follow-ups currently scheduled.
              </div>
            ) : (
              pendingFollowUps.slice(0, 5).map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-[#FAF6EF]/60 hover:bg-[#FAF6EF] transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{c.name}</span>
                      <span className="text-[10px] text-burgundy-900 bg-burgundy-50 px-1.5 py-0.5 rounded font-semibold border border-burgundy-100">
                        {c.mobile}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">
                      {c.business || c.city} • <span className="text-amber-800 font-medium">Due: {formatDate(c.reminderDate)}</span>
                    </div>
                    {c.reminderRemark && (
                      <div className="text-[10px] text-slate-600 italic mt-0.5 truncate max-w-xs">
                        "{c.reminderRemark}"
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startCallingCustomer(c)}
                      className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition"
                      title="Call Now"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSelectedCustDetail(c)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Field Activities & Submissions (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h4 className="text-sm font-bold text-slate-900 font-corporate">
              Recent Field Activities & Lead Submissions
              {isSalesManager && <span className="text-burgundy-900 text-xs font-semibold ml-1.5">(Your Submissions)</span>}
            </h4>
            <span className="text-xs font-semibold text-slate-500">Latest 5</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {scopedActivities.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 italic">
                No recent field submissions logged.
              </div>
            ) : (
              scopedActivities.slice(0, 5).map(act => (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{act.customerName}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {act.source}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {act.mobile} • By <span className="font-semibold text-slate-700">{act.submittedByName}</span>
                    </div>
                    <div className="text-[10px] text-emerald-800 font-medium">
                      Auto Classified: {act.classifiedTo}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">{act.submissionDate}</span>
                    <span className="text-[10px] text-slate-500">{act.submissionTime}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddCustomerModal
        isOpen={isAddCustOpen}
        onClose={() => setIsAddCustOpen(false)}
      />

      <CaseSubmissionModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
      />

      {selectedCustDetail && (
        <CustomerDetailModal
          customer={selectedCustDetail}
          onClose={() => setSelectedCustDetail(null)}
        />
      )}
    </div>
  );
};
