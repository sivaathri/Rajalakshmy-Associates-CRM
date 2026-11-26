import React, { useState, useMemo, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { Pagination } from '../components/common/Pagination';
import {
  FileCheck,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Search,
  Filter,
  IndianRupee,
  User,
  History,
  Eye,
  X,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  Check,
  Lock
} from 'lucide-react';
import { formatCurrency, formatDate, formatMobileNumber } from '../utils/formatters';

export const BankLoginPage = () => {
  const { bankLogins, addBankLogin, addLoginUpdate, disburseLogin, rejectLogin, customers, activities = [], leads = [], employees = [] } = useCRM();
  const { currentUser, showToast } = useAuth();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [bankFilter, setBankFilter] = useState('All');
  const [executiveFilter, setExecutiveFilter] = useState('All');
  const [onlyDueReminders, setOnlyDueReminders] = useState(false);
  const [dateRangeType, setDateRangeType] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Pagination (minimum 15 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, bankFilter, executiveFilter, onlyDueReminders, dateRangeType, customStartDate, customEndDate, currentUser?.id]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [updatingLogin, setUpdatingLogin] = useState(null);
  const [disbursingLogin, setDisbursingLogin] = useState(null);
  const [rejectingLogin, setRejectingLogin] = useState(null);
  const [viewHistoryLogin, setViewHistoryLogin] = useState(null);

  // Add Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [sourceCustomerId, setSourceCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerDob, setCustomerDob] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerBusiness, setCustomerBusiness] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankId, setBankId] = useState('');
  const [loanType, setLoanType] = useState('Personal Loan');
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [loginDate, setLoginDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialNotes, setInitialNotes] = useState('');
  const [showNumberSuggestions, setShowNumberSuggestions] = useState(false);

  // Update Note State
  const [todayUpdateNote, setTodayUpdateNote] = useState('');

  // Disbursement Modal State (Req 5: bank name, loan amount, type of loan and click ok)
  const [disburseBankName, setDisburseBankName] = useState('');
  const [disburseLoanAmount, setDisburseLoanAmount] = useState('');
  const [disburseLoanType, setDisburseLoanType] = useState('');
  const [disburseDate, setDisburseDate] = useState(new Date().toISOString().split('T')[0]);
  const [disburseRemarks, setDisburseRemarks] = useState('');

  // Rejection Modal State (Req 5: if reject enter remarks)
  const [rejectionRemarks, setRejectionRemarks] = useState('');

  const clean10Digits = (num) => String(num || '').replace(/\D/g, '').slice(-10);
  const enteredDigits = String(customerMobile || '').replace(/\D/g, '');
  const entered10 = enteredDigits.length >= 10 ? enteredDigits.slice(-10) : '';

  const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Manager' || currentUser?.role === 'Managing Director';

  // Base accessible bank logins strictly scoped by user & role
  // Non-admin roles (RM, Sales Manager, Ops, etc.) ONLY see files assigned to or created/submitted by them.
  const scopedBankLogins = useMemo(() => {
    if (!currentUser) return [];

    if (isAdminOrManager) {
      if (executiveFilter && executiveFilter !== 'All') {
        return bankLogins.filter(b =>
          b.assignedRMId === executiveFilter ||
          b.assignedRMName === executiveFilter ||
          b.createdBy === executiveFilter ||
          b.submittedBy === executiveFilter
        );
      }
      return bankLogins;
    }

    // For RM, Sales Manager, and all other non-admin roles:
    return bankLogins.filter(b => {
      const matchId = (
        (b.assignedRMId && b.assignedRMId === currentUser.id) ||
        (b.createdBy && b.createdBy === currentUser.id) ||
        (b.submittedBy && b.submittedBy === currentUser.id)
      );
      const matchName = (
        currentUser.name && (
          (b.assignedRMName && b.assignedRMName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
          (b.createdByName && b.createdByName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
          (b.submittedByName && b.submittedByName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
        )
      );
      return matchId || matchName;
    });
  }, [bankLogins, currentUser, isAdminOrManager, executiveFilter]);

  // Count of bank logins per customer mobile
  const customerLoginsCountMap = useMemo(() => {
    const map = {};
    scopedBankLogins.forEach(b => {
      const d = clean10Digits(b.mobile);
      if (d) {
        map[d] = (map[d] || 0) + 1;
      }
    });
    return map;
  }, [scopedBankLogins]);

  // All bank logins for customer currently viewed in Modal 5 (Eye icon)
  const viewCustomerAllLogins = useMemo(() => {
    if (!viewHistoryLogin?.mobile) return [];
    const d = clean10Digits(viewHistoryLogin.mobile);
    return scopedBankLogins.filter(b => clean10Digits(b.mobile) === d);
  }, [viewHistoryLogin, scopedBankLogins]);

  // Handler: Open Add Bank Login modal pre-filled for an existing customer
  const handleOpenAddModalForCustomer = (cust) => {
    if (!cust) return;
    setBankName('');
    setBankId('');
    setLoanType('Personal Loan');
    setLoanAmount('');
    setInterestRate('');
    setInitialNotes('');
    setShowNumberSuggestions(false);

    const digits = clean10Digits(cust.mobile);
    const formatted = digits.length === 10 ? `+91 ${digits}` : formatMobileNumber(cust.mobile || '');
    setCustomerMobile(formatted);
    setSelectedCustomerId(cust.customerId || cust.id || '');
    setSourceCustomerId(cust.sourceCustomerId || cust.id || '');
    const cName = cust.customerName || cust.name || '';
    setCustomerName(cName === 'Unknown / Lead' ? '' : cName);
    setCustomerDob(cust.dob || cust.dateOfBirth || '');
    setCustomerBusiness(cust.business || '');
    setCustomerCity(cust.city || '');

    setViewHistoryLogin(null);
    setIsAddModalOpen(true);
  };

  // Matching suggestions as user types mobile number
  const matchingPhoneRecords = useMemo(() => {
    if (!enteredDigits || enteredDigits.length < 3 || entered10.length === 10) return [];
    const seen = new Set();
    const results = [];
    customers.forEach(c => {
      const d = clean10Digits(c.mobile);
      if (d && d.includes(enteredDigits) && !seen.has(d)) {
        seen.add(d);
        const followerId = c.actionedBy || c.assignedTo;
        const isConflict = Boolean(followerId && currentUser?.id && followerId !== currentUser.id);
        const lCount = customerLoginsCountMap[d] || 0;
        results.push({
          id: c.id,
          customerId: c.isCustomer ? (c.customerId || c.id) : '',
          name: isConflict ? 'Confidential (Other User)' : (c.name || 'Unknown / Lead'),
          mobile: c.mobile,
          business: isConflict ? '—' : (c.business || ''),
          city: isConflict ? '—' : (c.city || ''),
          isConflict,
          loginCount: lCount
        });
      }
    });

    bankLogins.forEach(b => {
      const d = clean10Digits(b.mobile);
      if (d && d.includes(enteredDigits) && !seen.has(d)) {
        seen.add(d);
        const followerId = b.assignedRMId;
        const isConflict = Boolean(followerId && currentUser?.id && followerId !== currentUser.id);
        const lCount = customerLoginsCountMap[d] || 1;
        results.push({
          id: b.id,
          customerId: b.customerId || '',
          name: isConflict ? 'Confidential (Other User)' : (b.customerName || 'Customer'),
          mobile: b.mobile,
          business: isConflict ? '—' : (b.business || ''),
          city: isConflict ? '—' : (b.city || ''),
          isConflict,
          loginCount: lCount
        });
      }
    });
    return results.slice(0, 6);
  }, [enteredDigits, entered10, customers, bankLogins, currentUser, customerLoginsCountMap]);

  // Exact match lookup in Database (customers, activities, leads, bankLogins)
  const lookupResult = useMemo(() => {
    if (entered10.length !== 10) return null;

    const matchedCustomer = customers.find(
      c => clean10Digits(c.mobile) === entered10 || clean10Digits(c.altMobile) === entered10
    );
    const matchedActivity = activities.find(a => clean10Digits(a.mobile) === entered10);
    const matchedLead = leads.find(
      l => clean10Digits(l.mobile) === entered10 || clean10Digits(l.altMobile) === entered10
    );
    const matchedLogins = bankLogins.filter(b => clean10Digits(b.mobile) === entered10);

    const foundInDb = Boolean(matchedCustomer || matchedActivity || matchedLead || matchedLogins.length > 0);

    // Build conflict/processing alerts
    const alerts = [];
    const otherUserLogin = matchedLogins.find(
      b => currentUser?.id && b.assignedRMId && b.assignedRMId !== currentUser.id
    );

    if (otherUserLogin) {
      alerts.push({
        type: 'login',
        severity: 'danger',
        message: `Alert: Another user (${otherUserLogin.assignedRMName || 'RM'}) is managing a Bank Login for this customer (${otherUserLogin.bankName} — Status: ${otherUserLogin.status}).`
      });
    } else if (matchedLogins.length > 0) {
      alerts.push({
        type: 'existing-logins',
        severity: 'info',
        count: matchedLogins.length,
        logins: matchedLogins,
        message: `Customer already has ${matchedLogins.length} Bank Login${matchedLogins.length > 1 ? 's' : ''} on file: ${matchedLogins.map(l => `${l.bankName} (${l.status})`).join(', ')}. You can add an additional bank login below.`
      });
    }

    const followerId = matchedCustomer?.actionedBy || matchedCustomer?.assignedTo;
    const followerName = matchedCustomer?.actionedByName || matchedCustomer?.assignedName;
    if (followerId && currentUser?.id && followerId !== currentUser.id) {
      alerts.push({
        type: 'follow',
        severity: 'danger',
        message: `Alert: Another user (${followerName || followerId}) is following this customer (Status: ${matchedCustomer.callingStatus || 'Active'}${matchedCustomer.reminderDate ? `, Follow-up: ${formatDate(matchedCustomer.reminderDate)}` : ''}).`
      });
    } else if (matchedLead && matchedLead.assignedToId && currentUser?.id && matchedLead.assignedToId !== currentUser.id) {
      alerts.push({
        type: 'follow',
        severity: 'danger',
        message: `Alert: Another user (${matchedLead.assignedToName || matchedLead.assignedToId}) is following this customer in Leads (${matchedLead.status}).`
      });
    }

    return {
      foundInDb,
      matchedCustomer,
      matchedActivity,
      matchedLead,
      matchedLogins,
      alerts
    };
  }, [entered10, customers, activities, leads, bankLogins, currentUser]);

  const hasConflict = Boolean(lookupResult?.alerts?.some(a => a.severity === 'danger'));
  const isExistingCustomer = Boolean(lookupResult?.foundInDb || selectedCustomerId || lookupResult?.matchedCustomer);

  // Auto-fill details when a 10-digit number matches in database
  useEffect(() => {
    if (!isAddModalOpen || !lookupResult) return;
    if (hasConflict) {
      setSelectedCustomerId('');
      setSourceCustomerId('');
      setCustomerName('');
      setCustomerDob('');
      setCustomerBusiness('');
      setCustomerCity('');
      return;
    }

    if (lookupResult.foundInDb) {
      const src = lookupResult.matchedCustomer || lookupResult.matchedLead || lookupResult.matchedActivity || lookupResult.matchedLogins?.[0];
      if (src) {
        if (lookupResult.matchedCustomer?.isCustomer) {
          setSelectedCustomerId(lookupResult.matchedCustomer.customerId || lookupResult.matchedCustomer.id);
          setSourceCustomerId(lookupResult.matchedCustomer.id);
        } else if (lookupResult.matchedCustomer) {
          setSelectedCustomerId('');
          setSourceCustomerId(lookupResult.matchedCustomer.id);
        } else if (lookupResult.matchedLogins?.[0]) {
          setSelectedCustomerId(lookupResult.matchedLogins[0].customerId || lookupResult.matchedLogins[0].id || '');
          setSourceCustomerId(lookupResult.matchedLogins[0].sourceCustomerId || lookupResult.matchedLogins[0].id || '');
        } else {
          setSelectedCustomerId('');
          setSourceCustomerId('');
        }
        const fetchedName = src.name || src.customerName || '';
        setCustomerName(fetchedName === 'Unknown / Lead' ? '' : fetchedName);
        setCustomerDob(src.dob || src.dateOfBirth || '');
        setCustomerBusiness(src.business || '');
        setCustomerCity(src.city || src.location || '');
      }
    } else {
      setSelectedCustomerId('');
      setSourceCustomerId('');
    }
  }, [isAddModalOpen, entered10, lookupResult?.foundInDb, hasConflict]);

  // Handle selecting a number from suggestions
  const handleSelectSuggestedRecord = (rec) => {
    setCustomerMobile(formatMobileNumber(rec.mobile));
    setShowNumberSuggestions(false);
  };

  // Helper: Format customer ID so it starts with 1 (e.g. RA-CUST-1 instead of RA-CUST-1001)
  const formatDisplayCustomerId = (id) => {
    if (!id) return 'RA-CUST-1';
    const str = String(id).trim();
    const match = str.match(/^RA-CUST-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1000) {
        return `RA-CUST-${num - 1000 === 0 ? 1 : num - 1000}`;
      }
      return `RA-CUST-${num}`;
    }
    return str;
  };

  // Helper: display loan amount gracefully whether string or number
  const renderLoanAmount = (val) => {
    if (val === undefined || val === null || val === '') return '-';
    if (typeof val === 'number') return formatCurrency(val);
    const clean = String(val).trim();
    if (!clean) return '-';
    const numClean = clean.replace(/,/g, '');
    if (/^\d+(\.\d+)?$/.test(numClean)) {
      return formatCurrency(Number(numClean));
    }
    return clean.startsWith('₹') ? clean : `₹ ${clean}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper: check if a login is due for 2-day update
  const is2DayUpdateDue = (login) => {
    if (login.status !== 'In Progress') return false;
    if (!login.nextFollowUpDate) return true;
    return login.nextFollowUpDate <= todayStr;
  };

  // Filtered dataset
  const filteredLogins = useMemo(() => {
    return scopedBankLogins.filter(item => {
      // 2-Day Due toggle
      if (onlyDueReminders && !is2DayUpdateDue(item)) {
        return false;
      }

      // Status
      if (statusFilter !== 'All' && item.status !== statusFilter) {
        return false;
      }

      // Bank
      if (bankFilter !== 'All' && item.bankName !== bankFilter) {
        return false;
      }

      // Date Range Filter (on loginDate)
      if (dateRangeType === 'today') {
        if (item.loginDate !== todayStr) return false;
      } else if (dateRangeType === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const sevenDaysAgoStr = d.toISOString().split('T')[0];
        if (item.loginDate < sevenDaysAgoStr || item.loginDate > todayStr) return false;
      } else if (dateRangeType === 'month') {
        const currentMonthPrefix = todayStr.slice(0, 7);
        if (!item.loginDate?.startsWith(currentMonthPrefix)) return false;
      } else if (dateRangeType === 'custom') {
        if (customStartDate && item.loginDate < customStartDate) return false;
        if (customEndDate && item.loginDate > customEndDate) return false;
      }

      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mName = item.customerName?.toLowerCase().includes(q);
        const mMobile = item.mobile?.includes(q);
        const mBiz = item.business?.toLowerCase().includes(q);
        const mBank = item.bankName?.toLowerCase().includes(q);
        const mBankId = item.bankId?.toLowerCase().includes(q);
        const mLoan = item.loanType?.toLowerCase().includes(q);
        const mId = item.id?.toLowerCase().includes(q);
        if (!mName && !mMobile && !mBiz && !mBank && !mBankId && !mLoan && !mId) return false;
      }

      return true;
    });
  }, [scopedBankLogins, onlyDueReminders, statusFilter, bankFilter, dateRangeType, customStartDate, customEndDate, searchTerm, todayStr]);

  // Distinct banks list for filter
  const distinctBanks = useMemo(() => {
    const set = new Set();
    scopedBankLogins.forEach(b => {
      if (b.bankName) set.add(b.bankName);
    });
    return Array.from(set);
  }, [scopedBankLogins]);

  // Aggregate Metrics (strictly scoped to logged-in user / role)
  const totalLoginsCount = scopedBankLogins.length;
  const inProgressCount = scopedBankLogins.filter(b => b.status === 'In Progress').length;
  const updatesDueCount = scopedBankLogins.filter(is2DayUpdateDue).length;
  const disbursedLogins = scopedBankLogins.filter(b => b.status === 'Disbursed');
  const disbursedVolume = disbursedLogins.reduce((sum, b) => {
    const raw = b.disbursementDetails?.loanAmount ?? b.loanAmount ?? 0;
    const num = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^\d.-]/g, '')) || 0;
    return sum + num;
  }, 0);
  const rejectedCount = scopedBankLogins.filter(b => b.status === 'Rejected').length;

  // Group bank logins by customer so that an existing customer is ONE single record in the table
  const groupedCustomerLogins = useMemo(() => {
    const map = new Map();

    filteredLogins.forEach(login => {
      const custKey = clean10Digits(login.mobile) || login.customerId || login.id;
      if (!map.has(custKey)) {
        map.set(custKey, {
          key: custKey,
          customerId: login.customerId || login.id,
          customerName: login.customerName,
          mobile: login.mobile,
          business: login.business,
          city: login.city,
          dob: login.dob,
          assignedRMId: login.assignedRMId,
          assignedRMName: login.assignedRMName,
          logins: []
        });
      }
      map.get(custKey).logins.push(login);
    });

    // Ensure files for each customer are ordered chronologically by creation (1st created: File 1, 2nd: File 2, 3rd: File 3...)
    map.forEach(group => {
      group.logins.sort((a, b) => {
        const numA = typeof a.fileNumber === 'number' ? a.fileNumber : 9999;
        const numB = typeof b.fileNumber === 'number' ? b.fileNumber : 9999;
        if (numA !== numB) return numA - numB;
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA && timeB && timeA !== timeB) return timeA - timeB;
        if (a.loginDate && b.loginDate && a.loginDate !== b.loginDate) {
          return a.loginDate.localeCompare(b.loginDate);
        }
        return 0;
      });
    });

    return Array.from(map.values());
  }, [filteredLogins]);

  const paginatedCustomerRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return groupedCustomerLogins.slice(start, start + itemsPerPage);
  }, [groupedCustomerLogins, currentPage, itemsPerPage]);

  // Add Login Handler
  const handleCreateLogin = (e) => {
    e.preventDefault();
    if (!customerMobile.trim() || customerMobile.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    if (hasConflict) {
      alert('Cannot create bank login: This customer is currently being followed or processed by another user.');
      return;
    }

    if (lookupResult?.alerts?.length > 0) {
      const warningAlerts = lookupResult.alerts.filter(a => a.severity === 'warning');
      if (warningAlerts.length > 0) {
        const alertMsgs = warningAlerts.map(a => a.message).join('\n');
        const proceed = window.confirm(`${alertMsgs}\n\nDo you still want to proceed with registering this Bank Login?`);
        if (!proceed) return;
      }
    }

    const digits = customerMobile.replace(/\D/g, '').slice(-10);
    const formattedMobile = `+91 ${digits}`;

    addBankLogin({
      customerId: selectedCustomerId,
      sourceCustomerId,
      customerName: customerName.trim() || 'New Loan Client',
      dob: customerDob,
      mobile: formattedMobile,
      business: customerBusiness.trim() || 'General Business',
      city: customerCity.trim(),
      bankName: bankName.trim(),
      bankId: bankId.trim(),
      interestRate: interestRate.trim(),
      loanType,
      loanAmount: loanAmount.trim(),
      loginDate,
      notes: initialNotes.trim() || `Submitted file to ${bankName}`,
      assignedRMId: currentUser?.id || 'EMP004',
      assignedRMName: currentUser?.name || 'Ananya Subramanian',
      assignedToRole: currentUser?.role || 'RM',
      createdBy: currentUser?.id || 'EMP004',
      createdByName: currentUser?.name || 'Ananya Subramanian',
      createdByRole: currentUser?.role || 'RM',
      submittedBy: currentUser?.id || 'EMP004',
      submittedByName: currentUser?.name || 'Ananya Subramanian'
    });

    // Reset
    setIsAddModalOpen(false);
    setSelectedCustomerId('');
    setSourceCustomerId('');
    setCustomerName('');
    setCustomerDob('');
    setCustomerMobile('');
    setCustomerBusiness('');
    setCustomerCity('');
    setBankName('');
    setBankId('');
    setLoanType('Personal Loan');
    setLoanAmount('');
    setInterestRate('');
    setInitialNotes('');
    setShowNumberSuggestions(false);
  };

  // 2-Day Update Handler
  const handleSaveUpdate = (e) => {
    e.preventDefault();
    if (!updatingLogin || !todayUpdateNote.trim()) {
      alert('Please enter the current update/progress details from the bank');
      return;
    }

    addLoginUpdate(updatingLogin.id, todayUpdateNote.trim());
    setUpdatingLogin(null);
    setTodayUpdateNote('');
  };

  // Open Disbursement Modal
  const handleOpenDisburseModal = (login) => {
    setDisbursingLogin(login);
    setDisburseBankName(login.bankName || '');
    setDisburseLoanAmount(login.loanAmount || '');
    setDisburseLoanType(login.loanType || 'Personal Loan');
    setDisburseDate(new Date().toISOString().split('T')[0]);
    setDisburseRemarks('');
  };

  // Confirm Disbursement (Req 5: bank name, loan amount, type of loan and click ok)
  const handleConfirmDisbursement = (e) => {
    e.preventDefault();
    if (!disbursingLogin) return;
    if (!disburseBankName.trim() || !String(disburseLoanAmount).trim() || !disburseLoanType.trim()) {
      alert('Please enter Bank Name, Disbursed Loan Amount, and Type of Loan');
      return;
    }

    disburseLogin(disbursingLogin.id, {
      bankName: disburseBankName.trim(),
      loanAmount: String(disburseLoanAmount).trim(),
      loanType: disburseLoanType.trim(),
      disbursementDate: disburseDate,
      remarks: disburseRemarks.trim()
    });

    setDisbursingLogin(null);
  };

  // Open Rejection Modal
  const handleOpenRejectModal = (login) => {
    setRejectingLogin(login);
    setRejectionRemarks('');
  };

  // Confirm Rejection (Req 5: if reject enter remarks)
  const handleConfirmRejection = (e) => {
    e.preventDefault();
    if (!rejectingLogin) return;
    if (!rejectionRemarks.trim()) {
      alert('Please enter rejection remarks / reason');
      return;
    }

    rejectLogin(rejectingLogin.id, {
      remarks: rejectionRemarks.trim()
    });

    setRejectingLogin(null);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-700">Bank Files Console:</span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-burgundy-50 text-burgundy-900 border border-burgundy-200">
            {currentUser?.name || 'User'} ({currentUser?.role || 'RM'})
          </span>
          {!isAdminOrManager && (
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              • Showing only your personal assigned & logged files
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setCustomerMobile('');
            setSelectedCustomerId('');
            setSourceCustomerId('');
            setCustomerName('');
            setCustomerDob('');
            setCustomerBusiness('');
            setCustomerCity('');
            setBankName('');
            setBankId('');
            setLoanType('Personal Loan');
            setLoanAmount('');
            setInterestRate('');
            setInitialNotes('');
            setShowNumberSuggestions(false);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-gold-500 hover:bg-gold-600 px-4 py-2.5 text-xs font-bold text-amber-950 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Bank Login</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Files Logged In</span>
          <span className="text-2xl font-black text-slate-900">{totalLoginsCount}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Across partner banks</span>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-blue-800 block">In Bank Processing</span>
          <span className="text-2xl font-black text-blue-900">{inProgressCount}</span>
          <span className="text-[10px] text-blue-700 block mt-1">Active file appraisals</span>
        </div>

        {/* 2-Day Routine Reminder KPI */}
        <div className={`rounded-2xl border p-4 shadow-sm transition ${
          updatesDueCount > 0
            ? 'border-amber-400 bg-amber-50/90 ring-2 ring-amber-400/20'
            : 'border-slate-200 bg-white'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-900 block">2-Day Updates Due</span>
            {updatesDueCount > 0 && (
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <span className="text-2xl font-black text-amber-900">{updatesDueCount}</span>
          <span className="text-[10px] text-amber-800 block mt-1 font-semibold">
            {updatesDueCount > 0 ? 'Action required today!' : 'All files up to date'}
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">Disbursed Volume</span>
          <span className="text-xl font-black text-emerald-900">{formatCurrency(disbursedVolume)}</span>
          <span className="text-[10px] text-emerald-700 block mt-1 font-semibold">{disbursedLogins.length} files successfully funded</span>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-rose-800 block">Rejected Files</span>
          <span className="text-2xl font-black text-rose-900">{rejectedCount}</span>
          <span className="text-[10px] text-rose-700 block mt-1">Declined with remarks</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdminOrManager ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3`}>
          {/* Universal Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, mobile, bank, loan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800"
            />
          </div>

          {/* Executive / RM Filter (Visible to Admin & Manager) */}
          {isAdminOrManager && (
            <div>
              <select
                value={executiveFilter}
                onChange={(e) => setExecutiveFilter(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 bg-white"
              >
                <option value="All">All Executives / RMs</option>
                {employees
                  .filter(emp => emp.status !== 'Inactive')
                  .map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 bg-white"
            >
              <option value="All">All File Statuses</option>
              <option value="In Progress">In Progress (Bank Appraisal)</option>
              <option value="Disbursed">Disbursed ("Disposement")</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Bank Filter */}
          <div>
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 bg-white"
            >
              <option value="All">All Partner Banks</option>
              {distinctBanks.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Date Range Selector */}
          <div>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={dateRangeType}
                onChange={(e) => setDateRangeType(e.target.value)}
                className={`w-full text-xs rounded-xl border py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800 bg-white transition ${
                  dateRangeType !== 'all' ? 'border-burgundy-800 text-burgundy-900 bg-burgundy-50/40 font-bold' : 'border-slate-300 text-slate-700'
                }`}
              >
                <option value="all">Date: All Time</option>
                <option value="today">Date: Today</option>
                <option value="week">Date: Last 7 Days</option>
                <option value="month">Date: This Month</option>
                <option value="custom">Date: Custom Date Range</option>
              </select>
            </div>
          </div>

          {/* 2-Day Due Toggle */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setOnlyDueReminders(!onlyDueReminders)}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition ${
                onlyDueReminders
                  ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-400/20'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-700" />
              <span>{onlyDueReminders ? '✓ 2-Day Updates Due' : 'Filter 2-Day Due'}</span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Panel (Visible when Custom Date Range is selected) */}
        {dateRangeType === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-[#FAF6EF]/60 p-3 rounded-xl border border-gold-200/50">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-burgundy-800" /> Start Date:
                </span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">End Date:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              {/* Quick Presets for Custom Picker */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate(todayStr);
                    setCustomEndDate(todayStr);
                  }}
                  className="px-2 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    setCustomStartDate(d.toISOString().split('T')[0]);
                    setCustomEndDate(todayStr);
                  }}
                  className="px-2 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstDay = `${todayStr.slice(0, 7)}-01`;
                    setCustomStartDate(firstDay);
                    setCustomEndDate(todayStr);
                  }}
                  className="px-2 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                >
                  This Month
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(customStartDate || customEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="flex items-center gap-1 text-xs text-rose-700 hover:text-rose-900 font-bold px-2 py-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Dates</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Filters Summary Strip */}
        {(dateRangeType !== 'all' || statusFilter !== 'All' || bankFilter !== 'All' || searchTerm || onlyDueReminders) && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-600">Active Filters:</span>
              {dateRangeType !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-burgundy-50 text-burgundy-900 border border-burgundy-200 text-[11px] font-semibold">
                  <Calendar className="w-3 h-3 text-burgundy-700" />
                  {dateRangeType === 'today' && 'Today'}
                  {dateRangeType === 'week' && 'Last 7 Days'}
                  {dateRangeType === 'month' && 'This Month'}
                  {dateRangeType === 'custom' && (
                    customStartDate || customEndDate
                      ? `${customStartDate || 'Any'} to ${customEndDate || 'Any'}`
                      : 'Custom Range'
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setDateRangeType('all');
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="ml-1 hover:text-rose-600"
                  >
                    ×
                  </button>
                </span>
              )}
              {statusFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                  Status: {statusFilter}
                  <button type="button" onClick={() => setStatusFilter('All')} className="ml-1 hover:text-rose-600">×</button>
                </span>
              )}
              {bankFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                  Bank: {bankFilter}
                  <button type="button" onClick={() => setBankFilter('All')} className="ml-1 hover:text-rose-600">×</button>
                </span>
              )}
              {onlyDueReminders && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold">
                  2-Day Due
                  <button type="button" onClick={() => setOnlyDueReminders(false)} className="ml-1 hover:text-rose-600">×</button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                  Query: "{searchTerm}"
                  <button type="button" onClick={() => setSearchTerm('')} className="ml-1 hover:text-rose-600">×</button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('All');
                setBankFilter('All');
                setOnlyDueReminders(false);
                setDateRangeType('all');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="text-xs text-rose-700 hover:text-rose-900 font-bold underline cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[950px]">
            <thead className="bg-[#FAF6EF] text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Customer ID</th>
                <th className="px-4 py-3">Customer / Enterprise (CRM)</th>
                <th className="px-4 py-3">Bank & Loan Value</th>
                <th className="px-4 py-3">2-Day Reminder & Updates</th>
                <th className="px-4 py-3">File Status</th>
                <th className="px-4 py-3 text-center">Disburse / Reject</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            {groupedCustomerLogins.length === 0 ? (
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    No bank login records found matching criteria.
                  </td>
                </tr>
              </tbody>
            ) : (
              paginatedCustomerRecords.map(customerGroup => {
                const totalLogins = customerLoginsCountMap[clean10Digits(customerGroup.mobile)] || customerGroup.logins.length;
                const loginsList = customerGroup.logins;
                const rowCount = loginsList.length;

                return (
                  <tbody key={customerGroup.key} className="border-b border-slate-200 divide-y divide-slate-100 hover:bg-slate-50/40 transition">
                    {loginsList.map((login, idx) => {
                      const isDue = is2DayUpdateDue(login);
                      const lastUpdate = login.updates?.[0];
                      const isFirstRow = idx === 0;

                      return (
                        <tr
                          key={login.id || `${customerGroup.key}_${login.bankName}_${idx}`}
                          className={`transition ${isDue ? 'bg-amber-50/30' : ''}`}
                        >
                          {/* Customer ID & Customer Info (Render ONCE per customer spanning all bank logins) */}
                          {isFirstRow && (
                            <>
                              {/* Customer ID & Date */}
                              <td rowSpan={rowCount} className="px-4 py-3 align-top border-r border-slate-100/80">
                                <span className="font-mono font-bold text-burgundy-900 block text-xs">
                                  {formatDisplayCustomerId(customerGroup.customerId)}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Logged: {formatDate(login.loginDate)}
                                </span>
                              </td>

                              {/* Customer Info (CRM) */}
                              <td rowSpan={rowCount} className="px-4 py-3 align-top border-r border-slate-100/80">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => setViewHistoryLogin(login)}
                                    className="font-bold text-slate-900 hover:text-burgundy-900 hover:underline text-left cursor-pointer transition"
                                    title="Click to view customer & file profile"
                                  >
                                    {customerGroup.customerName}
                                  </button>
                                  <span
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-burgundy-50 text-burgundy-900 border border-burgundy-200"
                                    title={`This customer has ${totalLogins} bank file${totalLogins > 1 ? 's' : ''} logged`}
                                  >
                                    {totalLogins} {totalLogins === 1 ? 'Login' : 'Logins'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Building2 className="w-3 h-3 text-slate-400" />
                                  <span>{customerGroup.business} • {customerGroup.city}</span>
                                </div>
                                <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5">
                                  <span className="font-mono">{formatMobileNumber(customerGroup.mobile)}</span>
                                  {customerGroup.dob && (
                                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-sans">
                                      DOB: {formatDate(customerGroup.dob)}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </>
                          )}

                          {/* Bank & Loan Value */}
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(rowCount > 1 || totalLogins > 1) && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-burgundy-900 bg-burgundy-50 px-1.5 py-0.2 rounded border border-burgundy-200">
                                  File #{login.fileNumber || (idx + 1)}
                                </span>
                              )}
                              <span className="font-bold text-slate-800">{login.bankName}</span>
                            </div>
                            {login.bankId && (
                              <div className="text-[10px] font-mono text-slate-500 mt-0.5">Bank ID: {login.bankId}</div>
                            )}
                            <div className="text-xs font-bold text-burgundy-900 mt-0.5">
                              {renderLoanAmount(login.loanAmount)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {login.loanType}
                              {login.interestRate && <span className="text-amber-800 font-semibold ml-1.5">• ROI: {login.interestRate}</span>}
                            </div>
                          </td>

                          {/* 2-Day Reminder & Updates */}
                          <td className="px-4 py-3 align-top">
                            {login.status === 'In Progress' ? (
                              <div>
                                {isDue ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span>2-Day Update Due! ({login.nextFollowUpDate})</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-600 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>Next Due: {formatDate(login.nextFollowUpDate)}</span>
                                  </span>
                                )}

                                {lastUpdate && (
                                  <div className="text-[10px] text-slate-500 italic mt-1 line-clamp-1 max-w-xs" title={lastUpdate.note}>
                                    Last ({formatDate(lastUpdate.date)}): "{lastUpdate.note}"
                                  </div>
                                )}
                              </div>
                            ) : login.status === 'Disbursed' ? (
                              <div className="text-[11px] text-emerald-800 font-semibold">
                                Disbursed: {renderLoanAmount(login.disbursementDetails?.loanAmount)} ({login.disbursementDetails?.bankName})
                              </div>
                            ) : (
                              <div className="text-[11px] text-rose-800 italic line-clamp-1 max-w-xs" title={login.rejectionRemarks}>
                                Reason: {login.rejectionRemarks || 'Declined by bank'}
                              </div>
                            )}
                          </td>

                          {/* File Status */}
                          <td className="px-4 py-3 align-top">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              login.status === 'Disbursed'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20'
                                : login.status === 'Rejected'
                                ? 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-500/20'
                                : 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-500/20'
                            }`}>
                              {login.status === 'Disbursed' ? '✓ Disbursed' : login.status}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {login.assignedToRole === 'Sales Manager' ? 'Sales Manager' : 'RM'}: {login.assignedRMName}
                            </div>
                          </td>

                          {/* Disburse / Reject Column */}
                          <td className="px-4 py-3 text-center align-top">
                            <div className="inline-flex items-center justify-center gap-1.5 flex-nowrap">
                              {login.status === 'In Progress' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDisburseModal(login)}
                                    className="h-7 px-2.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition flex items-center gap-1.5 shadow-2xs"
                                    title="Convert file to Disbursement"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Disburse</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRejectModal(login)}
                                    className="h-7 px-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold transition flex items-center gap-1.5 shadow-2xs"
                                    title="Mark Rejected by Bank with remarks"
                                  >
                                    <X className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              ) : login.status === 'Disbursed' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Disbursed</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Rejected</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions Column */}
                          <td className="px-4 py-3 text-center align-top">
                            <div className="inline-flex items-center justify-center gap-1.5 flex-nowrap">
                              {login.status === 'In Progress' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUpdatingLogin(login);
                                      setTodayUpdateNote('');
                                    }}
                                    className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
                                      isDue
                                        ? 'bg-amber-500 hover:bg-amber-600 text-amber-950 ring-1 ring-amber-600/30 shadow-xs animate-pulse'
                                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                                    }`}
                                    title="Add Today's Update / Next Action (2-day cycle)"
                                  >
                                    <Clock className={`w-3.5 h-3.5 ${isDue ? 'text-amber-950' : 'text-slate-500'}`} />
                                    <span>{isDue ? 'Update Due!' : 'Update'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setViewHistoryLogin(login)}
                                    className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition flex items-center gap-1.5 shadow-2xs"
                                    title="View Customer & Bank File Profile"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                                    <span>View</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setViewHistoryLogin(login)}
                                  className="h-7 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition flex items-center gap-1.5 shadow-2xs"
                                  title="View File Details & Follow-up Timeline"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>View Details</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                );
              })
            )}
          </table>
        </div>

        {/* Reusable Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={groupedCustomerLogins.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          summaryLabel="customer records"
        />
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: ADD BANK LOGIN (Req 4, 6)                   */}
      {/* ---------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-3xl md:max-w-4xl xl:max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gold-300 block">Bank Syndication</span>
                <h3 className="text-base font-bold text-white">Add New Bank File Login</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLogin} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {/* Step 1: Enter / Select Mobile Number */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    autoFocus
                    placeholder="Enter 10-digit mobile number to check database..."
                    value={customerMobile}
                    onChange={(e) => {
                      setCustomerMobile(e.target.value);
                      setShowNumberSuggestions(true);
                    }}
                    onFocus={() => setShowNumberSuggestions(true)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800 focus:ring-1 focus:ring-burgundy-800"
                  />
                </div>

                {/* Matching Number Suggestions Dropdown */}
                {showNumberSuggestions && matchingPhoneRecords.length > 0 && (
                  <div className="mt-1 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden divide-y divide-slate-100">
                    <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Select Matching Number from Database
                    </div>
                    {matchingPhoneRecords.map((rec) => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => handleSelectSuggestedRecord(rec)}
                        className="w-full text-left px-3 py-2 hover:bg-burgundy-50/70 transition flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-burgundy-900">{formatMobileNumber(rec.mobile)}</span>
                          <span className="font-semibold text-slate-800">{rec.name}</span>
                          {rec.loginCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-burgundy-50 text-burgundy-800 border border-burgundy-200">
                              {rec.loginCount} {rec.loginCount === 1 ? 'Login' : 'Logins'}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 truncate max-w-[160px]">
                          {rec.business || rec.city || 'Database'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Lookup Status Banner */}
                {entered10.length === 10 && lookupResult && (
                  <div className="mt-2 space-y-2">
                    {/* Processing / Follow-up Conflict Alerts */}
                    {lookupResult.alerts.map((al, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold ${
                          al.severity === 'danger'
                            ? 'border-rose-300 bg-rose-50 text-rose-900 shadow-xs'
                            : al.severity === 'info'
                            ? 'border-blue-300 bg-blue-50/90 text-blue-950 shadow-xs'
                            : 'border-amber-300 bg-amber-50 text-amber-900'
                        }`}
                      >
                        {al.severity === 'danger' ? (
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                        ) : al.severity === 'info' ? (
                          <Building2 className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                        )}
                        <div>
                          <span>{al.message}</span>
                          {al.severity === 'danger' && (
                            <p className="mt-0.5 text-[10px] font-normal text-rose-700">
                              Customer details are hidden and Bank Login file creation is strictly disallowed because this contact is actively managed by another executive.
                            </p>
                          )}
                          {al.severity === 'info' && al.logins && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {al.logins.map((b, idx) => (
                                <span key={idx} className="bg-white px-2 py-0.5 rounded border border-blue-200 text-[10px] font-semibold text-blue-900">
                                  {b.bankName} • {renderLoanAmount(b.loanAmount)} ({b.status})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {!hasConflict && (
                      lookupResult.foundInDb ? (
                        <div className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50/80 px-3 py-2 text-[11px] text-emerald-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold flex items-center gap-1.5">
                              <span>Existing Customer Found — Details Fetched</span>
                              {lookupResult.matchedLogins?.length > 0 && (
                                <span className="font-normal text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300">
                                  {lookupResult.matchedLogins.length} {lookupResult.matchedLogins.length === 1 ? 'Login on File' : 'Logins on File'} • Creating File #{lookupResult.matchedLogins.length + 1}
                                </span>
                              )}
                            </span>
                            <span className="text-emerald-800">
                              {lookupResult.matchedCustomer?.isCustomer
                                ? `Customer ID: ${lookupResult.matchedCustomer.customerId || lookupResult.matchedCustomer.id}`
                                : lookupResult.matchedLogins?.[0]?.customerId
                                ? `Customer ID: ${lookupResult.matchedLogins[0].customerId}`
                                : 'Found in Database records — you can review details below and add a new bank login.'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-[11px] text-blue-900">
                          <User className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">New Customer Number</span>
                            <span className="text-blue-800">Not found in database. Enter customer details below to add and save.</span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {entered10.length < 10 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-xs text-slate-500">
                  Please enter a 10-digit mobile number above to verify database records.
                </div>
              ) : hasConflict ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-5 text-center my-2">
                  <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-rose-900 mb-1">
                    {lookupResult?.matchedLogin ? 'Duplicate Bank Login Prohibited' : 'Bank Login Creation Restricted'}
                  </h4>
                  <p className="text-xs text-rose-700 max-w-sm mx-auto">
                    {lookupResult?.matchedLogin
                      ? `This customer already has an active Bank Login file (${lookupResult.matchedLogin.bankName} — Status: ${lookupResult.matchedLogin.status}). Creating duplicate bank logins for this customer is not allowed.`
                      : 'This customer is currently assigned to or being followed by another executive. Bank Login file creation is restricted.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Customer Profile Details (Non-editable when existing customer is found) */}
                  <div className="space-y-2.5 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Customer Profile Details</span>
                      </span>
                      {isExistingCustomer && (
                        <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-slate-500" />
                          <span>Profile Data (Non-editable)</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 truncate">
                          Customer Name {!isExistingCustomer && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="text"
                          required={!isExistingCustomer}
                          readOnly={isExistingCustomer}
                          disabled={isExistingCustomer}
                          placeholder={isExistingCustomer ? '' : "e.g. S. Ramanathan"}
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className={`w-full text-xs rounded-xl border py-2 px-3 transition focus:outline-none ${
                            isExistingCustomer
                              ? 'bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed select-none font-medium'
                              : 'bg-white border-slate-300 focus:border-burgundy-800'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 truncate">
                          Date of Birth
                        </label>
                        {isExistingCustomer ? (
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={customerDob || '—'}
                            className="w-full text-xs rounded-xl border border-slate-200 py-2 px-3 bg-slate-100/90 text-slate-700 cursor-not-allowed select-none font-medium focus:outline-none"
                          />
                        ) : (
                          <input
                            type="date"
                            value={customerDob}
                            onChange={(e) => setCustomerDob(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800 bg-white"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 truncate">
                          Business / Enterprise
                        </label>
                        <input
                          type="text"
                          readOnly={isExistingCustomer}
                          disabled={isExistingCustomer}
                          placeholder={isExistingCustomer ? '—' : "e.g. Ramanathan Silks & Exports"}
                          value={customerBusiness}
                          onChange={(e) => setCustomerBusiness(e.target.value)}
                          className={`w-full text-xs rounded-xl border py-2 px-3 transition focus:outline-none ${
                            isExistingCustomer
                              ? 'bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed select-none font-medium'
                              : 'bg-white border-slate-300 focus:border-burgundy-800'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 truncate">
                          Location / City
                        </label>
                        <input
                          type="text"
                          readOnly={isExistingCustomer}
                          disabled={isExistingCustomer}
                          placeholder={isExistingCustomer ? '—' : "e.g. Chennai, Madurai"}
                          value={customerCity}
                          onChange={(e) => setCustomerCity(e.target.value)}
                          className={`w-full text-xs rounded-xl border py-2 px-3 transition focus:outline-none ${
                            isExistingCustomer
                              ? 'bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed select-none font-medium'
                              : 'bg-white border-slate-300 focus:border-burgundy-800'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bank Syndication & Loan Specifications */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Bank Syndication & Loan Specifications</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Bank / Lending Institution <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          list="bank-suggestions"
                          placeholder="e.g. State Bank of India, HDFC..."
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                        />
                        <datalist id="bank-suggestions">
                          <option value="State Bank of India" />
                          <option value="HDFC Bank" />
                          <option value="ICICI Bank" />
                          <option value="Axis Bank" />
                          <option value="Indian Bank" />
                          <option value="Canara Bank" />
                          <option value="Kotak Mahindra Bank" />
                          <option value="Bank of Baroda" />
                          <option value="Punjab National Bank" />
                          <option value="Federal Bank" />
                          <option value="Bajaj Finserv" />
                          <option value="Cholamandalam Finance" />
                          <option value="Sundaram Finance" />
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Bank ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. SBI-CH-88219 / Ref No."
                          value={bankId}
                          onChange={(e) => setBankId(e.target.value)}
                          className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Loan Type <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={loanType}
                          onChange={(e) => setLoanType(e.target.value)}
                          className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white focus:outline-none focus:border-burgundy-800"
                        >
                          <option value="Personal Loan">Personal Loan</option>
                          <option value="Business Loan">Business Loan</option>
                          <option value="Housing Loan">Housing Loan</option>
                          <option value="Mortgage Loan (LAP)">Mortgage Loan (LAP)</option>
                          <option value="Used Car Loans & Commercial Vehicle Refinance">Used Car Loans & Commercial Vehicle Refinance</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Rate of Interest
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 8.75% or 9.5% p.a."
                          value={interestRate}
                          onChange={(e) => setInterestRate(e.target.value)}
                          className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Loan Amount <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 25,00,000 or 25 Lakhs"
                          value={loanAmount}
                          onChange={(e) => setLoanAmount(e.target.value)}
                          className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-burgundy-800"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Login Submission Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Branch ref no., submitted to branch manager, initial document checklist cleared"
                      value={initialNotes}
                      onChange={(e) => setInitialNotes(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-burgundy-800"
                    />
                  </div>

                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Routine 2-day reminder will automatically trigger for bank follow-up after login.</span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={hasConflict || entered10.length !== 10}
                  className={`px-5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                    hasConflict || entered10.length !== 10
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'text-white bg-burgundy-900 hover:bg-burgundy-800 shadow-md'
                  }`}
                  title={
                    hasConflict
                      ? 'Creation Restricted: Contact followed by another user'
                      : entered10.length !== 10
                      ? 'Enter 10-digit mobile number first'
                      : 'Create Bank Login'
                  }
                >
                  {hasConflict
                    ? 'Creation Restricted'
                    : lookupResult?.matchedLogins?.length > 0
                    ? '+ Add Additional Bank Login'
                    : 'Create Bank Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: 2-DAY UPDATE & NEXT ACTION (Req 4)          */}
      {/* ---------------------------------------------------- */}
      {updatingLogin && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-600 to-amber-800 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-200 block">2-Day Bank Follow-up</span>
                <h3 className="text-base font-bold text-white">Log Today's Bank Update</h3>
              </div>
              <button
                onClick={() => setUpdatingLogin(null)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUpdate} className="p-6 space-y-4">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs">
                <div className="font-bold text-amber-950">{updatingLogin.customerName}</div>
                <div className="text-amber-800 mt-0.5">{updatingLogin.bankName} • {updatingLogin.loanType} ({formatCurrency(updatingLogin.loanAmount)})</div>
                <div className="text-[11px] text-amber-900/80 font-mono mt-1">
                  Last Update: {updatingLogin.lastUpdateDate}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  What is Today's Update / Next Action? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Bank field officer completed inspection, valuation report cleared, sanction letter expected in 2 days..."
                  value={todayUpdateNote}
                  onChange={(e) => setTodayUpdateNote(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-200">
                💡 Submitting this update automatically resets the 2-day reminder timer and logs it in file history.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUpdatingLogin(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-md transition"
                >
                  Save Today's Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: CONVERT TO DISBURSEMENT (Req 5)             */}
      {/* ---------------------------------------------------- */}
      {disbursingLogin && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300 block">Loan Funded</span>
                <h3 className="text-base font-bold text-white">Convert to Disbursement ("Disposement")</h3>
              </div>
              <button
                onClick={() => setDisbursingLogin(null)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDisbursement} className="p-6 space-y-3.5">
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 text-xs">
                <div className="font-bold text-emerald-950">{disbursingLogin.customerName}</div>
                <div className="text-emerald-800 font-mono mt-0.5">{formatMobileNumber(disbursingLogin.mobile)} • {disbursingLogin.business}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Disbursing Bank Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Bank of India"
                  value={disburseBankName}
                  onChange={(e) => setDisburseBankName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Disbursed Loan Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter disbursed amount manually (e.g. 25,00,000 or 25 Lakhs)..."
                    value={disburseLoanAmount}
                    onChange={(e) => setDisburseLoanAmount(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-emerald-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Type of Loan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="disburse-loan-types"
                    placeholder="e.g. Personal Loan, Business Loan"
                    value={disburseLoanType}
                    onChange={(e) => setDisburseLoanType(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-emerald-700"
                  />
                  <datalist id="disburse-loan-types">
                    <option value="Personal Loan" />
                    <option value="Business Loan" />
                    <option value="Housing Loan" />
                    <option value="Mortgage Loan (LAP)" />
                    <option value="Used Car Loans & Commercial Vehicle Refinance" />
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Disbursement Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={disburseDate}
                  onChange={(e) => setDisburseDate(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sanction & Disbursement Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter sanction & disbursement remarks manually (e.g. ROI 9%, tenure 5 yrs, loan account number, processing fee deducted...)"
                  value={disburseRemarks}
                  onChange={(e) => setDisburseRemarks(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDisbursingLogin(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>OK • Confirm Disbursement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: REJECT LOGIN WITH REMARKS (Req 5)          */}
      {/* ---------------------------------------------------- */}
      {rejectingLogin && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-800 to-rose-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-rose-300 block">File Rejection</span>
                <h3 className="text-base font-bold text-white">Bank Rejection Remarks</h3>
              </div>
              <button
                onClick={() => setRejectingLogin(null)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejection} className="p-6 space-y-4">
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs">
                <div className="font-bold text-rose-950">{rejectingLogin.customerName}</div>
                <div className="text-rose-800 mt-0.5">{rejectingLogin.bankName} • {rejectingLogin.loanType} ({formatCurrency(rejectingLogin.loanAmount)})</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Enter Rejection Remarks / Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. CIBIL score issue, income eligibility not met, collateral valuation shortfall, customer cancelled..."
                  value={rejectionRemarks}
                  onChange={(e) => setRejectionRemarks(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:outline-none focus:border-rose-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingLogin(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-md transition"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 5: COMPLETE CUSTOMER & BANK FILE DETAILS       */}
      {/* ---------------------------------------------------- */}
      {viewHistoryLogin && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-4xl xl:max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gold-300 block">Bank File & Customer Profile</span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{viewHistoryLogin.customerName}</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-gold-200 border border-white/10">
                    {formatDisplayCustomerId(viewHistoryLogin.customerId || viewHistoryLogin.id)}
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/15 text-gold-200 border border-white/20">
                  {viewCustomerAllLogins.length} {viewCustomerAllLogins.length === 1 ? 'Bank Login' : 'Bank Logins'}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  viewHistoryLogin.status === 'Disbursed'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : viewHistoryLogin.status === 'Rejected'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-blue-600 text-white shadow-xs'
                }`}>
                  {viewHistoryLogin.status}
                </span>
                <button
                  onClick={() => setViewHistoryLogin(null)}
                  className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto text-xs text-slate-700">
              {/* Section 1: Customer Personal & Contact Details */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center gap-2 text-burgundy-900 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/80 pb-2">
                  <User className="w-4 h-4 text-burgundy-900" />
                  <span>Customer Profile Details</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Customer Name</span>
                    <span className="text-xs font-bold text-slate-900 mt-0.5 block">{viewHistoryLogin.customerName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Mobile Number</span>
                    <span className="text-xs font-mono font-bold text-slate-800 mt-0.5 block">{formatMobileNumber(viewHistoryLogin.mobile)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Date of Birth (DOB)</span>
                    <span className="text-xs font-semibold text-slate-800 mt-0.5 block">
                      {viewHistoryLogin.dob ? formatDate(viewHistoryLogin.dob) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Customer ID</span>
                    <span className="text-xs font-mono font-bold text-burgundy-900 mt-0.5 block">
                      {formatDisplayCustomerId(viewHistoryLogin.customerId || viewHistoryLogin.id)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Business / Enterprise</span>
                    <span className="text-xs font-semibold text-slate-800 mt-0.5 block">{viewHistoryLogin.business || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Location / City</span>
                    <span className="text-xs font-semibold text-slate-800 mt-0.5 block">{viewHistoryLogin.city || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Bank Logins</span>
                    <span className="text-xs font-bold text-burgundy-900 mt-0.5 block">
                      {viewCustomerAllLogins.length} {viewCustomerAllLogins.length === 1 ? 'Login on File' : 'Logins on File'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Multiple Bank Files List for this Customer */}
              {viewCustomerAllLogins.length > 1 && (
                <div className="rounded-2xl border border-burgundy-200/80 bg-burgundy-50/30 p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-burgundy-100 pb-2">
                    <div className="flex items-center gap-2 text-burgundy-900 font-bold uppercase tracking-wider text-[11px]">
                      <Building2 className="w-4 h-4 text-burgundy-900" />
                      <span>All Bank Logins for this Customer ({viewCustomerAllLogins.length})</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Click a file below to switch view</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {viewCustomerAllLogins
                      .slice()
                      .sort((a, b) => (a.fileNumber ?? 9999) - (b.fileNumber ?? 9999))
                      .map((bl, bIdx) => (
                      <div
                        key={bl.id}
                        onClick={() => setViewHistoryLogin(bl)}
                        className={`p-2.5 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between ${
                          bl.id === viewHistoryLogin.id
                            ? 'border-burgundy-700 bg-white ring-2 ring-burgundy-700/20 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-bold text-burgundy-900 bg-burgundy-100 px-1.5 py-0.2 rounded border border-burgundy-200">
                              File #{bl.fileNumber || (bIdx + 1)}
                            </span>
                            <span className="font-bold text-slate-900">{bl.bankName}</span>
                            {bl.id === viewHistoryLogin.id && (
                              <span className="text-[9px] bg-burgundy-100 text-burgundy-900 px-1 rounded font-bold">Viewing</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {bl.loanType} • {renderLoanAmount(bl.loanAmount)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bl.status === 'Disbursed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : bl.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {bl.status}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{formatDate(bl.loginDate)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Bank & Loan File Details */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-burgundy-900 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100 pb-2">
                  <Building2 className="w-4 h-4 text-burgundy-900" />
                  <span>Bank Syndication & Loan Specifications</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Bank / Institution</span>
                    <span className="text-xs font-bold text-slate-900 mt-0.5 block">{viewHistoryLogin.bankName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Bank File / Reference ID</span>
                    <span className="text-xs font-mono font-semibold text-slate-800 mt-0.5 block">{viewHistoryLogin.bankId || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Type of Loan</span>
                    <span className="text-xs font-semibold text-slate-800 mt-0.5 block">{viewHistoryLogin.loanType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Rate of Interest</span>
                    <span className="text-xs font-bold text-amber-900 mt-0.5 block">
                      {viewHistoryLogin.interestRate ? `${viewHistoryLogin.interestRate}` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Loan Amount Requested</span>
                    <span className="text-sm font-black text-burgundy-900 mt-0.5 block">
                      {renderLoanAmount(viewHistoryLogin.loanAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">File Login Date</span>
                    <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{formatDate(viewHistoryLogin.loginDate)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Assigned RM</span>
                    <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{viewHistoryLogin.assignedRMName || 'Ananya Subramanian'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Next 2-Day Due Date</span>
                    <span className="text-xs font-bold text-amber-800 mt-0.5 block flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>{formatDate(viewHistoryLogin.nextFollowUpDate)}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Disbursement Info (if Disbursed) */}
              {viewHistoryLogin.disbursementDetails && (
                <div className="p-4 bg-emerald-50/90 rounded-2xl border border-emerald-200 text-xs space-y-2">
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Disbursement ("Disposement") Confirmed</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                    <div>
                      <span className="text-emerald-700 text-[10px] font-semibold uppercase block">Disbursed Amount</span>
                      <span className="font-bold text-emerald-950 text-xs">{renderLoanAmount(viewHistoryLogin.disbursementDetails.loanAmount)}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 text-[10px] font-semibold uppercase block">Disbursement Bank</span>
                      <span className="font-semibold text-emerald-900">{viewHistoryLogin.disbursementDetails.bankName}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 text-[10px] font-semibold uppercase block">Disbursement Date</span>
                      <span className="font-semibold text-emerald-900">{formatDate(viewHistoryLogin.disbursementDetails.disbursementDate)}</span>
                    </div>
                  </div>
                  {viewHistoryLogin.disbursementDetails.remarks && (
                    <div className="text-[11px] text-emerald-800 bg-white/70 p-2 rounded-xl border border-emerald-200/60 mt-1">
                      <span className="font-semibold">Remarks:</span> {viewHistoryLogin.disbursementDetails.remarks}
                    </div>
                  )}
                </div>
              )}

              {/* Rejection Remarks (if Rejected) */}
              {viewHistoryLogin.rejectionRemarks && (
                <div className="p-4 bg-rose-50/90 rounded-2xl border border-rose-200 text-xs space-y-1.5">
                  <div className="font-bold text-rose-950 flex items-center gap-1.5 text-xs">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>File Rejection Details</span>
                  </div>
                  <div className="text-rose-900 bg-white/70 p-2.5 rounded-xl border border-rose-200/60 text-xs font-medium">
                    {viewHistoryLogin.rejectionRemarks}
                  </div>
                </div>
              )}

              {/* Section 3: Follow-up & 2-Day Update History */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Routine Updates & Notes ({(viewHistoryLogin.updates || []).length})</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 italic">2-day reminder cycle</span>
                </div>

                {(viewHistoryLogin.updates || []).length === 0 ? (
                  <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                    No update notes logged yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {viewHistoryLogin.updates.map((u, idx) => (
                      <div key={u.id || idx} className="p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold text-burgundy-900">{formatDate(u.date)}</span>
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">by {u.updatedBy || 'RM'}</span>
                        </div>
                        <p className="text-slate-800 leading-relaxed font-medium">{u.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                  <span>Customer Logins:</span>
                  <strong className="text-burgundy-900 font-bold bg-burgundy-50 px-2 py-0.5 rounded border border-burgundy-200">
                    {viewCustomerAllLogins.length} {viewCustomerAllLogins.length === 1 ? 'Bank File' : 'Bank Files'}
                  </strong>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAddModalForCustomer(viewHistoryLogin)}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition flex items-center gap-1.5"
                    title="Add another bank loan file for this customer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Bank Login</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewHistoryLogin(null)}
                    className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
