import { Routes, Route } from 'react-router-dom';
import AppShell from '@/layouts/AppShell';
import ProtectedRoute from '@/layouts/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import RawMaterialsPage from '@/pages/RawMaterialsPage';
import PackagingPage from '@/pages/PackagingPage';
import FormulasPage from '@/pages/FormulasPage';
import FinishedProductsPage from '@/pages/FinishedProductsPage';
import ProductionPage from '@/pages/ProductionPage';
import SalesPage from '@/pages/SalesPage';
import SettingsPage from '@/pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<SalesPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/raw-materials" element={<RawMaterialsPage />} />
          <Route path="/packaging" element={<PackagingPage />} />
          <Route path="/formulas" element={<FormulasPage />} />
          <Route path="/finished-products" element={<FinishedProductsPage />} />
          <Route path="/production" element={<ProductionPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
