import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useCRM } from '../../context/CRMContext';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  Database,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

export const ExcelBulkUploader = () => {
  const { processBulkExcelImport } = useCRM();

  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Sample data generator for quick test
  const handleDownloadSample = () => {
    const sampleRows = [
      {
        "Customer Name": "Senthil Murugan Traders",
        "Mobile Number": "9840199881",
        "Business": "Spices Wholesale",
        "State": "Tamil Nadu",
        "Type": "known",
        "Source": "Bills"
      },
      {
        "Customer Name": "Karpagam Stores",
        "Mobile Number": "9840122341", // This is duplicate with RA-CUST-1001 Swaminathan!
        "Business": "Provisions",
        "State": "Tamil Nadu",
        "Type": "known",
        "Source": "Bills"
      },
      {
        "Customer Name": "Unknown / Retail",
        "Mobile Number": "9841288771",
        "Business": "Hardware Store",
        "State": "Tamil Nadu",
        "Type": "unknown",
        "Source": "Open Source"
      },
      {
        "Customer Name": "Puducherry Handicrafts",
        "Mobile Number": "9842511223",
        "Business": "Handicrafts & Decor",
        "State": "Puducherry",
        "Type": "known",
        "Source": "Reference"
      },
      {
        "Customer Name": "Broken Number Shop",
        "Mobile Number": "12345", // Invalid format!
        "Business": "Stationery",
        "State": "Tamil Nadu",
        "Type": "known",
        "Source": "Bills"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "Rajalakshmy_Customer_Bulk_Sample.xlsx");
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setParsing(true);
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const result = processBulkExcelImport(data);
        setImportResult(result);
      } catch (err) {
        alert("Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.");
        console.error(err);
      } finally {
        setParsing(false);
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const handleCommit = () => {
    if (importResult && importResult.commitImport) {
      importResult.commitImport();
      setImportSuccess(true);
    }
  };

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    setImportSuccess(false);
  };

  return (
    <div className="space-y-6">
      {/* Upload Box & Helper */}
      <div className="rounded-2xl border-2 border-dashed border-burgundy-300 bg-white p-6 text-center hover:border-burgundy-500 transition shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-burgundy-50 text-burgundy-800 mb-3 shadow-inner">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          Upload Customer Excel Database (.xlsx / .xls)
        </h3>
        <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1 mb-4">
          Upload field sales leads in bulk. The system automatically reads customer records, verifies 10-digit mobile numbers, detects duplicates against the existing database, and categorizes them into New Database.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <label className="cursor-pointer flex items-center gap-2 rounded-xl bg-burgundy-900 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-burgundy-800 transition">
            <FileSpreadsheet className="w-4 h-4 text-gold-400" />
            <span>Select Excel File</span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleDownloadSample}
            className="flex items-center gap-2 rounded-xl border border-gold-400 bg-gold-50/60 px-4 py-2.5 text-xs font-bold text-amber-950 hover:bg-gold-100 transition shadow-sm"
          >
            <Download className="w-4 h-4 text-gold-700" />
            <span>Download Sample Template</span>
          </button>
        </div>

        {file && (
          <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <FileSpreadsheet className="w-4 h-4 text-burgundy-800" />
            <span>Loaded: {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}
      </div>

      {/* Parse Progress */}
      {parsing && (
        <div className="text-center py-6">
          <RefreshCw className="w-6 h-6 animate-spin text-burgundy-800 mx-auto mb-2" />
          <p className="text-xs text-slate-600 font-semibold">
            Parsing Excel rows and scanning for duplicates...
          </p>
        </div>
      )}

      {/* Success Banner */}
      {importSuccess && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="text-sm font-bold">Import Completed Successfully!</div>
              <div className="text-xs text-emerald-800">
                Valid records have been saved into New Database. Duplicates were automatically skipped.
              </div>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="text-xs font-bold text-emerald-900 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100"
          >
            Import Another File
          </button>
        </div>
      )}

      {/* Import Preview & Results Table */}
      {importResult && !importSuccess && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#FAF6EF] border-b border-slate-200">
            <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Rows In File</span>
              <span className="text-xl font-extrabold text-slate-900">{importResult.summary.total}</span>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Valid New Records</span>
              <span className="text-xl font-extrabold text-emerald-800">{importResult.summary.imported}</span>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">Duplicates (Skipped)</span>
              <span className="text-xl font-extrabold text-amber-800">{importResult.summary.duplicates}</span>
            </div>
            <div className="rounded-xl bg-rose-50 p-3 border border-rose-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">Invalid Numbers</span>
              <span className="text-xl font-extrabold text-rose-800">{importResult.summary.invalid}</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100">
            <div className="text-xs text-slate-600 font-semibold">
              Previewing records extracted from file before committing to database
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleCommit}
                disabled={importResult.summary.imported === 0}
                className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-md transition ${
                  importResult.summary.imported > 0
                    ? 'bg-burgundy-900 hover:bg-burgundy-800'
                    : 'bg-slate-400 cursor-not-allowed'
                }`}
              >
                <Database className="w-4 h-4 text-gold-300" />
                <span>Save {importResult.summary.imported} Valid Record(s) to New Database</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="sticky top-0 bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Row</th>
                  <th className="px-4 py-2.5">Customer Name</th>
                  <th className="px-4 py-2.5">Extracted Mobile</th>
                  <th className="px-4 py-2.5">Business</th>
                  <th className="px-4 py-2.5">State</th>
                  <th className="px-4 py-2.5">Source</th>
                  <th className="px-4 py-2.5 text-right">Validation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importResult.previewList.map((row) => (
                  <tr key={row.id} className="hover:bg-[#FAF6EF]/60 transition">
                    <td className="px-4 py-2.5 font-mono text-slate-400">#{row.id}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">{row.name}</td>
                    <td className="px-4 py-2.5 font-mono font-medium">{row.rawMobile}</td>
                    <td className="px-4 py-2.5">{row.business}</td>
                    <td className="px-4 py-2.5">{row.state}</td>
                    <td className="px-4 py-2.5">{row.source}</td>
                    <td className="px-4 py-2.5 text-right">
                      {row.status === 'valid' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Ready to Import
                        </span>
                      )}
                      {row.status === 'duplicate' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Duplicate (Skip)
                        </span>
                      )}
                      {row.status === 'invalid' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Invalid Mobile
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
