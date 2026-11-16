import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_CUSTOMERS,
  INITIAL_CALL_HISTORY,
  INITIAL_DAILY_ACTIVITIES,
  INITIAL_PERFORMANCE_CASES,
  INITIAL_RESIGNATIONS,
  INITIAL_ADVANCE_AMOUNTS,
  INITIAL_EMPLOYEES
} from '../data/mockData';
import { useAuth } from './AuthContext';

const CRMContext = createContext();

const STORAGE_KEYS = {
  CUSTOMERS: 'rajalakshmy_customers_v1',
  CALLS: 'rajalakshmy_calls_v1',
  ACTIVITIES: 'rajalakshmy_activities_v1',
  PERFORMANCE: 'rajalakshmy_performance_v1',
  RESIGNATIONS: 'rajalakshmy_resignations_v1',
  ADVANCES: 'rajalakshmy_advances_v1'
};

export const CRMProvider = ({ children }) => {
  const { currentUser, showToast } = useAuth();

  // Load from LocalStorage or mock data
  const [customers, setCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const c1033 = parsed.find(c => c.id === 'CUST-1033');
        if (c1033 && (!c1033.submittedBy || c1033.name !== 'Annapoorna Caterers & Bakers')) {
          return parsed.map(c => {
            const initialMatch = INITIAL_CUSTOMERS.find(ic => ic.id === c.id);
            if (initialMatch && initialMatch.submittedBy) {
              return {
                ...c,
                name: initialMatch.name,
                business: initialMatch.business,
                submittedBy: initialMatch.submittedBy,
                submittedByName: initialMatch.submittedByName,
                referenceFrom: initialMatch.referenceFrom,
                assignedTo: initialMatch.assignedTo || c.assignedTo
              };
            }
            return c;
          });
        }
        return parsed;
      }
      return INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  });

  const [calls, setCalls] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CALLS);
      return saved ? JSON.parse(saved) : INITIAL_CALL_HISTORY;
    } catch {
      return INITIAL_CALL_HISTORY;
    }
  });

  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.some(a => a.id === 'ACT-506')) {
          const emp5Activities = INITIAL_DAILY_ACTIVITIES.filter(a => a.submittedBy === 'EMP005' && a.id !== 'ACT-503');
          return [...emp5Activities, ...parsed];
        }
        return parsed;
      }
      return INITIAL_DAILY_ACTIVITIES;
    } catch {
      return INITIAL_DAILY_ACTIVITIES;
    }
  });

  const [performanceCases, setPerformanceCases] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PERFORMANCE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.some(c => c.id === 'CASE-307')) {
          const emp5Cases = INITIAL_PERFORMANCE_CASES.filter(c => c.submittedBy === 'EMP005');
          return [...parsed, ...emp5Cases];
        }
        return parsed;
      }
      return INITIAL_PERFORMANCE_CASES;
    } catch {
      return INITIAL_PERFORMANCE_CASES;
    }
  });

  const [resignations, setResignations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RESIGNATIONS);
      return saved ? JSON.parse(saved) : INITIAL_RESIGNATIONS;
    } catch {
      return INITIAL_RESIGNATIONS;
    }
  });

  const [advanceAmounts, setAdvanceAmounts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADVANCES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.some(a => a.id === 'ADV-605')) {
          const emp5Advances = INITIAL_ADVANCE_AMOUNTS.filter(a => a.employeeId === 'EMP005');
          return [...parsed, ...emp5Advances];
        }
        return parsed;
      }
      return INITIAL_ADVANCE_AMOUNTS;
    } catch {
      return INITIAL_ADVANCE_AMOUNTS;
    }
  });

  // Active call state for RM telecalling
  const [activeCallContact, setActiveCallContact] = useState(null);
  const [isCallingModalOpen, setIsCallingModalOpen] = useState(false);

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

  // Reset to initial mock data
  const resetToFactoryDefaults = () => {
    setCustomers(INITIAL_CUSTOMERS);
    setCalls(INITIAL_CALL_HISTORY);
    setActivities(INITIAL_DAILY_ACTIVITIES);
    setPerformanceCases(INITIAL_PERFORMANCE_CASES);
    setResignations(INITIAL_RESIGNATIONS);
    setAdvanceAmounts(INITIAL_ADVANCE_AMOUNTS);
    showToast('Reset all database tables to initial corporate mock data', 'info');
  };

  // ----------------------------------------------------
  // CUSTOMER MANAGEMENT
  // ----------------------------------------------------
  const addCustomer = (customerData) => {
    const newId = `CUST-${1000 + customers.length + 1}`;
    const newCustomer = {
      id: newId,
      name: customerData.name || (customerData.customerType === 'unknown' ? 'Unknown / Lead' : 'Customer'),
      mobile: customerData.mobile,
      altMobile: customerData.altMobile || '',
      business: customerData.business || 'General Business',
      state: customerData.state || 'Tamil Nadu',
      city: customerData.city || 'Chennai',
      address: customerData.address || '',
      databaseType: customerData.databaseType || 'new',
      customerType: customerData.customerType || 'known',
      source: customerData.source || 'Bills',
      referenceFrom: customerData.referenceFrom || '',
      assignedTo: customerData.assignedTo || (currentUser?.id || 'EMP004'),
      assignedName: customerData.assignedName || (currentUser?.name || 'Ananya Subramanian'),
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
    showToast(`Added customer: ${newCustomer.name} (${newCustomer.id})`, 'success');
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
    const rm = INITIAL_EMPLOYEES.find(e => e.id === rmEmployeeId);
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
      outcome, // 'OK' | 'Not Attend' | 'No Need' | 'Reminder'
      remarks,
      reminderDate: outcome === 'Reminder' ? reminderDate : ''
    };

    setCalls(prev => [newCall, ...prev]);

    // Update customer's status
    const customerUpdates = {
      callingStatus: outcome,
      lastCallDate: callDate
    };

    if (outcome === 'Reminder') {
      customerUpdates.reminderDate = reminderDate;
      customerUpdates.reminderRemark = remarks;
    } else {
      // Clear reminder if marked something else
      customerUpdates.reminderDate = '';
      customerUpdates.reminderRemark = '';
    }

    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, ...customerUpdates } : c));
    showToast(`Call logged: ${outcome} for ${customer.name}`, 'success');
  };

  // ----------------------------------------------------
  // DAILY ACTIVITIES & BULK EXCEL UPLOAD
  // ----------------------------------------------------
  const addDailyActivity = (activity) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const isKnown = activity.customerType === 'known';
    const classification = isKnown ? 'New Database - Known' : 'New Database - Unknown';

    const newActivity = {
      id: `ACT-${Date.now().toString().slice(-4)}`,
      customerName: isKnown ? (activity.customerName || 'Customer') : 'Unknown / Lead',
      mobile: activity.mobile,
      business: activity.business || 'Business / Trading',
      customerType: activity.customerType,
      state: activity.state || 'Tamil Nadu',
      source: activity.source,
      referenceFrom: activity.source === 'Reference' ? activity.referenceFrom : '',
      submittedBy: currentUser?.id || 'EMP005',
      submittedByName: currentUser?.name || 'Murugan Velu',
      submissionDate: dateStr,
      submissionTime: timeStr,
      classifiedTo: classification,
      status: 'Saved'
    };

    setActivities(prev => [newActivity, ...prev]);

    // Also auto-add to New Database
    addCustomer({
      name: newActivity.customerName,
      mobile: newActivity.mobile,
      business: newActivity.business,
      state: newActivity.state,
      databaseType: 'new',
      customerType: activity.customerType,
      source: activity.source,
      referenceFrom: activity.source === 'Reference' ? activity.referenceFrom : '',
      assignedTo: currentUser?.role === 'RM' ? currentUser.id : 'EMP004',
      assignedName: currentUser?.role === 'RM' ? currentUser.name : 'Ananya Subramanian'
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
        newCustomersToAdd.forEach(cust => {
          addCustomer(cust);
        });
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
        employees: INITIAL_EMPLOYEES,
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
        resetToFactoryDefaults,
        // Calling state
        activeCallContact,
        setActiveCallContact,
        isCallingModalOpen,
        setIsCallingModalOpen,
        startCallingCustomer
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => useContext(CRMContext);
