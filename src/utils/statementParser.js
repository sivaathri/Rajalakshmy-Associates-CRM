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

  // 3. DD MMM YYYY or DD-MMM-YYYY or DD MMM YY or DD-MMM-YY (including compact 01APR2025)
  const dMonYRegex = /\b(0?[1-9]|[12]\d|3[01])[\s\-/.]*([A-Za-z]{3,9})[\s\-/.]*((?:20|19)?\d{2})\b/g;
  while ((m = dMonYRegex.exec(str)) !== null) {
    const monthNum = MONTH_MAP[m[2].toLowerCase()];
    const y = normalizeYear(m[3]);
    if (monthNum && y) {
      const iso = toIsoIfValid(y, monthNum, m[1]);
      if (iso && !found.includes(iso)) found.push(iso);
    }
  }

  // 4. MMM DD, YYYY or MMM-DD-YYYY (common in international / card / PayPal / Razorpay exports)
  const monDYRegex = /\b([A-Za-z]{3,9})[\s\-/.]+(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?(?:\s*,\s*|\s+)((?:20|19)\d{2})\b/g;
  while ((m = monDYRegex.exec(str)) !== null) {
    const monthNum = MONTH_MAP[m[1].toLowerCase()];
    const y = normalizeYear(m[3]);
    if (monthNum && y) {
      const iso = toIsoIfValid(y, monthNum, m[2]);
      if (iso && !found.includes(iso)) found.push(iso);
    }
  }

  return found;
};

const TABLE_HEADER_KEYWORDS = [
  'date', 'tran date', 'txn date', 'trans date', 'tx date', 'post date', 'posting date', 'value date', 'value dt', 'val dt', 'dt',
  'particulars', 'narration', 'description', 'remarks', 'details', 'transaction', 'memo', 'payee',
  'chq', 'cheque', 'inst', 'instrument', 'ref', 'utr', 'mode', 'type', 'dr/cr', 'cr/dr', 'debit/credit', 'ind',
  'brn', 'branch', 'cod', 'code', 'sl', 'srl', 'sno', '#',
  'debit', 'debits', 'withdrawal', 'withdrawals', 'withdraw', 'withdraws', 'money out', 'paid out', 'dr',
  'credit', 'credits', 'deposit', 'deposits', 'money in', 'paid in', 'cr',
  'amount', 'amt', 'balance', 'closing', 'running', 'available', 'bal', 'init'
];

const isTableHeaderText = (joinedText = '', cellCount = 1) => {
  if (cellCount < 2) return false;
  const lower = joinedText.toLowerCase();
  // Exclude metadata / summary-box lines that happen to repeat words like "Cash Credit", "MICR", "Opening Balance ... Closing Balance"
  if (/\b(a\/c\s*type|micr\s*code|ifsc\s*code|customer\s*id|mobile\s*no|account\s*summary|statement\s*summary|opening\s*bal(?:ance)?)\b/i.test(lower)) {
    return false;
  }
  const hasDateCol = /\b(tran(?:s)?\s*(?:date|dt)|txn\s*(?:date|dt)|tx\s*date|post(?:ing)?\s*(?:date|dt)|entry\s*date|book\s*date|date|value\s*dt|value\s*date|val\s*(?:date|dt))\b/i.test(lower);
  const hasDescOrAmt = /\b(particulars|narration|description|details|remarks|memo|debits?|credits?|withdraws?|withdrawals?|deposits?|balances?|bal|amounts?|amts?|money\s*(?:in|out))\b/i.test(lower);
  const hasWideTextCol = /\b(particulars|narration|description|details|remarks|memo)\b/i.test(lower);
  const hasAmtCol = /\b(debits?|credits?|withdraws?|withdrawals?|deposits?|balances?|bal|amounts?|amts?|money\s*(?:in|out))\b/i.test(lower);

  let hits = 0;
  TABLE_HEADER_KEYWORDS.forEach(kw => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = kw === '#' ? /(?:^|\s)#(?:\s|$)/ : new RegExp(`\\b${escaped}\\b`, 'i');
    if (re.test(lower)) hits += 1;
  });

  if (hasDateCol && hasDescOrAmt && hits >= 3) return true;
  // Rare dateless table headers still need explicit description + amount columns across >= 4 cells
  return cellCount >= 4 && hasWideTextCol && hasAmtCol && hits >= 4;
};

const isNumericColumnHeader = (label = '') =>
  /\b(debits?|credits?|withdraws?|withdrawals?|deposits?|balances?|closing\s*bal|running\s*bal|avail(?:able)?\s*bal|bal|amts?|amounts?|money\s*(?:in|out)|paid\s*(?:in|out)|dr|cr)\b/i.test(label) &&
  !/\b(dr\s*\/?\s*cr|cr\s*\/?\s*dr|debit\s*\/\s*credit)\b/i.test(label);

const isWideTextColumnHeader = (label = '') =>
  /\b(particulars|narration|description|remarks|details|memo|transaction\s*details|transaction\s*remarks|transaction\s*particulars)\b/i.test(label);

const isRefOrMetaColumnHeader = (label = '') =>
  /\b(chq|cheque|inst|instrument|ref|utr|tran\s*id|txn\s*id|brn|branch|cod|code|init|sl\.?\s*no|s\.?\s*no|srl|sr\.?\s*no)\b|^#$/i.test(String(label || '').trim());

