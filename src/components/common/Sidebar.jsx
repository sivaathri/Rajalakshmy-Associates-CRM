import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import {
  LayoutDashboard,
  User,
  UserX,
  CreditCard,
  Award,
  Users,
  CalendarCheck,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  PhoneCall,
  Database,
  Building2,
  ChevronLeft,
  Clock,
  X
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/formatters';

export const Sidebar = ({ isOpen, setIsOpen }) => {
  const { currentUser, canAccessRoute } = useAuth();
  const { customers, performanceCases, advanceAmounts, resignations, attendance = [] } = useCRM();
  const location = useLocation();

  // Collapsible sub-menus
  const [customerMenuOpen, setCustomerMenuOpen] = useState(
    location.pathname.startsWith('/customers')
  );
  const [oldDbOpen, setOldDbOpen] = useState(
    location.pathname.includes('/old/')
  );
  const [newDbOpen, setNewDbOpen] = useState(
    location.pathname.includes('/new/')
  );

  const isSalesManager = currentUser?.role === 'Sales Manager';

  // Compute pending counts (scoped to user if Sales Manager)
  const pendingCasesCount = performanceCases.filter(c => {
    if (isSalesManager) return (c.submittedBy === currentUser?.id || c.submittedByName === currentUser?.name) && c.status === 'Pending Approval';
    return c.status === 'Pending Approval';
  }).length;

  const pendingAdvanceCount = advanceAmounts.filter(a => {
    if (isSalesManager) return a.employeeId === currentUser?.id && a.status === 'Pending Approval';
    return a.status === 'Pending Approval';
  }).length;

  const pendingResignationCount = resignations.filter(r => {
    if (isSalesManager) return r.employeeId === currentUser?.id && r.status === 'Pending Approval';
    return r.status === 'Pending Approval';
  }).length;

  // Check if current user has punched in for today (format: DD-MM-YYYY)
  const todayFormatted = formatDateDDMMYYYY(new Date());
  const userTodayPunched = (attendance || []).some(
    a => a.employeeId === currentUser?.id && a.date === todayFormatted
  );

  // Customer menu badge count (excludes New Database because Customer menu is separated)
  const customerOnlyList = customers.filter(c => c.databaseType !== 'new');
  const scopedCustomerMenuCount = isSalesManager
    ? customerOnlyList.filter(c => c.submittedBy === currentUser?.id || c.referenceFrom?.includes(currentUser?.name) || c.assignedTo === currentUser?.id).length
    : (currentUser?.role === 'RM'
        ? customerOnlyList.filter(c => c.assignedTo === currentUser?.id).length
        : customerOnlyList.length);

  // Database sub-menu counts
  // RM sees fresh un-actioned numbers + numbers actioned by/assigned to themselves
  const databaseScopedCustomers = isSalesManager
    ? customers.filter(c => c.submittedBy === currentUser?.id || c.referenceFrom?.includes(currentUser?.name) || c.assignedTo === currentUser?.id)
    : (currentUser?.role === 'RM'
        ? customers.filter(c => {
            const isFresh = c.callingStatus === 'Pending' && (!c.assignedTo || c.assignedTo === currentUser.id);
            const isMine = c.assignedTo === currentUser.id || c.actionedBy === currentUser.id;
            return isFresh || isMine;
          })
        : customers);

  const oldKnownCount = databaseScopedCustomers.filter(c => c.databaseType === 'old' && c.customerType === 'known').length;
  const oldUnknownCount = databaseScopedCustomers.filter(c => c.databaseType === 'old' && c.customerType === 'unknown').length;
  const newKnownCount = databaseScopedCustomers.filter(c => c.databaseType === 'new' && c.customerType === 'known').length;
  const newUnknownCount = databaseScopedCustomers.filter(c => c.databaseType === 'new' && c.customerType === 'unknown').length;

  const NavContent = ({ isExpanded = true, isMobile = false }) => (
    <>
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-3 border-b border-white/10 bg-[#4c0210]/40">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-lg ring-1 ring-gold-400">
            <img
              src="/logo.png"
              alt="Rajalakshmy Associates"
              className="h-full w-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          {isExpanded && (
            <div className="truncate">
              <span className="block text-sm font-extrabold tracking-wide text-white uppercase font-corporate leading-tight">
                Rajalakshmy
              </span>
              <span className="block text-[10px] font-semibold tracking-widest text-gold-300 uppercase">
                Associates CRM
              </span>
            </div>
          )}
        </div>

        {isMobile ? (
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition"
            title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* User Mini Card */}
      {isExpanded && (
        <div className="px-4 py-3 bg-black/15 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-burgundy-950 border border-gold-400/60 text-gold-300 font-bold flex items-center justify-center shrink-0 shadow-sm">
              <User className="w-4 h-4 text-gold-300" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">{currentUser?.name}</div>
              <div className="text-[11px] font-semibold text-gold-300 truncate">
                {currentUser?.role} • {currentUser?.id}
              </div>
            </div>
          </div>
        </div>
      )}

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

        {/* Dedicated RM Telecalling view */}
        {canAccessRoute('telecalling') && (
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

        {/* Dedicated Customer Management Menu */}
        {canAccessRoute('customers') && (
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
            {isExpanded && (
              <span className="text-[10px] bg-white/15 text-gold-200 font-semibold px-1.5 py-0.5 rounded-full">
                {scopedCustomerMenuCount}
              </span>
            )}
          </NavLink>
        )}

        {/* Database Tree (Old & New) */}
        {canAccessRoute('customers') && (
          <div>
            <button
              onClick={() => {
                if (isExpanded) {
                  setCustomerMenuOpen(!customerMenuOpen);
                } else {
                  setIsOpen(true);
                  setCustomerMenuOpen(true);
                }
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                location.pathname.includes('/customers/old') || location.pathname.includes('/customers/new')
                  ? 'bg-white/15 text-gold-300 font-bold'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 shrink-0 text-amber-300" />
                {isExpanded && <span>Database</span>}
              </div>
              {isExpanded && (
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${customerMenuOpen ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            {/* Sub-menu */}
            {isExpanded && customerMenuOpen && (
              <div className="mt-1 ml-4 space-y-1 border-l border-white/20 pl-2">
                {/* Old Database */}
                <div>
                  <button
                    onClick={() => setOldDbOpen(!oldDbOpen)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-semibold text-white/70 hover:text-white"
                  >
                    <span className="flex items-center gap-1.5">
                      <ChevronRight className={`w-3 h-3 transition-transform ${oldDbOpen ? 'rotate-90' : ''}`} />
                      Old Database
                    </span>
                  </button>
                  {oldDbOpen && (
                    <div className="ml-4 space-y-1 mt-0.5">
                      <NavLink
                        to="/customers/old/known"
                        onClick={() => isMobile && setIsOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center justify-between rounded-lg px-2 py-1 text-[11px] transition ${
                            isActive
                              ? 'bg-gold-400/20 text-gold-300 font-bold'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`
                        }
                      >
                        <span>• Known</span>
                        <span className="text-[10px] text-white/60">{oldKnownCount}</span>
                      </NavLink>
                      <NavLink
                        to="/customers/old/unknown"
                        onClick={() => isMobile && setIsOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center justify-between rounded-lg px-2 py-1 text-[11px] transition ${
                            isActive
                              ? 'bg-gold-400/20 text-gold-300 font-bold'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`
                        }
                      >
                        <span>• Unknown</span>
                        <span className="text-[10px] text-white/60">{oldUnknownCount}</span>
                      </NavLink>
                    </div>
                  )}
                </div>

                {/* New Database */}
                <div>
                  <button
                    onClick={() => setNewDbOpen(!newDbOpen)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-semibold text-white/70 hover:text-white"
                  >
                    <span className="flex items-center gap-1.5">
                      <ChevronRight className={`w-3 h-3 transition-transform ${newDbOpen ? 'rotate-90' : ''}`} />
                      New Database
                    </span>
                  </button>
                  {newDbOpen && (
                    <div className="ml-4 space-y-1 mt-0.5">
                      <NavLink
                        to="/customers/new/known"
                        onClick={() => isMobile && setIsOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center justify-between rounded-lg px-2 py-1 text-[11px] transition ${
                            isActive
                              ? 'bg-gold-400/20 text-gold-300 font-bold'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`
                        }
                      >
                        <span>• Known</span>
                        <span className="text-[10px] text-white/60">{newKnownCount}</span>
                      </NavLink>
                      <NavLink
                        to="/customers/new/unknown"
                        onClick={() => isMobile && setIsOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center justify-between rounded-lg px-2 py-1 text-[11px] transition ${
                            isActive
                              ? 'bg-gold-400/20 text-gold-300 font-bold'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`
                        }
                      >
                        <span>• Unknown</span>
                        <span className="text-[10px] text-white/60">{newUnknownCount}</span>
                      </NavLink>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. Daily Activities */}
        {canAccessRoute('daily-activities') && (
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
        )}

        {/* 4. Performance (Case Disposition) */}
        {canAccessRoute('performance') && (
          <NavLink
            to="/performance"
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
              <Award className="w-4 h-4 shrink-0 text-yellow-400" />
              {isExpanded && <span>Performance</span>}
            </div>
            {isExpanded && pendingCasesCount > 0 && (
              <span className="text-[10px] bg-amber-400 text-amber-950 font-bold px-1.5 py-0.5 rounded-full">
                {pendingCasesCount}
              </span>
            )}
          </NavLink>
        )}

        {/* 5. Attendance Menu (Available to All Roles - Punch In Only) */}
        {canAccessRoute('attendance') && (
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
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                userTodayPunched
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-amber-400 text-amber-950 font-extrabold'
              }`}>
                {userTodayPunched ? 'Punched' : 'Punch In'}
              </span>
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
        {canAccessRoute('resignation') && (
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

        {/* 7. Reports */}
        {canAccessRoute('reports') && (
          <NavLink
            to="/reports"
            onClick={() => isMobile && setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-white/15 text-gold-300 shadow-inner font-bold border-l-4 border-gold-400'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <BarChart3 className="w-4 h-4 shrink-0 text-violet-300" />
            {isExpanded && <span>Reports</span>}
          </NavLink>
        )}

        {/* 8. Settings & Distribution */}
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

      {/* Footer Info */}
      {isExpanded && (
        <div className="p-3 border-t border-white/10 bg-black/25 text-center text-[10px] text-white/50 shrink-0">
          Rajalakshmy Associates v1.0
        </div>
      )}
    </>
  );

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
