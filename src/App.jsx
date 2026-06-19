import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChartsPage } from './pages/ChartsPage';
import { ProductsPage } from './pages/ProductsPage';
import { MasterDetailPage, ComplexFormPage } from './pages/FormPages';
import { PrintableReportPage } from './pages/PrintableReportPage';
import { RemitosPage } from './pages/RemitosPage';
import { RemitosListPage } from './pages/RemitosListPage';
import { RemitoDetailPage } from './pages/RemitoDetailPage';
import { PageLoader } from './components/ui';
import './index.css';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  return children;
};

const Placeholder = ({ title }) => (
  <div>
    <div className="page-header"><div className="page-title">{title}</div></div>
    <div className="card">
      <div className="card-body" style={{ padding: 60, textAlign: 'center', color: 'var(--gray-400)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-600)' }}>{title}</div>
        <div style={{ marginTop: 8 }}>Esta página está pendiente de implementación.</div>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<LoginPage />} />
            <Route path="/*" element={
              <PrivateRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/"                    element={<DashboardPage />} />
                    <Route path="/remitos/nuevo"       element={<RemitosPage />} />
                    <Route path="/remitos/consulta"    element={<RemitosListPage />} />
                    <Route path="/remitos/:id"         element={<RemitoDetailPage />} />
                    <Route path="/charts"              element={<ChartsPage />} />
                    <Route path="/products"            element={<ProductsPage />} />
                    <Route path="/orders"              element={<Placeholder title="Pedidos" />} />
                    <Route path="/customers"           element={<Placeholder title="Clientes" />} />
                    <Route path="/users"               element={<Placeholder title="Usuarios" />} />
                    <Route path="/forms/master-detail" element={<MasterDetailPage />} />
                    <Route path="/forms/complex"       element={<ComplexFormPage />} />
                    <Route path="/reports/grid"        element={<Placeholder title="Grilla de Datos" />} />
                    <Route path="/reports/builder"     element={<Placeholder title="Generador de Reportes" />} />
                    <Route path="/reports/printable"   element={<PrintableReportPage />} />
                    <Route path="/settings"            element={<Placeholder title="Configuración" />} />
                    <Route path="/settings/profile"    element={<ComplexFormPage />} />
                    <Route path="*"                    element={<Placeholder title="404 – Página no encontrada" />} />
                  </Routes>
                </AppLayout>
              </PrivateRoute>
            } />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
