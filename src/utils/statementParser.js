import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MONTH_MAP = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12'
};

const normalizeYear = (yStr) => {
  const n = parseInt(yStr, 10);
  if (isNaN(n)) return null;
  if (yStr.length === 2) {
    return n >= 70 ? 1900 + n : 2000 + n;
  }
  if (n >= 1950 && n <= 2100) return n;
  return null;
};

const toIsoIfValid = (year, month, day) => {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

export const extractDatesFromLine = (text = '') => {
  const str = String(text || '');
  const found = [];

  // 1. YYYY-MM-DD or YYYY/MM/DD
  const isoRegex = /\b(20\d{2}|19\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/g;
  let m;
  while ((m = isoRegex.exec(str)) !== null) {
    const iso = toIsoIfValid(m[1], m[2], m[3]);
    if (iso && !found.includes(iso)) found.push(iso);
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY or DD/MM/YY
  const dmyRegex = /\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]((?:20|19)?\d{2})\b/g;
  while ((m = dmyRegex.exec(str)) !== null) {
    const y = normalizeYear(m[3]);
    if (y) {
      const iso = toIsoIfValid(y, m[2], m[1]);
      if (iso && !found.includes(iso)) found.push(iso);
    }
  }

  // 3. DD MMM YYYY or DD-MMM-YYYY or DD MMM YY or DD-MMM-YY
  const dMonYRegex = /\b(0?[1-9]|[12]\d|3[01])[\s\-/.]*([A-Za-z]{3,9})[\s\-/.]*((?:20|19)?\d{2})\b/g;
  while ((m = dMonYRegex.exec(str)) !== null) {
    const monthNum = MONTH_MAP[m[2].toLowerCase()];
    const y = normalizeYear(m[3]);
    if (monthNum && y) {
      const iso = toIsoIfValid(y, monthNum, m[1]);
      if (iso && !found.includes(iso)) found.push(iso);
    }
  }

  return found;
};

const TABLE_HEADER_KEYWORDS = [
  'date', 'tran date', 'txn date', 'value date', 'posting date',
  'particulars', 'narration', 'description', 'remarks', 'details', 'transaction',
  'chq', 'cheque', 'ref', 'utr',
  'debit', 'withdrawal', 'dr', 'credit', 'deposit', 'cr', 'amount', 'balance', 'closing', 'init'
];

const isTableHeaderText = (joinedText = '', cellCount = 1) => {
  if (cellCount < 3) return false;
  const lower = joinedText.toLowerCase();
  let hits = 0;
  TABLE_HEADER_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) hits += 1;
  });
  const hasDateCol = /\b(tran\s*date|txn\s*date|date|value\s*dt|value\s*date)\b/i.test(lower);
  const hasDescOrAmt = /\b(particulars|narration|description|debit|credit|withdrawal|deposit|balance)\b/i.test(lower);
  return hits >= 3 && (hasDateCol || hasDescOrAmt);
};

const isNumericColumnHeader = (label = '') =>
  /\b(debit|credit|withdrawal|deposit|balance|amt|amount|dr|cr|br|init)\b/i.test(label);

const isWideTextColumnHeader = (label = '') =>
  /\b(particulars|narration|description|remarks|details|transaction\s*details)\b/i.test(label);

