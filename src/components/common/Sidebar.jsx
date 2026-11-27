import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import {
  LayoutDashboard,
  User,
  UserX,
  CreditCard,
  Users,
  CalendarCheck,
  Settings,
  PhoneCall,
  Building2,
  ChevronLeft,
  Clock,
  Menu,
  FileCheck,
  FileText,
  UserCog,
  UserCheck,
  LogOut,
  Bell,
  X
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/formatters';
import { getSystemNotifications } from '../../utils/notifications';

export const Sidebar = ({ isOpen, setIsOpen }) => {
  const { currentUser, canAccessRoute, logout, confirmAndLogout } = useAuth();
  const { customers, performanceCases, advanceAmounts, resignations, attendance = [], bankLogins = [], leads = [], leaves = [], employees = [] } = useCRM();

  const isSalesManager = currentUser?.role === 'Sales Manager';

  // Compute pending counts (strictly scoped to logged-in user)
  const pendingCasesCount = performanceCases.filter(c => {
    return (c.submittedBy === currentUser?.id || c.submittedByName === currentUser?.name) && c.status === 'Pending Approval';
  }).length;

  const pendingAdvanceCount = advanceAmounts.filter(a => {
    return a.employeeId === currentUser?.id && a.status === 'Pending Approval';
  }).length;

  const pendingResignationCount = resignations.filter(r => {
    return r.employeeId === currentUser?.id && r.status === 'Pending Approval';
  }).length;

  const pendingLeavesAdminCount = (currentUser?.role === 'Admin' || currentUser?.role === 'Manager')
    ? (leaves || []).filter(l => l.status === 'Pending Approval').length
    : 0;

  // Check if current user has punched in for today (format: DD-MM-YYYY)
  const todayFormatted = formatDateDDMMYYYY(new Date());
  const userTodayPunched = (attendance || []).some(
    a => a.employeeId === currentUser?.id && a.date === todayFormatted
  );

  // Customer menu badge count (strictly verified/converted customers)
  const customerOnlyList = customers.filter(
    c => c.isCustomer || (c.services && c.services.length > 0)
  );
  const scopedCustomerMenuCount = isSalesManager
    ? customerOnlyList.filter(c => c.submittedBy === currentUser?.id || c.referenceFrom?.includes(currentUser?.name) || c.assignedTo === currentUser?.id).length
    : (currentUser?.role === 'RM'
        ? customerOnlyList.filter(c => c.assignedTo === currentUser?.id).length
        : customerOnlyList.length);

  // Bank Logins 2-Day Updates Due count
  const todayIso = new Date().toISOString().split('T')[0];
  const loginUpdatesDueCount = bankLogins.filter(
    b => b.status === 'In Progress' && (!b.nextFollowUpDate || b.nextFollowUpDate <= todayIso)
  ).length;

  // Pending Assigned Leads count for current user (Collect Docs + Case Assignments)
  const pendingAssignedLeadsCount = React.useMemo(() => {
    if (!currentUser?.id) return 0;
    return (leads || []).filter(l => {
      if (l.assignmentType === 'collect_docs') {
        return (
          (l.docCollectionAssigneeId === currentUser.id || l.assignedToId === currentUser.id) &&
          l.docCollectionStatus !== 'Documents Collected'
        );
      }
      if (l.assignmentType === 'transfer_case') {
        const cleanMob = String(l.mobile || '').replace(/\D/g, '').slice(-10);
        const alreadyLogged = (bankLogins || []).some(
          b =>
            ((cleanMob && String(b.mobile || '').replace(/\D/g, '').slice(-10) === cleanMob) ||
              (l.customerId && b.customerId === l.customerId)) &&
            (b.createdBy === currentUser.id || b.assignedRMId === currentUser.id)
        );
        return l.assignedToId === currentUser.id && l.assignedBy !== currentUser.id && l.status !== 'Converted to Login' && !alreadyLogged;
      }
      return false;
    }).length;
  }, [leads, bankLogins, currentUser?.id]);

  // Unread System Notifications count
  const unreadNotificationsCount = React.useMemo(() => {
    try {
      const all = getSystemNotifications({
        currentUser,
        customers,
        bankLogins,
        leads,
        leaves,
        advanceAmounts,
        resignations,
        performanceCases,
        attendance
      });
      const read = JSON.parse(localStorage.getItem('rajalakshmy_read_notifications') || '[]');
      return all.filter(n => !read.includes(n.id)).length;
    } catch {
      return 0;
    }
  }, [currentUser, customers, bankLogins, leads, leaves, advanceAmounts, resignations, performanceCases, attendance]);

  const NavContent = ({ isExpanded = true, isMobile = false }) => {
    const dailyActivitiesMenu = canAccessRoute('daily-activities') && currentUser?.role !== 'Admin' && (
      <NavLink
        to="/daily-activities"
        onClick={() => isMobile && setIsOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition ${
            isActive
              ? 'bg-white/15 text-gold-300 shadow-inner font-bold border-l-4 border-gold-400'
              : 'text-white/80 hover:bg-white/10 hover:text-white'
          }`
        }
      >
        <CalendarCheck className="w-4 h-4 shrink-0 text-cyan-300" />
        {isExpanded && <span>Daily Activities</span>}
      </NavLink>
    );

    return (
    <>
      {/* Brand Header */}
      <div className={`flex h-16 shrink-0 items-center ${isExpanded ? 'justify-between px-3' : 'justify-center px-1'} border-b border-white/10 bg-[#4c0210]/40`}>
        {isExpanded ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-lg ring-1 ring-gold-400">
              <img
                src="./logo.png"
                alt="Rajalakshmy Associates"
                className="h-full w-full object-contain"
                onError={(e) => {
                  if (e.target.src.includes('./logo.png')) {
                    e.target.src = '/logo.png';
                  } else {
                    e.target.style.display = 'none';
                  }
                }}
              />
            </div>
            <div className="truncate">
              <span className="block text-sm font-extrabold tracking-wide text-white uppercase font-corporate leading-tight">
                Rajalakshmy
              </span>
              <span className="block text-[10px] font-semibold tracking-widest text-gold-300 uppercase">
                Associates CRM
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition"
            title="Expand Sidebar"
          >
            <Menu className="w-5 h-5 text-gold-300" />
          </button>
        )}

        {isExpanded && (
          isMobile ? (
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition"
              title="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition"
              title="Close Sidebar (X)"
            >
              <X className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {/* 1. Dashboard */}
        {canAccessRoute('dashboard') && (
          <NavLink
            to="/dashboard"
            onClick={() => isMobile && setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition group ${
                isActive
                  ? 'bg-white/15 text-gold-300 shadow-inner font-bold border-l-4 border-gold-400'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4 shrink-0 text-gold-400" />
            {isExpanded && <span>Dashboard</span>}
          </NavLink>
        )}

        {/* Notifications Menu */}
        {canAccessRoute('notifications') && (
          <NavLink
            to="/notifications"
            onClick={() => isMobile && setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition group ${
                isActive
                  ? 'bg-white/15 text-gold-300 shadow-inner font-bold border-l-4 border-gold-400'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <div className="flex items-center gap-3 truncate">
              <Bell className="w-4 h-4 shrink-0 text-amber-300" />
              {isExpanded && <span>Notifications</span>}
            </div>
            {isExpanded && unreadNotificationsCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-extrabold text-white shadow-sm animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </NavLink>
        )}

        {/* For Sales Manager, place Daily Activities immediately after Dashboard */}
        {isSalesManager && dailyActivitiesMenu}

        {/* Dedicated RM Telecalling view */}
        {canAccessRoute('telecalling') && currentUser?.role !== 'Admin' && (
          <NavLink
            to="/telecalling"
            onClick={() => isMobile && setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition group ${
                isActive
                  ? 'bg-white/15 text-gold-300 shadow-inner font-bold border-l-4 border-gold-400'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <div className="flex items-center gap-3 truncate">
              <PhoneCall className="w-4 h-4 shrink-0 text-emerald-400" />
              {isExpanded && <span>Telecalling</span>}
            </div>
          </NavLink>
        )}

        {/* Assign Lead Menu (Collect Docs Only & Case Assignments) */}
        {canAccessRoute('assigned-leads') && currentUser?.role !== 'Admin' && !['ops', 'operations'].includes(String(currentUser?.role || '').toLowerCase()) && (
          <NavLink
            to="/assigned-leads"
            onClick={() => isMobile && setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition group ${
                isActive
                  ? 'bg-white/15 text-gold-300 shadow-inner font-bold border-l-4 border-gold-400'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <div className="flex items-center gap-3 truncate">
              <UserCheck className="w-4 h-4 shrink-0 text-gold-300" />
              {isExpanded && <span>Assign Lead</span>}
            </div>
            {isExpanded && pendingAssignedLeadsCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold-400 px-1.5 text-[10px] font-extrabold text-amber-950 shadow-sm">
                {pendingAssignedLeadsCount}
              </span>
            )}
          </NavLink>
        )}

        {/* Dedicated Customer Management Menu - Not shown for RM role */}
        {canAccessRoute('customers') && currentUser?.role !== 'RM' && (
          <NavLink
            to="/customers"
            end
            onClick={() => isMobile && setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-white/15 text-gold-300 shadow-inner font-bold border-l-4 border-gold-400'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <div className="flex items-center gap-3 truncate">
              <Users className="w-4 h-4 shrink-0 text-gold-400" />
              {isExpanded && <span>Customer</span>}
            </div>
          </NavLink>
        )}

        {/* Bank File Login Menu (Req 2, 4, 5, 6) */}
        {canAccessRoute('bank-logins') && currentUser?.role !== 'Admin' && !['ops', 'operations'].includes(String(currentUser?.role || '').toLowerCase()) && (
          <NavLink
            to="/bank-logins"
            onClick={() => isMobile && setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-white/15 text-gold-300 shadow-inner font-bold border-l-4 border-gold-400'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <FileCheck className="w-4 h-4 shrink-0 text-gold-400" />
              {isExpanded && <span>Login</span>}
            </div>
          </NavLink>
        )}

        {/* Statement Analyzer Menu */}
        {canAccessRoute('statement') && (
          <NavLink
            to="/statement"
            onClick={() => isMobile && setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-white/15 text-gold-300 shadow-inner font-bold border-l-4 border-gold-400'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <FileText className="w-4 h-4 shrink-0 text-amber-300" />
            {isExpanded && <span>Statement</span>}
          </NavLink>
        )}

        {/* 5. Daily Activities (for non-Sales Manager roles) */}
        {!isSalesManager && dailyActivitiesMenu}

        {/* 5. Attendance Menu (Available to non-Admin roles) */}
        {canAccessRoute('attendance') && currentUser?.role !== 'Admin' && (
          <NavLink
            to="/attendance"
            onClick={() => isMobile && setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-white/15 text-gold-300 shadow-inner font-bold border-l-4 border-gold-400'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <div className="flex items-center gap-3 truncate">
              <Clock className="w-4 h-4 shrink-0 text-emerald-400" />
              {isExpanded && <span>Attendance</span>}
            </div>
            {isExpanded && (
              <div className="flex items-center gap-1.5">
                {pendingLeavesAdminCount > 0 && (
                  <span className="text-[10px] bg-amber-400 text-amber-950 font-bold px-1.5 py-0.5 rounded-full animate-pulse" title="Pending Leave Requests">
                    {pendingLeavesAdminCount} Leave{pendingLeavesAdminCount > 1 ? 's' : ''}
                  </span>
                )}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  userTodayPunched
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : 'bg-amber-400 text-amber-950 font-extrabold'
                }`}>
                  {userTodayPunched ? 'Punched' : 'Punch In'}
                </span>
              </div>
            )}
          </NavLink>
        )}

        {/* 3. Advance Amount */}
        {canAccessRoute('advance') && (
          <NavLink
            to="/advance"
            onClick={() => isMobile && setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-white/15 text-gold-300 shadow-inner font-bold border-l-4 border-gold-400'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <div className="flex items-center gap-3 truncate">
              <CreditCard className="w-4 h-4 shrink-0 text-emerald-300" />
              {isExpanded && <span>Advance Amount</span>}
            </div>
            {isExpanded && pendingAdvanceCount > 0 && (
              <span className="text-[10px] bg-amber-400 text-amber-950 font-bold px-1.5 py-0.5 rounded-full">
                {pendingAdvanceCount}
              </span>
            )}
          </NavLink>
        )}

        {/* 2. Resignation */}
        {canAccessRoute('resignation') && currentUser?.role !== 'Admin' && (
          <NavLink
            to="/resignation"
            onClick={() => isMobile && setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-white/15 text-gold-300 shadow-inner font-bold border-l-4 border-gold-400'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <div className="flex items-center gap-3 truncate">
              <UserX className="w-4 h-4 shrink-0 text-rose-300" />
              {isExpanded && <span>Resignation</span>}
            </div>
            {isExpanded && pendingResignationCount > 0 && (
              <span className="text-[10px] bg-rose-400 text-white font-bold px-1.5 py-0.5 rounded-full">
                {pendingResignationCount}
              </span>
            )}
          </NavLink>
        )}

        {/* 8. User Management */}
        {canAccessRoute('users') && (
          <NavLink
            to="/users"
            onClick={() => isMobile && setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-white/15 text-gold-300 shadow-inner font-bold border-l-4 border-gold-400'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <div className="flex items-center gap-3 truncate">
              <UserCog className="w-4 h-4 shrink-0 text-gold-400" />
              {isExpanded && <span>User Management</span>}
            </div>
          </NavLink>
        )}

        {/* 9. Settings & Distribution */}
        {canAccessRoute('settings') && (
          <NavLink
            to="/settings"
            onClick={() => isMobile && setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-white/15 text-gold-300 shadow-inner font-bold border-l-4 border-gold-400'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Settings className="w-4 h-4 shrink-0 text-slate-300" />
            {isExpanded && <span>Settings & Ops</span>}
          </NavLink>
        )}
      </div>

      {/* Footer Info & Logout */}
      <div className="border-t border-white/10 bg-black/25 shrink-0">
        {isExpanded ? (
          <div className="p-3 space-y-2">
            <button
              onClick={() => {
                if (isMobile) setIsOpen(false);
                confirmAndLogout();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-rose-600/90 text-rose-200 hover:text-white border border-white/10 py-2.5 px-3 text-xs font-bold transition shadow-sm active:scale-95"
            >
              <LogOut className="w-4 h-4 text-rose-300" />
              <span>Log Out</span>
            </button>
            <div className="text-center text-[10px] text-white/40 pt-1">
              Rajalakshmy Associates v1.0
            </div>
          </div>
        ) : (
          <div className="p-2 flex justify-center">
            <button
              onClick={() => confirmAndLogout()}
              title={`Log Out (${currentUser?.name})`}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-rose-600 text-rose-300 hover:text-white transition shadow-sm active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
    );
  };

  return (
    <>
      {/* 1. Desktop & Tablet Persistent Sidebar (natural flex item, never overlaps Navbar) */}
      <aside
        className={`sticky top-0 h-screen shrink-0 z-20 hidden md:flex flex-col bg-gradient-to-b from-[#600516] via-[#79091D] to-[#45020F] text-white transition-all duration-300 border-r border-burgundy-900/40 shadow-xl ${
          isOpen ? 'w-64' : 'w-20'
        }`}
      >
        <NavContent isExpanded={isOpen} isMobile={false} />
      </aside>

      {/* 2. Mobile Off-Canvas Drawer (Only visible on small phones when hamburger is clicked) */}
      <div className="md:hidden">
        {isOpen && (
          <>
            <div
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-gradient-to-b from-[#600516] via-[#79091D] to-[#45020F] text-white shadow-2xl">
              <NavContent isExpanded={true} isMobile={true} />
            </aside>
          </>
        )}
      </div>
    </>
  );
};
