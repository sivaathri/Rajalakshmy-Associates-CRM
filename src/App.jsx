import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CRMProvider } from './context/CRMContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { FollowUpReminderModal } from './components/common/FollowUpReminderModal';
import { LogoutConfirmModal } from './components/common/LogoutConfirmModal';
import { ActiveCallModal } from './components/telecalling/ActiveCallModal';
import { Toast } from './components/common/Toast';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomerManagementPage } from './pages/CustomerManagementPage';
import { CustomerDatabasePage } from './pages/CustomerDatabasePage';
import { TelecallingPage } from './pages/TelecallingPage';
import { DailyActivitiesPage } from './pages/DailyActivitiesPage';
import { PerformancePage } from './pages/PerformancePage';
import { ResignationPage } from './pages/ResignationPage';
import { AdvanceAmountPage } from './pages/AdvanceAmountPage';
import { AttendancePage } from './pages/AttendancePage';
import { LeadsPage } from './pages/LeadsPage';
import { BankLoginPage } from './pages/BankLoginPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UserManagementPage } from './pages/UserManagementPage';

// Protected Route Guard with Role Verification
const ProtectedLayout = ({ children, requiredRoute }) => {
  const { currentUser, canAccessRoute, showToast } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoute && !canAccessRoute(requiredRoute)) {
    showToast(`Access Restricted: "${requiredRoute}" is not available for role ${currentUser.role}`, 'error');
    return <Navigate to="/dashboard" replace />;
  }

  // Derive dynamic page title based on pathname
  const getPageTitle = (path) => {
    if (path.startsWith('/dashboard')) return 'Executive Dashboard';
    if (path.startsWith('/telecalling')) return 'RM Focused Telecalling';
    if (path === '/customers') return 'Customer Management Directory';
    if (path.startsWith('/customers/old/known') || path.startsWith('/database/old/known')) return 'Database • Old Known Numbers';
    if (path.startsWith('/customers/old/unknown') || path.startsWith('/database/old/unknown')) return 'Database • Old Unknown Numbers';
    if (path.startsWith('/customers/new/known') || path.startsWith('/database/new/known')) return 'Database • New Known Numbers';
    if (path.startsWith('/customers/new/unknown') || path.startsWith('/database/new/unknown')) return 'Database • New Unknown Numbers';
    if (path.startsWith('/leads') || path.startsWith('/lead')) return 'Lead Management';
    if (path.startsWith('/bank-logins') || path.startsWith('/logins')) return 'Bank File Login & 2-Day Routine Console';
    if (path.startsWith('/daily-activities')) return 'Field Sales Daily Activities';
    if (path.startsWith('/performance')) return 'Performance & Case Disposition';
    if (path.startsWith('/attendance')) return 'Daily Attendance & In-Punch';
    if (path.startsWith('/resignation')) return 'Resignation Management';
    if (path.startsWith('/advance')) return 'Employee Advance Amount';
    if (path.startsWith('/reports')) return 'Intelligence Reports & Leaderboards';
    if (path.startsWith('/users') || path.startsWith('/user-management')) return 'User Management & Personnel Directory';
    if (path.startsWith('/settings')) return 'Operations Settings & Lead Distribution';
    return 'Rajalakshmy Associates CRM';
  };

  return (
    <div className="min-h-screen bg-[#FAF6EF] flex">
      {/* Collapsible Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          pageTitle={getPageTitle(location.pathname)}
          isSidebarOpen={sidebarOpen}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 p-4 md:p-6 w-full">
          {children}
        </main>
      </div>

      {/* Global Modals & Notifications */}
      <FollowUpReminderModal />
      <LogoutConfirmModal />
      <ActiveCallModal />
      <Toast />
    </div>
  );
};

export function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <CRMProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedLayout requiredRoute="dashboard">
                  <DashboardPage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/telecalling"
              element={
                <ProtectedLayout requiredRoute="telecalling">
                  <TelecallingPage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/customers"
              element={
                <ProtectedLayout requiredRoute="customers">
                  <CustomerManagementPage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/customers/:dbType/:custType"
              element={
                <ProtectedLayout requiredRoute="database">
                  <CustomerDatabasePage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/database/:dbType/:custType"
              element={
                <ProtectedLayout requiredRoute="database">
                  <CustomerDatabasePage />
                </ProtectedLayout>
              }
            />

            {/* Lead Management  (Req 2) */}
            <Route
              path="/leads"
              element={
                <ProtectedLayout requiredRoute="leads">
                  <LeadsPage />
                </ProtectedLayout>
              }
            />
            <Route path="/lead" element={<Navigate to="/leads" replace />} />

            {/* Bank Loan File Login Console (Req 2, 4, 5, 6) */}
            <Route
              path="/bank-logins"
              element={
                <ProtectedLayout requiredRoute="bank-logins">
                  <BankLoginPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/logins"
              element={
                <ProtectedLayout requiredRoute="logins">
                  <BankLoginPage />
                </ProtectedLayout>
              }
            />

            {/* Legacy enquiry redirects */}
            <Route path="/enquiry" element={<Navigate to="/dashboard" replace />} />
            <Route path="/enquiries" element={<Navigate to="/dashboard" replace />} />

            <Route
              path="/daily-activities"
              element={
                <ProtectedLayout requiredRoute="daily-activities">
                  <DailyActivitiesPage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/performance"
              element={
                <ProtectedLayout requiredRoute="performance">
                  <PerformancePage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/attendance"
              element={
                <ProtectedLayout requiredRoute="attendance">
                  <AttendancePage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/resignation"
              element={
                <ProtectedLayout requiredRoute="resignation">
                  <ResignationPage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/advance"
              element={
                <ProtectedLayout requiredRoute="advance">
                  <AdvanceAmountPage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedLayout requiredRoute="reports">
                  <ReportsPage />
                </ProtectedLayout>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedLayout requiredRoute="users">
                  <UserManagementPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/user-management"
              element={<Navigate to="/users" replace />}
            />

            <Route
              path="/settings"
              element={
                <ProtectedLayout requiredRoute="settings">
                  <SettingsPage />
                </ProtectedLayout>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </CRMProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
