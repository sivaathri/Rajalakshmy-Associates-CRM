import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Layers,
  XCircle,
  Filter,
  RotateCcw,
  Activity
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
import { formatCurrency, formatDate, getStatusBadgeClass, formatMobileNumber } from '../utils/formatters';
import { CaseSubmissionModal } from '../components/performance/CaseSubmissionModal';
import { CustomerDetailModal } from '../components/customers/CustomerDetailModal';

export const DashboardPage = () => {
  const { customers, calls, activities, performanceCases, bankLogins = [] } = useCRM();
  const { currentUser, setShowFollowUpModal, showToast } = useAuth();
  const navigate = useNavigate();

  const isRM = currentUser?.role === 'RM';
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
    : (isRM
        ? calls.filter(c => (currentUser?.id && c.employeeId === currentUser.id) || (currentUser?.name && c.employeeName === currentUser.name))
        : calls);

  // Scoped Bank Logins for RM & Sales Manager (strictly their assigned, created, or submitted bank files)
  const scopedBankLogins = (isRM || isSalesManager)
    ? (bankLogins || []).filter(b => {
        const matchId = (
          (b.assignedRMId && b.assignedRMId === currentUser?.id) ||
          (b.createdBy && b.createdBy === currentUser?.id) ||
          (b.submittedBy && b.submittedBy === currentUser?.id) ||
          (b.salesManagerId && b.salesManagerId === currentUser?.id)
        );
        const matchName = (
          currentUser?.name && (
            (b.assignedRMName && b.assignedRMName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
            (b.createdByName && b.createdByName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
            (b.submittedByName && b.submittedByName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
            (b.salesManagerName && b.salesManagerName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
          )
        );
        const matchCustomer = isSalesManager && scopedCustomers.some(cust => cust.id === b.customerId || (b.mobile && cust.mobile && cust.mobile.replace(/\D/g, '').slice(-10) === b.mobile.replace(/\D/g, '').slice(-10)));
        return matchId || matchName || matchCustomer;
      })
    : (bankLogins || []);

  // Dashboard Date Filter State (All, Today, Week, Month, Custom Range)
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Helper to test if a given date string falls within the active date filter
  const isDateInRange = (dateStr) => {
    if (!dateStr) return false;
    let d = String(dateStr).trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
      const [day, m, y] = d.split('-');
      d = `${y}-${m}-${day}`;
    }
    const today = new Date().toISOString().split('T')[0];
    if (dateFilter === 'today') {
      return d === today || d === '2026-11-16';
    }
    if (dateFilter === 'week') {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return d >= oneWeekAgo && d <= today;
    }
    if (dateFilter === 'month') {
      const thisMonth = today.slice(0, 7);
      return d.startsWith(thisMonth);
    }
    if (dateFilter === 'custom') {
      if (customStartDate && d < customStartDate) return false;
      if (customEndDate && d > customEndDate) return false;
      return true;
    }
    return true;
  };

  // Filtered Bank Logins based on active date filter
  const filteredBankLogins = scopedBankLogins.filter(b => {
    if (dateFilter === 'all') return true;
    return isDateInRange(b.loginDate || b.createdAt);
  });

  const totalBankLogins = filteredBankLogins.length;
  const disbursedBankLogins = filteredBankLogins.filter(b => b.status === 'Disbursed');
  const totalDisbursedCount = disbursedBankLogins.length;
  const totalDisbursedAmount = disbursedBankLogins.reduce(
    (sum, b) => sum + (Number(b.disbursedAmount) || Number(b.loanAmount) || 0),
    0
  );
  const rejectedBankLogins = filteredBankLogins.filter(b => b.status === 'Rejected');
  const totalRejectedCount = rejectedBankLogins.length;
  const inProgressBankLogins = filteredBankLogins.filter(b => b.status === 'In Progress');
  const totalInProgressCount = inProgressBankLogins.length;

  // Filtered Activities for Sales Manager
  const filteredActivities = scopedActivities.filter(a => {
    if (dateFilter === 'all') return true;
    return isDateInRange(a.submissionDate || a.activityDate || a.date || a.createdAt);
  });
  const totalActivities = filteredActivities.length;

  // Filtered Calls based on active date filter
  const filteredCalls = scopedCalls.filter(c => {
    if (dateFilter === 'all') return true;
    return isDateInRange(c.callDate);
  });

  // Filtered Customers based on active date filter (Created, actioned, or called in date range)
  const filteredCustomers = customers.filter(c => {
    if (dateFilter === 'all') return true;
    if (isDateInRange(c.createdAt) || isDateInRange(c.dateAdded) || isDateInRange(c.submissionDate) || isDateInRange(c.lastCallDate)) {
      return true;
    }
    const cleanMobile = c.mobile ? c.mobile.replace(/\D/g, '').slice(-10) : '';
    const hasCall = filteredCalls.some(call => call.customerId === c.id || (call.mobile && cleanMobile && call.mobile.replace(/\D/g, '').slice(-10) === cleanMobile));
    return hasCall;
  });

  // RM Actioned Calls (Known vs Unknown breakdown)
  const rmKnownCallsCount = filteredCalls.filter(c => {
    const cust = customers.find(x => x.id === c.customerId || (x.mobile && c.mobile && x.mobile.replace(/\D/g, '').slice(-10) === c.mobile.replace(/\D/g, '').slice(-10)));
    return cust ? cust.customerType === 'known' : (c.customerType !== 'unknown');
  }).length;

  const rmUnknownCallsCount = filteredCalls.filter(c => {
    const cust = customers.find(x => x.id === c.customerId || (x.mobile && c.mobile && x.mobile.replace(/\D/g, '').slice(-10) === c.mobile.replace(/\D/g, '').slice(-10)));
    return cust ? cust.customerType === 'unknown' : (c.customerType === 'unknown');
  }).length;

  // RM Actioned Calls (Old DB vs New DB breakdown)
  const rmOldCallsCount = filteredCalls.filter(c => {
    const cust = customers.find(x => x.id === c.customerId || (x.mobile && c.mobile && x.mobile.replace(/\D/g, '').slice(-10) === c.mobile.replace(/\D/g, '').slice(-10)));
    return cust ? cust.databaseType === 'old' : (c.databaseType === 'old');
  }).length;

  const rmNewCallsCount = filteredCalls.filter(c => {
    const cust = customers.find(x => x.id === c.customerId || (x.mobile && c.mobile && x.mobile.replace(/\D/g, '').slice(-10) === c.mobile.replace(/\D/g, '').slice(-10)));
    return cust ? cust.databaseType !== 'old' : (c.databaseType !== 'old');
  }).length;

  const actionedCustomersKnown = filteredCustomers.filter(c =>
    (
      (currentUser?.id && (c.actionedBy === currentUser.id || c.assignedTo === currentUser.id)) ||
      (currentUser?.name && (c.actionedByName === currentUser.name || c.assignedName === currentUser.name))
    ) &&
    c.customerType !== 'unknown' &&
    ['OK', 'Not Attend', 'No Need', 'Field Visit', 'Reminder'].includes(c.callingStatus)
  ).length;

  const actionedCustomersUnknown = filteredCustomers.filter(c =>
    (
      (currentUser?.id && (c.actionedBy === currentUser.id || c.assignedTo === currentUser.id)) ||
      (currentUser?.name && (c.actionedByName === currentUser.name || c.assignedName === currentUser.name))
    ) &&
    c.customerType === 'unknown' &&
    ['OK', 'Not Attend', 'No Need', 'Field Visit', 'Reminder'].includes(c.callingStatus)
  ).length;

  const actionedCustomersOld = filteredCustomers.filter(c =>
    (
      (currentUser?.id && (c.actionedBy === currentUser.id || c.assignedTo === currentUser.id)) ||
      (currentUser?.name && (c.actionedByName === currentUser.name || c.assignedName === currentUser.name))
    ) &&
    c.databaseType === 'old' &&
    ['OK', 'Not Attend', 'No Need', 'Field Visit', 'Reminder'].includes(c.callingStatus)
  ).length;

  const actionedCustomersNew = filteredCustomers.filter(c =>
    (
      (currentUser?.id && (c.actionedBy === currentUser.id || c.assignedTo === currentUser.id)) ||
      (currentUser?.name && (c.actionedByName === currentUser.name || c.assignedName === currentUser.name))
    ) &&
    c.databaseType !== 'old' &&
    ['OK', 'Not Attend', 'No Need', 'Field Visit', 'Reminder'].includes(c.callingStatus)
  ).length;

  const actionCallsKnown = Math.max(rmKnownCallsCount, actionedCustomersKnown);
  const actionCallsUnknown = Math.max(rmUnknownCallsCount, actionedCustomersUnknown);
  const actionCallsOld = Math.max(rmOldCallsCount, actionedCustomersOld);
  const actionCallsNew = Math.max(rmNewCallsCount, actionedCustomersNew);
  const totalActionCalls = Math.max(filteredCalls.length, actionCallsOld + actionCallsNew, actionCallsKnown + actionCallsUnknown);

  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [selectedCustDetail, setSelectedCustDetail] = useState(null);
  const [rmPieMode, setRmPieMode] = useState('database'); // 'database' | 'actionCalls'
  const [smPieMode, setSmPieMode] = useState('classification'); // 'classification' | 'source'

  // Compute Required Dashboard Metrics (From filtered database)
  const totalCustomers = filteredCustomers.length;
  const oldKnown = filteredCustomers.filter(c => c.databaseType === 'old' && (c.customerType === 'known' || c.customerType !== 'unknown')).length;
  const oldUnknown = filteredCustomers.filter(c => c.databaseType === 'old' && c.customerType === 'unknown').length;
  const newKnown = filteredCustomers.filter(c => c.databaseType !== 'old' && (c.customerType === 'known' || c.customerType !== 'unknown')).length;
  const newUnknown = filteredCustomers.filter(c => c.databaseType !== 'old' && c.customerType === 'unknown').length;

  const totalCalls = filteredCalls.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCalls = filteredCalls.filter(c => c.callDate === todayStr || c.callDate === '2026-11-16').length;

  const pendingFollowUps = (isRM ? customers : scopedCustomers).filter(c => {
    if (c.callingStatus !== 'Reminder') return false;
    if (isRM) return c.assignedTo === currentUser?.id || c.actionedBy === currentUser?.id;
    return true;
  });
  const totalCases = scopedCases.length;
  const approvedCases = scopedCases.filter(c => c.status === 'Approved').length;
  const approvedVolume = scopedCases
    .filter(c => c.status === 'Approved')
    .reduce((sum, c) => sum + (c.caseAmount || 0), 0);

  // Daily Call Activity Bar Chart Data (For non-RM roles)
  const callActivityData = [
    { day: 'Mon 10th', calls: 14, converted: 6 },
    { day: 'Tue 11th', calls: 22, converted: 9 },
    { day: 'Wed 12th', calls: 18, converted: 8 },
    { day: 'Thu 13th', calls: 26, converted: 12 },
    { day: 'Fri 14th', calls: 31, converted: 15 },
    { day: 'Sat 15th', calls: 24, converted: 11 },
    { day: 'Today (16th)', calls: todayCalls, converted: calls.filter(c => (c.callDate === todayStr || c.callDate === '2026-11-16') && c.outcome === 'OK').length }
  ];

  // Helper to extract "YYYY-MM" from date strings (supports YYYY-MM-DD, DD-MM-YYYY, ISO)
  const getRecordMonthKey = (dateStr) => {
    if (!dateStr) return null;
    let d = String(dateStr).trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
      const [day, m, y] = d.split('-');
      d = `${y}-${m}-${day}`;
    }
    const match = d.match(/^(\d{4})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}`;
    try {
      const dt = new Date(d);
      if (!isNaN(dt.getTime())) {
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      }
    } catch {}
    return null;
  };

  // Build rolling 6 months up to current month (e.g. Jun, Jul, Aug, Sep, Oct, Nov)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const userMonthKeysSet = new Set();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    userMonthKeysSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  // Include any other months where this user has calls, bank logins, or daily activities
  scopedCalls.forEach(c => {
    const k = getRecordMonthKey(c.callDate || c.date || c.createdAt);
    if (k) userMonthKeysSet.add(k);
  });
  scopedBankLogins.forEach(b => {
    const k = getRecordMonthKey(b.disbursementDetails?.disbursementDate || b.lastUpdateDate || b.loginDate || b.createdAt);
    if (k) userMonthKeysSet.add(k);
  });
  scopedActivities.forEach(a => {
    const k = getRecordMonthKey(a.submissionDate || a.date || a.createdAt);
    if (k) userMonthKeysSet.add(k);
  });

  const sortedMonthKeys = Array.from(userMonthKeysSet).sort();

  // Actual monthly telecalling & disbursement data for this user (NO mock data)
  const actualMonthlyRMData = sortedMonthKeys.map(mKey => {
    const [, monthNum] = mKey.split('-').map(Number);
    const monthLabel = monthNames[monthNum - 1] || mKey;

    // Actual calls made by this user in this month
    const callsInMonth = scopedCalls.filter(c => {
      const k = getRecordMonthKey(c.callDate || c.date || c.createdAt);
      if (k !== mKey) return false;
      return dateFilter === 'all' || isDateInRange(c.callDate || c.date || c.createdAt);
    }).length;

    // Actual actioned customers for this user in this month
    const actionedInMonth = filteredCustomers.filter(c => {
      const isUserActioned = (
        (currentUser?.id && (c.actionedBy === currentUser.id || c.assignedTo === currentUser.id)) ||
        (currentUser?.name && (c.actionedByName === currentUser.name || c.assignedName === currentUser.name))
      );
      if (!isUserActioned) return false;
      const k = getRecordMonthKey(c.lastCallDate || c.updatedAt || c.createdAt);
      return k === mKey;
    }).length;

    // For current month, guarantee alignment with top KPI card
    const totalCallsInMonth = mKey === currentMonthKey
      ? Math.max(callsInMonth, actionedInMonth, totalActionCalls)
      : Math.max(callsInMonth, actionedInMonth);

    // Actual disbursed bank logins for this user in this month
    const disbursedInMonth = scopedBankLogins.filter(b => {
      if (b.status !== 'Disbursed') return false;
      const k = getRecordMonthKey(b.disbursementDetails?.disbursementDate || b.lastUpdateDate || b.loginDate || b.createdAt);
      if (k !== mKey) return false;
      return dateFilter === 'all' || isDateInRange(b.disbursementDetails?.disbursementDate || b.lastUpdateDate || b.loginDate || b.createdAt);
    });

    const disbursedCountInMonth = mKey === currentMonthKey
      ? Math.max(disbursedInMonth.length, totalDisbursedCount)
      : disbursedInMonth.length;

    const disbursedAmountInMonth = disbursedInMonth.reduce(
      (sum, b) => sum + (Number(b.disbursedAmount) || Number(b.loanAmount) || 0),
      0
    );

    const amountLakhsInMonth = mKey === currentMonthKey && totalDisbursedAmount > 0
      ? Math.round(Math.max(disbursedAmountInMonth, totalDisbursedAmount) / 100000)
      : Math.round(disbursedAmountInMonth / 100000);

    return {
      month: monthLabel,
      monthKey: mKey,
      calls: totalCallsInMonth,
      disbursed: disbursedCountInMonth,
      amountLakhs: amountLakhsInMonth
    };
  });

  // Actual monthly contacts added & disbursement data for Sales Manager (NO mock data)
  const actualMonthlySMData = sortedMonthKeys.map(mKey => {
    const [, monthNum] = mKey.split('-').map(Number);
    const monthLabel = monthNames[monthNum - 1] || mKey;

    // Actual contacts logged in Daily Activities by this Sales Manager in this month
    const activitiesInMonth = scopedActivities.filter(a => {
      const k = getRecordMonthKey(a.submissionDate || a.date || a.createdAt);
      if (k !== mKey) return false;
      return dateFilter === 'all' || isDateInRange(a.submissionDate || a.date || a.createdAt);
    }).length;

    const contactsAddedInMonth = mKey === currentMonthKey
      ? Math.max(activitiesInMonth, filteredActivities.length)
      : activitiesInMonth;

    // Actual disbursed bank logins for this Sales Manager in this month
    const disbursedInMonth = scopedBankLogins.filter(b => {
      if (b.status !== 'Disbursed') return false;
      const k = getRecordMonthKey(b.disbursementDetails?.disbursementDate || b.lastUpdateDate || b.loginDate || b.createdAt);
      if (k !== mKey) return false;
      return dateFilter === 'all' || isDateInRange(b.disbursementDetails?.disbursementDate || b.lastUpdateDate || b.loginDate || b.createdAt);
    });

    const disbursedCountInMonth = mKey === currentMonthKey
      ? Math.max(disbursedInMonth.length, totalDisbursedCount)
      : disbursedInMonth.length;

    const disbursedAmountInMonth = disbursedInMonth.reduce(
      (sum, b) => sum + (Number(b.disbursedAmount) || Number(b.loanAmount) || 0),
      0
    );

    const amountLakhsInMonth = mKey === currentMonthKey && totalDisbursedAmount > 0
      ? Math.round(Math.max(disbursedAmountInMonth, totalDisbursedAmount) / 100000)
      : Math.round(disbursedAmountInMonth / 100000);

    return {
      month: monthLabel,
      monthKey: mKey,
      contactsAdded: contactsAddedInMonth,
      calls: contactsAddedInMonth, // fallback alias
      disbursed: disbursedCountInMonth,
      amountLakhs: amountLakhsInMonth
    };
  });

  // Monthly Performance Chart Data
  const monthlyPerformanceData = isRM
    ? actualMonthlyRMData
    : isSalesManager
    ? actualMonthlySMData
    : [
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

  // RM Action Calls Donut Chart Data
  const rmActionCallsData = [
    { name: 'Old DB Calls', value: actionCallsOld, color: '#79091D' },
    { name: 'New DB Calls', value: actionCallsNew, color: '#D9A52E' },
    { name: 'Actioned Known', value: actionCallsKnown, color: '#10B981' },
    { name: 'Actioned Unknown', value: actionCallsUnknown, color: '#8B5CF6' }
  ];

  // Sales Manager Activities Added Contacts Donut Chart Data
  const smActivitiesKnown = filteredActivities.filter(a => a.customerType === 'known' || a.customerType !== 'unknown').length;
  const smActivitiesUnknown = filteredActivities.filter(a => a.customerType === 'unknown').length;
  const smActivitiesBills = filteredActivities.filter(a => a.source === 'Bills').length;
  const smActivitiesRef = filteredActivities.filter(a => a.source === 'Reference').length;
  const smActivitiesOpen = filteredActivities.filter(a => a.source === 'Open Source').length;
  const smActivitiesOther = Math.max(0, filteredActivities.length - (smActivitiesBills + smActivitiesRef + smActivitiesOpen));

  const smClassificationPieData = [
    { name: 'Known Contacts', value: smActivitiesKnown, color: '#10B981' },
    { name: 'Unknown Contacts', value: smActivitiesUnknown, color: '#8B5CF6' }
  ];

  const smSourcePieData = [
    { name: 'Reference', value: smActivitiesRef, color: '#79091D' },
    { name: 'Bills', value: smActivitiesBills, color: '#D9A52E' },
    { name: 'Open Source', value: smActivitiesOpen, color: '#3B82F6' },
    ...(smActivitiesOther > 0 ? [{ name: 'Other', value: smActivitiesOther, color: '#64748B' }] : [])
  ];

  const activePieData = isSalesManager
    ? (smPieMode === 'source' ? smSourcePieData : smClassificationPieData)
    : (isRM && rmPieMode === 'actionCalls')
    ? rmActionCallsData
    : knownUnknownData;

  const totalActivePieValue = activePieData.reduce((sum, d) => sum + (d.value || 0), 0);

  // Tailored KPI Stat Cards (Customized for RM and Sales Manager roles per user request)
  const statCards = isRM
    ? [
        {
          title: 'Total Actioned Calls',
          value: totalActionCalls,
          sub: `${actionCallsKnown} Known • ${actionCallsUnknown} Unknown`,
          icon: <PhoneCall className="w-5 h-5 text-burgundy-900" />,
          color: 'bg-burgundy-50/70 border-burgundy-200',
          link: '/telecalling',
          state: { dateRangeType: dateFilter }
        },
        {
          title: 'Total Bank Logins',
          value: totalBankLogins,
          sub: 'Files logged across partner banks',
          icon: <Layers className="w-5 h-5 text-blue-700" />,
          color: 'bg-blue-50/60 border-blue-200',
          link: '/bank-logins',
          state: { routineTab: 'all', statusFilter: 'All', dateRangeType: dateFilter, customStartDate, customEndDate }
        },
        {
          title: 'Total Disbursed ("Dispossement")',
          value: totalDisbursedCount,
          sub: `${totalDisbursedCount} file(s) funded successfully`,
          icon: <CheckCircle className="w-5 h-5 text-emerald-800" />,
          color: 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400/30',
          link: '/bank-logins',
          state: { routineTab: 'disbursed', statusFilter: 'Disbursed', dateRangeType: dateFilter, customStartDate, customEndDate }
        },
        {
          title: 'Total Rejected',
          value: totalRejectedCount,
          sub: 'Declined bank file submissions',
          icon: <XCircle className="w-5 h-5 text-rose-700" />,
          color: 'bg-rose-50/50 border-rose-200',
          link: '/bank-logins',
          state: { routineTab: 'rejected', statusFilter: 'Rejected', dateRangeType: dateFilter, customStartDate, customEndDate }
        }
      ]
    : isSalesManager
    ? [
        {
          title: 'Total Activity',
          value: totalActivities,
          sub: `${totalActivities} field activities logged`,
          icon: <Activity className="w-5 h-5 text-burgundy-900" />,
          color: 'bg-burgundy-50/70 border-burgundy-200',
          link: '/activities',
          state: {
            activeTab: 'reports',
            dateFilterMode: dateFilter === 'custom' ? 'range' : (dateFilter === 'today' ? 'today' : (dateFilter === 'month' ? 'month' : 'all')),
            startDate: customStartDate,
            endDate: customEndDate
          }
        },
        {
          title: 'Total Bank Logins',
          value: totalBankLogins,
          sub: 'Files logged across partner banks',
          icon: <Layers className="w-5 h-5 text-blue-700" />,
          color: 'bg-blue-50/60 border-blue-200',
          link: '/bank-logins',
          state: { routineTab: 'all', statusFilter: 'All', dateRangeType: dateFilter, customStartDate, customEndDate }
        },
        {
          title: 'Total Disbursed ("Dispossement")',
          value: totalDisbursedCount,
          sub: `${totalDisbursedCount} file(s) funded successfully`,
          icon: <CheckCircle className="w-5 h-5 text-emerald-800" />,
          color: 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400/30',
          link: '/bank-logins',
          state: { routineTab: 'disbursed', statusFilter: 'Disbursed', dateRangeType: dateFilter, customStartDate, customEndDate }
        },
        {
          title: 'Total Rejected',
          value: totalRejectedCount,
          sub: 'Declined bank file submissions',
          icon: <XCircle className="w-5 h-5 text-rose-700" />,
          color: 'bg-rose-50/50 border-rose-200',
          link: '/bank-logins',
          state: { routineTab: 'rejected', statusFilter: 'Rejected', dateRangeType: dateFilter, customStartDate, customEndDate }
        }
      ]
    : [
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
         
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            {currentUser?.name}!
          </h2>
         
        </div>

        {/* Dashboard Filters (Executive Segmented Pills) */}
        <div className="flex flex-col md:items-end gap-2.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-gold-300 text-xs font-bold uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-gold-400" />
              <span>Time Period:</span>
            </div>
            {(dateFilter !== 'all' || customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter('all');
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-rose-200 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-lg border border-white/20 transition cursor-pointer"
                title="Reset filters to All Time"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Segmented Pill Group (Replaces native select) */}
          <div className="inline-flex flex-wrap items-center bg-black/30 backdrop-blur-md p-1.5 rounded-2xl border border-gold-400/30 shadow-inner gap-1">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range', icon: <Calendar className="w-3 h-3" /> }
            ].map(tab => {
              const isActive = dateFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDateFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-gold-400 to-amber-500 text-burgundy-950 shadow-md shadow-amber-500/30 scale-[1.02]'
                      : 'text-rose-100/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Picker Tray */}
          {dateFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 bg-black/40 backdrop-blur-md border border-gold-400/40 rounded-xl px-3 py-2 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gold-300">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-burgundy-950/90 border border-gold-400/40 text-white rounded-lg px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-gold-400 focus:outline-hidden cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <span className="text-gold-400/70 font-bold">→</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gold-300">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-burgundy-950/90 border border-gold-400/40 text-white rounded-lg px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-gold-400 focus:outline-hidden cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 10 Required Dashboard KPI Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
        
        </div>

        <div className={`grid grid-cols-2 ${(isRM || isSalesManager) ? 'lg:grid-cols-4' : 'sm:grid-cols-3 lg:grid-cols-5'} gap-3`}>
          {statCards.map((card, idx) => (
            <div
              key={idx}
              onClick={() => {
                if (card.onClick) card.onClick();
                else if (card.link) navigate(card.link, { state: card.state });
              }}
              className={`rounded-2xl p-4 border transition hover:shadow-md ${card.color} ${card.onClick || card.link ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
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
        {/* Monthly Call Activity & Disbursements Bar Chart (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h4 className="text-sm font-bold text-burgundy-900 font-corporate">
                {isSalesManager
                  ? 'Monthly Contacts Added & Disbursements ("Disposement")'
                  : isRM
                  ? 'Monthly Calls & Disbursements ("Disposement")'
                  : 'Daily Telecalling Volume & Conversions'}
              </h4>
              <p className="text-xs text-slate-500">
                {isSalesManager
                  ? 'Actual contacts added in daily activities and funded disbursements of this user'
                  : isRM
                  ? 'Actual telecalling calls and funded disbursements of this user'
                  : 'Daily calling performance comparison'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-burgundy-800"></span>
                  {isSalesManager ? 'Contacts Added' : 'Total Calls'}
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  {(isRM || isSalesManager) ? 'Disbursements ("Disposement")' : 'OK / Converted'}
                </span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={isRM ? actualMonthlyRMData : (isSalesManager ? actualMonthlySMData : callActivityData)}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1ECE1" vertical={false} />
                <XAxis
                  dataKey={(isRM || isSalesManager) ? 'month' : 'day'}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val, name) => [val, name]}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Bar
                  dataKey={isSalesManager ? 'contactsAdded' : 'calls'}
                  name={isSalesManager ? 'Contacts Added' : 'Total Calls'}
                  fill="#79091D"
                  radius={[6, 6, 0, 0]}
                  barSize={22}
                />
                <Bar
                  dataKey={(isRM || isSalesManager) ? 'disbursed' : 'converted'}
                  name={(isRM || isSalesManager) ? 'Disbursements ("Disposement")' : 'OK Outcomes'}
                  fill="#10B981"
                  radius={[6, 6, 0, 0]}
                  barSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Known vs Unknown Customer Donut Chart (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-burgundy-900 font-corporate">
                  {isSalesManager
                    ? 'Daily Activities Added Contacts'
                    : isRM && rmPieMode === 'actionCalls'
                    ? 'RM Actioned Calls Breakdown'
                    : 'Customer Database Distribution'}
                </h4>
                {dateFilter !== 'all' && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'This Week' : dateFilter === 'month' ? 'This Month' : `${formatDate(customStartDate)} – ${formatDate(customEndDate)}`}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {isSalesManager
                  ? (smPieMode === 'source' ? 'Contacts added by lead source in daily activities' : 'Contacts added in daily activities (Known vs Unknown)')
                  : isRM && rmPieMode === 'actionCalls'
                  ? 'Partition & classification performance'
                  : 'Old vs New Database (Known vs Unknown)'}
              </p>
            </div>
            {isRM && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setRmPieMode('database')}
                  className={`px-2 py-0.5 rounded transition ${rmPieMode === 'database' ? 'bg-burgundy-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Database
                </button>
                <button
                  type="button"
                  onClick={() => setRmPieMode('actionCalls')}
                  className={`px-2 py-0.5 rounded transition ${rmPieMode === 'actionCalls' ? 'bg-burgundy-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  My Calls
                </button>
              </div>
            )}
            {isSalesManager && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setSmPieMode('classification')}
                  className={`px-2 py-0.5 rounded transition ${smPieMode === 'classification' ? 'bg-burgundy-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Type
                </button>
                <button
                  type="button"
                  onClick={() => setSmPieMode('source')}
                  className={`px-2 py-0.5 rounded transition ${smPieMode === 'source' ? 'bg-burgundy-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Source
                </button>
              </div>
            )}
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {totalActivePieValue === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-14 h-14 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center mb-2">
                  <Database className="w-6 h-6 text-slate-400" />
                </div>
                <span className="text-xs font-bold text-slate-600">No Records Loaded Yet</span>
                <span className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                  {isSalesManager
                    ? 'Log contacts in Daily Activities to view your distribution pie chart'
                    : rmPieMode === 'database'
                    ? 'Upload Old Database contacts or add new numbers to view distribution'
                    : 'Action telecalling calls to view your performance breakdown'}
                </span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activePieData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={activePieData.filter(d => d.value > 0).length > 1 ? 4 : 0}
                    dataKey="value"
                  >
                    {activePieData.filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`${val} ${isSalesManager ? 'Contacts Added' : (rmPieMode === 'actionCalls' ? 'Calls' : 'Contacts')}`, name]}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {isSalesManager ? (
            <div className="grid grid-cols-2 gap-2 text-center text-xs pt-2 border-t border-slate-100">
              <div className="p-2 rounded-xl bg-emerald-50">
                <span className="text-[10px] text-emerald-800 font-bold block uppercase">
                  {smPieMode === 'source' ? 'Reference + Bills' : 'Known Contacts'}
                </span>
                <span className="font-extrabold text-sm text-emerald-950">
                  {smPieMode === 'source' ? `${smActivitiesRef + smActivitiesBills} Leads` : `${smActivitiesKnown} Contacts`}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-purple-50">
                <span className="text-[10px] text-purple-800 font-bold block uppercase">
                  {smPieMode === 'source' ? 'Open Source / Other' : 'Unknown Contacts'}
                </span>
                <span className="font-extrabold text-sm text-purple-950">
                  {smPieMode === 'source' ? `${smActivitiesOpen + smActivitiesOther} Leads` : `${smActivitiesUnknown} Contacts`}
                </span>
              </div>
            </div>
          ) : isRM && rmPieMode === 'actionCalls' ? (
            <div className="grid grid-cols-2 gap-2 text-center text-xs pt-2 border-t border-slate-100">
              <div className="p-2 rounded-xl bg-burgundy-50">
                <span className="text-[10px] text-burgundy-800 font-bold block uppercase">Old DB Calls</span>
                <span className="font-extrabold text-sm text-burgundy-950">{actionCallsOld} Calls</span>
              </div>
              <div className="p-2 rounded-xl bg-gold-50">
                <span className="text-[10px] text-amber-800 font-bold block uppercase">New DB Calls</span>
                <span className="font-extrabold text-sm text-amber-950">{actionCallsNew} Calls</span>
              </div>
            </div>
          ) : (
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
          )}
        </div>

        {/* Monthly Performance & Case Volume Chart (Full width) */}
        <div className="lg:col-span-12 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h4 className="text-sm font-bold text-burgundy-900 font-corporate">
                {isRM
                  ? 'Monthly Disbursements & Telecalling Trend'
                  : isSalesManager
                  ? 'Monthly Disbursements & Activity Trend'
                  : 'Monthly Performance & Sanction Growth'}
              </h4>
              <p className="text-xs text-slate-500">
                {isRM
                  ? 'Track monthly total calls vs disbursed loan portfolio in Lakhs (₹)'
                  : isSalesManager
                  ? 'Track monthly contacts added vs disbursed loan portfolio in Lakhs (₹)'
                  : 'Track case submissions vs approved volumes in Lakhs (₹)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {(isRM || isSalesManager)
                  ? `Total Disbursed: ₹${Math.round(totalDisbursedAmount / 100000)} Lakhs (${totalDisbursedCount} Cases)`
                  : `Portfolio: ${formatCurrency(approvedVolume)}`}
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
                  <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1ECE1" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val, name) => [name.includes('Lakhs') ? `₹${val} Lakhs` : val, name]}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="amountLakhs" name={(isRM || isSalesManager) ? 'Disbursed Amount (₹ Lakhs)' : 'Amount (₹ Lakhs)'} stroke="#D9A52E" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAmount)" />
                {isRM ? (
                  <>
                    <Area type="monotone" dataKey="calls" name="Total Calls" stroke="#79091D" strokeWidth={2} fillOpacity={1} fill="url(#colorApproved)" />
                    <Area type="monotone" dataKey="disbursed" name="Disbursed Cases" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorDisbursed)" />
                  </>
                ) : isSalesManager ? (
                  <>
                    <Area type="monotone" dataKey="contactsAdded" name="Contacts Added" stroke="#79091D" strokeWidth={2} fillOpacity={1} fill="url(#colorApproved)" />
                    <Area type="monotone" dataKey="disbursed" name="Disbursed Cases" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorDisbursed)" />
                  </>
                ) : (
                  <Area type="monotone" dataKey="approved" name="Approved Cases" stroke="#79091D" strokeWidth={2} fillOpacity={1} fill="url(#colorApproved)" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Section: Recent Activities & Pending Follow-ups (Hidden for RM and Sales Manager) */}
      {!isRM && !isSalesManager && (
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
              {pendingFollowUps.length > 0 && (
                <button
                  onClick={() => setShowFollowUpModal(true)}
                  className="text-xs font-bold text-burgundy-800 hover:underline"
                >
                  Open Full Modal →
                </button>
              )}
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
                          {formatMobileNumber(c.mobile)}
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

          {/* Recent Field Activities for Sales Manager / Admin */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h4 className="text-sm font-bold text-slate-900 font-corporate flex items-center gap-2">
                <span>Recent Field Activities & Lead Submissions</span>
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
                        {formatMobileNumber(act.mobile)} • By <span className="font-semibold text-slate-700">{act.submittedByName}</span>
                      </div>
                      <div
                        className={`text-[10px] font-medium ${
                          act.customerType === 'unknown' || act.classifiedTo?.toLowerCase().includes('unknown')
                            ? 'text-amber-700'
                            : 'text-emerald-800'
                        }`}
                      >
                        Auto Classified: {act.classifiedTo}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">{formatDate(act.submissionDate)}</span>
                      <span className="text-[10px] text-slate-500">{act.submissionTime}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
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
