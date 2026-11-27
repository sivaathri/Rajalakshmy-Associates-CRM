import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { formatMobileNumber } from '../utils/formatters';
import {
  Settings,
  User,
  Users,
  Share2,
  RefreshCw,
  Shield,
  CheckCircle,
  Database,
  Building,
  Phone,
  Mail,
  ArrowRight
} from 'lucide-react';

export const SettingsPage = () => {
  const { customers, employees, assignCustomersToRM, resetToFactoryDefaults } = useCRM();
  const { currentUser } = useAuth();

  // Distribution State
  const [selectedRM, setSelectedRM] = useState('EMP004'); // Ananya
  const [batchCount, setBatchCount] = useState(5);
  const [distributeDb, setDistributeDb] = useState('all'); // 'all' | 'old' | 'new'

  // Filter RMs
  const rmEmployees = employees.filter(e => e.role === 'RM');

  // Filter unassigned or pending customers
  const candidateCustomers = customers.filter(c => {
    if (distributeDb === 'old' && c.databaseType !== 'old') return false;
    if (distributeDb === 'new' && c.databaseType !== 'new') return false;
    return c.callingStatus === 'Pending' || c.assignedTo !== selectedRM;
  });

  const handleDistribute = () => {
    if (candidateCustomers.length === 0) {
      alert('No eligible customer records to distribute under selected criteria');
      return;
    }

    const idsToAssign = candidateCustomers.slice(0, Number(batchCount)).map(c => c.id);
    assignCustomersToRM(idsToAssign, selectedRM);
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to clear all data in LocalStorage? All menus and tables will be emptied so you can use your own data.')) {
      resetToFactoryDefaults();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-burgundy-900 via-[#79091D] to-burgundy-950 p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            Operations & System Settings
          </h2>

        </div>
      </div>

      {/* Section 1: Ops Telecalling Lead Distribution Tool */}
      <div className="rounded-2xl border border-gold-300 bg-white p-6 shadow-sm space-y-4">
      

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#FAF6EF] p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Target Relationship Manager (RM)
            </label>
            <select
              value={selectedRM}
              onChange={(e) => setSelectedRM(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white focus:outline-none focus:border-burgundy-800"
            >
              {rmEmployees.map(rm => (
                <option key={rm.id} value={rm.id}>
                  {rm.name} ({rm.id} - {rm.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Database Scope
            </label>
            <select
              value={distributeDb}
              onChange={(e) => setDistributeDb(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white focus:outline-none focus:border-burgundy-800"
            >
              <option value="all">All Databases (Old & New)</option>
              <option value="old">Old Database Only</option>
              <option value="new">New Database Only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Batch Allocation Size
            </label>
            <select
              value={batchCount}
              onChange={(e) => setBatchCount(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white focus:outline-none focus:border-burgundy-800"
            >
              <option value="3">3 Contacts</option>
              <option value="5">5 Contacts</option>
              <option value="10">10 Contacts</option>
              <option value="20">20 Contacts</option>
            </select>
          </div>
        </div>

        
      </div>

      {/* Section 2: 20 Employee Directory */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#FAF6EF] border-b border-slate-200">
         
          <span className="text-xs font-mono font-semibold text-slate-500">Active Staff: {employees.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[760px]">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department & Designation</th>
                <th className="px-4 py-3">Branch Location</th>
                <th className="px-4 py-3">Contact Email</th>
                <th className="px-4 py-3">Mobile Contact</th>
                <th className="px-4 py-3 text-right">System Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-[#FAF6EF]/60 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-burgundy-900 text-gold-300 font-bold flex items-center justify-center border border-gold-300 shrink-0">
                        <User className="w-4 h-4 text-gold-300" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{emp.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 block">{emp.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-burgundy-50 text-burgundy-900 border border-burgundy-200">
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800">{emp.title}</span>
                    <span className="text-[10px] text-slate-400 block">{emp.department}</span>
                  </td>
                  <td className="px-4 py-3">{emp.location}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{emp.email}</td>
                  <td className="px-4 py-3 font-mono font-medium">{formatMobileNumber(emp.mobile)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