export const parseNumericAmount = (str = '') => {
  const cleaned = String(str || '').replace(/[^\d.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return 0;
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const buildColumnDefinitions = (headerRowItems, pageWidth) => {
  // Cluster closely adjacent fragments that belong to the same column header (e.g. "Tran Date", "Chq No", "Init. Br")
  const sorted = [...headerRowItems].sort((a, b) => a.x - b.x);
  const grouped = [];
  sorted.forEach(it => {
    const text = it.str.trim();
    if (!text) return;
    const prev = grouped[grouped.length - 1];
    const gap = prev ? (it.x - prev.xRight) : 999;
    // Merge words belonging to same header title if close (< 18px gap)
    if (prev && gap >= -2 && gap < 18) {
      prev.label = `${prev.label} ${text}`.replace(/\s+/g, ' ').trim();
      prev.xRight = Math.max(prev.xRight, it.xRight);
      prev.xCenter = (prev.xLeft + prev.xRight) / 2;
    } else {
      grouped.push({
        label: text,
        xLeft: it.x,
        xRight: it.xRight,
        xCenter: (it.x + it.xRight) / 2
      });
    }
  });

  // Compute start/end x boundaries carefully handling wide text columns & right-aligned amount columns
  const cols = grouped.map((g, idx) => {
    const prev = grouped[idx - 1];
    const next = grouped[idx + 1];
    const isWide = isWideTextColumnHeader(g.label);
    const isNum = isNumericColumnHeader(g.label);

    let startX = 0;
    if (prev) {
      if (isWide) {
        startX = prev.xRight + 4;
      } else if (isWideTextColumnHeader(prev.label) && isNum) {
        startX = Math.max(prev.xRight + 10, g.xLeft - 22);
      } else if (isNumericColumnHeader(prev.label) && isNum) {
        startX = (prev.xRight + g.xRight) / 2 - 4;
      } else {
        startX = (prev.xRight + g.xLeft) / 2;
      }
    }

    let endX = pageWidth + 50;
    if (next) {
      if (isWide && isNumericColumnHeader(next.label)) {
        endX = Math.max(g.xRight + 10, next.xLeft - 22);
      } else if (isWideTextColumnHeader(next.label)) {
        endX = g.xRight + 4;
      } else if (isNum && isNumericColumnHeader(next.label)) {
        endX = (g.xRight + next.xRight) / 2 - 4;
      } else {
        endX = (g.xRight + next.xLeft) / 2;
      }
    }

    return {
      key: `col_${idx}`,
      label: g.label,
      startX,
      endX,
      xLeft: g.xLeft,
      xRight: g.xRight,
      xCenter: g.xCenter,
      isNumeric: isNum,
      isWideText: isWide,
      isDate: /\bdate\b/i.test(g.label)
    };
  });

  return cols;
};

const assignRowItemsToColumns = (rowItems, columns) => {
  const cells = columns.map(() => '');
  const wideColIdx = columns.findIndex(c => c.isWideText);
  rowItems.forEach(item => {
    const cx = (item.x + item.xRight) / 2;
    const lx = item.x;
    const itemHasDigit = /\d/.test(item.str);
    let targetIdx = columns.findIndex(col => {
      if (col.isWideText) return lx >= col.startX && cx <= col.endX;
      if (col.isNumeric) return itemHasDigit && item.xRight >= col.startX - 8 && item.xRight <= col.endX + 12;
      return cx >= col.startX && cx <= col.endX;
    });
    if (targetIdx === -1 && wideColIdx >= 0 && !itemHasDigit && lx >= columns[wideColIdx].startX - 4 && lx <= columns[wideColIdx].endX + 20) {
      targetIdx = wideColIdx;
    }
    if (targetIdx === -1) {
      targetIdx = columns.findIndex(col => cx >= col.startX && cx <= col.endX);
    }
    if (targetIdx === -1) {
      // Nearest column fallback
      let bestDist = Infinity;
      columns.forEach((col, i) => {
        const d = Math.abs(cx - col.xCenter);
        if (d < bestDist) {
          bestDist = d;
          targetIdx = i;
        }
      });
    }
    if (targetIdx >= 0) {
      const s = item.str.trim();
      if (s) {
        cells[targetIdx] = cells[targetIdx] ? `${cells[targetIdx]} ${s}` : s;
      }
    }
  });
  return cells.map(c => c.replace(/\s+/g, ' ').trim());
};

const isFooterOrNoiseRow = (joined = '') => {
  const lower = joined.toLowerCase().trim();
  if (!lower) return true;
  if (/^page\s*\d+(\s*of\s*\d+)?$/i.test(lower)) return true;
  if (lower.includes('this is a system generated statement') || lower.includes('does not require signature')) return true;
  if (lower.includes('legends used in account statement') || lower.includes('registered office:')) return true;
  return false;
};

/**
 * Extracts Header / Customer Address info and Exact Table Columns + Rows from PDF.
 */
const extractPdfStructured = async (arrayBuffer, password = '') => {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    password: password || undefined
  });

  const pdfDoc = await loadingTask.promise;
  const rawLines = [];
  let page1HeaderBlock = {
    bankName: '',
    statementTitle: '',
    leftLines: [],
    rightLines: []
  };

  let columns = null;
  const rawTableRows = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const pageWidth = viewport.width || 600;
    const content = await page.getTextContent();

    // Cluster items into visual horizontal rows (Y descending)
    const rows = [];
    content.items.forEach(item => {
      if (!item || typeof item.str !== 'string') return;
      const trimmed = item.str.trim();
      if (!trimmed) return;
      const x = item.transform ? item.transform[4] : 0;
      const y = item.transform ? item.transform[5] : 0;
      const width = item.width || trimmed.length * 4.5;

      let row = rows.find(r => Math.abs(r.y - y) <= 3.5);
      if (!row) {
        row = { y, pageNum, items: [] };
        rows.push(row);
      }
      row.items.push({ x, xRight: x + width, y, str: item.str });
    });

    rows.sort((a, b) => b.y - a.y);

    // Find table header row index on this page
    let pageHeaderIdx = -1;
    rows.forEach((row, idx) => {
      row.items.sort((a, b) => a.x - b.x);
      const joined = row.items.map(i => i.str.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      row.joined = joined;
      rawLines.push({ source: `Page ${pageNum}`, text: joined });

      if (pageHeaderIdx === -1 && isTableHeaderText(joined, row.items.length)) {
        pageHeaderIdx = idx;
      }
    });

    // If table header was found on Page 1, collect customer/address/account summary above it
    if (pageNum === 1 && pageHeaderIdx > 0) {
      const preRows = rows.slice(0, pageHeaderIdx);
      preRows.forEach((r, rIdx) => {
        const text = r.joined;
        if (!text) return;

        // First prominent bank banner line (e.g. AXIS BANK, HDFC BANK)
        if (rIdx <= 1 && !page1HeaderBlock.bankName && /bank/i.test(text) && text.length < 50) {
          page1HeaderBlock.bankName = text;
          return;
        }

        // Centered statement period/account heading line
        if (/statement\s+of|account\s*(no|number|summary)|period\s*\(?from/i.test(text) && !/^scheme:/i.test(text)) {
          page1HeaderBlock.statementTitle = page1HeaderBlock.statementTitle
            ? `${page1HeaderBlock.statementTitle} • ${text}`
            : text;
          return;
        }

        const leftItems = r.items.filter(i => (i.x + i.xRight) / 2 < pageWidth * 0.56);
        const rightItems = r.items.filter(i => (i.x + i.xRight) / 2 >= pageWidth * 0.56);

        const leftText = leftItems.map(i => i.str.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        const rightText = rightItems.map(i => i.str.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

        if (leftText) page1HeaderBlock.leftLines.push(leftText);
        if (rightText) page1HeaderBlock.rightLines.push(rightText);
      });
    }

    // Build columns from the first detected table header (or page header)
    if (pageHeaderIdx !== -1 && !columns) {
      let headerItems = [...rows[pageHeaderIdx].items];
      // Check if header wrapped onto immediate next row (e.g. "Init." above "Br") within 13pt
      const nextRow = rows[pageHeaderIdx + 1];
      if (nextRow && Math.abs(rows[pageHeaderIdx].y - nextRow.y) <= 14) {
        const nextLooksLikeHeaderSub = nextRow.items.every(i => /^[A-Za-z.\s/()]{1,14}$/.test(i.str.trim()));
        if (nextLooksLikeHeaderSub && extractDatesFromLine(nextRow.joined).length === 0) {
          headerItems = [...headerItems, ...nextRow.items];
          pageHeaderIdx += 1;
        }
      }
      columns = buildColumnDefinitions(headerItems, pageWidth);
    }

    // Extract rows inside the table body on this page
    if (columns) {
      const bodyStartIdx = pageHeaderIdx !== -1 ? pageHeaderIdx + 1 : 0;
      for (let i = bodyStartIdx; i < rows.length; i++) {
        const r = rows[i];
        if (isFooterOrNoiseRow(r.joined)) continue;
        // Skip repeated table headers on Page 2+
        if (isTableHeaderText(r.joined, r.items.length)) continue;
        if (pageNum > 1 && page1HeaderBlock.bankName && r.joined === page1HeaderBlock.bankName) continue;
        if (pageNum > 1 && /statement\s+of/i.test(r.joined) && extractDatesFromLine(r.joined).length > 0 && !columns.some((_, idx) => idx === 0 && /^\s*\d{2}[-/]/.test(r.joined))) {
          continue;
        }

        const cells = assignRowItemsToColumns(r.items, columns);
        const nonEmptyCount = cells.filter(Boolean).length;
        if (nonEmptyCount === 0) continue;

        const dateColIdx = columns.findIndex(c => c.isDate);
        const wideColIdx = columns.findIndex(c => c.isWideText);
        const dateText = dateColIdx >= 0 ? cells[dateColIdx] : r.joined;
        const rowDates = extractDatesFromLine(dateText || r.joined);
        const hasAmount = columns.some((c, idx) => c.isNumeric && /\d+\.\d{2}|\d{2,}/.test(cells[idx] || ''));
        const isBalanceBanner = /\b(opening\s+balance|closing\s+balance|transaction\s+total)\b/i.test(r.joined);

        rawTableRows.push({
          pageNum,
          y: r.y,
          cells,
          joined: r.joined,
          explicitDate: rowDates[0] || '',
          hasAmount,
          isBalanceBanner,
          isNarrationOnly: !rowDates[0] && !hasAmount && !isBalanceBanner && wideColIdx >= 0 && Boolean(cells[wideColIdx])
        });
      }
    }
  }

  // Merge multi-line wrapped particulars into their owning transaction row
  // Handles BOTH top-wrapped (Axis Bank: line above cell center) and bottom-wrapped (SBI/HDFC: continuation below)
  const mergedRows = [];
  if (columns && rawTableRows.length > 0) {
    const wideIdx = columns.findIndex(c => c.isWideText);
    const pendingTopPrefix = [];

    for (let i = 0; i < rawTableRows.length; i++) {
      const cur = rawTableRows[i];
      const next = rawTableRows[i + 1];
      const prevMerged = mergedRows[mergedRows.length - 1];

      if (cur.isNarrationOnly && wideIdx >= 0) {
        const dyPrev = (prevMerged && prevMerged.pageNum === cur.pageNum) ? Math.abs(prevMerged.y - cur.y) : Infinity;
        const dyNext = (next && next.pageNum === cur.pageNum) ? Math.abs(cur.y - next.y) : Infinity;

        // If the next row has a date/amount and is closer than previous row, or previous row is already complete balance banner, attach above next row!
        if (next && (next.explicitDate || next.hasAmount) && (dyNext <= dyPrev || prevMerged?.isBalanceBanner)) {
          pendingTopPrefix.push(cur.cells[wideIdx]);
          continue;
        }
        // Otherwise attach below previous merged row
        if (prevMerged && prevMerged.pageNum === cur.pageNum && dyPrev <= 28) {
          prevMerged.cells[wideIdx] = `${prevMerged.cells[wideIdx]} ${cur.cells[wideIdx]}`.trim();
          prevMerged.y = cur.y;
          continue;
        }
        // Fallback: keep as pending top prefix if next exists, else standalone
        if (next && next.pageNum === cur.pageNum) {
          pendingTopPrefix.push(cur.cells[wideIdx]);
          continue;
        }
      }

      const finalCells = [...cur.cells];
      if (pendingTopPrefix.length > 0 && wideIdx >= 0) {
        const prefixText = pendingTopPrefix.join(' ').trim();
        finalCells[wideIdx] = finalCells[wideIdx]
          ? `${prefixText} ${finalCells[wideIdx]}`.replace(/\s+/g, ' ').trim()
          : prefixText;
        pendingTopPrefix.length = 0;
      }

      mergedRows.push({
        ...cur,
        cells: finalCells,
        joined: finalCells.filter(Boolean).join(' ')
      });
    }
  }

  return {
    pageCount: pdfDoc.numPages,
    rawLines,
    accountHeader: page1HeaderBlock,
    columns,
    tableRows: mergedRows
  };
};

/**
 * Extracts structured Header + Columns + Rows from Excel / CSV workbooks.
 */
const extractSpreadsheetStructured = async (arrayBuffer) => {
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: false });
  const rawLines = [];
  const accountHeader = {
    bankName: '',
    statementTitle: '',
    leftLines: [],
    rightLines: []
  };
  let columns = null;
  const tableRows = [];

  workbook.SheetNames.forEach((sheetName, sheetIdx) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

    let headerRowIdx = -1;
    rows.forEach((row, idx) => {
      if (!Array.isArray(row)) return;
      const nonEmpty = row.map(c => String(c ?? '').trim()).filter(Boolean);
      if (nonEmpty.length === 0) return;
      rawLines.push({ source: sheetName, text: nonEmpty.join(' | ') });

      if (headerRowIdx === -1 && isTableHeaderText(nonEmpty.join(' '), nonEmpty.length)) {
        headerRowIdx = idx;
      }
    });

    if (headerRowIdx === -1) {
      // Fallback: pick first row with >= 3 non-empty cells as table header
      headerRowIdx = rows.findIndex(r => Array.isArray(r) && r.filter(c => String(c ?? '').trim()).length >= 3);
    }

    if (sheetIdx === 0 && headerRowIdx > 0) {
      rows.slice(0, headerRowIdx).forEach(r => {
        if (!Array.isArray(r)) return;
        const txt = r.map(c => String(c ?? '').trim()).filter(Boolean).join(' ').trim();
        if (txt) accountHeader.leftLines.push(txt);
      });
    }

    if (headerRowIdx >= 0) {
      const headerRow = rows[headerRowIdx];
      const activeColIndices = [];
      headerRow.forEach((cell, colIdx) => {
        const lbl = String(cell ?? '').trim();
        if (lbl) activeColIndices.push({ colIdx, lbl });
      });

      if (!columns && activeColIndices.length > 0) {
        columns = activeColIndices.map((entry, idx) => ({
          key: `col_${idx}`,
          label: entry.lbl,
          origIdx: entry.colIdx,
          isNumeric: isNumericColumnHeader(entry.lbl),
          isWideText: isWideTextColumnHeader(entry.lbl),
          isDate: /\bdate\b/i.test(entry.lbl)
        }));
      }

      if (columns) {
        rows.slice(headerRowIdx + 1).forEach(r => {
          if (!Array.isArray(r)) return;
          const cells = columns.map(col => String(r[col.origIdx] ?? '').trim());
          if (!cells.some(Boolean)) return;
          const dateColIdx = columns.findIndex(c => c.isDate);
          const joined = cells.filter(Boolean).join(' ');
          const rowDates = extractDatesFromLine((dateColIdx >= 0 ? cells[dateColIdx] : '') || joined);

          tableRows.push({
            pageNum: sheetIdx + 1,
            source: sheetName,
            cells,
            joined,
            explicitDate: rowDates[0] || ''
          });
        });
      }
    }
  });

  return {
    pageCount: workbook.SheetNames.length,
    rawLines,
    accountHeader,
    columns,
    tableRows
  };
};

export const analyzeStatementData = ({ rawLines = [], accountHeader = null, columns = null, tableRows = [] }) => {
  let currentContextDate = '';
  const analyzedLines = [];
  const allDatesSet = new Set();

  rawLines.forEach((entry) => {
    const text = typeof entry === 'string' ? entry : (entry.text || '');
    const source = typeof entry === 'string' ? 'Text' : (entry.source || 'Doc');
    const trimmed = text.replace(/\s+/g, ' ').trim();
    if (!trimmed) return;

    const lineDates = extractDatesFromLine(trimmed);
    const primaryLineDate = lineDates[0] || '';
    if (primaryLineDate) {
      currentContextDate = primaryLineDate;
      lineDates.forEach(d => allDatesSet.add(d));
    }

    analyzedLines.push({
      lineNo: analyzedLines.length + 1,
      source,
      text: trimmed,
      explicitDate: primaryLineDate,
      effectiveDate: primaryLineDate || currentContextDate || '',
      allDates: lineDates
    });
  });

  // Also ensure dates from structured table rows are indexed cleanly
  const structuredRows = (tableRows || []).map((r, idx) => {
    const rowDates = r.explicitDate ? [r.explicitDate] : extractDatesFromLine(r.joined || '');
    rowDates.forEach(d => allDatesSet.add(d));
    return {
      rowNo: idx + 1,
      pageNum: r.pageNum || 1,
      source: r.source || `Page ${r.pageNum || 1}`,
      cells: r.cells || [],
      joined: r.joined || (r.cells || []).filter(Boolean).join(' '),
      date: r.explicitDate || rowDates[0] || '',
      isBalanceBanner: Boolean(r.isBalanceBanner)
    };
  });

  const sortedDates = Array.from(allDatesSet).sort();
  const fullText = analyzedLines.map(l => l.text).join('\n');

  return {
    accountHeader: accountHeader || { bankName: '', statementTitle: '', leftLines: [], rightLines: [] },
    columns: columns || null,
    tableRows: structuredRows,
    lines: analyzedLines,
    fullText,
    totalLines: analyzedLines.length,
    totalRows: structuredRows.length,
    minDate: sortedDates[0] || '',
    maxDate: sortedDates[sortedDates.length - 1] || '',
    detectedDatesCount: sortedDates.length
  };
};

export const analyzeStatementLines = (rawLines = []) =>
  analyzeStatementData({ rawLines });

export const parseStatementFile = async (file, password = '') => {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  if (ext === 'pdf') {
    const structured = await extractPdfStructured(arrayBuffer, password);
    const analysis = analyzeStatementData(structured);
    return {
      fileType: 'PDF',
      pageCount: structured.pageCount,
      ...analysis
    };
  }

  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    const structured = await extractSpreadsheetStructured(arrayBuffer);
    const analysis = analyzeStatementData(structured);
    return {
      fileType: ext.toUpperCase(),
      pageCount: structured.pageCount,
      ...analysis
    };
  }

  const decoder = new TextDecoder('utf-8');
  const rawText = decoder.decode(arrayBuffer);
  const rawLines = rawText
    .split(/\r?\n/)
    .map(l => ({ source: 'Text', text: l }))
    .filter(l => l.text.trim());

  const analysis = analyzeStatementData({ rawLines });
  return {
    fileType: ext.toUpperCase() || 'TXT',
    pageCount: 1,
    ...analysis
  };
};
