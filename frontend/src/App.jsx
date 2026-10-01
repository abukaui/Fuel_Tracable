import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import GovDashboard from './pages/GovDashboard';
import OperatorDashboard from './pages/OperatorDashboard';
import StationDetail from './pages/StationDetail';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Gov / Admin routes */}
      <Route element={<ProtectedRoute allowedRoles={['GOV_REGULATOR', 'ADMIN']} />}>
        <Route path="/stations" element={<GovDashboard />} />
        <Route path="/stations/:id" element={<StationDetail />} />
      </Route>

      {/* Station Operator routes */}
      <Route element={<ProtectedRoute allowedRoles={['STATION_OPERATOR']} />}>
        <Route path="/operator" element={<OperatorDashboard />} />
      </Route>

      {/* Catch-all for drivers or unhandled paths (protected route handles role rejections) */}
      <Route element={<ProtectedRoute />}>
        <Route path="*" element={<Navigate to="/stations" replace />} />
      </Route>
    </Routes>
  );
}
