'use client';

import { useEffect, useState } from 'react';
import { useAppStore, initializeStore } from '@/lib/store';
import LoginPage from '@/components/app/login-page';
import { Sidebar, Header } from '@/components/app/sidebar';
import DashboardPage from '@/components/dashboard/dashboard-page';
import CustomerPage from '@/components/customers/customer-page';
import InvoicePage from '@/components/invoices/invoice-page';
import ExpensePage from '@/components/expenses/expense-page';
import ReportPage from '@/components/reports/report-page';
import SettingsPage from '@/components/settings/settings-page';
import { AnimatePresence, motion } from 'framer-motion';

export default function Home() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const activePage = useAppStore((s) => s.activePage);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initializeStore();
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 animate-pulse" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'customers':
        return <CustomerPage />;
      case 'invoices':
        return <InvoicePage />;
      case 'expenses':
        return <ExpensePage />;
      case 'reports':
        return <ReportPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 bg-muted/30">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