export const parseNumericAmount = (str = '') => {
  const s = String(str || '').trim();
  const isParenNeg = /^\((?:rs\.?|inr|₹|\s)*[\d,]+(?:\.\d+)?(?:\s*\))?$/i.test(s) || /^\([\d,]+(?:\.\d+)?\)$/.test(s);
  const cleaned = s.replace(/,/g, '');
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const n = parseFloat(match[0]);
  if (isNaN(n)) return 0;
  return isParenNeg && n > 0 ? -n : n;
};

const parseBalanceAmount = (str = '') => {
  const s = String(str || '').trim();
  const n = parseNumericAmount(s);
  if (/\b\d[\d,]*(?:\.\d+)?\s*dr\.?$/i.test(s) && n > 0) return -n;
  return n;
};

export const isMoneyLikeCell = (str = '') => {
  const t = String(str || '').trim();
  if (!/\d/.test(t) || /\//.test(t)) return false;
  let stripped = t;
  const isWrappedParen = /^\(.*\)$/.test(stripped);
  if (isWrappedParen) stripped = stripped.slice(1, -1).trim();
  stripped = stripped
    .replace(/^(?:rs\.?|inr|usd|eur|gbp|₹|\$|€|£)\s*/i, '')
    .replace(/\s*(?:cr\.?|dr\.?)$/i, '')
    .trim();
  if (!/^[+-]?[\d,]+(?:\.\d{1,2})?$/.test(stripped)) return false;
  const digitsOnly = stripped.replace(/\D/g, '');
  return /\.\d{1,2}$/.test(stripped) || digitsOnly.length <= 9;
};

const buildColumnDefinitions = (headerRowItems, pageWidth) => {
  // 1. Sort top-to-bottom (y desc) then left-to-right (x asc) so multi-line headers join in natural reading order
  const itemsByTopLeft = [...headerRowItems]
    .filter(it => it.str && it.str.trim())
    .sort((a, b) => {
      if (Math.abs(a.y - b.y) > 2) return b.y - a.y;
      return a.x - b.x;
    });

  // 2. Group fragments belonging to the SAME column:
  //    a) Horizontally adjacent words on the same baseline (gap >= -2 && gap < 5, e.g. "Tran" + "Date", "Chq" + "No")
  //    b) Vertically stacked wrapped header lines (different y, overlapping x span or centers <= 18pt, e.g. "Init." above "Br")
  const grouped = [];
  itemsByTopLeft.forEach(it => {
    const text = it.str.trim();
    const xLeft = it.x;
    const xRight = it.xRight;
    const xCenter = (xLeft + xRight) / 2;

    // Try vertical stack match first (on a different baseline with overlapping X)
    const verticalTarget = grouped.find(g => {
      if (Math.abs(g.lastY - it.y) <= 2) return false;
      const horizOverlap = Math.min(g.xRight, xRight) - Math.max(g.xLeft, xLeft);
      const centerDist = Math.abs(g.xCenter - xCenter);
      return horizOverlap >= 2 || centerDist <= 14;
    });

    if (verticalTarget) {
      verticalTarget.label = `${verticalTarget.label} ${text}`.replace(/\s+/g, ' ').trim();
      verticalTarget.xLeft = Math.min(verticalTarget.xLeft, xLeft);
      verticalTarget.xRight = Math.max(verticalTarget.xRight, xRight);
      verticalTarget.xCenter = (verticalTarget.xLeft + verticalTarget.xRight) / 2;
      verticalTarget.lastY = it.y;
      return;
    }

    // Try tight horizontal same-baseline word merge (< 5pt gap, keeps "Tran Date" and "Chq No" separate!)
    const horizTarget = grouped.find(g => {
      if (Math.abs(g.lastY - it.y) > 2) return false;
      const gap = xLeft - g.xRight;
      return gap >= -2 && gap < 5;
    });

    if (horizTarget) {
      horizTarget.label = `${horizTarget.label} ${text}`.replace(/\s+/g, ' ').trim();
      horizTarget.xRight = Math.max(horizTarget.xRight, xRight);
      horizTarget.xCenter = (horizTarget.xLeft + horizTarget.xRight) / 2;
    } else {
      grouped.push({
        label: text,
        xLeft,
        xRight,
        xCenter,
        lastY: it.y
      });
    }
  });

  // Sort final column headers strictly left-to-right
  grouped.sort((a, b) => a.xLeft - b.xLeft);

  // Compute start/end x boundaries & proportional percentage widths matching the uploaded statement layout
  const cols = grouped.map((g, idx) => {
    const prev = grouped[idx - 1];
    const next = grouped[idx + 1];
    const isWide = isWideTextColumnHeader(g.label);
    const isNum = isNumericColumnHeader(g.label);

    let startX = 0;
    if (prev) {
      if (isWide && /\b(date|dt)\b/i.test(prev.label)) {
        startX = Math.min(g.xLeft - 6, Math.max(prev.xRight + 50, (prev.xRight + g.xLeft) / 2));
      } else if (isWide) {
        startX = prev.xRight + 4;
      } else if (isWideTextColumnHeader(prev.label) && isNum) {
        startX = Math.max(prev.xRight + 10, g.xLeft - 22);
      } else {
        startX = (prev.xRight + g.xLeft) / 2;
      }
    }

    let endX = pageWidth;
    if (next) {
      if (isWide && isNumericColumnHeader(next.label)) {
        endX = Math.max(g.xRight + 10, next.xLeft - 22);
      } else if (isWideTextColumnHeader(next.label) && /\b(date|dt)\b/i.test(g.label)) {
        endX = Math.min(next.xLeft - 6, Math.max(g.xRight + 50, (g.xRight + next.xLeft) / 2));
      } else if (isWideTextColumnHeader(next.label)) {
        endX = g.xRight + 4;
      } else {
        endX = (g.xRight + next.xLeft) / 2;
      }
    }

    const spanWidth = Math.max(25, (endX - startX));
    const safePageWidth = Math.max(pageWidth || 600, endX);
    const widthPct = Math.max(6, Math.round((spanWidth / safePageWidth) * 100));

    return {
      key: `col_${idx}`,
      label: g.label,
      startX,
      endX: next ? endX : pageWidth + 50,
      xLeft: g.xLeft,
      xRight: g.xRight,
      xCenter: g.xCenter,
      widthPct,
      isNumeric: isNum,
      isWideText: isWide,
      isDate: /\b(date|dt)\b/i.test(g.label)
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
    const itemLooksMoney = isMoneyLikeCell(item.str);
    let targetIdx = columns.findIndex(col => {
      if (col.isWideText) return lx >= col.startX && cx <= col.endX;
      if (col.isNumeric) return itemHasDigit && itemLooksMoney && cx >= col.startX && cx <= col.endX;
      return cx >= col.startX && cx <= col.endX;
    });
    if (targetIdx === -1 && wideColIdx >= 0 && lx >= columns[wideColIdx].startX - 4 && lx <= columns[wideColIdx].endX + 30) {
      targetIdx = wideColIdx;
    }
    if (targetIdx === -1) {
      targetIdx = columns.findIndex(col => !col.isNumeric && cx >= col.startX && cx <= col.endX);
    }
    if (targetIdx === -1) {
      targetIdx = columns.findIndex(col => cx >= col.startX && cx <= col.endX);
    }
    if (targetIdx === -1) {
      // Nearest column fallback
      let bestDist = Infinity;
      columns.forEach((col, i) => {
        if (col.isNumeric && !itemLooksMoney) return;
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

// Only skip completely blank lines or pure page-number counters
const isFooterOrNoiseRow = (joined = '') => {
  const t = String(joined || '').trim();
  if (!t) return true;
  if (/^page\s*(?:no\.?\s*[:.]?\s*)?\d+(?:\s*(?:of|\/)\s*\d+)?$/i.test(t)) return true;
  return false;
};

const normalizeHeaderLine = (text = '') =>
  String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();

const POST_TABLE_SECTION_REGEX =
  /^\s*(statement\s*summary\s*:?-?|account\s*summary\s*:?-?|nominee\s*details|commonly\s*used\s*narrations|abbreviations\s*used|acronyms\s*:?|important\s*information|legend\s*:?|end\s*of\s*statement)\b/i;

const BALANCE_OR_TOTAL_BANNER_REGEX =
  /\b(opening\s+balance|closing\s+balance|transaction\s+total|total\s+transaction|page\s+total|grand\s+total|brought\s+forward|carried\s+forward)\b|(^|\s)(b\s*\/?\s*f|c\s*\/?\s*f)(\s|$)/i;

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
  const repeatedHeaderSet = new Set();
  let inPostTableSection = false;

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

    // Capture customer/address/account summary above table on Page 1 (or entire Page 1 if table starts on Page 2+)
    if (pageNum === 1 && (pageHeaderIdx > 0 || pageHeaderIdx === -1)) {
      const preRows = pageHeaderIdx > 0 ? rows.slice(0, pageHeaderIdx) : rows;
      preRows.forEach((r, rIdx) => {
        const text = r.joined;
        if (!text) return;
        if (text.length >= 6) repeatedHeaderSet.add(normalizeHeaderLine(text));

        // Prominent bank banner line anywhere in top pre-table metadata (avoid matching bank inside branch email or long disclaimer)
        if (
          rIdx <= 4 &&
          !page1HeaderBlock.bankName &&
          /\bbank(?:\s+of|\s+ltd|\s+limited|\b)/i.test(text) &&
          !/[@:]|branch\s*name|email|ifsc/i.test(text) &&
          text.length < 65
        ) {
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

    // Build columns from the first detected table header (including 1 top-wrapped prefix row & up to 2 bottom-wrapped sub-rows)
    if (pageHeaderIdx !== -1 && !columns) {
      let headerItems = [...rows[pageHeaderIdx].items];
      const baseHeaderY = rows[pageHeaderIdx].y;

      // Check 1 row ABOVE if the bank put top words like "Txn / Value / Chq" above "Date / Date / No."
      const prevRow = rows[pageHeaderIdx - 1];
      if (
        prevRow &&
        Math.abs(prevRow.y - baseHeaderY) <= 18 &&
        prevRow.items.length >= 2 &&
        prevRow.items.every(i => /^[A-Za-z0-9.\s/()&-]{1,18}$/.test(i.str.trim())) &&
        extractDatesFromLine(prevRow.joined).length === 0 &&
        !/[:,]/.test(prevRow.joined)
      ) {
        headerItems = [...prevRow.items, ...headerItems];
      }

      // Check up to 2 wrapped header sub-rows below (e.g. "Transaction / Date", "Init. / Br", "(INR)") within 22pt
      for (let hOffset = 0; hOffset < 2; hOffset++) {
        const nextRow = rows[pageHeaderIdx + 1];
        if (nextRow && Math.abs(baseHeaderY - nextRow.y) <= 22) {
          const nextLooksLikeHeaderSub = nextRow.items.every(i => /^[A-Za-z0-9.\s/()&-]{1,18}$/.test(i.str.trim()));
          if (nextLooksLikeHeaderSub && extractDatesFromLine(nextRow.joined).length === 0) {
            headerItems = [...headerItems, ...nextRow.items];
            pageHeaderIdx += 1;
          } else {
            break;
          }
        }
      }
      columns = buildColumnDefinitions(headerItems, pageWidth);
    }

    // Extract rows inside the table body on this page
    if (columns) {
      const primaryDateColIdx = columns.findIndex(c => c.isDate && !/\bvalue\b|\bval\b/i.test(c.label));
      const dateColIdx = primaryDateColIdx >= 0 ? primaryDateColIdx : columns.findIndex(c => c.isDate);
      const wideColIdx = columns.findIndex(c => c.isWideText);
      const bodyStartIdx = pageHeaderIdx !== -1 ? pageHeaderIdx + 1 : 0;
      let seenTxnOnThisPage = false;

      for (let i = bodyStartIdx; i < rows.length; i++) {
        const r = rows[i];
        if (isFooterOrNoiseRow(r.joined)) continue;

        // If a new transaction table header starts mid-page (e.g. 2 tables per page), reset post-table mode and skip header sub-rows
        if (isTableHeaderText(r.joined, r.items.length)) {
          inPostTableSection = false;
          const nextSub = rows[i + 1];
          if (nextSub && Math.abs(r.y - nextSub.y) <= 22 && nextSub.items.every(it => /^[A-Za-z0-9.\s/()&-]{1,18}$/.test(it.str.trim())) && extractDatesFromLine(nextSub.joined).length === 0) {
            i += 1;
          }
          continue;
        }

        // Generic skipping of repeated Page 1 customer/account headers appearing above transactions on Page 2+
        const normJoined = normalizeHeaderLine(r.joined);
        if (pageNum > 1 && page1HeaderBlock.bankName && r.joined === page1HeaderBlock.bankName) continue;
        if (pageNum > 1 && repeatedHeaderSet.has(normJoined)) continue;
        if (
          pageNum > 1 &&
          pageHeaderIdx === -1 &&
          !seenTxnOnThisPage &&
          i < 20 &&
          !extractDatesFromLine(r.joined)[0] &&
          /^(page\s*no|statement\s*(?:of|for|period)|branch|cust(?:omer)?\s*id|a\/?c\s*(?:no|number|type|status|open)|account\s*(?:no|number|branch|status|type)|rtgs|neft\s*ifsc|ifsc|micr|nomination|currency|joint\s*holders|from\s*:.*to\s*:|period\s*:|email|phone|mobile|ckyc)/i.test(r.joined)
        ) {
          continue;
        }

        // Detect start of post-table Statement Summary / Account Summary / Legends / Disclaimers
        if (POST_TABLE_SECTION_REGEX.test(r.joined)) {
          inPostTableSection = true;
        }

        const cells = assignRowItemsToColumns(r.items, columns);
        const nonEmptyCount = cells.filter(Boolean).length;
        if (nonEmptyCount === 0) continue;

        const dateText = dateColIdx >= 0 ? (cells[dateColIdx] || '') : r.joined;
        const rowDates = extractDatesFromLine(dateText);
        const hasAmount = columns.some((c, idx) => c.isNumeric && !isRefOrMetaColumnHeader(c.label) && isMoneyLikeCell(cells[idx] || ''));
        const isInlineTotalRow = /\btotal\s*(?:debits?|withdraws?|withdrawals?)\s*:|\btotal\s*(?:credits?|deposits?)\s*:/i.test(r.joined);
        const isBalanceBanner = BALANCE_OR_TOTAL_BANNER_REGEX.test(r.joined) || isInlineTotalRow;

        // If a real dated transaction row appears, ensure we are back in table mode
        if (rowDates[0] && hasAmount && !isBalanceBanner) {
          inPostTableSection = false;
          seenTxnOnThisPage = true;
        } else if (rowDates[0] || hasAmount) {
          seenTxnOnThisPage = true;
        }

        const isFullWidthPostRow = (inPostTableSection && !rowDates[0] && !isBalanceBanner) || isInlineTotalRow;

        rawTableRows.push({
          pageNum,
          y: r.y,
          cells: isFullWidthPostRow ? [r.joined] : cells,
          joined: r.joined,
          explicitDate: rowDates[0] || '',
          hasAmount,
          isBalanceBanner,
          isFullWidthRow: isFullWidthPostRow,
          isNarrationOnly: !isFullWidthPostRow && !rowDates[0] && !hasAmount && !isBalanceBanner && wideColIdx >= 0 && Boolean(cells[wideColIdx])
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
        // Otherwise attach below previous merged row (including cross-page wrapped descriptions when next starts a new txn)
        if (
          prevMerged &&
          !prevMerged.isBalanceBanner &&
          !prevMerged.isFullWidthRow &&
          ((prevMerged.pageNum === cur.pageNum && dyPrev <= 28) ||
            (cur.pageNum === prevMerged.pageNum + 1 && next && (next.explicitDate || next.hasAmount)))
        ) {
          prevMerged.cells[wideIdx] = `${prevMerged.cells[wideIdx]} ${cur.cells[wideIdx]}`.trim();
          prevMerged.joined = prevMerged.cells.filter(Boolean).join(' ');
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
      // Fallback for CSV/Excel with custom column names: find first row with >= 3 non-metadata cells whose body contains dates or money
      headerRowIdx = rows.findIndex((r, idx) => {
        if (!Array.isArray(r)) return false;
        const nonEmpty = r.map(c => String(c ?? '').trim()).filter(Boolean);
        if (nonEmpty.length < 3) return false;
        if (nonEmpty.some(c => c === ':')) return false;
        const nextSample = rows.slice(idx + 1, idx + 6).map(nr => (Array.isArray(nr) ? nr.join(' ') : '')).join(' ');
        return extractDatesFromLine(nextSample).length > 0 || /\d+\.\d{2}/.test(nextSample);
      });
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
      // Compute maximum non-empty column index across header + body rows so no data column is ever dropped
      let maxColIdx = headerRow.length - 1;
      rows.slice(headerRowIdx + 1).forEach(r => {
        if (!Array.isArray(r)) return;
        for (let c = r.length - 1; c > maxColIdx; c--) {
          if (String(r[c] ?? '').trim()) {
            maxColIdx = c;
            break;
          }
        }
      });

      const activeColIndices = [];
      for (let colIdx = 0; colIdx <= maxColIdx; colIdx++) {
        const lbl = String(headerRow[colIdx] ?? '').trim();
        const colHasData = lbl || rows.slice(headerRowIdx + 1).some(r => Array.isArray(r) && String(r[colIdx] ?? '').trim());
        if (colHasData) {
          activeColIndices.push({ colIdx, lbl: lbl || `Column ${colIdx + 1}` });
        }
      }

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
        if (workbook.SheetNames.length > 1 && sheetIdx > 0) {
          tableRows.push({
            pageNum: sheetIdx + 1,
            source: sheetName,
            cells: [`Sheet: ${sheetName}`],
            joined: `Sheet: ${sheetName}`,
            isFullWidthRow: true
          });
        }
        rows.slice(headerRowIdx + 1).forEach(r => {
          if (!Array.isArray(r)) return;
          const cells = columns.map(col => String(r[col.origIdx] ?? '').trim());
          // Also capture any trailing cell beyond header columns if present
          const anyCell = r.some(v => String(v ?? '').trim());
          if (!anyCell) return;
          const primaryCsvDateIdx = columns.findIndex(c => c.isDate && !/\bvalue\b|\bval\b/i.test(c.label));
          const dateColIdx = primaryCsvDateIdx >= 0 ? primaryCsvDateIdx : columns.findIndex(c => c.isDate);
          const joined = (cells.some(Boolean) ? cells : r.map(v => String(v ?? '').trim())).filter(Boolean).join(' ');
          const dateCellVal = dateColIdx >= 0 ? (cells[dateColIdx] || '') : joined;
          const rowDates = extractDatesFromLine(dateCellVal);

          tableRows.push({
            pageNum: sheetIdx + 1,
            source: sheetName,
            cells: cells.some(Boolean) ? cells : [joined],
            joined,
            explicitDate: rowDates[0] || '',
            isFullWidthRow: !cells.some(Boolean) && Boolean(joined)
          });
        });
      }
    } else if (sheetIdx > 0 || !columns) {
      // Sheet with no structured 3+ col header — keep every non-empty row without hiding anything
      rows.forEach(r => {
        if (!Array.isArray(r)) return;
        const txt = r.map(c => String(c ?? '').trim()).filter(Boolean).join(' ').trim();
        if (!txt) return;
        tableRows.push({
          pageNum: sheetIdx + 1,
          source: sheetName,
          cells: [txt],
          joined: txt,
          explicitDate: extractDatesFromLine(txt)[0] || '',
          isFullWidthRow: true
        });
      });
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

  // Also ensure dates from structured table rows are indexed cleanly and detect Opening / Closing Balance & Transaction Total rows
  const wideColIdx = columns ? columns.findIndex(c => c.isWideText) : -1;
  const primaryDateIdx = columns ? columns.findIndex(c => c.isDate && !/\bvalue\b|\bval\b/i.test(c.label)) : -1;
  const dateColIdx = primaryDateIdx >= 0 ? primaryDateIdx : (columns ? columns.findIndex(c => c.isDate) : -1);
  const debitColIdx = columns
    ? columns.findIndex(c => /\b(debits?|withdraws?|withdrawals?|money\s*out|paid\s*out|dr)\b/i.test(c.label) && !/\b(dr\s*\/?\s*cr|cr\s*\/?\s*dr|debit\s*\/\s*credit)\b/i.test(c.label))
    : -1;
  const creditColIdx = columns
    ? columns.findIndex(c => /\b(credits?|deposits?|money\s*in|paid\s*in|cr)\b/i.test(c.label) && !/\b(dr\s*\/?\s*cr|cr\s*\/?\s*dr|debit\s*\/\s*credit)\b/i.test(c.label))
    : -1;
  const amountColIdx = columns && debitColIdx === -1 && creditColIdx === -1
    ? columns.findIndex(c => /\b(amounts?|amts?|txn\s*amt|transaction\s*amount)\b/i.test(c.label))
    : -1;
  const typeColIdx = columns
    ? columns.findIndex(c => /\b(dr\s*\/?\s*cr|cr\s*\/?\s*dr|debit\s*\/\s*credit|d\/c|txn\s*type|^type$|^ind$|^sign$)\b/i.test(c.label.trim()))
    : -1;
  const balanceColIdx = columns ? columns.findIndex(c => /\b(balances?|bal|closing\s*bal|running\s*bal|avail(?:able)?\s*bal)\b/i.test(c.label)) : -1;

  const isBannerText = (text = '') => BALANCE_OR_TOTAL_BANNER_REGEX.test(text);

  const structuredRows = (tableRows || []).map((r, idx) => {
    const cells = r.cells || [];
    const joined = r.joined || cells.filter(Boolean).join(' ');
    const rowDates = r.explicitDate
      ? [r.explicitDate]
      : (dateColIdx >= 0 ? extractDatesFromLine(cells[dateColIdx] || '') : extractDatesFromLine(joined));
    rowDates.forEach(d => allDatesSet.add(d));
    const wideCell = wideColIdx >= 0 ? (cells[wideColIdx] || '') : '';
    const dateCell = dateColIdx >= 0 ? (cells[dateColIdx] || '') : '';
    const bannerFlag =
      Boolean(r.isBalanceBanner) ||
      isBannerText(wideCell) ||
      isBannerText(joined) && !dateCell ||
      /\b(page\s+total|grand\s+total|b\s*\/?\s*f\b)\b/i.test(joined);

    return {
      rowNo: idx + 1,
      pageNum: r.pageNum || 1,
      source: r.source || `Page ${r.pageNum || 1}`,
      cells,
      joined,
      date: r.explicitDate || rowDates[0] || '',
      isBalanceBanner: bannerFlag,
      isFullWidthRow: Boolean(r.isFullWidthRow)
    };
  });

  // Extract Opening Balance, Closing Balance & Transaction Total summary
  const parseTrailingAmount = (str = '') => {
    const matches = String(str || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?(?:\s*(?:cr|dr))?/gi);
    if (!matches || matches.length === 0) return null;
    const raw = matches[matches.length - 1];
    return parseBalanceAmount(raw);
  };

  let openingBalance = null;
  let closingBalance = null;
  let statementDebitTotal = null;
  let statementCreditTotal = null;
  let computedDebitTotal = 0;
  let computedCreditTotal = 0;
  let lastTxnBalance = null;
  let transactionCount = 0;

  structuredRows.forEach(r => {
    const lowerJoined = (r.joined || '').toLowerCase();
    const wideLower = wideColIdx >= 0 ? String(r.cells[wideColIdx] || '').toLowerCase() : '';
    const checkText = `${wideLower} ${lowerJoined}`;

    if ((/\bopening\s*balance\b/i.test(checkText) || /\b(b\s*\/?\s*f|brought\s*forward)\b/i.test(wideLower || checkText)) && openingBalance === null) {
      if (balanceColIdx >= 0 && isMoneyLikeCell(r.cells[balanceColIdx] || '')) {
        openingBalance = parseBalanceAmount(r.cells[balanceColIdx]);
      } else {
        openingBalance = parseTrailingAmount(r.joined);
      }
      return;
    }

    if (/\bclosing\s*balance\b/i.test(checkText)) {
      if (balanceColIdx >= 0 && isMoneyLikeCell(r.cells[balanceColIdx] || '')) {
        closingBalance = parseBalanceAmount(r.cells[balanceColIdx]);
      } else {
        closingBalance = parseTrailingAmount(r.joined);
      }
      return;
    }

    if (/\bgrand\s*total\b/i.test(checkText)) {
      if (debitColIdx >= 0 && isMoneyLikeCell(r.cells[debitColIdx] || '')) {
        statementDebitTotal = Math.abs(parseNumericAmount(r.cells[debitColIdx]));
      }
      if (creditColIdx >= 0 && isMoneyLikeCell(r.cells[creditColIdx] || '')) {
        statementCreditTotal = Math.abs(parseNumericAmount(r.cells[creditColIdx]));
      }
      if (balanceColIdx >= 0 && isMoneyLikeCell(r.cells[balanceColIdx] || '')) {
        closingBalance = parseBalanceAmount(r.cells[balanceColIdx]);
      }
      return;
    }

    if (/\btransaction\s*total\b/i.test(checkText)) {
      if (debitColIdx >= 0 && isMoneyLikeCell(r.cells[debitColIdx] || '')) {
        statementDebitTotal = Math.abs(parseNumericAmount(r.cells[debitColIdx]));
      }
      if (creditColIdx >= 0 && isMoneyLikeCell(r.cells[creditColIdx] || '')) {
        statementCreditTotal = Math.abs(parseNumericAmount(r.cells[creditColIdx]));
      }
      return;
    }

    if (!r.isBalanceBanner && !r.isFullWidthRow) {
      const hasDr = debitColIdx >= 0 && isMoneyLikeCell(r.cells[debitColIdx] || '');
      const hasCr = creditColIdx >= 0 && isMoneyLikeCell(r.cells[creditColIdx] || '');
      const hasSingleAmt = amountColIdx >= 0 && isMoneyLikeCell(r.cells[amountColIdx] || '');

      if (hasDr || hasCr || hasSingleAmt || r.date) transactionCount += 1;

      if (hasDr) {
        computedDebitTotal += Math.abs(parseNumericAmount(r.cells[debitColIdx]));
      }
      if (hasCr) {
        computedCreditTotal += Math.abs(parseNumericAmount(r.cells[creditColIdx]));
      }
      if (hasSingleAmt) {
        const amtVal = parseNumericAmount(r.cells[amountColIdx]);
        const typeSignal = `${typeColIdx >= 0 ? (r.cells[typeColIdx] || '') : ''} ${r.cells[amountColIdx] || ''}`;
        if (/\bcr\b|\(cr\)|credit/i.test(typeSignal)) {
          computedCreditTotal += Math.abs(amtVal);
        } else if (/\bdr\b|\(dr\)|debit/i.test(typeSignal) || amtVal < 0) {
          computedDebitTotal += Math.abs(amtVal);
        } else {
          computedDebitTotal += Math.abs(amtVal);
        }
      }
      if (balanceColIdx >= 0 && isMoneyLikeCell(r.cells[balanceColIdx] || '')) {
        lastTxnBalance = parseBalanceAmount(r.cells[balanceColIdx]);
      }
    }
  });

  // Parse multi-bank 2-row summary boxes (KVB, Canara, HDFC, Kotak) and inline Total Debit / Credit lines (IOB, UCO, BOB)
  const extractSummaryBoxMetrics = () => {
    for (let idx = 0; idx < analyzedLines.length; idx++) {
      const lineText = analyzedLines[idx].text;

      // Inline key: value patterns (e.g. IOB "Total Debit: 7857437.89 Total Credit: 9786649.00", UCO "Closing Balance -1492890.4")
      if (statementDebitTotal === null) {
        const mDr = lineText.match(/total\s*(?:debits?|withdraws?|withdrawals?)\s*[:=\-]?\s*(?:rs\.?|inr|₹)?\s*(-?\d[\d,]*(?:\.\d+)?)/i);
        if (mDr) statementDebitTotal = Math.abs(parseNumericAmount(mDr[1]));
      }
      if (statementCreditTotal === null) {
        const mCr = lineText.match(/total\s*(?:credits?|deposits?)\s*[:=\-]?\s*(?:rs\.?|inr|₹)?\s*(-?\d[\d,]*(?:\.\d+)?)/i);
        if (mCr) statementCreditTotal = Math.abs(parseNumericAmount(mCr[1]));
      }
      if (/\bgrand\s*total\b/i.test(lineText)) {
        const nums = lineText.replace(/,/g, '').match(/-?\d+(?:\.\d+)?(?:\s*(?:cr|dr))?/gi);
        if (nums && nums.length >= 2) {
          if (statementDebitTotal === null) statementDebitTotal = Math.abs(parseNumericAmount(nums[0]));
          if (statementCreditTotal === null) statementCreditTotal = Math.abs(parseNumericAmount(nums[1]));
          if (closingBalance === null && nums[2]) closingBalance = parseBalanceAmount(nums[2]);
        }
      }

      // Columnar 2-row box header detection (handles both single-line headers and 2-line wrapped box headers like Canara Statement Summary)
      const tokenMatchersWide = [
        { key: 'openingBalance', regex: /opening(?:\s*bal(?:ance)?)?/gi },
        { key: 'debitCount', regex: /(?:total\s*)?(?:dr|debit)\s*(?:txn\s*)?count|no\.?\s*of\s*debits?/gi },
        { key: 'creditCount', regex: /(?:total\s*)?(?:cr|credit)\s*(?:txn\s*)?count|no\.?\s*of\s*credits?/gi },
        { key: 'countCombined', regex: /count\s*of\s*cr\.?\s*&\s*dr\.?\s*transactions/gi },
        { key: 'debitTotal', regex: /(?:total\s*)?debits?(?:\s*amount)?|total\s*withdraws?|total\s*withdrawals?/gi },
        { key: 'creditTotal', regex: /(?:total\s*)?credits?(?:\s*amount)?|total\s*deposits?/gi },
        { key: 'closingBalance', regex: /closing(?:\s*bal(?:ance)?)?/gi },
        { key: 'limit', regex: /\b(?:limit|unclear(?:\s*balance)?|hold(?:\s*funds)?|sweep-?in(?:\s*balance)?)\b/gi }
      ];

      const isWrappedSummaryBox = /opening/i.test(lineText) && /(?:closing|total\s*debit|total\s*credit)/i.test(lineText);
      if (isWrappedSummaryBox) {
        const hits = [];
        tokenMatchersWide.forEach(({ key, regex }) => {
          regex.lastIndex = 0;
          let m;
          while ((m = regex.exec(lineText)) !== null) {
            const overlapsExisting = hits.some(h => m.index >= h.start && m.index < h.end);
            if (!overlapsExisting) {
              hits.push({ key, start: m.index, end: m.index + m[0].length });
            }
          }
        });

        if (hits.length >= 2) {
          hits.sort((a, b) => a.start - b.start);
          // Scan ahead 1..4 lines for the corresponding numeric values row (skipping wrapped label lines & timestamps)
          for (let offset = 1; offset <= 4; offset++) {
            const valLine = analyzedLines[idx + offset]?.text || '';
            const cleanedValLine = valLine.replace(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g, ' ').replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\b/gi, ' ');
            const valTokens = cleanedValLine.match(/(?<![:\-/])-?\d[\d,]*(?:\.\d+)?(?:\s*(?:cr|dr))?/gi);
            if (valTokens && valTokens.length >= 2 && /[.,]/.test(valTokens[0])) {
              const seenSummaryKeys = new Set();
              hits.forEach((h, hIdx) => {
                const rawVal = valTokens[hIdx];
                if (!rawVal) return;
                // Ignore duplicate "Credit"/"Debit" label tokens (e.g. wrapped "Credit Count") and require decimal money format for monetary totals
                if (seenSummaryKeys.has(h.key)) return;
                if ((h.key === 'debitTotal' || h.key === 'creditTotal' || h.key === 'openingBalance' || h.key === 'closingBalance') && !/\.\d/.test(rawVal)) {
                  return;
                }
                seenSummaryKeys.add(h.key);
                if (h.key === 'openingBalance') {
                  openingBalance = parseBalanceAmount(rawVal);
                } else if (h.key === 'closingBalance') {
                  closingBalance = parseBalanceAmount(rawVal);
                } else if (h.key === 'debitTotal') {
                  statementDebitTotal = Math.abs(parseNumericAmount(rawVal));
                } else if (h.key === 'creditTotal') {
                  statementCreditTotal = Math.abs(parseNumericAmount(rawVal));
                }
              });
              break;
            }
          }
        }
      }
    }
  };

  extractSummaryBoxMetrics();

  // Fallback scan across raw analyzed lines when Closing Balance / Opening Balance / Totals aren't inside tableRows or summary boxes
  if (openingBalance === null || closingBalance === null || (statementDebitTotal === null && statementCreditTotal === null)) {
    analyzedLines.forEach(l => {
      if (openingBalance === null && /\bopening\s*balance\b/i.test(l.text)) {
        const m = l.text.match(/opening\s*balance\s*[:=\-]?\s*(?:rs\.?|inr|₹)?\s*(-?\d[\d,]*(?:\.\d+)?(?:\s*(?:cr|dr))?)/i);
        const v = m ? parseBalanceAmount(m[1]) : parseTrailingAmount(l.text);
        if (v !== null) openingBalance = v;
      }
      if (closingBalance === null && /\bclosing\s*bal(?:ance)?\b/i.test(l.text)) {
        const m = l.text.match(/closing\s*bal(?:ance)?\s*[:=\-]?\s*(?:rs\.?|inr|₹)?\s*(-?\d[\d,]*(?:\.\d+)?(?:\s*(?:cr|dr))?)/i);
        const v = m ? parseBalanceAmount(m[1]) : parseTrailingAmount(l.text);
        if (v !== null) closingBalance = v;
      }
      if (statementDebitTotal === null && statementCreditTotal === null && /\btransaction\s*total\b/i.test(l.text)) {
        const nums = l.text.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/g);
        if (nums && nums.length >= 2) {
          statementDebitTotal = parseFloat(nums[nums.length - 2]) || 0;
          statementCreditTotal = parseFloat(nums[nums.length - 1]) || 0;
        }
      }
    });
  }

  if (closingBalance === null && lastTxnBalance !== null) {
    closingBalance = lastTxnBalance;
  }

  const hasAmtCols = debitColIdx >= 0 || creditColIdx >= 0 || amountColIdx >= 0;
  const resolvedDebitTotal = statementDebitTotal !== null ? statementDebitTotal : (hasAmtCols ? computedDebitTotal : null);
  const resolvedCreditTotal = statementCreditTotal !== null ? statementCreditTotal : (hasAmtCols ? computedCreditTotal : null);
  const transactionTotalAmount =
    resolvedDebitTotal !== null || resolvedCreditTotal !== null
      ? (resolvedDebitTotal || 0) + (resolvedCreditTotal || 0)
      : null;

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
    detectedDatesCount: sortedDates.length,
    statementSummary: {
      openingBalance,
      closingBalance,
      debitTotal: resolvedDebitTotal,
      creditTotal: resolvedCreditTotal,
      transactionTotal: transactionTotalAmount,
      transactionCount
    }
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
