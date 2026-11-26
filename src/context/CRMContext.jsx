import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_CUSTOMERS,
  INITIAL_CALL_HISTORY,
  INITIAL_DAILY_ACTIVITIES,
  INITIAL_PERFORMANCE_CASES,
  INITIAL_RESIGNATIONS,
  INITIAL_ADVANCE_AMOUNTS,
  INITIAL_ATTENDANCE,
  INITIAL_EMPLOYEES,
  INITIAL_WEBSITE_ENQUIRIES,
  INITIAL_LEADS,
  INITIAL_BANK_LOGINS,
  INITIAL_LEAVES
} from '../data/mockData';
import { useAuth } from './AuthContext';
import { formatDateDDMMYYYY } from '../utils/formatters';

const CRMContext = createContext();

const STORAGE_KEYS = {
  CUSTOMERS: 'rajalakshmy_customers_v2',
  CALLS: 'rajalakshmy_calls_v2',
  ACTIVITIES: 'rajalakshmy_activities_v2',
  PERFORMANCE: 'rajalakshmy_performance_v2',
  RESIGNATIONS: 'rajalakshmy_resignations_v2',
  ADVANCES: 'rajalakshmy_advances_v2',
  ATTENDANCE: 'rajalakshmy_attendance_v2',
  ENQUIRIES: 'rajalakshmy_enquiries_v2',
  LEADS: 'rajalakshmy_leads_v2',
  BANK_LOGINS: 'rajalakshmy_bank_logins_v2',
  LEAVES: 'rajalakshmy_leaves_v2',
  EMPLOYEES: 'rajalakshmy_employees_v2',
  CALL_LOCKS: 'rajalakshmy_call_locks_v1'
};

