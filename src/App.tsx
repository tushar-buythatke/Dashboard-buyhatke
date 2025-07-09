import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FilterProvider } from '@/context/FilterContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import Analytics from '@/pages/Analytics';
import { CampaignList } from '@/components/campaigns/CampaignList';
import { CampaignForm } from '@/components/campaigns/CampaignForm';
import { AdList } from '@/components/ads/AdList';
import { AdForm } from '@/components/ads/AdForm';
import { AdDetail } from '@/components/ads/AdDetail';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

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
      <div className="min-h-screen w-full bg-slate-50 dark:bg-gray-900 transition-colors duration-200" style={{ minHeight: '100vh', width: '100vw' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <FilterProvider>
            <AppRoutes />
          </FilterProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;