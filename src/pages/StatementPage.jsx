import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  parseStatementFile,
  parseNumericAmount,
  isMoneyLikeCell
} from '../utils/statementParser';
import { Pagination } from '../components/common/Pagination';
import {
  Upload,
  Search,
  Calendar,
  RotateCcw,
  Trash2,
  Lock,
  FileSpreadsheet,
  AlignLeft,
  Table,
  Download,
  Copy,
  Check,
  AlertCircle,
  Eye,
  Building2
} from 'lucide-react';
import { formatDate, exportToCSV } from '../utils/formatters';

const formatStatementCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const STORAGE_KEY_STATEMENTS = 'rajalakshmy_bank_statements_v3';

const HighlightText = ({ text = '', query = '' }) => {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = String(text).split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

export const StatementPage = () => {
  const { currentUser, showToast } = useAuth();
  const fileInputRef = useRef(null);

  const [statements, setStatements] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATEMENTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeStatementId, setActiveStatementId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATEMENTS);
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed[0]?.id || null;
    } catch {
      return null;
    }
  });

  // In-session Object URLs so uploaded PDFs can also be viewed in exact original document view
  const [originalPdfUrls, setOriginalPdfUrls] = useState({});

  const [isParsing, setIsParsing] = useState(false);

  // Encrypted PDF password retry state
  const [pendingPdfFile, setPendingPdfFile] = useState(null);
  const [pdfPassword, setPdfPassword] = useState('');
  const [pdfError, setPdfError] = useState('');

  // Search & Date Range Filters
  const [searchText, setSearchText] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'raw' | 'document'
  const [showAllRows, setShowAllRows] = useState(true); // Show all extracted rows without hiding pages by default
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedFull, setCopiedFull] = useState(false);
  const itemsPerPage = 50;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATEMENTS, JSON.stringify(statements));
    } catch (e) {
      console.warn('Could not persist full statements to localStorage:', e);
    }
  }, [statements]);

  const activeStatement = useMemo(() => {
    return statements.find(s => s.id === activeStatementId) || statements[0] || null;
  }, [statements, activeStatementId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, fromDate, toDate, activeStatement?.id, viewMode]);

  const saveParsedStatement = (parsed, meta, rawFile = null) => {
    const todayIso = new Date().toISOString().split('T')[0];
    const id = `STMT-${Date.now().toString(36)}`;
    const defaultLabel =
      parsed.accountHeader?.leftLines?.[0] ||
      meta.fileName.replace(/\.[^.]+$/, '');

    const entry = {
      id,
      customerLabel: defaultLabel,
      fileName: meta.fileName,
      fileType: parsed.fileType,
      pageCount: parsed.pageCount || 1,
      totalLines: parsed.totalLines || 0,
      totalRows: parsed.totalRows || 0,
      minDate: parsed.minDate || '',
      maxDate: parsed.maxDate || '',
      detectedDatesCount: parsed.detectedDatesCount || 0,
      accountHeader: parsed.accountHeader || { bankName: '', statementTitle: '', leftLines: [], rightLines: [] },
      columns: parsed.columns || null,
      tableRows: parsed.tableRows || [],
      lines: parsed.lines || [],
      fullText: parsed.fullText || '',
      statementSummary: parsed.statementSummary || null,
      uploadedAt: todayIso,
      uploadedBy: currentUser?.name || 'User'
    };

    if (rawFile && (rawFile.type === 'application/pdf' || /\.pdf$/i.test(rawFile.name || ''))) {
      const objUrl = URL.createObjectURL(rawFile);
      setOriginalPdfUrls(prev => ({ ...prev, [id]: objUrl }));
    }

    setStatements(prev => [entry, ...prev]);
    setActiveStatementId(id);
    setViewMode('table');
    setFromDate('');
    setToDate('');
    setSearchText('');
    showToast(
      entry.columns
        ? `Extracted ${entry.tableRows.length} rows (${entry.columns.length} columns) from "${entry.fileName}"`
        : `Extracted ${entry.totalLines} lines from "${entry.fileName}"`,
      'success'
    );
  };

  const processFile = async (file, password = '') => {
    if (!file) return;
    setIsParsing(true);
    setPdfError('');
    try {
      const parsed = await parseStatementFile(file, password);
      if (!parsed.totalLines) {
        showToast('No readable text found in this file (scanned image PDFs need selectable text or CSV/Excel).', 'error');
        setIsParsing(false);
        return;
      }
      saveParsedStatement(parsed, { fileName: file.name }, file);
      setPendingPdfFile(null);
      setPdfPassword('');
    } catch (err) {
      const msg = String(err?.message || err || '');
      if (err?.name === 'PasswordException' || msg.toLowerCase().includes('password')) {
        setPendingPdfFile(file);
        setPdfError(password ? 'Incorrect PDF password. Please try again.' : 'This bank statement PDF is password protected. Enter the password below:');
      } else {
        console.error('Statement parse error:', err);
        showToast(`Could not parse statement: ${msg || 'Unsupported format'}`, 'error');
      }
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file, '');
    }
  };

  const handleUnlockPdf = (e) => {
    e.preventDefault();
    if (!pendingPdfFile || !pdfPassword) return;
    processFile(pendingPdfFile, pdfPassword);
  };

  const handleDeleteStatement = (id) => {
    if (originalPdfUrls[id]) {
      URL.revokeObjectURL(originalPdfUrls[id]);
    }
    setStatements(prev => prev.filter(s => s.id !== id));
    if (activeStatementId === id) {
      setActiveStatementId(null);
    }
    showToast('Statement removed', 'info');
  };

  const hasStructuredTable = Boolean(activeStatement?.columns?.length && activeStatement?.tableRows?.length);

  // Filtered structured table rows (Date Range + Search Text)
  const filteredTableRows = useMemo(() => {
    if (!hasStructuredTable) return [];
    const q = searchText.trim().toLowerCase();
    const hasDateFilter = Boolean(fromDate || toDate);

    return activeStatement.tableRows.filter(row => {
      if (hasDateFilter) {
        if (!row.date) return false;
        if (fromDate && row.date < fromDate) return false;
        if (toDate && row.date > toDate) return false;
      }
      if (q) {
        const match = (row.joined || '').toLowerCase().includes(q) || (row.date || '').includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [activeStatement, hasStructuredTable, fromDate, toDate, searchText]);

  // Filtered raw text lines (Date Range + Search Text)
  const filteredLines = useMemo(() => {
    if (!activeStatement?.lines) return [];
    const q = searchText.trim().toLowerCase();
    const hasDateFilter = Boolean(fromDate || toDate);

    return activeStatement.lines.filter(line => {
      if (hasDateFilter) {
        const lineDate = line.effectiveDate || line.explicitDate;
        if (!lineDate) return false;
        if (fromDate && lineDate < fromDate) return false;
        if (toDate && lineDate > toDate) return false;
      }
      if (q) {
        const matchText = (line.text || '').toLowerCase().includes(q);
        const matchDate = (line.effectiveDate || '').includes(q);
        const matchSource = (line.source || '').toLowerCase().includes(q);
        if (!matchText && !matchDate && !matchSource) return false;
      }
      return true;
    });
  }, [activeStatement, fromDate, toDate, searchText]);

  // Compute Debit / Credit / Transaction Total & Closing Balance across active/filtered rows + extracted statement summary
  const statementTotalsSummary = useMemo(() => {
    if (!activeStatement) return null;
    const extracted = activeStatement.statementSummary || {};
    const isFiltered = Boolean(fromDate || toDate || searchText.trim());

    if (hasStructuredTable) {
      const cols = activeStatement.columns;
      const debitIdx = cols.findIndex(
        c => /\b(debits?|withdraws?|withdrawals?|money\s*out|paid\s*out|dr)\b/i.test(c.label) && !/\b(dr\s*\/?\s*cr|cr\s*\/?\s*dr|debit\s*\/\s*credit)\b/i.test(c.label)
      );
      const creditIdx = cols.findIndex(
        c => /\b(credits?|deposits?|money\s*in|paid\s*in|cr)\b/i.test(c.label) && !/\b(dr\s*\/?\s*cr|cr\s*\/?\s*dr|debit\s*\/\s*credit)\b/i.test(c.label)
      );
      const amountIdx = debitIdx === -1 && creditIdx === -1
        ? cols.findIndex(c => /\b(amounts?|amts?|txn\s*amt|transaction\s*amount)\b/i.test(c.label))
        : -1;
      const typeIdx = cols.findIndex(c => /\b(dr\s*\/?\s*cr|cr\s*\/?\s*dr|debit\s*\/\s*credit|d\/c|txn\s*type|^type$|^ind$|^sign$)\b/i.test(c.label.trim()));
      const balanceIdx = cols.findIndex(c => /\b(balances?|bal|closing\s*bal|running\s*bal|avail(?:able)?\s*bal)\b/i.test(c.label));

      let totalDebit = 0;
      let totalCredit = 0;
      let txnCount = 0;
      let filteredClosingBalance = null;

      const parseFilteredBalance = (raw = '') => {
        const val = parseNumericAmount(raw);
        return /\b\d[\d,]*(?:\.\d+)?\s*dr\.?$/i.test(String(raw || '').trim()) && val > 0 ? -val : val;
      };

      filteredTableRows.forEach(r => {
        const joinedLower = (r.joined || '').toLowerCase();
        if (/\bclosing\s*balance\b/i.test(joinedLower) && balanceIdx >= 0 && isMoneyLikeCell(r.cells[balanceIdx] || '')) {
          filteredClosingBalance = parseFilteredBalance(r.cells[balanceIdx]);
          return;
        }
        if (r.isBalanceBanner || r.isFullWidthRow) return;

        const hasDr = debitIdx >= 0 && isMoneyLikeCell(r.cells[debitIdx] || '');
        const hasCr = creditIdx >= 0 && isMoneyLikeCell(r.cells[creditIdx] || '');
        const hasSingleAmt = amountIdx >= 0 && isMoneyLikeCell(r.cells[amountIdx] || '');
        if (hasDr || hasCr || hasSingleAmt || r.date) txnCount += 1;
        if (hasDr) totalDebit += Math.abs(parseNumericAmount(r.cells[debitIdx]));
        if (hasCr) totalCredit += Math.abs(parseNumericAmount(r.cells[creditIdx]));
        if (hasSingleAmt) {
          const amtVal = parseNumericAmount(r.cells[amountIdx]);
          const typeSignal = `${typeIdx >= 0 ? (r.cells[typeIdx] || '') : ''} ${r.cells[amountIdx] || ''}`;
          if (/\bcr\b|\(cr\)|credit/i.test(typeSignal)) {
            totalCredit += Math.abs(amtVal);
          } else {
            totalDebit += Math.abs(amtVal);
          }
        }
        if (balanceIdx >= 0 && isMoneyLikeCell(r.cells[balanceIdx] || '')) {
          filteredClosingBalance = parseFilteredBalance(r.cells[balanceIdx]);
        }
      });

      const resolvedDebit = !isFiltered && extracted.debitTotal !== null && extracted.debitTotal !== undefined
        ? extracted.debitTotal
        : (debitIdx >= 0 || amountIdx >= 0 ? totalDebit : null);
      const resolvedCredit = !isFiltered && extracted.creditTotal !== null && extracted.creditTotal !== undefined
        ? extracted.creditTotal
        : (creditIdx >= 0 || amountIdx >= 0 ? totalCredit : null);
      const resolvedClosing = isFiltered
        ? (filteredClosingBalance ?? extracted.closingBalance ?? null)
        : (extracted.closingBalance ?? filteredClosingBalance ?? null);

      const resolvedTransactionTotal =
        resolvedDebit !== null || resolvedCredit !== null
          ? (resolvedDebit || 0) + (resolvedCredit || 0)
          : null;

      return {
        isFiltered,
        openingBalance: extracted.openingBalance ?? null,
        closingBalance: resolvedClosing,
        hasDebit: debitIdx >= 0 || amountIdx >= 0 || resolvedDebit !== null,
        hasCredit: creditIdx >= 0 || amountIdx >= 0 || resolvedCredit !== null,
        totalDebit: resolvedDebit || 0,
        totalCredit: resolvedCredit || 0,
        transactionTotal: resolvedTransactionTotal,
        transactionCount: isFiltered ? txnCount : (extracted.transactionCount || txnCount),
        debitIdx,
        creditIdx,
        amountIdx,
        balanceIdx
      };
    }

    return {
      isFiltered,
      openingBalance: extracted.openingBalance ?? null,
      closingBalance: extracted.closingBalance ?? null,
      hasDebit: extracted.debitTotal !== null && extracted.debitTotal !== undefined,
      hasCredit: extracted.creditTotal !== null && extracted.creditTotal !== undefined,
      totalDebit: extracted.debitTotal || 0,
      totalCredit: extracted.creditTotal || 0,
      transactionTotal: extracted.transactionTotal ?? null,
      transactionCount: extracted.transactionCount || 0,
      debitIdx: -1,
      creditIdx: -1,
      amountIdx: -1,
      balanceIdx: -1
    };
  }, [activeStatement, hasStructuredTable, filteredTableRows, fromDate, toDate, searchText]);

  const activeItems = (viewMode === 'table' && hasStructuredTable) ? filteredTableRows : filteredLines;
  const paginatedItems = useMemo(() => {
    if (showAllRows) return activeItems;
    const start = (currentPage - 1) * itemsPerPage;
    return activeItems.slice(start, start + itemsPerPage);
  }, [activeItems, currentPage, itemsPerPage, showAllRows]);

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setSearchText('');
  };

  const handleExportFiltered = () => {
    if (!activeStatement) return;
    if (hasStructuredTable && viewMode === 'table') {
      if (filteredTableRows.length === 0) return;
      const rows = filteredTableRows.map(r => {
        const obj = {};
        activeStatement.columns.forEach((col, i) => {
          obj[col.label] = r.cells[i] || '';
        });
        return obj;
      });
      exportToCSV(rows, `${activeStatement.customerLabel || 'bank_statement'}_table.csv`);
    } else {
      if (filteredLines.length === 0) return;
      const rows = filteredLines.map(l => ({
        'Line No': l.lineNo,
        'Page / Sheet': l.source,
        'Detected Date': l.effectiveDate ? formatDate(l.effectiveDate) : '-',
        'Statement Text / Details': l.text
      }));
      exportToCSV(rows, `${activeStatement.customerLabel || 'bank_statement'}_lines.csv`);
    }
  };

  const handleCopyFilteredText = async () => {
    const joined = (hasStructuredTable && viewMode === 'table')
      ? filteredTableRows.map(r => r.cells.join('\t')).join('\n')
      : filteredLines.map(l => l.text).join('\n');
    try {
      await navigator.clipboard.writeText(joined);
      setCopiedFull(true);
      showToast('Copied filtered statement details to clipboard', 'success');
      setTimeout(() => setCopiedFull(false), 2000);
    } catch {
      showToast('Unable to copy automatically', 'info');
    }
  };

  const quickKeywords = ['UPI', 'NEFT', 'IMPS', 'RTGS', 'Salary', 'EMI', 'Return', 'Bounce', 'Cash'];
  const headerInfo = activeStatement?.accountHeader;
  const hasHeaderCard = Boolean(
    headerInfo &&
    (headerInfo.bankName || headerInfo.statementTitle || headerInfo.leftLines?.length || headerInfo.rightLines?.length)
  );
  const currentPdfUrl = activeStatement ? originalPdfUrls[activeStatement.id] : null;

  return (
    <div className="space-y-6 w-full">
      {/* Upload & Statement Extraction Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-burgundy-50 text-burgundy-900 border border-burgundy-200">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Upload Customer Bank Statement</h2>
              <p className="text-[11px] text-slate-500">
                Upload any bank statement (PDF, Excel, CSV, TXT) to extract the customer address header &amp; exact transaction table for date/text search.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="flex w-full items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-burgundy-300 bg-[#FAF6EF] hover:bg-burgundy-50/60 px-4 text-xs font-bold text-burgundy-950 cursor-pointer transition">
            <Upload className="w-4 h-4 text-burgundy-800" />
            <span>
              {isParsing ? 'Analyzing Bank Statement...' : 'Select Bank Statement (PDF, Excel, CSV, TXT)'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv,.txt"
              disabled={isParsing}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Password Protected PDF Prompt */}
        {pendingPdfFile && (
          <form onSubmit={handleUnlockPdf} className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-950 font-semibold flex-1">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{pdfError || `Enter password for ${pendingPdfFile.name}`}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="PDF Password..."
                value={pdfPassword}
                onChange={(e) => setPdfPassword(e.target.value)}
                autoFocus
                className="text-xs rounded-xl border border-amber-300 bg-white px-3 py-2 focus:outline-none focus:border-burgundy-800"
              />
              <button
                type="submit"
                disabled={isParsing}
                className="rounded-xl bg-burgundy-900 hover:bg-burgundy-800 text-white px-4 py-2 text-xs font-bold"
              >
                Unlock &amp; Read
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingPdfFile(null);
                  setPdfPassword('');
                  setPdfError('');
                }}
                className="text-xs text-slate-600 hover:text-slate-900 px-2 py-2 font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Uploaded Statements List */}
        {statements.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Uploaded Statements ({statements.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {statements.map((st) => {
                const isSelected = activeStatement?.id === st.id;
                return (
                  <div
                    key={st.id}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition ${
                      isSelected
                        ? 'border-burgundy-800 bg-burgundy-50 text-burgundy-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveStatementId(st.id)}
                      className="text-left flex items-center gap-2"
                    >
                      <span className="text-[10px] font-mono font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        {st.fileType}
                      </span>
                      <span>{st.customerLabel}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        ({st.totalRows ? `${st.totalRows} rows` : `${st.totalLines} lines`})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStatement(st.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                      title="Delete statement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Statement Search & Viewer */}
      {!activeStatement ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Bank Statement Uploaded Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Upload a customer bank statement (PDF, Excel, CSV, or TXT) above to view its exact account address header and structured table.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search & Date Range Filter Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {activeStatement.customerLabel}
                  <span className="ml-2 text-[11px] font-normal text-slate-500">
                    ({activeStatement.fileName})
                  </span>
                </h3>
                <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                  <span>Pages/Sheets: <strong>{activeStatement.pageCount}</strong></span>
                  <span>•</span>
                  <span>
                    Entries: <strong>{hasStructuredTable ? `${activeStatement.tableRows.length} rows` : `${activeStatement.totalLines} lines`}</strong>
                  </span>
                  {(activeStatement.minDate || activeStatement.maxDate) && (
                    <>
                      <span>•</span>
                      <span>
                        Statement Period: <strong>{formatDate(activeStatement.minDate)}</strong> to{' '}
                        <strong>{formatDate(activeStatement.maxDate)}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg transition ${
                      viewMode === 'table' ? 'bg-white text-burgundy-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Statement Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('raw')}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg transition ${
                      viewMode === 'raw' ? 'bg-white text-burgundy-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                    <span>All Text</span>
                  </button>
                  {currentPdfUrl && (
                    <button
                      type="button"
                      onClick={() => setViewMode('document')}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg transition ${
                        viewMode === 'document' ? 'bg-white text-burgundy-900 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Original Document</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCopyFilteredText}
                  disabled={activeItems.length === 0}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
                >
                  {copiedFull ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFull ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportFiltered}
                  disabled={activeItems.length === 0}
                  className="inline-flex items-center gap-1 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5 text-gold-300" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Search Inputs */}
            {viewMode !== 'document' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Search Text / Particulars / Amount / Name / UTR
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search any text in statement..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full h-9 text-xs rounded-xl border border-slate-300 pl-9 pr-3 bg-white focus:outline-none focus:border-burgundy-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      From Date
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full h-9 text-xs rounded-xl border border-slate-300 pl-9 pr-3 bg-white focus:outline-none focus:border-burgundy-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      To Date
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="w-full h-9 text-xs rounded-xl border border-slate-300 pl-9 pr-3 bg-white focus:outline-none focus:border-burgundy-800"
                        />
                      </div>
                      {(fromDate || toDate || searchText) && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1"
                          title="Reset Filters"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Text Filter Pills & Filtered Totals */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Quick Find:</span>
                  {quickKeywords.map(kw => {
                    const active = searchText.toLowerCase() === kw.toLowerCase();
                    return (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => setSearchText(active ? '' : kw)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                          active
                            ? 'bg-burgundy-900 text-white border-burgundy-900'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {kw}
                      </button>
                    );
                  })}

                  <div className="ml-auto flex items-center gap-2 flex-wrap text-[11px] font-semibold">
                    {statementTotalsSummary?.hasDebit && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                        Debit: {formatStatementCurrency(statementTotalsSummary.totalDebit)}
                      </span>
                    )}
                    {statementTotalsSummary?.hasCredit && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Credit: {formatStatementCurrency(statementTotalsSummary.totalCredit)}
                      </span>
                    )}
                    <span className="text-burgundy-900">
                      Showing {activeItems.length} of {hasStructuredTable && viewMode === 'table' ? activeStatement.tableRows.length : activeStatement.totalLines}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Statement Opening Balance, Separate Debit & Credit Totals, Transaction Total & Closing Balance */}
            {statementTotalsSummary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Opening Balance
                  </span>
                  <span className="text-sm font-extrabold font-mono text-slate-900 mt-0.5 block">
                    {statementTotalsSummary.openingBalance !== null && statementTotalsSummary.openingBalance !== undefined
                      ? formatStatementCurrency(statementTotalsSummary.openingBalance)
                      : '—'}
                  </span>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                    {statementTotalsSummary.isFiltered ? 'Filtered Debit Total' : 'Debit Total'}
                  </span>
                  <span className="text-sm font-extrabold font-mono text-rose-800 mt-0.5 block">
                    {statementTotalsSummary.hasDebit ? formatStatementCurrency(statementTotalsSummary.totalDebit) : '—'}
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    {statementTotalsSummary.isFiltered ? 'Filtered Credit Total' : 'Credit Total'}
                  </span>
                  <span className="text-sm font-extrabold font-mono text-emerald-800 mt-0.5 block">
                    {statementTotalsSummary.hasCredit ? formatStatementCurrency(statementTotalsSummary.totalCredit) : '—'}
                  </span>
                </div>

                <div className="rounded-xl border border-gold-300 bg-[#FAF6EF] px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                    {statementTotalsSummary.isFiltered ? 'Filtered Transaction Total' : 'Transaction Total'}
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                    <span className="text-sm font-extrabold font-mono text-burgundy-950">
                      {statementTotalsSummary.transactionTotal !== null
                        ? formatStatementCurrency(statementTotalsSummary.transactionTotal)
                        : `${statementTotalsSummary.transactionCount} Txns`}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-600">
                      ({statementTotalsSummary.transactionCount} txns)
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-burgundy-200 bg-burgundy-50/70 px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-burgundy-800 block">
                    Closing Balance
                  </span>
                  <span className="text-sm font-extrabold font-mono text-burgundy-950 mt-0.5 block">
                    {statementTotalsSummary.closingBalance !== null && statementTotalsSummary.closingBalance !== undefined
                      ? formatStatementCurrency(statementTotalsSummary.closingBalance)
                      : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* VIEW 1: EXACT STATEMENT ACCOUNT/ADDRESS HEADER + STRUCTURED TABLE */}
          {viewMode === 'table' && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Customer / Bank Address Header Format (matches uploaded bank statement layout) */}
              {hasHeaderCard && (
                <div className="p-6 border-b border-slate-200 bg-white space-y-4">
                  {headerInfo.bankName && (
                    <div className="flex items-center justify-center gap-2 text-base font-extrabold tracking-wide text-burgundy-900 uppercase">
                      <Building2 className="w-5 h-5 text-burgundy-800" />
                      <span>
                        <HighlightText text={headerInfo.bankName} query={searchText} />
                      </span>
                    </div>
                  )}

                  {(headerInfo.leftLines?.length > 0 || headerInfo.rightLines?.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-800 leading-relaxed">
                      <div className="space-y-0.5">
                        {headerInfo.leftLines.map((ln, idx) => (
                          <div
                            key={idx}
                            className={idx === 0 ? 'font-extrabold text-sm text-slate-900 underline decoration-slate-300 underline-offset-2 mb-1' : 'font-medium text-slate-700'}
                          >
                            <HighlightText text={ln} query={searchText} />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-0.5 md:text-right">
                        {headerInfo.rightLines.map((ln, idx) => (
                          <div key={idx} className="font-medium text-slate-700">
                            <HighlightText text={ln} query={searchText} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {headerInfo.statementTitle && (
                    <div className="text-center text-xs font-extrabold text-slate-900 bg-[#FAF6EF] border border-slate-200 rounded-xl py-2 px-4">
                      <HighlightText text={headerInfo.statementTitle} query={searchText} />
                    </div>
                  )}
                </div>
              )}

              {/* Exact Extracted Columns Table */}
              {hasStructuredTable ? (
                <div className="overflow-x-auto p-3 sm:p-4 bg-white">
                  <table className="w-full text-left text-xs text-slate-900 border-collapse border border-slate-400 table-auto">
                    <thead className="bg-[#FAF6EF] text-[11px] font-bold text-slate-950 border-b border-slate-400">
                      <tr>
                        {activeStatement.columns.map((col, cIdx) => (
                          <th
                            key={col.key || cIdx}
                            style={col.widthPct ? { width: `${col.widthPct}%` } : undefined}
                            className="px-2.5 py-2.5 border border-slate-400 text-center align-middle leading-tight"
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.length === 0 ? (
                        <tr>
                          <td colSpan={activeStatement.columns.length} className="px-4 py-10 text-center text-xs text-slate-400 italic border border-slate-300">
                            No matching entries found for the selected date range or search text.
                          </td>
                        </tr>
                      ) : (
                        paginatedItems.map((row) => (
                          <tr
                            key={row.rowNo}
                            className={`transition align-top ${
                              row.isBalanceBanner || row.isFullWidthRow
                                ? 'bg-slate-50 font-extrabold text-slate-950'
                                : 'hover:bg-[#FAF6EF]/60'
                            }`}
                          >
                            {row.isFullWidthRow ? (
                              <td
                                colSpan={activeStatement.columns.length}
                                className="px-2.5 py-2 text-left text-xs font-bold text-burgundy-900 bg-[#FAF6EF]/60 border border-slate-300"
                              >
                                <HighlightText text={row.joined || row.cells[0] || ''} query={searchText} />
                              </td>
                            ) : (
                              activeStatement.columns.map((col, cIdx) => {
                                const val = row.cells[cIdx] || '';
                                const isBranchOrCode = /\b(br|init|chq|cheque|ref|type|mode)\b/i.test(col.label) && !col.isWideText;
                                return (
                                  <td
                                    key={col.key || cIdx}
                                    className={`px-2.5 py-2 border border-slate-300 leading-snug ${
                                      isBranchOrCode
                                        ? 'text-center font-mono whitespace-nowrap'
                                        : col.isNumeric
                                        ? 'text-right font-mono tabular-nums whitespace-nowrap'
                                        : col.isDate
                                        ? 'text-left font-mono whitespace-nowrap text-slate-900'
                                        : 'text-left break-words [overflow-wrap:anywhere]'
                                    }`}
                                  >
                                    <HighlightText text={val} query={searchText} />
                                  </td>
                                );
                              })
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                    {statementTotalsSummary && activeStatement.columns.length > 0 && (
                      <tfoot className="bg-[#FAF6EF] border-t-2 border-slate-400 text-xs font-extrabold text-slate-950">
                        <tr>
                          {activeStatement.columns.map((col, cIdx) => {
                            if (cIdx === statementTotalsSummary.debitIdx) {
                              return (
                                <td key={col.key || cIdx} className="px-2.5 py-2.5 text-right font-mono tabular-nums text-rose-800 whitespace-nowrap border border-slate-400">
                                  {formatStatementCurrency(statementTotalsSummary.totalDebit)}
                                </td>
                              );
                            }
                            if (cIdx === statementTotalsSummary.creditIdx) {
                              return (
                                <td key={col.key || cIdx} className="px-2.5 py-2.5 text-right font-mono tabular-nums text-emerald-800 whitespace-nowrap border border-slate-400">
                                  {formatStatementCurrency(statementTotalsSummary.totalCredit)}
                                </td>
                              );
                            }
                            if (cIdx === statementTotalsSummary.amountIdx) {
                              return (
                                <td key={col.key || cIdx} className="px-2.5 py-2.5 text-right font-mono tabular-nums text-burgundy-950 whitespace-nowrap border border-slate-400">
                                  {statementTotalsSummary.transactionTotal !== null
                                    ? formatStatementCurrency(statementTotalsSummary.transactionTotal)
                                    : '—'}
                                </td>
                              );
                            }
                            if (cIdx === statementTotalsSummary.balanceIdx) {
                              return (
                                <td key={col.key || cIdx} className="px-2.5 py-2.5 text-right font-mono tabular-nums text-burgundy-950 whitespace-nowrap border border-slate-400">
                                  {statementTotalsSummary.closingBalance !== null && statementTotalsSummary.closingBalance !== undefined
                                    ? formatStatementCurrency(statementTotalsSummary.closingBalance)
                                    : '—'}
                                </td>
                              );
                            }
                            if (col.isWideText || (statementTotalsSummary.debitIdx > 0 && cIdx === 0 && !activeStatement.columns.some(c => c.isWideText))) {
                              return (
                                <td key={col.key || cIdx} className="px-2.5 py-2.5 text-left uppercase tracking-wider text-burgundy-900 border border-slate-400">
                                  TRANSACTION TOTAL &amp; CLOSING BALANCE
                                </td>
                              );
                            }
                            return (
                              <td key={col.key || cIdx} className="px-2.5 py-2.5 border border-slate-400" />
                            );
                          })}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              ) : (
                /* Fallback table when pasted/plain TXT has no columnar header */
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 min-w-[780px]">
                    <thead className="bg-[#FAF6EF] text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 w-16 text-center">Line #</th>
                        <th className="px-4 py-3 w-28">Source</th>
                        <th className="px-4 py-3 w-36">Statement Date</th>
                        <th className="px-4 py-3">Extracted Statement Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedItems.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-xs text-slate-400 italic">
                            No matching details found for the selected date range or search text.
                          </td>
                        </tr>
                      ) : (
                        paginatedItems.map((line) => (
                          <tr key={line.lineNo} className="hover:bg-[#FAF6EF]/60 transition align-top">
                            <td className="px-4 py-2.5 text-center font-mono text-[11px] text-slate-500">
                              {line.lineNo}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700 whitespace-nowrap">
                                {line.source}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {line.effectiveDate ? (
                                <span className="font-mono text-[11px] font-bold text-burgundy-900">
                                  {formatDate(line.effectiveDate)}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[11.5px] text-slate-800 leading-relaxed break-words">
                              <HighlightText text={line.text} query={searchText} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs font-semibold text-slate-600">
                  Showing {paginatedItems.length} of {activeItems.length} {hasStructuredTable ? 'statement rows' : 'statement lines'}
                  {showAllRows ? ' (All data visible)' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllRows(prev => !prev)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-burgundy-900 transition"
                >
                  {showAllRows ? 'Switch to 50 / Page' : `Show All (${activeItems.length})`}
                </button>
              </div>
              {!showAllRows && (
                <Pagination
                  currentPage={currentPage}
                  totalItems={activeItems.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  summaryLabel={hasStructuredTable ? 'statement rows' : 'statement lines'}
                />
              )}
            </div>
          )}

          {/* VIEW 2: FULL EXTRACTED TEXT LINES */}
          {viewMode === 'raw' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {filteredLines.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 italic">
                  No matching statement text found for the selected date range or search text.
                </div>
              ) : (
                <div className="max-h-[65vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800 space-y-1.5 leading-relaxed">
                  {filteredLines.map(line => (
                    <div key={line.lineNo} className="hover:bg-white px-2 py-0.5 rounded">
                      <span className="text-slate-400 select-none mr-2">[{line.lineNo}]</span>
                      {line.effectiveDate && (
                        <span className="text-burgundy-800 font-bold mr-2">
                          ({formatDate(line.effectiveDate)})
                        </span>
                      )}
                      <HighlightText text={line.text} query={searchText} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: ORIGINAL UPLOADED PDF DOCUMENT */}
          {viewMode === 'document' && currentPdfUrl && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <iframe
                title={activeStatement.fileName}
                src={currentPdfUrl}
                className="w-full h-[78vh] rounded-xl border border-slate-200"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
