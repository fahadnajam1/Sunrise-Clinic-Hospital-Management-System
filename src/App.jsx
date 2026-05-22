import React, { useState } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import {
  LayoutDashboard, Users, Calendar, FileText, UserCheck,
  Stethoscope, Folder, Building2, Package, Pill,
  CreditCard, Receipt, Briefcase, Clock, MessageSquare,
  BarChart3, Shield, Settings as SettingsIcon, LogOut, Bell, Search,
  HeartPulse, ChevronRight, Activity, Database, Mail
} from 'lucide-react';
import toast from 'react-hot-toast';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientList from './pages/patients/PatientList';
import PatientRegister from './pages/patients/PatientRegister';
import PatientView from './pages/patients/PatientView';
import Appointments from './pages/appointments/Appointments';
import DischargeSummary from './pages/discharge/DischargeSummary';
import Consultants from './pages/consultants/Consultants';
import MRDManagement from './pages/mrd/MRDManagement';
import Reception from './pages/reception/Reception';
import Pharmacy from './pages/pharmacy/Pharmacy';
import Inventory from './pages/inventory/Inventory';
import Services from './pages/services/Services';
import Invoices from './pages/billing/Invoices';
import Claims from './pages/claims/Claims';
import Attendance from './pages/attendance/Attendance';
import Payroll from './pages/payroll/Payroll';
import Feedback from './pages/feedback/Feedback';
import Analytics from './pages/analytics/Analytics';
import Reports from './pages/reports/Reports';
import SecurityManagement from './pages/security/SecurityManagement';
import CybersecurityPolicy from './pages/security/CybersecurityPolicy';
import PenTestReport from './pages/security/PenTestReport';
import AuditLogs from './pages/security/AuditLogs';
import Settings from './pages/settings/Settings';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/reception', label: 'Reception', icon: Building2 },
    ],
  },
  {
    label: 'Clinical',
    items: [
      { path: '/patients', label: 'Patients', icon: Users },
      { path: '/appointments', label: 'Appointments', icon: Calendar },
      { path: '/ehr', label: 'EHR / Records', icon: FileText },
      { path: '/discharge', label: 'Discharge Summary', icon: HeartPulse },
      { path: '/consultants', label: 'Consultants', icon: Stethoscope },
      { path: '/mrd', label: 'MRD Management', icon: Folder },
    ],
  },
  {
    label: 'Pharmacy & Stock',
    items: [
      { path: '/pharmacy', label: 'Pharmacy', icon: Pill },
      { path: '/inventory', label: 'Inventory', icon: Package },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/services', label: 'Services', icon: Activity },
      { path: '/invoices', label: 'Billing & Invoices', icon: CreditCard },
      { path: '/claims', label: 'Claims & Insurance', icon: Receipt },
    ],
  },
  {
    label: 'HR & Staff',
    items: [
      { path: '/attendance', label: 'Attendance', icon: Clock },
      { path: '/payroll', label: 'Payroll', icon: Briefcase },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { path: '/analytics', label: 'Analytics & BI', icon: BarChart3 },
      { path: '/reports', label: 'Reports', icon: Database },
      { path: '/feedback', label: 'Feedback', icon: MessageSquare },
    ],
  },
  {
    label: 'Security & Compliance',
    items: [
      { path: '/audit-logs', label: 'Audit Logs', icon: Shield },
      { path: '/cybersecurity-policy', label: 'Cybersecurity Policy', icon: FileText },
      { path: '/pentest-report', label: 'PenTest Report', icon: UserCheck },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

function Sidebar({ onSignOut }) {
  const { profile } = useAuth();
  const location = useLocation();

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)
    : 'US';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-brand">
          <div className="logo-icon">
            <HeartPulse size={20} />
          </div>
          <div className="logo-text">
            <h1>Sunrise Clinic</h1>
            <p>Medical Management System</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="sidebar-user">
        <div className="user-avatar">{initials}</div>
        <div className="user-info">
          <div className="user-name">{profile?.full_name || 'User'}</div>
          <div className="user-role">{profile?.role || 'staff'}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} className="nav-icon" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="nav-item w-full" onClick={onSignOut}>
          <LogOut size={16} className="nav-icon" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

function Topbar({ pageTitle, pageSubtitle }) {
  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        <h2>{pageTitle}</h2>
        {pageSubtitle && <p>{pageSubtitle}</p>}
      </div>
      <div className="topbar-actions">
        <button className="topbar-btn" title="Notifications">
          <Bell size={16} />
        </button>
        <button className="topbar-btn" title="Settings">
          <SettingsIcon size={16} />
        </button>
        <div style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 500 }}>
          {new Date().toLocaleDateString('en-AU', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
        </div>
      </div>
    </header>
  );
}

