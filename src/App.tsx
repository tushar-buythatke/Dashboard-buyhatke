import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FilterProvider } from '@/context/FilterContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AccentProvider } from '@/context/AccentContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/context/PermissionsContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { EnvironmentProvider } from '@/context/EnvironmentContext';
import { PermissionsProvider } from '@/context/PermissionsContext';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import Analytics from '@/pages/Analytics';
import { SlotManagement } from '@/pages/SlotManagement';
import { AdminPanel } from '@/pages/AdminPanel';
import { CampaignList } from '@/components/campaigns/CampaignList';
import { CampaignForm } from '@/components/campaigns/CampaignForm';
import { AdList } from '@/components/ads/AdList';
import { AdForm } from '@/components/ads/AdForm';
import { AdDetail } from '@/components/ads/AdDetail';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import AuthLogin from '@/pages/AuthLogin';
import OffersConfig from '@/pages/OffersConfig';
import StyleGuide from '@/pages/StyleGuide';

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--h-canvas)]">
        <div className="halo-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const { isAdmin } = usePermissions();
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function EditorRoute({ children }: { children: JSX.Element }) {
  const { canEdit } = usePermissions();
  if (!canEdit) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="relative min-h-screen w-full overflow-x-hidden">
        <Routes>
          <Route path="/login" element={<AuthLogin />} />
          <Route path="/style" element={<StyleGuide />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="campaigns">
              <Route index element={<CampaignList />} />
              <Route path="new" element={<CampaignForm />} />
              <Route path=":campaignId">
                <Route index element={<Navigate to="ads" replace />} />
                <Route path="edit" element={<CampaignForm />} />
                <Route path="ads">
                  <Route index element={<AdList />} />
                  <Route path="new" element={<AdForm />} />
                  <Route path=":adId" element={<AdDetail />} />
                  <Route path=":adId/edit" element={<AdForm />} />
                </Route>
              </Route>
            </Route>
            <Route path="analytics" element={<Analytics />} />
            <Route path="slot-management" element={<SlotManagement />} />
            <Route path="offers-config" element={<EditorRoute><OffersConfig /></EditorRoute>} />
            <Route path="admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </div>
      <Toaster />
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AccentProvider>
      <EnvironmentProvider>
        <AuthProvider>
          <PermissionsProvider>
            <NotificationProvider>
              <FilterProvider>
                <TooltipProvider delayDuration={200}>
                  <AppRoutes />
                </TooltipProvider>
              </FilterProvider>
            </NotificationProvider>
          </PermissionsProvider>
        </AuthProvider>
      </EnvironmentProvider>
      </AccentProvider>
    </ThemeProvider>
  );
}

export default App;