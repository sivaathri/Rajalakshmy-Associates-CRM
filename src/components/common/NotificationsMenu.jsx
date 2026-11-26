import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { getSystemNotifications } from '../../utils/notifications';
import {
  Bell,
  CheckCheck,
  CalendarCheck,
  FileCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  X
} from 'lucide-react';

export const NotificationsMenu = () => {
  const { currentUser } = useAuth();
  const crm = useCRM();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Stored read notification IDs in localStorage
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('rajalakshmy_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread' | 'reminders'

  // Generate dynamic notifications
  const allNotifications = useMemo(() => {
    return getSystemNotifications({
      currentUser,
      customers: crm.customers,
      bankLogins: crm.bankLogins,
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

  // Sync read IDs
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
  };

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'unread') {
      return allNotifications.filter(n => !readIds.includes(n.id));
    }
    if (activeFilter === 'reminders') {
      return allNotifications.filter(n => n.type === 'reminder' || n.type === 'bank_login');
    }
    return allNotifications;
  }, [allNotifications, activeFilter, readIds]);

  const getItemIcon = (type) => {
    switch (type) {
      case 'reminder':
        return <CalendarCheck className="w-4 h-4 text-amber-600" />;
      case 'bank_login':
        return <FileCheck className="w-4 h-4 text-emerald-600" />;
      case 'attendance':
        return <Clock className="w-4 h-4 text-rose-600" />;
      case 'approval':
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Navbar Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/20 shadow-sm"
        title="Notifications"
        aria-label="Open notifications"
      >
        <Bell className="w-4 h-4 text-gold-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white shadow ring-2 ring-[#600516] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden animate-fade-in text-slate-800">
          {/* Header */}
          <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-950 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-400/20 text-gold-300">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">Notifications</h4>
                <p className="text-[10px] text-white/70">
                  {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-gold-300 hover:text-gold-200 hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold gap-1.5">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition ${
                activeFilter === 'all'
                  ? 'bg-burgundy-900 text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              All ({allNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('unread')}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition ${
                activeFilter === 'unread'
                  ? 'bg-burgundy-900 text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('reminders')}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition ${
                activeFilter === 'reminders'
                  ? 'bg-burgundy-900 text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Due Reminders
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 text-center px-4">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-xs font-bold text-slate-700">All caught up!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No pending notifications at this time.</p>
              </div>
            ) : (
              filteredNotifications.map(item => {
                const isRead = readIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      markAsRead(item.id);
                      setIsOpen(false);
                      if (item.link) navigate(item.link);
                    }}
                    className={`p-3 transition cursor-pointer flex items-start gap-3 hover:bg-[#FAF6EF]/60 ${
                      !isRead ? 'bg-burgundy-50/30' : 'bg-white opacity-85'
                    }`}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200">
                      {getItemIcon(item.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-burgundy-900 bg-burgundy-50 px-1.5 py-0.5 rounded border border-burgundy-200">
                          {item.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {item.time}
                        </span>
                      </div>

                      <h5 className={`text-xs mt-1 truncate ${!isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {item.title}
                      </h5>

                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                        {item.message}
                      </p>
                    </div>

                    {!isRead && (
                      <span className="mt-2 h-2 w-2 rounded-full bg-rose-500 shrink-0" title="Unread" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="font-bold text-burgundy-900 hover:text-burgundy-700 flex items-center gap-1 text-[11px]"
            >
              <span>View All Notifications Page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
