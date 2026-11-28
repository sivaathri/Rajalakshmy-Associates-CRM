import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { formatMobileNumber } from '../utils/formatters';
import {
  User,
  CheckCircle,
  Camera,
  Trash2,
  Target,
  MapPin,
  Calendar,
  BadgeCheck,
  Edit3,
  X,
  Lock,
  Eye,
  EyeOff
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
  const { employees, updateEmployee } = useCRM();
  const { currentUser, updateCurrentUser, showToast } = useAuth();

  const fileInputRef = useRef(null);
  const liveEmployee = (employees || []).find(e => e.id === currentUser?.id) || currentUser || {};
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const buildFormFromEmployee = (emp = {}) => ({
    name: emp.name || '',
    avatar: emp.avatar || '',
    id: emp.id || '',
    role: emp.role || '',
    mobile: emp.mobile ? formatMobileNumber(emp.mobile) : '',
    dob: emp.dob || '',
    dateOfJoining: emp.dateOfJoining || emp.joiningDate || '',
    address: emp.address || emp.location || '',
    target: emp.target || '',
    password: emp.password || 'password123'
  });

  const [profileForm, setProfileForm] = useState(() => buildFormFromEmployee(liveEmployee));

  useEffect(() => {
    setProfileForm(buildFormFromEmployee(liveEmployee));
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
    liveEmployee.target,
    liveEmployee.password
  ]);

  useEffect(() => {
    setIsEditing(false);
    setShowPassword(false);
  }, [currentUser?.id]);

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
    if (!profileForm.password.trim()) {
      alert('Please enter a Password');
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
      address: profileForm.address.trim(),
      password: profileForm.password.trim()
    };

    if (currentUser?.id) {
      updateEmployee(currentUser.id, updatedPayload);
      updateCurrentUser(updatedPayload);
      setIsEditing(false);
      setShowPassword(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileForm(buildFormFromEmployee(liveEmployee));
    setIsEditing(false);
    setShowPassword(false);
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
                {isEditing
                  ? `Upload a photo for ${profileForm.name || 'your account'} (${profileForm.id || 'EMP'})`
                  : `${profileForm.name || 'Account'} (${profileForm.id || 'EMP'}) • Click Edit to update profile`}
              </p>
            </div>
            {isEditing && (
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
            )}
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
              readOnly={!isEditing}
              disabled={!isEditing}
              placeholder="Enter full name"
              value={profileForm.name}
              onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full text-xs rounded-xl border py-2.5 px-3 focus:outline-none font-semibold text-slate-900 transition ${
                isEditing
                  ? 'border-slate-300 bg-white focus:border-burgundy-800'
                  : 'border-slate-200 bg-slate-50/90 text-slate-700 cursor-default'
              }`}
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
              readOnly={!isEditing}
              disabled={!isEditing}
              placeholder="+91 9876543210"
              value={profileForm.mobile}
              onChange={(e) => setProfileForm(prev => ({ ...prev, mobile: e.target.value }))}
              className={`w-full text-xs rounded-xl border py-2.5 px-3 focus:outline-none font-mono font-semibold text-slate-900 transition ${
                isEditing
                  ? 'border-slate-300 bg-white focus:border-burgundy-800'
                  : 'border-slate-200 bg-slate-50/90 text-slate-700 cursor-default'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date of Birth (DOB)</span>
            </label>
            <input
              type="date"
              readOnly={!isEditing}
              disabled={!isEditing}
              value={profileForm.dob}
              onChange={(e) => setProfileForm(prev => ({ ...prev, dob: e.target.value }))}
              className={`w-full text-xs rounded-xl border py-2.5 px-3 focus:outline-none text-slate-900 transition ${
                isEditing
                  ? 'border-slate-300 bg-white focus:border-burgundy-800'
                  : 'border-slate-200 bg-slate-50/90 text-slate-700 cursor-default'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date of Joining</span>
            </label>
            <input
              type="date"
              readOnly
              disabled
              value={profileForm.dateOfJoining}
              className="w-full text-xs rounded-xl border border-slate-200 py-2.5 px-3 bg-slate-100 text-slate-700 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-burgundy-700" />
              <span>Target</span>
            </label>
            <input
              type="text"
              readOnly
              disabled
              placeholder="Assigned by Admin"
              value={profileForm.target}
              className="w-full text-xs rounded-xl border border-slate-200 py-2.5 px-3 bg-slate-100 text-slate-700 font-semibold cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Password {isEditing && <span className="text-rose-500">*</span>}</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required={isEditing}
                readOnly={!isEditing}
                disabled={!isEditing}
                placeholder="Enter password"
                value={profileForm.password}
                onChange={(e) => setProfileForm(prev => ({ ...prev, password: e.target.value }))}
                className={`w-full text-xs rounded-xl border py-2.5 pl-3 pr-9 focus:outline-none font-mono text-slate-900 transition ${
                  isEditing
                    ? 'border-slate-300 bg-white focus:border-burgundy-800'
                    : 'border-slate-200 bg-slate-50/90 text-slate-700 cursor-default'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Address</span>
            </label>
            <textarea
              rows={2}
              readOnly={!isEditing}
              disabled={!isEditing}
              placeholder={isEditing ? 'Enter residential or branch address' : 'Not set'}
              value={profileForm.address}
              onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
              className={`w-full text-xs rounded-xl border p-3 focus:outline-none text-slate-900 transition ${
                isEditing
                  ? 'border-slate-300 bg-white focus:border-burgundy-800'
                  : 'border-slate-200 bg-slate-50/90 text-slate-700 cursor-default'
              }`}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 px-6 py-2.5 text-xs font-bold text-white shadow-md transition"
            >
              <Edit3 className="w-4 h-4 text-gold-300" />
              <span>Edit</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 transition"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 px-6 py-2.5 text-xs font-bold text-white shadow-md transition"
              >
                <CheckCircle className="w-4 h-4 text-gold-300" />
                <span>Save Profile Settings</span>
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};
