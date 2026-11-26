import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCRM } from '../context/CRMContext';
import { getSystemNotifications } from '../utils/notifications';
import {
  Bell,
  CheckCheck,
  CalendarCheck,
  FileCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Filter,
  Search,
  UserCheck,
  Trash2
} from 'lucide-react';

export const NotificationsPage = () => {
  const { currentUser, showToast } = useAuth();
  const crm = useCRM();
  const navigate = useNavigate();

  // Stored read notification IDs in localStorage
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('rajalakshmy_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread' | 'Telecalling' | 'Bank File' | 'Attendance' | 'Approval'
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all notifications
  const allNotifications = useMemo(() => {
    return getSystemNotifications({
      currentUser,
      customers: crm.customers,
      bankLogins: crm.bankLogins,
      leads: crm.leads,
      leaves: crm.leaves,
      advanceAmounts: crm.advanceAmounts,
      resignations: crm.resignations,
      performanceCases: crm.performanceCases,
      attendance: crm.attendance
    });
  }, [currentUser, crm]);

  const unreadCount = useMemo(() => {
    return allNotifications.filter(n => !readIds.includes(n.id)).length;
  }, [allNotifications, readIds]);

  const markAsRead = (id) => {
    setReadIds(prev => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem('rajalakshmy_read_notifications', JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }
      return updated;
    });
  };

  const markAllAsRead = () => {
    const allIds = allNotifications.map(n => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem('rajalakshmy_read_notifications', JSON.stringify(allIds));
    } catch (err) {
      console.warn(err);
    }
    showToast('All notifications marked as read', 'success');
  };

  const clearAllRead = () => {
    setReadIds([]);
    try {
      localStorage.removeItem('rajalakshmy_read_notifications');
    } catch (err) {
      console.warn(err);
    }
    showToast('Read status reset', 'info');
  };

  const filteredNotifications = useMemo(() => {
    return allNotifications.filter(item => {
      const isRead = readIds.includes(item.id);
      if (filterType === 'unread' && isRead) return false;
      if (filterType !== 'all' && filterType !== 'unread' && item.category !== filterType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesMessage = item.message?.toLowerCase().includes(q);
        const matchesCategory = item.category?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesMessage && !matchesCategory) return false;
      }
      return true;
    });
  }, [allNotifications, filterType, searchQuery, readIds]);

  const getItemIcon = (type) => {
    switch (type) {
      case 'reminder':
        return <CalendarCheck className="w-5 h-5 text-amber-600" />;
      case 'bank_login':
        return <FileCheck className="w-5 h-5 text-emerald-600" />;
      case 'lead_assign':
        return <UserCheck className="w-5 h-5 text-burgundy-700" />;
      case 'attendance':
        return <Clock className="w-5 h-5 text-rose-600" />;
      case 'approval':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/20 border border-gold-300/30 text-gold-300 shadow-sm">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-gold-300 block">System Alerts & Updates</span>
            <h2 className="text-xl md:text-2xl font-extrabold text-white font-corporate">
              Notification Center
            </h2>
            <p className="text-xs text-white/70 mt-0.5">
              Track routine reminders, 2-day bank follow-ups, punch-in alerts, and case updates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 text-xs font-bold border border-white/20 transition shadow-sm"
            >
              <CheckCheck className="w-4 h-4 text-gold-300" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {[
            { id: 'all', label: `All (${allNotifications.length})` },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'Telecalling', label: 'Call Reminders' },
            { id: 'Assign Lead', label: 'Assign Leads' },
            { id: 'Bank File', label: 'Bank 2-Day Due' },
            { id: 'Attendance', label: 'Attendance' },
            ...(currentUser?.role === 'Admin' || currentUser?.role === 'Manager' ? [{ id: 'Leave Approval', label: 'Approvals' }] : [])
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                filterType === btn.id
                  ? 'bg-burgundy-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 py-1.5 pl-8 pr-3 focus:outline-none focus:border-burgundy-800"
          />
        </div>
      </div>

      {/* Notification Items List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100 overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mb-3 shadow-sm">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Notifications Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              You are all caught up! New reminders, 2-day bank routine updates, and approvals will appear here automatically.
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isRead = readIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => {
                  markAsRead(item.id);
                  if (item.link) navigate(item.link);
                }}
                className={`p-4 transition cursor-pointer flex items-start gap-4 hover:bg-[#FAF6EF]/70 ${
                  !isRead ? 'bg-burgundy-50/20' : 'bg-white opacity-90'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 shadow-sm mt-0.5">
                  {getItemIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-burgundy-900 bg-burgundy-50 border border-burgundy-200 px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                      {item.priority === 'high' && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          High Priority
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {item.time}
                    </span>
                  </div>

                  <h4 className={`text-sm mt-1.5 ${!isRead ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>
                    {item.title}
                  </h4>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {item.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-center shrink-0">
                  {!isRead && (
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" title="Unread" />
                  )}
                  <button
                    type="button"
                    className="p-1 text-slate-400 hover:text-burgundy-900 transition"
                    title="Go to record"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
