import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { ProductsPage } from './pages/Products';
import { SalesPage } from './pages/Sales';
import { InvoicesPage } from './pages/Invoices';
import { ReportsPage } from './pages/Reports';
import { SettingsPage } from './pages/Settings';

function AppContent() {
  const { currentUser } = useApp();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!currentUser) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'products': return <ProductsPage />;
      case 'sales': return <SalesPage />;
      case 'invoices': return <InvoicesPage />;
      case 'reports': return <ReportsPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
