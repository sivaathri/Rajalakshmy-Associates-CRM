import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { formatMobileNumber } from '../../utils/formatters';
import { PlusCircle, Building2, User, Phone, MapPin, Tag, Share2, UploadCloud, FileSpreadsheet, Download, CheckCircle, AlertTriangle } from 'lucide-react';

const getClean10Digits = (num) => String(num || '').replace(/\D/g, '').slice(-10);

export const DailyActivityForm = () => {
  const { addDailyActivity, processBulkExcelImport, customers = [], activities = [], leads = [] } = useCRM();
  const { currentUser, showToast } = useAuth();

  const [customerType, setCustomerType] = useState('known'); // 'known' | 'unknown'
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [business, setBusiness] = useState('');
  const [source, setSource] = useState(''); // '' | 'Bills' | 'Open Source' | 'Reference' | 'Activities'
  const [referenceFrom, setReferenceFrom] = useState('');
  const [location, setLocation] = useState('');

  // Bulk Excel Upload state for Open Source
  const fileInputRef = useRef(null);
  const [bulkFile, setBulkFile] = useState(null);
  const [isBulkParsing, setIsBulkParsing] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const handleDownloadSample = () => {
    const sampleRows = [
      {
        "Customer Name": "Senthil Murugan Traders",
        "Mobile Number": "9840199881",
        "Business": "Spices Wholesale",
        "State": "Tamil Nadu",
        "Type": "known",
        "Source": "Open Source"
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
        "Customer Name": "Sri Lakshmi Silks",
        "Mobile Number": "9842511223",
        "Business": "Textiles Retail",
        "State": "Tamil Nadu",
        "Type": "known",
        "Source": "Open Source"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OpenSourceLeads");
    XLSX.writeFile(wb, "Open_Source_Bulk_Upload_Sample.xlsx");
  };

  const handleBulkUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    setIsBulkParsing(true);
    setBulkResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);

        // Guarantee all imported records are tagged as Open Source
        const mappedData = rawData.map(r => ({
          ...r,
          Source: 'Open Source'
        }));

        const result = processBulkExcelImport(mappedData);
        setBulkResult(result);
        showToast(`Bulk Excel imported: ${result.importedCount} new leads added to Open Source Database!`, 'success');
      } catch (err) {
        alert("Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.");
        console.error(err);
      } finally {
        setIsBulkParsing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const cleanEnteredMobile = getClean10Digits(mobile);
  const duplicateMatch = (() => {
    if (cleanEnteredMobile.length !== 10) return null;

    const existingCust = customers.find(
      c => getClean10Digits(c.mobile) === cleanEnteredMobile || getClean10Digits(c.altMobile) === cleanEnteredMobile
    );
    if (existingCust) {
      return {
        location: `${existingCust.databaseType ? existingCust.databaseType.toUpperCase() + ' ' : ''}Database`,
        name: existingCust.name || 'Unknown',
        mobile: existingCust.mobile || existingCust.altMobile
      };
    }

    const existingAct = activities.find(a => getClean10Digits(a.mobile) === cleanEnteredMobile);
    if (existingAct) {
      return {
        location: 'Daily Activities',
        name: existingAct.customerName || 'Unknown',
        mobile: existingAct.mobile
      };
    }

    const existingLead = leads.find(
      l => getClean10Digits(l.mobile) === cleanEnteredMobile || getClean10Digits(l.altMobile) === cleanEnteredMobile
    );
    if (existingLead) {
      return {
        location: 'Lead Pipeline',
        name: existingLead.customerName || 'Unknown',
        mobile: existingLead.mobile || existingLead.altMobile
      };
    }

    return null;
  })();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!mobile.trim() || cleanEnteredMobile.length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    if (duplicateMatch) {
      alert(`Mobile number ${formatMobileNumber(duplicateMatch.mobile)} already exists in ${duplicateMatch.location} (${duplicateMatch.name}). Duplicate entries cannot be saved!`);
      return;
    }

    if (!business.trim()) {
      alert('Please enter Business / Occupation');
      return;
    }

    if (!source) {
      alert('Please select a Database Source');
      return;
    }

    if (source === 'Reference' && !referenceFrom.trim()) {
      alert('Please specify "Reference From / Who?" for reference sourced leads');
      return;
    }

    if (source === 'Activities' && !location.trim()) {
      alert('Please enter the Location for Activities');
      return;
    }

    const formattedMobile = `+91 ${cleanEnteredMobile}`;

    const saved = addDailyActivity({
      customerName: customerType === 'known' ? customerName : 'Unknown / Lead',
      mobile: formattedMobile,
      business: business.trim(),
      customerType,
      state: '',
      city: source === 'Activities' ? location.trim() : '',
      location: source === 'Activities' ? location.trim() : '',
      source,
      referenceFrom: (source === 'Reference' || source === 'Bills') ? referenceFrom.trim() : ''
    });

    if (!saved) return;

    // Reset form
    setCustomerName('');
    setMobile('');
    setBusiness('');
    setSource('');
    setReferenceFrom('');
    setLocation('');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div>
          <h3 className="text-base font-bold text-burgundy-900 font-corporate">
            Field Sales Daily Entry Form
          </h3>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Type Toggle */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Classification Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <button
              type="button"
              onClick={() => setCustomerType('known')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition border ${
                customerType === 'known'
                  ? 'border-burgundy-800 bg-burgundy-50 text-burgundy-950 ring-2 ring-burgundy-800/10'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <User className="w-4 h-4 text-burgundy-800" />
              <span>Known Customer</span>
            </button>

            <button
              type="button"
              onClick={() => setCustomerType('unknown')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition border ${
                customerType === 'unknown'
                  ? 'border-burgundy-800 bg-burgundy-50 text-burgundy-950 ring-2 ring-burgundy-800/10'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Tag className="w-4 h-4 text-amber-700" />
              <span>Unknown / Lead</span>
            </button>
          </div>
        </div>

        {/* Dynamic Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Customer Name (Shown for Known) */}
          {customerType === 'known' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer / Proprietor Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. S. Ramanathan"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-11 text-xs md:text-sm rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 focus:outline-none focus:border-burgundy-800 focus:ring-1 focus:ring-burgundy-800 transition bg-white"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Customer Name (Auto-Generated)
              </label>
              <input
                type="text"
                disabled
                value="Unknown / Lead"
                className="w-full h-11 text-xs md:text-sm rounded-xl border border-slate-200 bg-slate-100 py-2.5 px-3.5 text-slate-500 cursor-not-allowed"
              />
            </div>
          )}

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="tel"
                required
                placeholder="10-digit mobile (e.g. 9840123456)"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className={`w-full h-11 text-xs md:text-sm rounded-xl border py-2.5 pl-10 pr-3 focus:outline-none focus:ring-1 transition bg-white ${
                  duplicateMatch
                    ? 'border-rose-500 focus:border-rose-600 focus:ring-rose-500'
                    : 'border-slate-300 focus:border-burgundy-800 focus:ring-burgundy-800'
                }`}
              />
            </div>
            {duplicateMatch && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-700 font-semibold mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Number already exists in {duplicateMatch.location} ({duplicateMatch.name})
                </span>
              </div>
            )}
          </div>

          {/* Business / Occupation */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Business / Occupation <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                required
                placeholder="e.g. Textiles, Rice Mill, Pharmacy"
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                className="w-full h-11 text-xs md:text-sm rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 focus:outline-none focus:border-burgundy-800 focus:ring-1 focus:ring-burgundy-800 transition bg-white"
              />
            </div>
          </div>

          {/* Database Source */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Database Source <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={`w-full h-11 text-xs md:text-sm rounded-xl border border-slate-300 py-2.5 px-3.5 focus:outline-none focus:border-burgundy-800 focus:ring-1 focus:ring-burgundy-800 transition bg-white cursor-pointer ${
                source ? 'text-slate-800' : 'text-slate-400'
              }`}
            >
              <option value="" className="text-slate-400">Select</option>
              <option value="Bills" className="text-slate-800">1. Bills</option>
              <option value="Open Source" className="text-slate-800">2. Open Source</option>
              <option value="Reference" className="text-slate-800">3. Reference</option>
              <option value="Activities" className="text-slate-800">4. Activities</option>
            </select>
          </div>

          {/* Conditional Field: Reference (Shown for Bills or Reference) */}
          {(source === 'Reference' || source === 'Bills') && (
            <div className="animate-fade-in">
              <label className="block text-xs font-semibold text-amber-900 mb-1">
                {source === 'Reference' ? (
                  <>Reference From / Who? <span className="text-rose-500">*</span></>
                ) : (
                  'Reference'
                )}
              </label>
              <div className="relative">
                <Share2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600 pointer-events-none" />
                <input
                  type="text"
                  required={source === 'Reference'}
                  placeholder={source === 'Reference' ? 'Enter recommender or client name' : 'Enter reference'}
                  value={referenceFrom}
                  onChange={(e) => setReferenceFrom(e.target.value)}
                  className="w-full h-11 text-xs md:text-sm rounded-xl border border-amber-300 py-2.5 pl-10 pr-3 bg-amber-50/50 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition"
                />
              </div>
            </div>
          )}

          {/* Conditional Field: Location (Shown for Activities) */}
          {source === 'Activities' && (
            <div className="animate-fade-in">
              <label className="block text-xs font-semibold text-emerald-900 mb-1">
                Location <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="Enter location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-11 text-xs md:text-sm rounded-xl border border-emerald-300 py-2.5 pl-10 pr-3 bg-emerald-50/50 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Conditional Bulk Upload Option for Open Source (Requirement 1) */}
        {source === 'Open Source' && (
          <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/60 p-4 space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-950">
                    Bulk Upload Open Source Excel File
                  </h4>
                  <p className="text-[11px] text-blue-800">
                    Upload an Excel (.xlsx, .xls, .csv) to auto-import leads into Open Source Database with duplicate checks.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadSample}
                className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-800 hover:bg-blue-50 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sample Template</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                onChange={handleBulkUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={isBulkParsing}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isBulkParsing ? 'Parsing Excel...' : 'Choose Excel File to Bulk Upload'}</span>
              </button>

              {bulkFile && (
                <span className="text-xs font-medium text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  {bulkFile.name} ({(bulkFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>

            {bulkResult && (
              <div className="p-3 bg-white rounded-xl border border-blue-200 text-xs space-y-1.5 animate-fade-in">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Successfully imported {bulkResult.importedCount} new lead(s) into Open Source!</span>
                </div>
                {bulkResult.duplicateCount > 0 && (
                  <div className="flex items-center gap-2 text-amber-800 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{bulkResult.duplicateCount} existing telephone numbers skipped automatically.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submit Bar */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-burgundy-900 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-burgundy-800 transition"
          >
            <PlusCircle className="w-4 h-4 text-gold-400" />
            <span>Submit Daily Field Activity</span>
          </button>
        </div>
      </form>
    </div>
  );
};
