import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import useAuth from './hooks/useAuth';
import { getRoleHome } from './services/navigation';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import FactoryRegister from './pages/FactoryRegister';
import TechnicianRegister from './pages/TechnicianRegister';
import FactoryDashboard from './pages/factory/FactoryDashboard';
import FactoryProfile from './pages/factory/FactoryProfile';
import FactoryMachines from './pages/factory/FactoryMachines';
import FaultReportForm from './pages/factory/FaultReportForm';
import TechnicianDiscovery from './pages/factory/TechnicianDiscovery';
import TechnicianDashboard from './pages/technician/TechnicianDashboard';
import TechnicianProfile from './pages/technician/TechnicianProfile';
import NotificationsPage from './pages/NotificationsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import NotFound from './pages/NotFound';

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? getRoleHome(user.role) : '/login'} replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<HomeRedirect />} />
    <Route element={<PublicOnlyRoute />}>
      <Route path="/login" element={<Login />} />
      <Route path="/register/factory" element={<FactoryRegister />} />
      <Route path="/register/technician" element={<TechnicianRegister />} />
    </Route>
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route element={<ProtectedRoute roles={['factory']} />}>
          <Route path="/dashboard/factory" element={<FactoryDashboard />} />
          <Route path="/dashboard/factory/profile" element={<FactoryProfile />} />
          <Route path="/dashboard/factory/machines" element={<FactoryMachines />} />
          <Route path="/dashboard/factory/faults/new" element={<FaultReportForm />} />
          <Route path="/dashboard/factory/technicians" element={<TechnicianDiscovery />} />
        </Route>
        <Route element={<ProtectedRoute roles={['technician']} />}>
          <Route path="/dashboard/technician" element={<TechnicianDashboard />} />
          <Route path="/dashboard/technician/profile" element={<TechnicianProfile />} />
        </Route>
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => <AuthProvider><AppRoutes /></AuthProvider>;

export default App;
