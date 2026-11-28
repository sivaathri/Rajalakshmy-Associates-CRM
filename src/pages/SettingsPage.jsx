import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight,
  Camera,
  Trash2,
  Target,
  MapPin,
  Calendar,
  BadgeCheck
} from 'lucide-react';

// Resize uploaded profile image cleanly to avoid exceeding localStorage quota
const resizeImageToDataUrl = (file, maxSize = 280) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const SettingsPage = () => {
  const { customers, employees, updateEmployee, assignCustomersToRM, resetToFactoryDefaults } = useCRM();
  const { currentUser, updateCurrentUser, showToast } = useAuth();

  const fileInputRef = useRef(null);
  const liveEmployee = (employees || []).find(e => e.id === currentUser?.id) || currentUser || {};

  const [profileForm, setProfileForm] = useState({
    name: '',
    avatar: '',
    id: '',
    role: '',
    mobile: '',
    dob: '',
    dateOfJoining: '',
    address: '',
    target: ''
  });

  useEffect(() => {
    setProfileForm({
      name: liveEmployee.name || '',
      avatar: liveEmployee.avatar || '',
      id: liveEmployee.id || '',
      role: liveEmployee.role || '',
      mobile: liveEmployee.mobile ? formatMobileNumber(liveEmployee.mobile) : '',
      dob: liveEmployee.dob || '',
      dateOfJoining: liveEmployee.dateOfJoining || liveEmployee.joiningDate || '',
      address: liveEmployee.address || liveEmployee.location || '',
      target: liveEmployee.target || ''
    });
  }, [
    liveEmployee.id,
    liveEmployee.name,
    liveEmployee.avatar,
    liveEmployee.role,
    liveEmployee.mobile,
    liveEmployee.dob,
    liveEmployee.dateOfJoining,
    liveEmployee.joiningDate,
    liveEmployee.address,
    liveEmployee.location,
    liveEmployee.target
  ]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setProfileForm(prev => ({ ...prev, avatar: dataUrl }));
    } catch {
      showToast('Failed to read selected image', 'error');
    }
    e.target.value = '';
  };

  const handleSaveProfileSettings = (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      alert('Please enter your Name');
      return;
    }
    const digits = String(profileForm.mobile || '').replace(/\D/g, '');
    if (profileForm.mobile.trim() && digits.length < 10) {
      alert('Please enter a valid 10-digit Mobile Number');
      return;
    }

    const formattedMobile = digits.length >= 10
      ? `+91 ${digits.slice(-10)}`
      : (liveEmployee.mobile || '');

    const updatedPayload = {
      name: profileForm.name.trim(),
      avatar: profileForm.avatar || '',
      mobile: formattedMobile,
      dob: profileForm.dob || '',
      dateOfJoining: profileForm.dateOfJoining || '',
      joiningDate: profileForm.dateOfJoining || '',
      address: profileForm.address.trim(),
      target: profileForm.target.trim()
    };

    if (currentUser?.id) {
      updateEmployee(currentUser.id, updatedPayload);
      updateCurrentUser(updatedPayload);
    }
  };

  const roleLower = String(currentUser?.role || '').toLowerCase();
  const isAdminOrOps = ['admin', 'ops', 'operations'].includes(roleLower);

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
          <span className="text-[11px] font-bold uppercase tracking-wider text-gold-300">
            Account Profile &amp; Preferences
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1 font-corporate">
            Setting
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs bg-white/10 border border-white/20 rounded-xl px-3.5 py-2">
          <BadgeCheck className="w-4 h-4 text-gold-300" />
          <span className="font-mono font-bold">{profileForm.id || currentUser?.id}</span>
          <span>•</span>
          <span className="font-semibold text-gold-200">{profileForm.role || currentUser?.role}</span>
        </div>
      </div>

      {/* User Profile & Settings Form (Visible to All Roles) */}
      <form
        onSubmit={handleSaveProfileSettings}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6"
      >
        {/* Profile Image Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-5 border-b border-slate-100">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-2 border-gold-300 bg-gradient-to-br from-burgundy-900 to-burgundy-950 text-gold-300 shadow-md overflow-hidden">
            {profileForm.avatar ? (
              <img
                src={profileForm.avatar}
                alt={profileForm.name || 'Profile Image'}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-gold-300" />
            )}
          </div>

          <div className="space-y-2 flex-1">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Profile Image</h3>
              <p className="text-xs text-slate-500">
                Upload a photo for {profileForm.name || 'your account'} ({profileForm.id || 'EMP'})
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
              >
                <Camera className="w-3.5 h-3.5 text-gold-300" />
                <span>{profileForm.avatar ? 'Change Profile Image' : 'Upload Profile Image'}</span>
              </button>
              {profileForm.avatar && (
                <button
                  type="button"
                  onClick={() => setProfileForm(prev => ({ ...prev, avatar: '' }))}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Form Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Enter full name"
              value={profileForm.name}
              onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full text-xs rounded-xl border border-slate-300 py-2.5 px-3 bg-white focus:outline-none focus:border-burgundy-800 font-semibold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Emp ID
            </label>
            <input
              type="text"
              readOnly
              disabled
              value={profileForm.id}
              className="w-full text-xs rounded-xl border border-slate-200 py-2.5 px-3 bg-slate-100 text-slate-700 font-mono font-bold cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Role
            </label>
            <input
              type="text"
              readOnly
              disabled
              value={profileForm.role}
              className="w-full text-xs rounded-xl border border-slate-200 py-2.5 px-3 bg-slate-100 text-slate-700 font-semibold cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="+91 9876543210"
              value={profileForm.mobile}
              onChange={(e) => setProfileForm(prev => ({ ...prev, mobile: e.target.value }))}
              className="w-full text-xs rounded-xl border border-slate-300 py-2.5 px-3 bg-white focus:outline-none focus:border-burgundy-800 font-mono font-semibold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date of Birth (DOB)</span>
            </label>
            <input
              type="date"
              value={profileForm.dob}
              onChange={(e) => setProfileForm(prev => ({ ...prev, dob: e.target.value }))}
              className="w-full text-xs rounded-xl border border-slate-300 py-2.5 px-3 bg-white focus:outline-none focus:border-burgundy-800 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date of Joining</span>
            </label>
            <input
              type="date"
              value={profileForm.dateOfJoining}
              onChange={(e) => setProfileForm(prev => ({ ...prev, dateOfJoining: e.target.value }))}
              className="w-full text-xs rounded-xl border border-slate-300 py-2.5 px-3 bg-white focus:outline-none focus:border-burgundy-800 text-slate-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-burgundy-700" />
              <span>Target</span>
            </label>
            <input
              type="text"
              placeholder="e.g. ₹25,00,000 / 50 Calls per day"
              value={profileForm.target}
              onChange={(e) => setProfileForm(prev => ({ ...prev, target: e.target.value }))}
              className="w-full text-xs rounded-xl border border-slate-300 py-2.5 px-3 bg-white focus:outline-none focus:border-burgundy-800 font-semibold text-slate-900"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Address</span>
            </label>
            <textarea
              rows={2}
              placeholder="Enter residential or branch address"
              value={profileForm.address}
              onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
              className="w-full text-xs rounded-xl border border-slate-300 p-3 bg-white focus:outline-none focus:border-burgundy-800 text-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 px-6 py-2.5 text-xs font-bold text-white shadow-md transition"
          >
            <CheckCircle className="w-4 h-4 text-gold-300" />
            <span>Save Profile Settings</span>
          </button>
        </div>
      </form>

      {/* Section 1: Ops Telecalling Lead Distribution Tool (Admin & Ops only) */}
      {isAdminOrOps && (
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
      )}

      {/* Section 2: 20 Employee Directory (Admin & Ops only) */}
      {isAdminOrOps && (
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
      )}
    </div>
  );
};
