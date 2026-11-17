import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  Globe,
  Mail,
  Phone,
  MessageSquare,
  Search,
  Download,
  Plus,
  ExternalLink,
  CheckCircle,
  Clock,
  ArrowRight,
  Filter,
  User,
  Building,
  Calendar,
  AlertCircle,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  X
} from 'lucide-react';
import { exportToCSV } from '../utils/formatters';

export const EnquiryPage = () => {
  const { enquiries = [], addEnquiry, updateEnquiryStatus, convertEnquiryToLead } = useCRM();
  const { currentUser } = useAuth();

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'New' | 'Contacted' | 'Follow-up' | 'Converted'
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  // Form State for Test Submission
  const [visitorName, setVisitorName] = useState('');
  const [visitorMobile, setVisitorMobile] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorService, setVisitorService] = useState('MSME Business Loan');
  const [visitorMessage, setVisitorMessage] = useState('');

  // Service Options
  const serviceOptions = [
    'MSME Business Loan',
    'Mortgage / Loan Against Property (LAP)',
    'Machinery & Equipment Term Loan',
    'Commercial Vehicle & Transport Finance',
    'Working Capital / Cash Credit Limit',
    'Debt Syndication & Project Advisory',
    'Doctor & Healthcare Equipment Financing',
    'General Financial Consultation'
  ];

  // Filtered dataset
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(enq => {
      if (statusFilter !== 'All' && enq.status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = enq.name && enq.name.toLowerCase().includes(q);
        const matchesMobile = enq.mobile && enq.mobile.includes(q);
        const matchesEmail = enq.email && enq.email.toLowerCase().includes(q);
        const matchesService = enq.service && enq.service.toLowerCase().includes(q);
        const matchesMessage = enq.message && enq.message.toLowerCase().includes(q);
        if (!matchesName && !matchesMobile && !matchesEmail && !matchesService && !matchesMessage) {
          return false;
        }
      }
      return true;
    });
  }, [enquiries, statusFilter, searchTerm]);

  // Counts
  const newCount = enquiries.filter(e => e.status === 'New').length;
  const inProgressCount = enquiries.filter(e => e.status === 'Contacted' || e.status === 'Follow-up').length;
  const convertedCount = enquiries.filter(e => e.status === 'Converted').length;

  const handleTestSubmit = (e) => {
    e.preventDefault();
    if (!visitorName.trim() || !visitorMobile.trim()) {
      alert('Please fill in visitor name and mobile number');
      return;
    }

    addEnquiry({
      name: visitorName.trim(),
      mobile: visitorMobile.trim(),
      email: visitorEmail.trim(),
      service: visitorService,
      sourceWebsite: 'https://rajalakshmyassociates.com/',
      sourcePage: 'Website Contact Us Form',
      message: visitorMessage.trim() || 'Inquiry submitted via official website contact form.'
    });

    // Reset Form
    setVisitorName('');
    setVisitorMobile('');
    setVisitorEmail('');
    setVisitorService('MSME Business Loan');
    setVisitorMessage('');
    setIsTestModalOpen(false);
  };

  const handleExportCSV = () => {
    const data = filteredEnquiries.map((e, idx) => ({
      "Sl No": idx + 1,
      "Enquiry ID": e.id,
      "Visitor Name": e.name,
      "Mobile Contact": e.mobile,
      "Email Address": e.email || '-',
      "Service Requested": e.service,
      "Website Source": e.sourceWebsite,
      "Form Page": e.sourcePage,
      "Inquiry Message": e.message,
      "Submitted At": e.submittedAt,
      "Status": e.status,
      "Assigned Staff": `${e.assignedName} (${e.assignedTo})`,
      "Remarks / Notes": e.notes || '-'
    }));
    exportToCSV(data, 'rajalakshmy_website_enquiries.csv');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-gold-300 text-xs font-bold uppercase tracking-wider flex-wrap">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Website Inbound Leads</span>
            <span>•</span>
            <a
              href="https://rajalakshmyassociates.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-gold-300 hover:text-white underline decoration-gold-400 font-mono text-[11px]"
            >
              <span>rajalakshmyassociates.com</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            Website Contact Us Enquiries
          </h2>
          <p className="text-xs text-white/80 max-w-xl">
            Live client leads and loan advisory enquiries submitted directly through the official corporate website contact form at{' '}
            <strong className="text-gold-300 font-mono">https://rajalakshmyassociates.com/</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gold-500 hover:bg-gold-600 px-4 py-2.5 text-xs font-bold text-amber-950 shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Simulate Web Submission</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-3.5 py-2.5 text-xs font-bold text-white transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Total Enquiries</span>
            <Globe className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{enquiries.length}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Captured from website</span>
        </div>

        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-800">New / Unread</span>
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div className="text-2xl font-black text-emerald-950">{newCount}</div>
          <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
            Require first contact
          </span>
        </div>

        <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-amber-800">In Follow-Up</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950">{inProgressCount}</div>
          <span className="text-[10px] text-amber-700 block mt-0.5">
            Active telecalling discussions
          </span>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-purple-800">Converted</span>
            <CheckCircle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-950">{convertedCount}</div>
          <span className="text-[10px] text-purple-700 block mt-0.5">
            Moved to Database / Leads
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {['All', 'New', 'Contacted', 'Follow-up', 'Converted'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                statusFilter === st
                  ? 'bg-burgundy-900 text-white border-burgundy-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st} ({enquiries.filter(e => st === 'All' ? true : e.status === st).length})
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search visitor, mobile, service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 py-2 pl-9 pr-3 focus:outline-none focus:border-burgundy-800"
          />
        </div>
      </div>

      {/* Enquiries Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 bg-[#FAF6EF] border-b border-slate-200 text-xs font-bold text-slate-800 flex flex-wrap items-center justify-between gap-2">
          <span>Website Inbound Enquiries ({filteredEnquiries.length})</span>
          <span className="text-[11px] text-burgundy-900 font-semibold bg-burgundy-50 px-2.5 py-0.5 rounded-full border border-burgundy-200">
            Source: rajalakshmyassociates.com Contact Us
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[800px]">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center w-14">Sl No</th>
                <th className="px-4 py-3">Enquiry ID</th>
                <th className="px-4 py-3">Visitor & Contact</th>
                <th className="px-4 py-3">Service Required</th>
                <th className="px-4 py-3">Inquiry Message</th>
                <th className="px-4 py-3">Submitted At</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <Globe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="text-sm font-semibold text-slate-700">No Website Enquiries Found</div>
                    <div className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      No inbound inquiries match the active criteria. Visitors who submit the contact form on{' '}
                      <span className="font-mono text-burgundy-800 font-semibold">https://rajalakshmyassociates.com/</span> will automatically appear here.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-[#FAF6EF]/60 transition">
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-burgundy-50 border border-burgundy-200 text-burgundy-900 font-bold text-xs">
                        {idx + 1}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono font-bold text-burgundy-900">
                      {item.id}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="font-mono text-[11px] text-slate-700 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{item.mobile}</span>
                      </div>
                      {item.email && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-xs">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{item.email}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-burgundy-50 border border-burgundy-200 text-burgundy-900 font-semibold text-[11px]">
                        {item.service}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      <p className="line-clamp-2 text-xs">{item.message}</p>
                    </td>

                    <td className="px-4 py-3 text-slate-600 text-[11px] whitespace-nowrap">
                      <div className="font-medium text-slate-800">{item.submittedAt}</div>
                      <span className="text-[10px] text-cyan-700 font-medium">via Website Form</span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.status === 'New'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : item.status === 'Contacted'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : item.status === 'Follow-up'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : item.status === 'Converted'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {item.status === 'New' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        <span>{item.status}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedEnquiry(item)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition"
                          title="View Message Details"
                        >
                          View
                        </button>

                        {item.status !== 'Converted' && (
                          <button
                            onClick={() => convertEnquiryToLead(item.id, 'new', 'known')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                            title="Move to New Database Lead Queue"
                          >
                            <ArrowRight className="w-3 h-3" />
                            <span>Convert to Lead</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Simulate Website Contact Form Submission */}
      {isTestModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-800 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400 text-burgundy-950 shadow-md font-bold">
                  <Globe className="w-5 h-5 text-burgundy-950" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Website Contact Form Simulator</h3>
                  <p className="text-xs text-gold-200 font-mono">
                    https://rajalakshmyassociates.com/contact-us
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleTestSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                <span>
                  Submit this form to test inbound website capture. The lead will immediately arrive into the Enquiry menu with <strong>New</strong> status.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Visitor Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandran"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2.5 px-3 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mobile Number (10 digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 98401 23456"
                    value={visitorMobile}
                    onChange={(e) => setVisitorMobile(e.target.value)}
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 py-2.5 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. ramesh@example.com"
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2.5 px-3 focus:outline-none focus:border-burgundy-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Service / Subject of Enquiry *
                </label>
                <select
                  value={visitorService}
                  onChange={(e) => setVisitorService(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2.5 px-3 focus:outline-none focus:border-burgundy-800 bg-white"
                >
                  {serviceOptions.map(srv => (
                    <option key={srv} value={srv}>{srv}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Enquiry Message
                </label>
                <textarea
                  rows={3}
                  placeholder="State your loan amount, commercial property details, or financial requirement..."
                  value={visitorMessage}
                  onChange={(e) => setVisitorMessage(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2.5 px-3 focus:outline-none focus:border-burgundy-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 text-white font-bold shadow-md transition"
                >
                  <span>Submit to CRM</span>
                  <ArrowRight className="w-4 h-4 text-gold-300" />
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: View & Update Enquiry Details */}
      {selectedEnquiry && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-800 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold">{selectedEnquiry.name}</h3>
                  <span className="font-mono text-xs text-gold-300 font-bold bg-white/10 px-2 py-0.5 rounded border border-white/20">
                    {selectedEnquiry.id}
                  </span>
                </div>
                <p className="text-xs text-gold-200 mt-0.5">
                  Captured from {selectedEnquiry.sourceWebsite}
                </p>
              </div>
              <button
                onClick={() => setSelectedEnquiry(null)}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Mobile Phone</span>
                  <a href={`tel:${selectedEnquiry.mobile}`} className="font-mono font-bold text-burgundy-900 hover:underline">
                    {selectedEnquiry.mobile}
                  </a>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Email</span>
                  <span className="font-medium text-slate-800">{selectedEnquiry.email || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Requested Service</span>
                  <span className="font-bold text-slate-900">{selectedEnquiry.service}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Submitted At</span>
                  <span className="font-medium text-slate-700">{selectedEnquiry.submittedAt}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Inquiry Message</span>
                <div className="bg-[#FAF6EF] p-3 rounded-xl border border-amber-200 text-slate-800 leading-relaxed font-medium">
                  {selectedEnquiry.message}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">
                  Update Enquiry Status
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['New', 'Contacted', 'Follow-up', 'Converted'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        updateEnquiryStatus(selectedEnquiry.id, st);
                        setSelectedEnquiry(prev => ({ ...prev, status: st }));
                      }}
                      className={`py-1.5 text-xs font-bold rounded-xl border transition ${
                        selectedEnquiry.status === st
                          ? 'bg-burgundy-900 text-white border-burgundy-900 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedEnquiry(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Close
                </button>

                {selectedEnquiry.status !== 'Converted' && (
                  <button
                    type="button"
                    onClick={() => {
                      convertEnquiryToLead(selectedEnquiry.id, 'new', 'known');
                      setSelectedEnquiry(null);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Convert to Database Lead</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
