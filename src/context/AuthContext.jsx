import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_EMPLOYEES } from '../data/mockData';
import { formatMobileNumber } from '../utils/formatters';

const AuthContext = createContext();

const STORAGE_KEY_AUTH = 'rajalakshmy_auth_user';

const normalizeUserContact = (user) => {
  if (!user || typeof user !== 'object') return user;
  return user.mobile ? { ...user, mobile: formatMobileNumber(user.mobile) } : user;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      if (saved) {
        return normalizeUserContact(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Error loading user from localStorage:", e);
    }
    // Default to null so user arrives on Login screen if logged out
    return null;
  });

  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const confirmAndLogout = () => {
    setShowLogoutConfirmModal(true);
  };

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    }
  }, [currentUser]);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type, id: Date.now() });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const getStoredEmployees = () => {
    try {
      const saved = localStorage.getItem('rajalakshmy_employees_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normalizeUserContact);
      }
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_EMPLOYEES.map(normalizeUserContact);
  };

  const login = (employeeId, password) => {
    const allEmployees = getStoredEmployees();
    const q = (employeeId || '').trim().toLowerCase();
    const employee = allEmployees.find(
      emp =>
        emp.id?.toLowerCase() === q ||
        emp.email?.toLowerCase() === q ||
        emp.name?.toLowerCase() === q
    );

    if (employee) {
      if (employee.status === 'Inactive') {
        return {
          success: false,
          message: `User account ${employee.id} (${employee.name}) is Inactive. Please contact Admin.`
        };
      }
      setCurrentUser(employee);
      showToast(`Welcome back, ${employee.name} (${employee.role})`, 'success');
      return { success: true, user: employee };
    }

    return {
      success: false,
      message: 'Invalid Employee ID or credentials. Please check and try again.'
    };
  };

  const loginAsRole = (roleName) => {
    const allEmployees = getStoredEmployees();
    const employee = allEmployees.find(
      emp => emp.role.toLowerCase() === roleName.toLowerCase() && emp.status !== 'Inactive'
    );
    if (employee) {
      setCurrentUser(employee);
      showToast(`Switched view to ${employee.name} (${employee.role})`, 'info');
      return employee;
    }
    return null;
  };

  const switchUser = (userObj) => {
    if (userObj) {
      const normalized = normalizeUserContact(userObj);
      setCurrentUser(normalized);
      showToast(`Switched session to ${normalized.name} (${normalized.id} • ${normalized.role})`, 'info');
    }
  };

  const logout = () => {
    setCurrentUser(null);
    showToast('Logged out successfully', 'info');
  };

  // Role permissions map
  const canAccessRoute = (route) => {
    if (!currentUser) return false;
    const role = currentUser.role;

    if (role === 'Admin') return true;

    switch (route) {
      case 'dashboard':
      case 'notifications':
      case 'attendance':
      case 'login':
      case 'logins':
      case 'bank-logins':
        return true;
      case 'resignation':
        return ['Admin', 'Manager', 'Ops', 'RM', 'Sales Manager'].includes(role);
      case 'advance':
        return ['Admin', 'Manager', 'Ops', 'RM', 'Sales Manager', 'Sales Executive'].includes(role);
      case 'performance':
        return ['Admin', 'Manager', 'RM', 'Sales Manager', 'Sales Executive'].includes(role);
      case 'customers':
        return ['Admin', 'Manager', 'Ops'].includes(role);
      case 'database':
        return ['Admin', 'Manager', 'Ops', 'RM'].includes(role);
      case 'telecalling':
        return ['Admin', 'Manager', 'RM'].includes(role);
      case 'daily-activities':
        return ['Admin', 'Manager', 'Sales Manager', 'Sales Executive'].includes(role);
      case 'reports':
        return ['Admin', 'Manager', 'Ops', 'Sales Manager', 'RM'].includes(role);
      case 'settings':
        return ['Admin', 'Ops'].includes(role);
      case 'users':
      case 'user-management':
        return ['Admin', 'Manager', 'Ops'].includes(role);
      default:
        return true;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        loginAsRole,
        switchUser,
        logout,
        confirmAndLogout,
        showLogoutConfirmModal,
        setShowLogoutConfirmModal,
        canAccessRoute,
        showFollowUpModal,
        setShowFollowUpModal,
        toastMessage,
        showToast
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
