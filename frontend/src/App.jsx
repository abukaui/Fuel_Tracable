import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import GovDashboard from './pages/GovDashboard';
import OperatorDashboard from './pages/OperatorDashboard';
import StationDetail from './pages/StationDetail';
import ReconciliationDetail from './pages/ReconciliationDetail';
import Complaints from './pages/Complaints';
import AuditLogs from './pages/AuditLogs';
import Reconciliations from './pages/Reconciliations';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* Gov / Admin routes */}
      <Route element={<ProtectedRoute allowedRoles={['GOV_REGULATOR', 'ADMIN']} />}>
        <Route path="/stations" element={<GovDashboard />} />
        <Route path="/stations/:id" element={<StationDetail />} />
        <Route path="/reconciliations" element={<Reconciliations />} />
        <Route path="/reconciliations/:id" element={<ReconciliationDetail />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
      </Route>

      {/* Station Operator routes */}
      <Route element={<ProtectedRoute allowedRoles={['STATION_OPERATOR']} />}>
        <Route path="/operator" element={<OperatorDashboard />} />
      </Route>

      {/* All authenticated users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
