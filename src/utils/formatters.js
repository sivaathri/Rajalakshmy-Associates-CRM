// Utility formatters and export helpers

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (dateStr) => {
  return formatDateDDMMYYYY(dateStr);
};

// Format mobile number continuously without 5-and-5 space (e.g. +91 9994354019)
export const formatMobileNumber = (val) => {
  if (!val) return "";
  const str = String(val).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2)}`;
  }
  return str.replace(/(\d{5})\s+(\d{5})/g, '$1$2').trim();
};

// Format strictly to DD-MM-YYYY (e.g. 17-11-2026)
export const formatDateDDMMYYYY = (dateInput) => {
  if (!dateInput) return "-";
  if (typeof dateInput === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  // If input is YYYY-MM-DD
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [y, m, d] = dateInput.trim().split('-');
    return `${d}-${m}-${y}`;
  }
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!date || isNaN(date.getTime())) return String(dateInput);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day}-${month}-${year} ${time}`;
};

export const getStatusBadgeClass = (status) => {
  const normalized = (status || "").toLowerCase();
  switch (normalized) {
    case 'ok':
    case 'approved':
    case 'completed':
    case 'saved':
    case 'active':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 ring-1 ring-emerald-500/20';
    case 'reminder':
    case 'in progress':
    case 'in review':
    case 'pending':
    case 'pending approval':
      return 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-500/20';
    case 'not attend':
      return 'bg-blue-50 text-blue-800 border-blue-200 ring-1 ring-blue-500/20';
    case 'no need':
    case 'rejected':
    case 'inactive':
      return 'bg-rose-50 text-rose-800 border-rose-200 ring-1 ring-rose-500/20';
    case 'field visit':
      return 'bg-purple-50 text-purple-800 border-purple-200 ring-1 ring-purple-500/20';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

// CSV Export Utility
export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(obj =>
    headers.map(header => {
      let val = obj[header];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'object') val = JSON.stringify(val);
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
