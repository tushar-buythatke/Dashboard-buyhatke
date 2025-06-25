import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FilterProvider } from '@/context/FilterContext';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Analytics } from '@/pages/Analytics';
import { CampaignList } from '@/components/campaigns/CampaignList';
import { CampaignForm } from '@/components/campaigns/CampaignForm';
import { AdList } from '@/components/ads/AdList';
import { AdForm } from '@/components/ads/AdForm';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <FilterProvider>
      <Router>
        <div className="min-h-screen bg-slate-50">
          <Routes>
            <Route path="/" element={<Layout />}>
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
    </FilterProvider>
  );
}

export default App;