const PAGE_META = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Welcome to Sunrise Medical Clinic' },
  '/patients': { title: 'Patient Management', subtitle: 'Register and manage patient records' },
  '/appointments': { title: 'Appointments', subtitle: 'Schedule and track patient appointments' },
  '/ehr': { title: 'Electronic Health Records', subtitle: 'Clinical documentation and records' },
  '/discharge': { title: 'Discharge Summary', subtitle: 'Generate and manage discharge summaries' },
  '/consultants': { title: 'Consultants', subtitle: 'Manage consultant profiles and charges' },
  '/mrd': { title: 'MRD Management', subtitle: 'Medical records department' },
  '/reception': { title: 'Reception', subtitle: 'Front desk management' },
  '/pharmacy': { title: 'Pharmacy', subtitle: 'Medications and dispensing' },
  '/inventory': { title: 'Inventory', subtitle: 'Medical supplies and equipment' },
  '/services': { title: 'Service Management', subtitle: 'Manage clinic services and pricing' },
  '/invoices': { title: 'Billing & Invoices', subtitle: 'eBilling and payment management' },
  '/claims': { title: 'Claims & Insurance', subtitle: 'Insurance claims and statements' },
  '/attendance': { title: 'Attendance', subtitle: 'Staff attendance management' },
  '/payroll': { title: 'Payroll', subtitle: 'HR and payroll management' },
  '/feedback': { title: 'Feedback', subtitle: 'Patient feedback and satisfaction' },
  '/analytics': { title: 'Analytics & Business Intelligence', subtitle: 'Insights and performance metrics' },
  '/reports': { title: 'Reports', subtitle: 'Custom and pre-built reporting' },
  '/security': { title: 'Security Management', subtitle: 'Role-based access and audit logs' },
  '/cybersecurity-policy': { title: 'Cybersecurity Policy', subtitle: 'HIPAA-compliant security policy' },
  '/pentest-report': { title: 'Penetration Testing Report', subtitle: 'Vulnerability analysis and mitigation' },
  '/audit-logs': { title: 'Audit Logs', subtitle: 'HIPAA-compliant activity and access logs' },
  '/settings': { title: 'Settings', subtitle: 'Account and system preferences' },
};

function AppLayout({ children }) {
  const { signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  const meta = Object.entries(PAGE_META).find(([k]) => location.pathname.startsWith(k))?.[1]
    || { title: 'Sunrise Medical Clinic', subtitle: '' };

  return (
    <div className="app-shell">
      <Sidebar onSignOut={handleSignOut} />
      <div className="main-content">
        <Topbar pageTitle={meta.title} pageSubtitle={meta.subtitle} />
        <main className="page-content page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-overlay" style={{height:'100vh'}}>
      <div className="spinner" style={{width:40,height:40}} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="loading-overlay" style={{height:'100vh',background:'var(--bg-app)'}}>
      <div>
        <div className="spinner" style={{width:40,height:40,margin:'0 auto'}} />
        <p style={{marginTop:16,color:'var(--gray-500)',fontSize:14,textAlign:'center'}}>Loading Sunrise Medical Clinic...</p>
      </div>
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />

      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/patients" element={<ProtectedRoute><AppLayout><PatientList /></AppLayout></ProtectedRoute>} />
      <Route path="/patients/register" element={<ProtectedRoute><AppLayout><PatientRegister /></AppLayout></ProtectedRoute>} />
      <Route path="/patients/:id" element={<ProtectedRoute><AppLayout><PatientView /></AppLayout></ProtectedRoute>} />
      <Route path="/appointments" element={<ProtectedRoute><AppLayout><Appointments /></AppLayout></ProtectedRoute>} />
      <Route path="/ehr" element={<ProtectedRoute><AppLayout><PatientList ehrMode /></AppLayout></ProtectedRoute>} />
      <Route path="/discharge" element={<ProtectedRoute><AppLayout><DischargeSummary /></AppLayout></ProtectedRoute>} />
      <Route path="/consultants" element={<ProtectedRoute><AppLayout><Consultants /></AppLayout></ProtectedRoute>} />
      <Route path="/mrd" element={<ProtectedRoute><AppLayout><MRDManagement /></AppLayout></ProtectedRoute>} />
      <Route path="/reception" element={<ProtectedRoute><AppLayout><Reception /></AppLayout></ProtectedRoute>} />
      <Route path="/pharmacy" element={<ProtectedRoute><AppLayout><Pharmacy /></AppLayout></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><AppLayout><Inventory /></AppLayout></ProtectedRoute>} />
      <Route path="/services" element={<ProtectedRoute><AppLayout><Services /></AppLayout></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><AppLayout><Invoices /></AppLayout></ProtectedRoute>} />
      <Route path="/claims" element={<ProtectedRoute><AppLayout><Claims /></AppLayout></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><AppLayout><Attendance /></AppLayout></ProtectedRoute>} />
      <Route path="/payroll" element={<ProtectedRoute><AppLayout><Payroll /></AppLayout></ProtectedRoute>} />
      <Route path="/feedback" element={<ProtectedRoute><AppLayout><Feedback /></AppLayout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AppLayout><Analytics /></AppLayout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute><AppLayout><AuditLogs /></AppLayout></ProtectedRoute>} />
      <Route path="/cybersecurity-policy" element={<ProtectedRoute><AppLayout><CybersecurityPolicy /></AppLayout></ProtectedRoute>} />
      <Route path="/pentest-report" element={<ProtectedRoute><AppLayout><PenTestReport /></AppLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
