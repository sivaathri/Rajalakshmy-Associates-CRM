import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_EMPLOYEES } from '../data/mockData';

const AuthContext = createContext();

const STORAGE_KEY_AUTH = 'rajalakshmy_auth_user';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error loading user from localStorage:", e);
    }
    // Default to RM Ananya for immediate showcase of telecalling and follow-up popup,
    // or EMP001 Admin. Ananya EMP004 has active pending follow-ups!
    return INITIAL_EMPLOYEES.find(e => e.id === "EMP004") || INITIAL_EMPLOYEES[0];
  });

  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

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

  const login = (employeeId, password) => {
    const employee = INITIAL_EMPLOYEES.find(
      emp => emp.id.toUpperCase() === (employeeId || '').trim().toUpperCase()
    );

    if (employee) {
      setCurrentUser(employee);
      showToast(`Welcome back, ${employee.name} (${employee.role})`, 'success');
      // Follow-up modal trigger on login
      setShowFollowUpModal(true);
      return { success: true, user: employee };
    }

    return {
      success: false,
      message: 'Invalid Employee ID or password. Use EMP001 to EMP005 or click quick login.'
    };
  };

  const loginAsRole = (roleName) => {
    const employee = INITIAL_EMPLOYEES.find(
      emp => emp.role.toLowerCase() === roleName.toLowerCase()
    );
    if (employee) {
      setCurrentUser(employee);
      showToast(`Switched view to ${employee.name} (${employee.role})`, 'info');
      setShowFollowUpModal(true);
      return employee;
    }
    return null;
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
      case 'attendance':
        return true;
      case 'resignation':
        return ['Admin', 'Manager', 'Ops', 'RM', 'Sales Manager'].includes(role);
      case 'advance':
        return ['Admin', 'Manager', 'Ops', 'RM', 'Sales Manager', 'Sales Executive'].includes(role);
      case 'performance':
        return ['Admin', 'Manager', 'RM', 'Sales Manager', 'Sales Executive'].includes(role);
      case 'customers':
        return ['Admin', 'Manager', 'Ops', 'RM'].includes(role);
      case 'telecalling':
        return ['Admin', 'Manager', 'RM'].includes(role);
      case 'daily-activities':
        return ['Admin', 'Manager', 'Sales Manager', 'Sales Executive'].includes(role);
      case 'reports':
        return ['Admin', 'Manager', 'Ops', 'Sales Manager', 'RM'].includes(role);
      case 'settings':
        return ['Admin', 'Ops'].includes(role);
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
        logout,
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
