'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAppStore } from '@/lib/store';
import { formatCurrency } from '@/lib/invoice-utils';

interface CompanySettings {
  companyName: string;
  logo: string;
}

interface KPIs {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  cashBalance: number;
  initialBalance: number;
  totalReceivable: number;
  activeCustomers: number;
  invoiceCountThisMonth: number;
  incomeThisMonth: number;
  expenseThisMonth: number;
  prevIncome: number;
  prevExpense: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  profit: number;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-muted-foreground ml-1">—</span>;
  if (previous === 0) return <span className="text-xs text-emerald-600 ml-1">baru</span>;
  const pct = ((current - previous) / previous) * 100;
  const isUp = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ml-1 ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const setActivePage = useAppStore((s) => s.setActivePage);

  useEffect(() => {
    fetchReports();
    fetchSettings();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKpis(data.kpis);
        setMonthlyData(data.monthlyData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSettings(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const kpiCards = kpis
    ? [
        {
          title: 'Total Pendapatan',
          value: formatCurrency(kpis.totalIncome),
          icon: <TrendingUp className="w-5 h-5" />,
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-950/50',
          border: 'border-l-4 border-l-emerald-500',
          page: 'reports' as const,
          trend: <TrendBadge current={kpis.incomeThisMonth} previous={kpis.prevIncome} />,
        },
        {
          title: 'Total Pengeluaran',
          value: formatCurrency(kpis.totalExpense),
          icon: <TrendingDown className="w-5 h-5" />,
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-950/50',
          border: 'border-l-4 border-l-red-500',
          page: 'expenses' as const,
          trend: <TrendBadge current={kpis.expenseThisMonth} previous={kpis.prevExpense} />,
        },
        {
          title: 'Laba Bersih',
          value: formatCurrency(kpis.netProfit),
          icon: <DollarSign className="w-5 h-5" />,
          color: kpis.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
          bg: kpis.netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/50' : 'bg-red-50 dark:bg-red-950/50',
          border: kpis.netProfit >= 0 ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500',
          page: 'reports' as const,
          trend: null,
        },
        {
          title: 'Saldo Kas/Bank',
          value: formatCurrency(kpis.cashBalance),
          subtitle: `Saldo awal: ${formatCurrency(kpis.initialBalance)}`,
          icon: <Wallet className="w-5 h-5" />,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-950/50',
          border: 'border-l-4 border-l-blue-500',
          page: 'reports' as const,
          prominent: true,
          trend: null,
        },
        {
          title: 'Total Piutang',
          value: formatCurrency(kpis.totalReceivable),
          icon: <ArrowUpRight className="w-5 h-5" />,
          color: 'text-orange-600 dark:text-orange-400',
          bg: 'bg-orange-50 dark:bg-orange-950/50',
          border: 'border-l-4 border-l-orange-500',
          page: 'invoices' as const,
          trend: null,
        },
        {
          title: 'Pelanggan Aktif',
          value: kpis.activeCustomers.toString(),
          icon: <Users className="w-5 h-5" />,
          color: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-50 dark:bg-purple-950/50',
          border: 'border-l-4 border-l-purple-500',
          page: 'customers' as const,
          trend: null,
        },
        {
          title: 'Invoice Bulan Ini',
          value: kpis.invoiceCountThisMonth.toString(),
          icon: <FileText className="w-5 h-5" />,
          color: 'text-teal-600 dark:text-teal-400',
          bg: 'bg-teal-50 dark:bg-teal-950/50',
          border: 'border-l-4 border-l-teal-500',
          page: 'invoices' as const,
          trend: null,
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-4 lg:p-6 space-y-6">
      {/* Welcome Banner */}
      <motion.div
        variants={item}
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-800 dark:to-emerald-900 p-5 lg:p-6 text-white"
      >
        <div className="flex items-center gap-4">
          {settings?.logo ? (
            <img src={settings.logo} alt="Logo" className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl object-cover bg-white/20 backdrop-blur-sm p-1 shrink-0" />
          ) : (
            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Wallet className="w-7 h-7 lg:w-8 lg:h-8" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg lg:text-xl font-bold">
              {settings?.companyName || 'PT Pest Killer Ngalam'}
            </h1>
            <p className="text-emerald-100 text-sm mt-0.5">
              Selamat datang, {user?.name || 'Pengguna'}! Berikut ringkasan keuangan Anda.
            </p>
          </div>
        </div>
        <div className="absolute top-2 right-2 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 right-16 w-20 h-20 bg-white/5 rounded-full translate-y-6" />
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <motion.div key={i} variants={item} className={card.prominent ? 'sm:col-span-2 lg:col-span-1' : ''}>
            <Card
              className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-0 shadow-sm ${card.border || ''}`}
              onClick={() => setActivePage(card.page)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${card.bg}`}>
                    <span className={card.color}>{card.icon}</span>
                  </div>
                  {card.trend}
                </div>
                <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
                <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pendapatan vs Pengeluaran (6 Bulan Terakhir)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Pendapatan" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}