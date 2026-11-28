import { formatDateDDMMYYYY, formatMobileNumber } from './formatters';

export const getSystemNotifications = ({
  currentUser,
  customers = [],
  bankLogins = [],
  leads = [],
  leaves = [],
  advanceAmounts = [],
  resignations = [],
  performanceCases = [],
  attendance = []
}) => {
  if (!currentUser) return [];

  const notifications = [];
  const todayIso = new Date().toISOString().split('T')[0];
  const todayFormatted = formatDateDDMMYYYY(new Date());
  const roleLower = String(currentUser.role || '').toLowerCase();
  const isOpsOrAdmin = roleLower === 'admin' || roleLower === 'ops' || roleLower === 'operations';

  // 0. New Bank Logins Created -> Notify OPS & Admin roles (click opens Customer menu for that customer)
  if (isOpsOrAdmin) {
    [...bankLogins]
      .filter(b => Boolean(b.createdAt))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .forEach(b => {
        const cleanMob = String(b.mobile || '').replace(/\D/g, '').slice(-10);
        const queryParams = new URLSearchParams();
        if (b.customerId) queryParams.set('customerId', b.customerId);
        if (cleanMob) queryParams.set('mobile', cleanMob);
        const targetLink = `/customers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

        const amountText = b.loanAmount
          ? ` • ₹${Number(String(b.loanAmount).replace(/[^\d.]/g, '') || 0).toLocaleString('en-IN')}`
          : '';
        const creatorText = b.createdByName
          ? ` • Created by ${b.createdByName}${b.createdBy ? ` (${b.createdBy})` : ''}`
          : '';

        notifications.push({
          id: `notif-new-login-${b.id}`,
          type: 'new_login',
          category: 'New Login',
          title: `New Login Created: ${b.customerName || 'Customer'}`,
          message: `${b.bankName || 'Bank'} (${b.loanType || 'Loan'}${amountText})${creatorText} — Click to view in Customer menu`,
          time: b.loginDate ? formatDateDDMMYYYY(b.loginDate) : todayFormatted,
          link: targetLink,
          customerId: b.customerId || '',
          priority: 'high',
          createdAt: b.createdAt || b.loginDate || todayIso
        });
      });
  }

  // 1. Telecalling Reminders
  const myReminders = customers.filter(c => {
    if (c.callingStatus !== 'Reminder') return false;
    if (currentUser.role === 'RM') {
      return c.assignedTo === currentUser.id || c.actionedBy === currentUser.id;
    }
    if (currentUser.role === 'Sales Manager') {
      return (
        c.submittedBy === currentUser.id ||
        c.referenceFrom?.includes(currentUser.name) ||
        c.assignedTo === currentUser.id
      );
    }
    return true;
  });

  myReminders.forEach(c => {
    notifications.push({
      id: `notif-reminder-${c.id}`,
      type: 'reminder',
      category: 'Telecalling',
      title: `Call Reminder: ${c.name}`,
      message: c.reminderRemark || `Follow-up scheduled with ${c.business || 'client'}`,
      time: c.reminderDate ? `Due: ${c.reminderDate}` : 'Follow-up Due',
      link: '/telecalling',
      priority: 'high',
      createdAt: c.reminderDate || c.lastCallDate || todayIso
    });
  });

  // 2. Bank Logins Due for 2-Day Routine Update
  const dueBankLogins = bankLogins.filter(b => {
    if (b.status !== 'In Progress') return false;
    const isDue = !b.nextFollowUpDate || b.nextFollowUpDate <= todayIso;
    if (!isDue) return false;
    if (currentUser.role === 'RM') {
      return b.assignedRMId === currentUser.id || b.assignedRMName === currentUser.name;
    }
    return true;
  });

  dueBankLogins.forEach(b => {
    notifications.push({
      id: `notif-bank-${b.id}`,
      type: 'bank_login',
      category: 'Bank File',
      title: `2-Day Update Due: ${b.customerName}`,
      message: `${b.bankName} - ₹${b.loanAmount?.toLocaleString?.('en-IN') || b.loanAmount} (${b.loanType})`,
      time: b.nextFollowUpDate ? `Due: ${b.nextFollowUpDate}` : '2-Day Due',
      link: '/bank-logins',
      priority: 'high',
      createdAt: b.nextFollowUpDate || b.loginDate || todayIso
    });
  });

  // 2b. Assigned Leads & Document Collection Tasks for Current User
  (leads || []).forEach(l => {
    if (!currentUser?.id) return;
    const isCollectDocsAssignee =
      l.assignmentType === 'collect_docs' &&
      (l.docCollectionAssigneeId === currentUser.id || l.assignedToId === currentUser.id) &&
      l.docCollectionAssignedById !== currentUser.id &&
      !['Documents Collected', 'Not Collected'].includes(l.docCollectionStatus);

    const cleanMob = String(l.mobile || '').replace(/\D/g, '').slice(-10);
    const hasMyBankLogin = bankLogins.some(
      b =>
        ((cleanMob && String(b.mobile || '').replace(/\D/g, '').slice(-10) === cleanMob) ||
          (l.customerId && b.customerId === l.customerId)) &&
        (b.createdBy === currentUser.id || b.assignedRMId === currentUser.id)
    );

    const isCaseTransferAssignee =
      l.assignmentType === 'transfer_case' &&
      l.assignedToId === currentUser.id &&
      l.assignedBy !== currentUser.id &&
      l.status !== 'Converted to Login' &&
      !hasMyBankLogin;

    if (isCollectDocsAssignee) {
      notifications.push({
        id: `notif-assign-doc-${l.id}`,
        type: 'lead_assign',
        category: 'Assign Lead',
        title: `Collect Documents Only: ${l.customerName}`,
        message: `${formatMobileNumber(l.mobile)} • From ${l.docCollectionAssignedByName || l.assignedByName || 'RM'}${l.docCollectionNote ? ` (${l.docCollectionNote})` : ''}`,
        time: l.docCollectionAssignedAt || l.assignedAt || 'Action Needed',
        link: '/assigned-leads',
        priority: 'high',
        createdAt: l.docCollectionAssignedAt || l.assignedAt || todayIso
      });
    } else if (isCaseTransferAssignee) {
      notifications.push({
        id: `notif-assign-case-${l.id}`,
        type: 'lead_assign',
        category: 'Assign Lead',
        title: `Assigned Lead: ${l.customerName}`,
        message: `${formatMobileNumber(l.mobile)} • Assigned by ${l.assignedByName || l.originalRmName || 'RM'} — Copy number & add Bank Login`,
        time: l.assignedAt || 'New Lead',
        link: '/assigned-leads',
        priority: 'high',
        createdAt: l.assignedAt || todayIso
      });
    }
  });

  // 3. Attendance Alert (if not punched in today)
  const userTodayPunched = (attendance || []).some(
    a => a.employeeId === currentUser.id && a.date === todayFormatted
  );

  if (!userTodayPunched) {
    notifications.push({
      id: `notif-att-${todayFormatted}`,
      type: 'attendance',
      category: 'Attendance',
      title: 'Daily Punch In Required',
      message: 'You have not registered attendance in-punch for today.',
      time: 'Action Required',
      link: '/attendance',
      priority: 'medium',
      createdAt: todayIso
    });
  }

  // 4. Role-specific Approvals & Status Updates
  const isAdminOrManager = currentUser.role === 'Admin' || currentUser.role === 'Manager';

  if (isAdminOrManager) {
    // Pending Leaves
    leaves
      .filter(l => l.status === 'Pending Approval')
      .forEach(l => {
        notifications.push({
          id: `notif-leave-${l.id}`,
          type: 'approval',
          category: 'Leave Approval',
          title: `Leave Application: ${l.employeeName}`,
          message: `${l.leaveType} (${l.duration || l.startDate}) - ${l.reason || 'Pending review'}`,
          time: l.appliedOn || l.startDate || 'Pending',
          link: '/attendance',
          priority: 'medium',
          createdAt: l.appliedOn || todayIso
        });
      });

    // Pending Advances
    advanceAmounts
      .filter(a => a.status === 'Pending Approval')
      .forEach(a => {
        notifications.push({
          id: `notif-adv-${a.id}`,
          type: 'approval',
          category: 'Advance Request',
          title: `Advance Request: ${a.employeeName}`,
          message: `₹${a.requestedAmount?.toLocaleString?.('en-IN') || a.requestedAmount} - ${a.reason}`,
          time: a.requestDate || 'Pending',
          link: '/advance',
          priority: 'medium',
          createdAt: a.requestDate || todayIso
        });
      });

    // Pending Resignations
    resignations
      .filter(r => r.status === 'Pending Approval')
      .forEach(r => {
        notifications.push({
          id: `notif-res-${r.id}`,
          type: 'approval',
          category: 'Resignation',
          title: `Resignation Notice: ${r.employeeName}`,
          message: `${r.department || 'Operations'} - ${r.reason || 'Notice submitted'}`,
          time: r.resignationDate || 'Pending',
          link: '/resignation',
          priority: 'high',
          createdAt: r.resignationDate || todayIso
        });
      });

    // Pending Performance Cases
    performanceCases
      .filter(p => p.status === 'Pending Approval')
      .forEach(p => {
        notifications.push({
          id: `notif-case-${p.id}`,
          type: 'approval',
          category: 'Case Approval',
          title: `Case Approval: ${p.customerName}`,
          message: `₹${p.caseAmount?.toLocaleString?.('en-IN') || p.caseAmount} submitted by ${p.submittedByName || 'RM'}`,
          time: p.caseDate || 'Pending',
          link: '/performance',
          priority: 'medium',
          createdAt: p.caseDate || todayIso
        });
      });
  } else {
    // For Employees / RMs: Status updates on submitted requests
    performanceCases
      .filter(p => (p.submittedBy === currentUser.id || p.submittedByName === currentUser.name) && p.status === 'Approved')
      .slice(0, 3)
      .forEach(p => {
        notifications.push({
          id: `notif-case-appr-${p.id}`,
          type: 'status',
          category: 'Performance',
          title: `Case Approved: ${p.customerName}`,
          message: `Your proposal for ₹${p.caseAmount?.toLocaleString?.('en-IN') || p.caseAmount} was approved!`,
          time: p.approvalDate || p.caseDate || 'Approved',
          link: '/performance',
          priority: 'low',
          createdAt: p.approvalDate || todayIso
        });
      });
  }

  return notifications;
};