// TODO (Node.js Backend Migration): Replace localStorage call locks + storage event sync with:
// 1. Atomic DB/Redis lock (e.g. locked_by + lock_expires_at, 45s TTL) on contact selection
// 2. Socket.IO real-time sync (lead:locked, lead:released, lead:saved) & socket disconnect auto-release
// 3. 15s server heartbeat & server-side per-RM round-robin queue ordering
const CALL_LOCK_TTL_MS = 45000; // 45s auto-expiry if app closes unexpectedly without firing beforeunload
const SESSION_ID = `SES-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const pruneExpiredCallLocks = (locksObj) => {
  const now = Date.now();
  const cleaned = {};
  Object.entries(locksObj || {}).forEach(([custId, lock]) => {
    if (lock && lock.userId && typeof lock.lockedAt === 'number' && (now - lock.lockedAt) < CALL_LOCK_TTL_MS) {
      cleaned[custId] = lock;
    }
  });
  return cleaned;
};

const readCallLocksFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CALL_LOCKS);
    return saved ? pruneExpiredCallLocks(JSON.parse(saved)) : {};
  } catch {
    return {};
  }
};

const writeCallLocksToStorage = (locksObj) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CALL_LOCKS, JSON.stringify(locksObj));
  } catch (e) {
    console.warn('Could not persist call locks:', e);
  }
};

// Helper to guarantee strictly unique RA-CUST- IDs across all records
export const ensureUniqueCustomerIds = (customerList) => {
  const seenIds = new Set();
  let maxNum = 1000;

  // Normalize all IDs to RA-CUST- format (seamlessly upgrades legacy CUST- IDs)
  const normalizedList = (customerList || []).map(c => {
    let item = c;
    if (c.id && typeof c.id === 'string' && c.id.startsWith('CUST-')) {
      item = { ...c, id: c.id.replace('CUST-', 'RA-CUST-') };
    }
    // Remove auto-injected 'Chennai, Tamil Nadu' for field activities if no actual address was entered
    if (item.city === 'Chennai' && !item.address && (item.submittedBy || item.referenceFrom)) {
      item = { ...item, city: '', state: '' };
    }
    return item;
  });

  // First pass: find maximum numeric ID among valid unique RA-CUST- numbers
  normalizedList.forEach(c => {
    if (c.id && typeof c.id === 'string') {
      const match = c.id.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  });

  // Second pass: assign new unique ID to any record with missing or duplicate ID
  return normalizedList.map(c => {
    if (!c.id || seenIds.has(c.id)) {
      maxNum += 1;
      const assignedId = `RA-CUST-${maxNum}`;
      seenIds.add(assignedId);
      return { ...c, id: assignedId };
    }
    seenIds.add(c.id);
    return c;
  });
};

export const CRMProvider = ({ children }) => {
  const { currentUser, showToast } = useAuth();

  // Clear legacy mock data once to ensure clean slate for user's own live data
  useEffect(() => {
    try {
      const legacyKeys = [
        'rajalakshmy_customers_v1',
        'rajalakshmy_calls_v1',
        'rajalakshmy_activities_v1',
        'rajalakshmy_performance_v1',
        'rajalakshmy_resignations_v1',
        'rajalakshmy_advances_v1',
        'rajalakshmy_attendance_v1',
        'rajalakshmy_enquiries_v1',
        'rajalakshmy_leads_v1',
        'rajalakshmy_bank_logins_v1',
        'rajalakshmy_leaves_v1'
      ];
      legacyKeys.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Could not clear legacy keys:', e);
    }
  }, []);

  // Load from LocalStorage (defaults to clean [] for user's own live data)
  const [customers, setCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return saved ? ensureUniqueCustomerIds(JSON.parse(saved)) : [];
    } catch {
      return [];
    }
  });

  const [calls, setCalls] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CALLS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [performanceCases, setPerformanceCases] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PERFORMANCE);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [resignations, setResignations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RESIGNATIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [advanceAmounts, setAdvanceAmounts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADVANCES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Daily Employee Attendance Records (Punch In Only)
  const [attendance, setAttendance] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Inbound Website Enquiries from https://rajalakshmyassociates.com/
  const [enquiries, setEnquiries] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ENQUIRIES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active Sales Leads Pipeline (Req 2 & 7)
  const [leads, setLeads] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LEADS);
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.map(l => {
        let cleanedRemarks = (l.remarks || '')
          .replace(/\s*\(Converted from telecalling:[^)]*\)/gi, '')
          .replace(/^Converted to Lead from telecalling.*$/gi, '')
          .trim();
        let cleanedCity = l.city === 'Chennai' && !l.address ? '' : (l.city || '');
        let cleanedState = l.state === 'Tamil Nadu' && !l.address ? '' : (l.state || '');
        let cleanedService = (l.requiredService === 'Site Inspection / Loan' || l.requiredService === 'Business Loan') && !l.services?.length
          ? ''
          : (l.requiredService || '');
        let cleanedAmount = Number(l.estimatedAmount) === 2000000 && !l.loanRequirement
          ? 0
          : (Number(l.estimatedAmount) || 0);

        return {
          ...l,
          remarks: cleanedRemarks,
          city: cleanedCity,
          state: cleanedState,
          requiredService: cleanedService,
          estimatedAmount: cleanedAmount
        };
      });
    } catch {
      return [];
    }
  });

  // Bank Loan File Logins (Req 2, 4, 5, 6)
  const [bankLogins, setBankLogins] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BANK_LOGINS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Employee Leaves State
  const [leaves, setLeaves] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LEAVES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Corporate Staff & Personnel State (Persisted in LocalStorage)
  const [employees, setEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not load employees from storage:', e);
    }
    return INITIAL_EMPLOYEES;
  });

  // Active call state for RM telecalling
  const [activeCallContact, setActiveCallContact] = useState(null);
  const [isCallingModalOpen, setIsCallingModalOpen] = useState(false);
  const [callLocks, setCallLocks] = useState(() => readCallLocksFromStorage());

  // Sync call locks with localStorage & clean up session locks on close / user switch
  useEffect(() => {
    const handleBeforeUnload = () => {
      const current = readCallLocksFromStorage();
      let changed = false;
      Object.keys(current).forEach(custId => {
        if (current[custId]?.sessionId === SESSION_ID) {
          delete current[custId];
          changed = true;
        }
      });
      if (changed) {
        writeCallLocksToStorage(current);
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEYS.CALL_LOCKS) {
        setCallLocks(readCallLocksFromStorage());
      } else if (e.key === STORAGE_KEYS.CUSTOMERS && e.newValue) {
        try {
          setCustomers(ensureUniqueCustomerIds(JSON.parse(e.newValue)));
        } catch (err) {
          console.warn(err);
        }
      }
    };

    const expiryInterval = setInterval(() => {
      const latest = readCallLocksFromStorage();
      setCallLocks(prev => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(latest);
        if (prevKeys.length === nextKeys.length && prevKeys.every(k => prev[k]?.lockedAt === latest[k]?.lockedAt)) {
          return prev;
        }
        writeCallLocksToStorage(latest);
        return latest;
      });
    }, 15000);

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(expiryInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Release any lock held by this window session whenever user logs out or switches accounts
  useEffect(() => {
    const current = readCallLocksFromStorage();
    let changed = false;
    Object.keys(current).forEach(custId => {
      if (current[custId]?.sessionId === SESSION_ID && current[custId]?.userId !== currentUser?.id) {
        delete current[custId];
        changed = true;
      }
    });
    if (changed) {
      writeCallLocksToStorage(current);
      setCallLocks(current);
    }
  }, [currentUser?.id]);

  const claimCallLock = (customerId) => {
    if (!customerId || !currentUser?.id) return { ok: true };
    const latest = readCallLocksFromStorage();
    const existing = latest[customerId];
    if (existing && existing.userId !== currentUser.id) {
      setCallLocks(latest);
      return { ok: false, lockedByName: existing.userName || 'another RM' };
    }

    // Release any previous lock held by this session before claiming the new one
    Object.keys(latest).forEach(id => {
      if (latest[id]?.sessionId === SESSION_ID && id !== customerId) {
        delete latest[id];
      }
    });

    latest[customerId] = {
      userId: currentUser.id,
      userName: currentUser.name || 'RM',
      sessionId: SESSION_ID,
      lockedAt: Date.now()
    };
    writeCallLocksToStorage(latest);
    setCallLocks(latest);
    return { ok: true };
  };

  const releaseCallLock = (customerId = null) => {
    const latest = readCallLocksFromStorage();
    let changed = false;
    if (customerId) {
      if (latest[customerId] && (latest[customerId].sessionId === SESSION_ID || latest[customerId].userId === currentUser?.id)) {
        delete latest[customerId];
        changed = true;
      }
    } else {
      Object.keys(latest).forEach(id => {
        if (latest[id]?.sessionId === SESSION_ID) {
          delete latest[id];
          changed = true;
        }
      });
    }
    if (changed) {
      writeCallLocksToStorage(latest);
      setCallLocks(latest);
    }
  };

  const refreshCallLock = (customerId) => {
    if (!customerId || !currentUser?.id) return;
    const latest = readCallLocksFromStorage();
    if (latest[customerId] && latest[customerId].sessionId === SESSION_ID && latest[customerId].userId === currentUser.id) {
      latest[customerId] = { ...latest[customerId], lockedAt: Date.now() };
      writeCallLocksToStorage(latest);
      setCallLocks(latest);
    }
  };

  const isLockedByOther = (customerId) => {
    const lock = callLocks[customerId];
    if (!lock) return false;
    if ((Date.now() - lock.lockedAt) >= CALL_LOCK_TTL_MS) return false;
    return lock.userId !== currentUser?.id;
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  }, [employees]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(calls));
  }, [calls]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(performanceCases));
  }, [performanceCases]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RESIGNATIONS, JSON.stringify(resignations));
  }, [resignations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADVANCES, JSON.stringify(advanceAmounts));
  }, [advanceAmounts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(enquiries));
  }, [enquiries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BANK_LOGINS, JSON.stringify(bankLogins));
  }, [bankLogins]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(leaves));
  }, [leaves]);

  // Reset to clean LocalStorage state
  const resetToFactoryDefaults = () => {
    setCustomers([]);
    setCalls([]);
    setActivities([]);
    setPerformanceCases([]);
    setResignations([]);
    setAdvanceAmounts([]);
    setAttendance([]);
    setEnquiries([]);
    setLeads([]);
    setBankLogins([]);
    setLeaves([]);
    setCallLocks({});
    Object.values(STORAGE_KEYS).forEach(k => {
      try {
        localStorage.setItem(k, JSON.stringify([]));
      } catch (e) {
        console.warn(e);
      }
    });
    showToast('All tables cleared! Ready for your own data in LocalStorage', 'info');
  };

  // Helper to generate next sequential official Customer ID (RA-CUST-XXXX) strictly for verified/converted customers
  const generateOfficialCustomerId = (customerList) => {
    let maxNum = 1000;
    (customerList || []).forEach(c => {
      if (c.isCustomer || (c.services && c.services.length > 0)) {
        const refId = c.customerId || c.id;
        if (refId && typeof refId === 'string') {
          const match = refId.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        }
      }
    });
    return `RA-CUST-${maxNum + 1}`;
  };

  // ----------------------------------------------------
  // CUSTOMER MANAGEMENT
  // ----------------------------------------------------
  const addCustomer = (customerData) => {
    const isOfficialCustomer = Boolean(customerData.isCustomer);
    let newId = customerData.id;

    if (isOfficialCustomer) {
      if (!newId || customers.some(c => c.id === newId || c.customerId === newId)) {
        newId = generateOfficialCustomerId(customers);
      }
    } else if (!newId || customers.some(c => c.id === newId)) {
      let maxDbNum = 1000;
      customers.forEach(c => {
        if (c.id && typeof c.id === 'string') {
          const match = c.id.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (!isNaN(num) && num > maxDbNum) maxDbNum = num;
          }
        }
      });
      newId = `DB-${maxDbNum + 1}`;
    }

    const isSalesMgr = currentUser?.role === 'Sales Manager' || customerData.submittedBy === 'EMP005';
    const resolvedDatabaseType = isSalesMgr ? 'new' : (customerData.databaseType || 'new');

    const newCustomer = {
      id: newId,
      isCustomer: isOfficialCustomer,
      customerId: isOfficialCustomer ? (customerData.customerId || newId) : '',
      name: customerData.name || (customerData.customerType === 'unknown' ? 'Unknown / Lead' : 'Customer'),
      mobile: customerData.mobile,
      altMobile: customerData.altMobile || '',
      business: customerData.business || 'General Business',
      state: customerData.state || '',
      city: customerData.city || '',
      address: customerData.address || '',
      databaseType: resolvedDatabaseType,
      customerType: customerData.customerType || 'known',
      source: customerData.source || 'Bills',
      referenceFrom: customerData.referenceFrom || '',
      assignedTo: customerData.assignedTo !== undefined ? customerData.assignedTo : (isSalesMgr ? '' : (currentUser?.id || '')),
      assignedName: customerData.assignedName !== undefined ? customerData.assignedName : (isSalesMgr ? '' : (currentUser?.name || '')),
      submittedBy: customerData.submittedBy || currentUser?.id || 'EMP005',
      submittedByName: customerData.submittedByName || currentUser?.name || 'Murugan Velu',
      callingStatus: 'Pending',
      lastCallDate: '',
      reminderDate: '',
      reminderRemark: '',
      createdAt: new Date().toISOString().split('T')[0],
      documents: customerData.documents || [],
      services: customerData.services || []
    };

    setCustomers(prev => [newCustomer, ...prev]);

    // Also record into activities log if not already initiated from an activity
    if (!customerData._fromActivity) {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const isKnown = (customerData.customerType || 'known') === 'known';
      const classification = `New Database - ${isKnown ? 'Known' : 'Unknown'}`;

      const newAct = {
        id: `ACT-${Date.now().toString().slice(-4)}`,
        customerName: newCustomer.name,
        mobile: newCustomer.mobile,
        business: newCustomer.business,
        customerType: newCustomer.customerType,
        state: newCustomer.state,
        source: newCustomer.source,
        referenceFrom: newCustomer.referenceFrom || '',
        submittedBy: newCustomer.submittedBy,
        submittedByName: newCustomer.submittedByName,
        submissionDate: dateStr,
        submissionTime: timeStr,
        classifiedTo: classification,
        status: 'Direct Entry'
      };
      setActivities(prev => [newAct, ...prev]);
    }

    showToast(
      resolvedDatabaseType === 'new'
        ? `Added to New Database: ${newCustomer.name} (${newCustomer.id})`
        : `Added customer: ${newCustomer.name} (${newCustomer.id})`,
      'success'
    );
    return newCustomer;
  };

  const updateCustomer = (id, updatedFields) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
    showToast('Customer record updated successfully', 'success');
  };

  const deleteCustomer = (id) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    showToast('Customer record removed', 'info');
  };

  const addCustomerDocument = (customerId, doc) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        const newDocs = c.documents || [];
        const newDocItem = {
          id: `DOC-${Date.now().toString().slice(-4)}`,
          category: doc.category || 'Other Documents',
          name: doc.name || 'document_upload.pdf',
          size: doc.size || '1.2 MB',
          uploadDate: new Date().toISOString().split('T')[0],
          url: doc.url || ''
        };
        return { ...c, documents: [...newDocs, newDocItem] };
      }
      return c;
    }));
    showToast('Document uploaded successfully', 'success');
  };

  const deleteCustomerDocument = (customerId, docId) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          documents: (c.documents || []).filter(d => d.id !== docId)
        };
      }
      return c;
    }));
    showToast('Document removed', 'info');
  };

  const addCustomerService = (customerId, service) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        const newServices = c.services || [];
        const newServiceItem = {
          id: `SRV-${Date.now().toString().slice(-4)}`,
          serviceName: service.serviceName,
          requestDate: service.requestDate || new Date().toISOString().split('T')[0],
          details: service.details || '',
          status: service.status || 'In Review',
          remarks: service.remarks || ''
        };
        return { ...c, services: [newServiceItem, ...newServices] };
      }
      return c;
    }));
    showToast('Service history entry recorded', 'success');
  };

  // Ops feature: distribute customer contacts to RM
  const assignCustomersToRM = (customerIds, rmEmployeeId) => {
    const rm = employees.find(e => e.id === rmEmployeeId);
    if (!rm) return;

    setCustomers(prev => prev.map(c => {
      if (customerIds.includes(c.id)) {
        return {
          ...c,
          assignedTo: rm.id,
          assignedName: rm.name
        };
      }
      return c;
    }));
    showToast(`Assigned ${customerIds.length} contact(s) to ${rm.name}`, 'success');
  };

  // User Management Actions (Add, Edit, Delete, Toggle Status)
  const addEmployee = (employeeData) => {
    let empId = (employeeData.id || '').trim().toUpperCase();

    // Auto-generate sequential ID if empty (e.g. EMP006, EMP007)
    if (!empId) {
      let maxNum = 0;
      employees.forEach(e => {
        const match = e.id?.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      empId = `EMP${String(maxNum + 1).padStart(3, '0')}`;
    }

    // Check duplicate ID
    if (employees.some(e => e.id.toUpperCase() === empId)) {
      showToast(`Employee ID ${empId} already exists! Please use a unique ID.`, 'error');
      return { success: false, message: 'Employee ID already exists' };
    }

    const newEmp = {
      id: empId,
      name: (employeeData.name || '').trim() || 'New Staff',
      role: employeeData.role || 'RM',
      title: (employeeData.title || '').trim() || `${employeeData.role || 'Relationship'} Specialist`,
      department: (employeeData.department || '').trim() || 'Operations & Client Services',
      email: (employeeData.email || '').trim() || `${empId.toLowerCase()}@rajalakshmy.com`,
      mobile: (employeeData.mobile || '').trim() || '+91 98400 00000',
      location: (employeeData.location || '').trim() || 'Chennai Head Office',
      password: employeeData.password || 'password123',
      status: employeeData.status || 'Active',
      createdAt: new Date().toISOString()
    };

    setEmployees(prev => [newEmp, ...prev]);
    showToast(`Staff member ${newEmp.name} (${newEmp.id}) added successfully`, 'success');
    return { success: true, employee: newEmp };
  };

  const updateEmployee = (id, updatedFields) => {
    setEmployees(prev => prev.map(e => {
      if (e.id === id) {
        return { ...e, ...updatedFields };
      }
      return e;
    }));
    showToast(`User ${id} profile updated`, 'success');
    return true;
  };

  const deleteEmployee = (id) => {
    if (id === 'EMP001') {
      showToast('Cannot delete Managing Director (Principal Admin)', 'error');
      return false;
    }
    setEmployees(prev => prev.filter(e => e.id !== id));
    showToast(`User ${id} removed from system`, 'info');
    return true;
  };

  const toggleEmployeeStatus = (id) => {
    if (id === 'EMP001') {
      showToast('Cannot deactivate Principal Admin', 'error');
      return;
    }
    setEmployees(prev => prev.map(e => {
      if (e.id === id) {
        const nextStatus = e.status === 'Active' ? 'Inactive' : 'Active';
        showToast(`User ${e.name} account is now ${nextStatus}`, 'info');
        return { ...e, status: nextStatus };
      }
      return e;
    }));
  };

  // ----------------------------------------------------
  // TELECALLING & CALL OUTCOMES
  // ----------------------------------------------------
  const logCall = ({ customerId, outcome, duration = '1m 30s', remarks = '', reminderDate = '' }) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const now = new Date();
    const callDate = now.toISOString().split('T')[0];
    const callTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const newCall = {
      id: `CALL-${Date.now().toString().slice(-4)}`,
      customerId,
      customerName: customer.name,
      mobile: customer.mobile,
      employeeId: currentUser?.id || 'EMP004',
      employeeName: currentUser?.name || 'Ananya Subramanian',
      callDate,
      callTime,
      duration,
      outcome, // 'OK' | 'Not Attend' | 'No Need' | 'Reminder' | 'Field Visit'
      remarks,
      reminderDate: (outcome === 'Reminder' || outcome === 'Field Visit') ? reminderDate : ''
    };

    setCalls(prev => [newCall, ...prev]);

    // Update customer's status AND claim/assign number to the user who took action so it follows them
    const customerUpdates = {
      callingStatus: outcome,
      lastCallDate: callDate,
      assignedTo: currentUser?.id || 'EMP004',
      assignedName: currentUser?.name || 'Ananya Subramanian',
      actionedBy: currentUser?.id || 'EMP004',
      actionedByName: currentUser?.name || 'Ananya Subramanian'
    };

    if (outcome === 'Reminder' || outcome === 'Field Visit') {
      customerUpdates.reminderDate = reminderDate;
      customerUpdates.reminderRemark = remarks;
    } else {
      // Clear reminder if marked something else
      customerUpdates.reminderDate = '';
      customerUpdates.reminderRemark = '';
    }

    if (outcome === 'OK' || outcome === 'Field Visit') {
      customerUpdates.status = 'Lead';
      customerUpdates.isLead = true;
    }

    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, ...customerUpdates } : c));
    releaseCallLock(customerId);

    // Automatic conversion into Lead when OK or Field Visit is selected
    if (outcome === 'OK' || outcome === 'Field Visit') {
      const leadStatus = outcome === 'Field Visit' ? 'Field Visit Scheduled' : 'Discussion in Progress';
      const cleanCustomerMobile = customer.mobile ? customer.mobile.replace(/\D/g, '') : '';
      const actionUser = currentUser || { id: 'EMP004', name: 'Ananya Subramanian', role: 'RM' };

      const currentLeadRemarks = remarks ? remarks.trim() : '';

      setLeads(prevLeads => {
        // Check if lead already exists for this customer or mobile number
        const existingIndex = prevLeads.findIndex(l =>
          (l.sourceCustomerId && l.sourceCustomerId === customerId) ||
          (l.customerId && l.customerId === customerId) ||
          (cleanCustomerMobile && l.mobile && l.mobile.replace(/\D/g, '') === cleanCustomerMobile)
        );

        if (existingIndex >= 0) {
          const updated = [...prevLeads];
          updated[existingIndex] = {
            ...updated[existingIndex],
            sourceCustomerId: updated[existingIndex].sourceCustomerId || customer.id,
            status: leadStatus,
            assignedToId: actionUser.id,
            assignedToName: actionUser.name,
            assignedToRole: actionUser.role || 'RM',
            actionedBy: actionUser.id,
            actionedByName: actionUser.name,
            assignedAt: callDate,
            remarks: currentLeadRemarks || updated[existingIndex].remarks || ''
          };
          return updated;
        } else {
          const isUnknown = customer.customerType === 'unknown' || customer.name === 'Unknown / Lead';
          const newLead = {
            id: `LEAD-${Date.now().toString().slice(-4)}`,
            sourceCustomerId: customer.id,
            customerId: customer.isCustomer ? (customer.customerId || customer.id) : '',
            customerName: isUnknown ? 'Unknown / Lead' : (customer.name || 'Prospect Client'),
            customerType: customer.customerType || (isUnknown ? 'unknown' : 'known'),
            mobile: customer.mobile,
            business: customer.business || '',
            city: customer.city || '',
            state: customer.state || '',
            requiredService: customer.services?.[0]?.name || customer.requiredService || '',
            estimatedAmount: Number(customer.loanRequirement) || Number(customer.estimatedAmount) || 0,
            source: customer.source || 'Database',
            status: leadStatus,
            assignedToRole: actionUser.role || 'RM',
            assignedToId: actionUser.id,
            assignedToName: actionUser.name,
            assignedBy: actionUser.id,
            assignedByName: actionUser.name,
            assignedAt: callDate,
            actionedBy: actionUser.id,
            actionedByName: actionUser.name,
            remarks: currentLeadRemarks
          };
          return [newLead, ...prevLeads];
        }
      });
      showToast(`Contact converted into Lead! Assigned strictly to you (${actionUser.name})`, 'success');
    } else {
      showToast(`Response saved! Number now follows you (${currentUser?.name || 'RM'})`, 'success');
    }
  };

  // ----------------------------------------------------
  // DAILY ACTIVITIES & BULK EXCEL UPLOAD
  // ----------------------------------------------------
  const addDailyActivity = (activity) => {
    const cleanMobile = String(activity.mobile || '').replace(/\D/g, '').slice(-10);
    if (cleanMobile.length === 10) {
      const existingCust = customers.find(
        c =>
          (c.mobile && c.mobile.replace(/\D/g, '').slice(-10) === cleanMobile) ||
          (c.altMobile && c.altMobile.replace(/\D/g, '').slice(-10) === cleanMobile)
      );
      if (existingCust) {
        showToast(
          `Mobile number already exists in ${existingCust.databaseType ? existingCust.databaseType.toUpperCase() + ' ' : ''}Database (${existingCust.name || 'Unknown'})`,
          'error'
        );
        return null;
      }
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const isKnown = activity.customerType === 'known';
    const classification = isKnown ? 'New Database - Known' : 'New Database - Unknown';

    const resolvedReference = (activity.source === 'Reference' || activity.source === 'Bills') ? (activity.referenceFrom || '') : '';
    const resolvedCity = activity.city || activity.location || '';

    const newActivity = {
      id: `ACT-${Date.now().toString().slice(-4)}`,
      customerName: isKnown ? (activity.customerName || 'Customer') : 'Unknown / Lead',
      mobile: activity.mobile,
      business: activity.business || 'Business / Trading',
      customerType: activity.customerType,
      city: resolvedCity,
      location: resolvedCity,
      state: activity.state || '',
      source: activity.source,
      referenceFrom: resolvedReference,
      submittedBy: currentUser?.id || 'EMP005',
      submittedByName: currentUser?.name || 'Murugan Velu',
      submissionDate: dateStr,
      submissionTime: timeStr,
      classifiedTo: classification,
      status: 'Saved'
    };

    setActivities(prev => [newActivity, ...prev]);

    // Also auto-add to New Database as fresh unassigned number
    addCustomer({
      name: newActivity.customerName,
      mobile: newActivity.mobile,
      business: newActivity.business,
      city: resolvedCity,
      state: newActivity.state,
      databaseType: 'new',
      customerType: activity.customerType,
      source: activity.source,
      referenceFrom: resolvedReference,
      submittedBy: newActivity.submittedBy,
      submittedByName: newActivity.submittedByName,
      assignedTo: currentUser?.role === 'RM' ? currentUser.id : '',
      assignedName: currentUser?.role === 'RM' ? currentUser.name : '',
      callingStatus: 'Pending',
      _fromActivity: true
    });

    showToast(`Activity saved & classified into ${classification}`, 'success');
    return newActivity;
  };

  // Bulk Excel import processor with mobile validation and duplicate detection
  const processBulkExcelImport = (rawRows) => {
    const existingMobiles = new Set(
      customers.map(c => (c.mobile || '').replace(/\D/g, '').slice(-10))
    );

    let importedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;
    const newCustomersToAdd = [];
    const previewList = [];

    rawRows.forEach((row, idx) => {
      // Find mobile column regardless of header case
      const mobileRaw = String(
        row.Mobile || row.mobile || row['Mobile Number'] || row['Phone'] || row['Contact'] || ''
      ).trim();

      const digits = mobileRaw.replace(/\D/g, '');
      const tenDigit = digits.slice(-10);

      const isValidMobile = tenDigit.length === 10;
      const isDuplicate = isValidMobile && existingMobiles.has(tenDigit);

      const name = row.Name || row.name || row['Customer Name'] || (row.Type === 'unknown' ? 'Unknown / Lead' : `Customer ${idx + 1}`);
      const business = row.Business || row.business || row['Occupation'] || 'Commercial Trader';
      const state = row.State || row.state || 'Tamil Nadu';
      const source = row.Source || row.source || 'Bills';
      const type = (row.Type || row.type || (name.toLowerCase().includes('unknown') ? 'unknown' : 'known')).toLowerCase();

      let status = 'valid';
      if (!isValidMobile) {
        status = 'invalid';
        invalidCount++;
      } else if (isDuplicate) {
        status = 'duplicate';
        duplicateCount++;
      } else {
        status = 'valid';
        importedCount++;
        existingMobiles.add(tenDigit); // prevent within-file duplicate

        newCustomersToAdd.push({
          name: type === 'unknown' ? 'Unknown / Lead' : name,
          mobile: `+91 ${tenDigit.slice(0, 5)} ${tenDigit.slice(5)}`,
          business,
          state,
          databaseType: 'new',
          customerType: type === 'unknown' ? 'unknown' : 'known',
          source: ['Bills', 'Open Source', 'Reference'].includes(source) ? source : 'Bills',
          assignedTo: 'EMP004',
          assignedName: 'Ananya Subramanian'
        });
      }

      previewList.push({
        id: idx + 1,
        name,
        rawMobile: mobileRaw,
        mobileFormatted: isValidMobile ? `+91 ${tenDigit.slice(0, 5)} ${tenDigit.slice(5)}` : mobileRaw,
        business,
        state,
        type,
        source,
        status
      });
    });

    return {
      previewList,
      summary: {
        total: rawRows.length,
        imported: importedCount,
        duplicates: duplicateCount,
        invalid: invalidCount
      },
      commitImport: () => {
        setCustomers(prev => {
          let currentList = [...prev];
          let maxNum = 1000;
          currentList.forEach(c => {
            if (c.id && typeof c.id === 'string') {
              const match = c.id.match(/\d+/);
              if (match) {
                const num = parseInt(match[0], 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
              }
            }
          });

          const importedCustomers = newCustomersToAdd.map(cust => {
            maxNum += 1;
            return {
              ...cust,
              id: `RA-CUST-${maxNum}`,
              submittedBy: currentUser?.id || 'EMP005',
              submittedByName: currentUser?.name || 'Murugan Velu',
              callingStatus: 'Pending',
              lastCallDate: '',
              reminderDate: '',
              reminderRemark: '',
              createdAt: new Date().toISOString().split('T')[0],
              documents: cust.documents || [],
              services: cust.services || []
            };
          });

          return [...importedCustomers, ...currentList];
        });

        // Also record each imported record in activities so reports accurately show user's added contacts
        const nowStr = new Date().toISOString().split('T')[0];
        const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        const importedActivities = newCustomersToAdd.map((cust, idx) => ({
          id: `ACT-EXCEL-${Date.now().toString().slice(-4)}-${idx + 1}`,
          customerName: cust.name,
          mobile: cust.mobile,
          business: cust.business || 'Commercial Trader',
          customerType: cust.customerType,
          state: cust.state || 'Tamil Nadu',
          source: cust.source || 'Open Source',
          referenceFrom: cust.referenceFrom || '',
          submittedBy: currentUser?.id || 'EMP005',
          submittedByName: currentUser?.name || 'Murugan Velu',
          submissionDate: nowStr,
          submissionTime: timeStr,
          classifiedTo: cust.customerType === 'known' ? 'New Database - Known' : 'New Database - Unknown',
          status: 'Imported (Excel)'
        }));

        setActivities(prev => [...importedActivities, ...prev]);

        showToast(`Successfully imported ${newCustomersToAdd.length} records into New Database (Skipped ${duplicateCount} duplicates)`, 'success');
      }
    };
  };

  // ----------------------------------------------------
  // PERFORMANCE - CASE DISPOSITION
  // ----------------------------------------------------
  const submitPerformanceCase = (data) => {
    const newCase = {
      id: `CASE-${Date.now().toString().slice(-4)}`,
      customerName: data.customerName,
      mobile: data.mobile,
      caseAmount: Number(data.caseAmount) || 0,
      caseDate: data.caseDate || new Date().toISOString().split('T')[0],
      details: data.details || '',
      submittedBy: currentUser?.id || 'EMP004',
      submittedByName: currentUser?.name || 'Ananya Subramanian',
      status: 'Pending Approval',
      approvedBy: '',
      approvalDate: '',
      rejectionRemarks: ''
    };

    setPerformanceCases(prev => [newCase, ...prev]);
    showToast('Case submitted for Admin/Manager approval', 'success');
  };

  const approvePerformanceCase = (caseId) => {
    const now = new Date().toISOString().split('T')[0];
    const approverName = currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Rajesh Kannan (Admin)';

    setPerformanceCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          status: 'Approved',
          approvedBy: approverName,
          approvalDate: now,
          rejectionRemarks: ''
        };
      }
      return c;
    }));
    showToast('Case Approved successfully! Performance totals updated.', 'success');
  };

  const rejectPerformanceCase = (caseId, remarks) => {
    const approverName = currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Priya Swaminathan (Manager)';

    setPerformanceCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          status: 'Rejected',
          approvedBy: approverName,
          approvalDate: new Date().toISOString().split('T')[0],
          rejectionRemarks: remarks || 'Does not meet credit norms'
        };
      }
      return c;
    }));
    showToast('Case marked as Rejected', 'info');
  };

  // ----------------------------------------------------
  // RESIGNATION & ADVANCE
  // ----------------------------------------------------
  const submitResignation = (data) => {
    const newRes = {
      id: `RES-${Date.now().toString().slice(-4)}`,
      employeeId: currentUser?.id || 'EMP020',
      employeeName: currentUser?.name || 'Senthil Nathan',
      role: currentUser?.role || 'Sales Executive',
      department: currentUser?.department || 'Field Sales',
      resignationDate: data.resignationDate || new Date().toISOString().split('T')[0],
      lastWorkingDate: data.lastWorkingDate,
      reason: data.reason,
      status: 'Pending Approval',
      reviewedBy: ''
    };
    setResignations(prev => [newRes, ...prev]);
    showToast('Resignation request submitted', 'success');
  };

  const updateResignationStatus = (id, status) => {
    setResignations(prev => prev.map(r => r.id === id ? {
      ...r,
      status,
      reviewedBy: currentUser?.name || 'Admin'
    } : r));
    showToast(`Resignation ${status}`, 'info');
  };

  const submitAdvance = (data) => {
    const newAdv = {
      id: `ADV-${Date.now().toString().slice(-4)}`,
      employeeId: currentUser?.id || 'EMP004',
      employeeName: currentUser?.name || 'Ananya Subramanian',
      requestedAmount: Number(data.requestedAmount) || 0,
      requestDate: new Date().toISOString().split('T')[0],
      reason: data.reason,
      status: 'Pending Approval',
      reviewedBy: '',
      reviewDate: ''
    };
    setAdvanceAmounts(prev => [newAdv, ...prev]);
    showToast('Advance amount request submitted', 'success');
  };

  const updateAdvanceStatus = (id, status) => {
    setAdvanceAmounts(prev => prev.map(a => a.id === id ? {
      ...a,
      status,
      reviewedBy: `${currentUser?.name} (${currentUser?.role})`,
      reviewDate: new Date().toISOString().split('T')[0]
    } : a));
    showToast(`Advance request ${status}`, 'info');
  };

  // Punch In Action (Punch Only for In Time)
  // Date format strictly: DD-MM-YYYY
  const punchIn = () => {
    if (!currentUser) return { success: false, message: 'Please log in to punch attendance' };

    const todayDate = formatDateDDMMYYYY(new Date()); // e.g. "17-11-2026"
    const nowTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    // Check if user already punched in today
    const existing = attendance.find(
      a => a.employeeId === currentUser.id && a.date === todayDate
    );

    if (existing) {
      showToast(`Already Punched In today at ${existing.inTime}`, 'info');
      return { success: false, alreadyPunched: true, record: existing };
    }

    const newRecord = {
      id: `ATT-${Date.now().toString().slice(-6)}`,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      role: currentUser.role,
      date: todayDate, // Format strictly DD-MM-YYYY
      inTime: nowTime,
      status: 'Present',
      punchMode: 'Direct Web In-Punch'
    };

    setAttendance(prev => [newRecord, ...prev]);
    showToast(`Punch In Successful at ${nowTime} (${todayDate})`, 'success');
    return { success: true, record: newRecord };
  };

  // ----------------------------------------------------
  // LEAVE MANAGEMENT & APPROVAL WORKFLOW
  // ----------------------------------------------------
  const requestLeave = (leaveData) => {
    if (!currentUser) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const newId = `LV-${Date.now().toString().slice(-4)}`;

    const newLeave = {
      id: newId,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      employeeRole: currentUser.role,
      leaveType: leaveData.leaveType || 'Casual Leave (CL)',
      startDate: leaveData.startDate,
      endDate: leaveData.endDate || leaveData.startDate,
      daysCount: Number(leaveData.daysCount) || 1,
      reason: leaveData.reason || '',
      status: 'Pending Approval',
      requestedAt: todayStr,
      actionedBy: '',
      actionedAt: '',
      actionRemarks: ''
    };

    setLeaves(prev => [newLeave, ...prev]);
    showToast(`Leave application submitted for ${newLeave.daysCount} day(s)! Waiting for Admin approval.`, 'success');
    return newLeave;
  };

  const approveLeave = (leaveId, remarks = '') => {
    const todayStr = new Date().toISOString().split('T')[0];
    setLeaves(prev => prev.map(l => l.id === leaveId ? {
      ...l,
      status: 'Approved',
      actionedBy: `${currentUser?.name || 'Admin'} (${currentUser?.role || 'Admin'})`,
      actionedAt: todayStr,
      actionRemarks: remarks || 'Leave request approved'
    } : l));
    showToast(`Leave requisition ${leaveId} has been APPROVED!`, 'success');
  };

  const rejectLeave = (leaveId, remarks = '') => {
    const todayStr = new Date().toISOString().split('T')[0];
    setLeaves(prev => prev.map(l => l.id === leaveId ? {
      ...l,
      status: 'Rejected',
      actionedBy: `${currentUser?.name || 'Admin'} (${currentUser?.role || 'Admin'})`,
      actionedAt: todayStr,
      actionRemarks: remarks || 'Leave request declined'
    } : l));
    showToast(`Leave requisition ${leaveId} has been REJECTED.`, 'info');
  };

  // ----------------------------------------------------
  // WEBSITE INBOUND ENQUIRIES (https://rajalakshmyassociates.com/)
  // ----------------------------------------------------
  const addEnquiry = (data) => {
    const now = new Date();
    const formattedDate = formatDateDDMMYYYY(now);
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newEnquiry = {
      id: `ENQ-${Date.now().toString().slice(-4)}`,
      name: data.name || 'Website Visitor',
      mobile: data.mobile || '',
      email: data.email || '',
      service: data.service || 'Financial Advisory',
      sourceWebsite: 'https://rajalakshmyassociates.com/',
      sourcePage: data.sourcePage || 'Contact Us Form',
      message: data.message || '',
      submittedAt: `${formattedDate} ${timeStr}`,
      status: 'New',
      assignedTo: data.assignedTo || 'EMP004',
      assignedName: data.assignedName || 'Ananya Subramanian',
      notes: data.notes || ''
    };

    setEnquiries(prev => [newEnquiry, ...prev]);
    showToast(`New Website Enquiry captured from ${newEnquiry.name}`, 'success');
    return newEnquiry;
  };

  const updateEnquiryStatus = (id, status, notes) => {
    setEnquiries(prev => prev.map(e => e.id === id ? {
      ...e,
      status,
      notes: notes !== undefined ? notes : e.notes
    } : e));
    showToast(`Enquiry marked as ${status}`, 'info');
  };

  const convertEnquiryToLead = (enquiryId, databaseType = 'new', customerType = 'known') => {
    const found = enquiries.find(e => e.id === enquiryId);
    if (!found) return;

    // Check if phone number already exists in database
    const cleanFound = found.mobile ? found.mobile.replace(/\D/g, '') : '';
    const alreadyExists = customers.some(c => c.mobile && c.mobile.replace(/\D/g, '') === cleanFound);
    if (alreadyExists) {
      showToast(`Contact number ${found.mobile} already exists in Database`, 'info');
      updateEnquiryStatus(enquiryId, 'Converted', 'Number already in Database');
      return;
    }

    addCustomer({
      name: found.name,
      mobile: found.mobile,
      business: found.service,
      customerType,
      databaseType,
      source: 'Website Enquiry',
      referenceFrom: 'https://rajalakshmyassociates.com/ Contact Us'
    });

    updateEnquiryStatus(enquiryId, 'Converted', `Converted to ${databaseType} Database on ${formatDateDDMMYYYY(new Date())}`);
    showToast(`Enquiry moved to ${databaseType === 'new' ? 'New' : 'Old'} Database!`, 'success');
  };

  // ----------------------------------------------------
  // LEADS PIPELINE MANAGEMENT (Req 2 & 7)
  // ----------------------------------------------------
  const addLead = (leadData) => {
    const newId = `LEAD-${Date.now().toString().slice(-4)}`;
    const newLead = {
      id: newId,
      customerId: leadData.customerId || '',
      customerName: leadData.customerName || 'Prospect Lead',
      mobile: leadData.mobile,
      business: leadData.business || 'General Business',
      city: leadData.city || 'Tamil Nadu',
      state: leadData.state || 'Tamil Nadu',
      requiredService: leadData.requiredService || 'Business Loan',
      estimatedAmount: Number(leadData.estimatedAmount) || 1000000,
      source: leadData.source || 'Direct',
      status: leadData.status || 'New Lead',
      assignedToRole: leadData.assignedToRole || (currentUser?.role === 'Sales Manager' ? 'Sales Manager' : 'RM'),
      assignedToId: leadData.assignedToId || currentUser?.id || 'EMP004',
      assignedToName: leadData.assignedToName || currentUser?.name || 'Ananya Subramanian',
      assignedBy: currentUser?.id || 'EMP004',
      assignedByName: currentUser?.name || 'Ananya Subramanian',
      assignedAt: new Date().toISOString().split('T')[0],
      remarks: leadData.remarks || 'New lead registered'
    };

    setLeads(prev => [newLead, ...prev]);
    showToast(`Lead created for ${newLead.customerName}!`, 'success');
    return newLead;
  };

  // Assign Lead (Req 7: RM can assign to himself or assign person of the Sales Manager role)
  const assignLead = (leadId, assigneeId, assigneeName, assigneeRole) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          assignedToId: assigneeId,
          assignedToName: assigneeName,
          assignedToRole: assigneeRole,
          assignedBy: currentUser?.id || 'EMP004',
          assignedByName: currentUser?.name || 'Ananya Subramanian',
          assignedAt: new Date().toISOString().split('T')[0],
          remarks: `${l.remarks ? l.remarks + ' | ' : ''}Assigned to ${assigneeName} (${assigneeRole}) by ${currentUser?.name || 'RM'}`
        };
      }
      return l;
    }));
    showToast(`Lead assigned to ${assigneeName} (${assigneeRole})`, 'success');
  };

  const updateLead = (leadId, updates) => {
    const existingLead = leads.find(l => l.id === leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l));

    const linkedCustId = existingLead?.sourceCustomerId || existingLead?.customerId;
    if (linkedCustId) {
      const custUpdates = {};
      if (updates.customerName !== undefined) custUpdates.name = updates.customerName;
      if (updates.mobile !== undefined) custUpdates.mobile = updates.mobile;
      if (updates.altMobile !== undefined) custUpdates.altMobile = updates.altMobile;
      if (updates.business !== undefined) custUpdates.business = updates.business;
      if (updates.city !== undefined) custUpdates.city = updates.city;
      if (updates.state !== undefined) custUpdates.state = updates.state;
      if (updates.address !== undefined) custUpdates.address = updates.address;
      if (updates.requiredService !== undefined) custUpdates.requiredService = updates.requiredService;
      if (updates.estimatedAmount !== undefined) custUpdates.loanRequirement = updates.estimatedAmount;
      if (updates.documents !== undefined) custUpdates.documents = updates.documents;

      if (Object.keys(custUpdates).length > 0) {
        setCustomers(prev => prev.map(c => (c.id === linkedCustId || c.customerId === linkedCustId) ? { ...c, ...custUpdates } : c));
      }
    }

    showToast('Lead details updated', 'success');
  };

  // ----------------------------------------------------
  // BANK / FILE LOGINS & 2-DAY REMINDERS (Req 2, 4, 5, 6)
  // ----------------------------------------------------
  const addTwoDays = (dateStr) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  };

  // Add Bank Login (Req 4, 6: Ensure person is added as a customer with auto-generated Customer ID, NOT a login ID)
  const addBankLogin = (loginData) => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Ensure customer exists in Customer Directory (Req 6: Login persons all are as a customers)
    let custId = loginData.customerId;
    const existingCust = customers.find(c =>
      (loginData.sourceCustomerId && c.id === loginData.sourceCustomerId) ||
      (custId && (c.id === custId || c.customerId === custId)) ||
      (loginData.mobile && c.mobile?.replace(/\D/g, '').slice(-10) === loginData.mobile?.replace(/\D/g, '').slice(-10))
    );

    if (existingCust) {
      custId = (existingCust.isCustomer && (existingCust.customerId || existingCust.id))
        ? (existingCust.customerId || existingCust.id)
        : (custId || generateOfficialCustomerId(customers));

      setCustomers(prev => prev.map(c => c.id === existingCust.id ? {
        ...c,
        isCustomer: true,
        customerId: custId,
        name: loginData.customerName || c.name,
        business: loginData.business || c.business,
        city: loginData.city || c.city
      } : c));
    } else {
      custId = custId || generateOfficialCustomerId(customers);

      addCustomer({
        id: custId,
        customerId: custId,
        isCustomer: true,
        name: loginData.customerName || 'New Loan Client',
        mobile: loginData.mobile,
        business: loginData.business || 'General Client',
        city: loginData.city || '',
        state: loginData.state || '',
        customerType: 'known',
        databaseType: 'new',
        source: 'Bank Login'
      });
    }

    const newLogin = {
      id: custId, // ID is the Customer ID! (NOT a login ID)
      customerId: custId,
      customerName: loginData.customerName,
      mobile: loginData.mobile,
      business: loginData.business || 'General Business',
      city: loginData.city || '',
      bankName: loginData.bankName || 'State Bank of India',
      bankId: loginData.bankId || '',
      interestRate: loginData.interestRate || '',
      clientAskedAmount: loginData.clientAskedAmount || '',
      bankApprovedAmount: loginData.bankApprovedAmount || '',
      loanType: loginData.loanType || 'Business Loan',
      loanAmount: loginData.loanAmount || '',
      loginDate: loginData.loginDate || todayStr,
      lastUpdateDate: todayStr,
      nextFollowUpDate: addTwoDays(loginData.loginDate || todayStr), // Every 2 days reminder (Req 4)
      status: 'In Progress',
      assignedRMId: loginData.assignedRMId || currentUser?.id || 'EMP004',
      assignedRMName: loginData.assignedRMName || currentUser?.name || 'Ananya Subramanian',
      updates: [
        {
          id: `UPD-${Date.now().toString().slice(-4)}`,
          date: todayStr,
          note: loginData.notes || `File logged in with ${loginData.bankName || 'Bank'}`,
          updatedBy: currentUser?.name || 'RM'
        }
      ],
      disbursementDetails: null,
      rejectionRemarks: ''
    };

    setBankLogins(prev => [newLogin, ...prev]);
    showToast(`Registered Customer ${custId} into Bank Login with ${newLogin.bankName}!`, 'success');
    return newLogin;
  };

  // Convert Lead to Login (Auto-generates Customer ID RA-CUST-XXXX, NOT a login ID)
  const convertLeadToLogin = (leadId, loginData) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    // Check if customer already exists or auto-generate official RA-CUST- ID
    let custId = lead.customerId;
    const existingCust = customers.find(c =>
      (lead.sourceCustomerId && c.id === lead.sourceCustomerId) ||
      (custId && (c.id === custId || c.customerId === custId)) ||
      (lead.mobile && c.mobile?.replace(/\D/g, '').slice(-10) === lead.mobile?.replace(/\D/g, '').slice(-10))
    );

    if (existingCust) {
      custId = (existingCust.isCustomer && (existingCust.customerId || existingCust.id))
        ? (existingCust.customerId || existingCust.id)
        : generateOfficialCustomerId(customers);

      setCustomers(prev => prev.map(c => c.id === existingCust.id ? {
        ...c,
        isCustomer: true,
        customerId: custId,
        name: lead.customerName || c.name,
        business: lead.business || c.business,
        city: lead.city || c.city,
        state: lead.state || c.state,
        altMobile: lead.altMobile || c.altMobile || '',
        address: lead.address || c.address || '',
        documents: (lead.documents && lead.documents.length > 0) ? lead.documents : (c.documents || [])
      } : c));
    } else {
      custId = generateOfficialCustomerId(customers);

      // Automatically register into Customer Management directory
      addCustomer({
        id: custId,
        customerId: custId,
        isCustomer: true,
        name: lead.customerName || 'Customer',
        mobile: lead.mobile,
        business: lead.business || 'General Business',
        city: lead.city || 'Chennai',
        state: lead.state || 'Tamil Nadu',
        altMobile: lead.altMobile || '',
        address: lead.address || '',
        documents: lead.documents || [],
        customerType: 'known',
        databaseType: 'new',
        source: lead.source || 'Lead Pipeline'
      });
    }

    const targetAssigneeId = loginData.assignedRMId || currentUser?.id || lead.assignedToId;
    const targetAssigneeName = loginData.assignedRMName || currentUser?.name || lead.assignedToName;
    const targetAssigneeRole = loginData.assignedToRole || currentUser?.role || lead.assignedToRole || 'RM';

    const createdLogin = addBankLogin({
      id: custId,
      customerId: custId,
      sourceCustomerId: existingCust?.id || lead.sourceCustomerId || custId,
      customerName: lead.customerName,
      mobile: lead.mobile,
      business: lead.business,
      city: lead.city,
      bankName: loginData.bankName,
      loanType: loginData.loanType || lead.requiredService,
      loanAmount: loginData.loanAmount || lead.estimatedAmount,
      loginDate: loginData.loginDate || new Date().toISOString().split('T')[0],
      assignedRMId: targetAssigneeId,
      assignedRMName: targetAssigneeName,
      notes: loginData.notes || `Converted from Lead #${lead.id}`
    });

    setLeads(prev => prev.map(l => l.id === leadId ? {
      ...l,
      customerId: custId, // Auto-assign the generated Customer ID to the lead!
      assignedToId: targetAssigneeId,
      assignedToName: targetAssigneeName,
      assignedToRole: targetAssigneeRole,
      status: 'Converted to Login',
      remarks: `${l.remarks ? l.remarks + ' | ' : ''}Customer ID: ${custId} (Bank Login with ${loginData.bankName})`
    } : l));

    showToast(`Customer ID ${custId} auto-generated! Registered in Bank Login with ${loginData.bankName}.`, 'success');
    return createdLogin;
  };

  // Add 2-Day Update / Note (Req 4: remind every 2 days for do next or wt today update)
  const addLoginUpdate = (loginId, updateNote) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nextDate = addTwoDays(todayStr);

    setBankLogins(prev => prev.map(l => {
      if (l.id === loginId) {
        const newUpdate = {
          id: `UPD-${Date.now().toString().slice(-4)}`,
          date: todayStr,
          note: updateNote,
          updatedBy: currentUser?.name || 'RM'
        };
        return {
          ...l,
          lastUpdateDate: todayStr,
          nextFollowUpDate: nextDate,
          updates: [newUpdate, ...(l.updates || [])]
        };
      }
      return l;
    }));

    showToast(`Update saved! Next follow-up reminder scheduled for ${nextDate}`, 'success');
  };

  // Disburse Login (Req 5: convert to Disposement with bank name, loan amount, type of loan)
  const disburseLogin = (loginId, { bankName, loanAmount, loanType, disbursementDate, remarks = '' }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const login = bankLogins.find(l => l.id === loginId);
    if (!login) return;

    const disburseData = {
      bankName: bankName || login.bankName,
      loanAmount: Number(loanAmount) || login.loanAmount,
      loanType: loanType || login.loanType,
      disbursementDate: disbursementDate || todayStr,
      remarks: remarks || 'Disbursement confirmed by bank'
    };

    setBankLogins(prev => prev.map(l => {
      if (l.id === loginId) {
        const disburseUpdate = {
          id: `UPD-${Date.now().toString().slice(-4)}`,
          date: todayStr,
          note: `Loan Disbursed: ₹${Number(disburseData.loanAmount).toLocaleString('en-IN')} via ${disburseData.bankName} (${disburseData.loanType}). ${remarks}`,
          updatedBy: currentUser?.name || 'RM'
        };
        return {
          ...l,
          status: 'Disbursed',
          lastUpdateDate: todayStr,
          disbursementDetails: disburseData,
          updates: [disburseUpdate, ...(l.updates || [])]
        };
      }
      return l;
    }));

    // Record into Performance Case Dispositions
    submitPerformanceCase({
      customerName: login.customerName,
      mobile: login.mobile,
      caseAmount: disburseData.loanAmount,
      details: `${disburseData.bankName} - ${disburseData.loanType} Disbursement (from Login #${login.id})`,
      caseDate: disburseData.disbursementDate
    });

    showToast(`Login #${loginId} converted to Disbursement (₹${Number(disburseData.loanAmount).toLocaleString('en-IN')})!`, 'success');
  };

  // Reject Login (Req 5: if reject enter remarks)
  const rejectLogin = (loginId, { remarks }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setBankLogins(prev => prev.map(l => {
      if (l.id === loginId) {
        const rejectUpdate = {
          id: `UPD-${Date.now().toString().slice(-4)}`,
          date: todayStr,
          note: `File Rejected: ${remarks}`,
          updatedBy: currentUser?.name || 'RM'
        };
        return {
          ...l,
          status: 'Rejected',
          lastUpdateDate: todayStr,
          rejectionRemarks: remarks,
          updates: [rejectUpdate, ...(l.updates || [])]
        };
      }
      return l;
    }));

    showToast(`Login #${loginId} marked as Rejected. Remarks logged.`, 'info');
  };

  // Quick initiate call
  const startCallingCustomer = (customer) => {
    setActiveCallContact(customer);
    setIsCallingModalOpen(true);
  };

  return (
    <CRMContext.Provider
      value={{
        customers,
        calls,
        activities,
        performanceCases,
        resignations,
        advanceAmounts,
        attendance,
        enquiries,
        leads,
        bankLogins,
        leaves,
        employees,
        setEmployees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        toggleEmployeeStatus,
        // Actions
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addCustomerDocument,
        deleteCustomerDocument,
        addCustomerService,
        assignCustomersToRM,
        logCall,
        addDailyActivity,
        processBulkExcelImport,
        submitPerformanceCase,
        approvePerformanceCase,
        rejectPerformanceCase,
        submitResignation,
        updateResignationStatus,
        submitAdvance,
        updateAdvanceStatus,
        punchIn,
        requestLeave,
        approveLeave,
        rejectLeave,
        addEnquiry,
        updateEnquiryStatus,
        convertEnquiryToLead,
        addLead,
        assignLead,
        updateLead,
        convertLeadToLogin,
        addBankLogin,
        addLoginUpdate,
        disburseLogin,
        rejectLogin,
        resetToFactoryDefaults,
        // Calling state
        activeCallContact,
        setActiveCallContact,
        isCallingModalOpen,
        setIsCallingModalOpen,
        startCallingCustomer,
        callLocks,
        claimCallLock,
        releaseCallLock,
        refreshCallLock,
        isLockedByOther
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => useContext(CRMContext);
