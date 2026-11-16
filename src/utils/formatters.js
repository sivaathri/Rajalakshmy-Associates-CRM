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
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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
