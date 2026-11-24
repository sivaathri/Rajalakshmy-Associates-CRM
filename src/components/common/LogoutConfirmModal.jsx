import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, X } from 'lucide-react';

export const LogoutConfirmModal = () => {
  const { showLogoutConfirmModal, setShowLogoutConfirmModal, logout, currentUser } = useAuth();

  if (!showLogoutConfirmModal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden p-6 text-center">
        <button
          onClick={() => setShowLogoutConfirmModal(false)}
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3.5 border border-rose-200 shadow-sm">
          <LogOut className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-slate-900 font-corporate">
          Are you sure you want to log out?
        </h3>

        <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
          Logged in as <strong className="text-slate-800">{currentUser?.name}</strong> ({currentUser?.role} • {currentUser?.id}). You will be returned to the employee login portal.
        </p>

        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setShowLogoutConfirmModal(false)}
            className="w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setShowLogoutConfirmModal(false);
              logout();
            }}
            className="w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-700 to-burgundy-900 hover:from-rose-800 hover:to-burgundy-950 text-white font-bold text-xs transition shadow-md active:scale-95"
          >
            Yes, Log Out
          </button>
        </div>
      </div>
    </div>
  );
};
