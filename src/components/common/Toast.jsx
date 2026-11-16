import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = () => {
  const { toastMessage } = useAuth();
  if (!toastMessage) return null;

  const { message, type } = toastMessage;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-gold-600 flex-shrink-0" />
  };

  const borders = {
    success: 'border-emerald-300 bg-white shadow-emerald-900/10',
    error: 'border-rose-300 bg-white shadow-rose-900/10',
    info: 'border-gold-300 bg-white shadow-gold-900/10'
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-slide-up max-w-md">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl ${borders[type] || borders.info}`}>
        {icons[type] || icons.info}
        <span className="text-sm font-medium text-slate-800">{message}</span>
      </div>
    </div>
  );
};
