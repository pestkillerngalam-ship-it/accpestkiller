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

interface KPIs {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  totalReceivable: number;
  activeCustomers: number;
  invoiceCountThisMonth: number;
  incomeThisMonth: number;
  expenseThisMonth: number;
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

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const token = useAppStore((s) => s.token);
  const setActivePage = useAppStore((s) => s.setActivePage);

  useEffect(() => {
    fetchReports();
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

  const kpiCards = kpis
    ? [
        {
          title: 'Total Pendapatan',
          value: formatCurrency(kpis.totalIncome),
          icon: <TrendingUp className="w-5 h-5" />,
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-950/50',
          page: 'reports' as const,
        },
        {
          title: 'Total Pengeluaran',
          value: formatCurrency(kpis.totalExpense),
          icon: <TrendingDown className="w-5 h-5" />,
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-950/50',
          page: 'expenses' as const,
        },
        {
          title: 'Laba Bersih',
          value: formatCurrency(kpis.netProfit),
          icon: <DollarSign className="w-5 h-5" />,
          color: kpis.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
          bg: kpis.netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/50' : 'bg-red-50 dark:bg-red-950/50',
          page: 'reports' as const,
        },
        {
          title: 'Saldo Kas/Bank',
          value: formatCurrency(kpis.totalIncome - kpis.totalExpense),
          icon: <Wallet className="w-5 h-5" />,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-950/50',
          page: 'reports' as const,
        },
        {
          title: 'Total Piutang',
          value: formatCurrency(kpis.totalReceivable),
          icon: <ArrowUpRight className="w-5 h-5" />,
          color: 'text-orange-600 dark:text-orange-400',
          bg: 'bg-orange-50 dark:bg-orange-950/50',
          page: 'invoices' as const,
        },
        {
          title: 'Pelanggan Aktif',
          value: kpis.activeCustomers.toString(),
          icon: <Users className="w-5 h-5" />,
          color: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-50 dark:bg-purple-950/50',
          page: 'customers' as const,
        },
        {
          title: 'Invoice Bulan Ini',
          value: kpis.invoiceCountThisMonth.toString(),
          icon: <FileText className="w-5 h-5" />,
          color: 'text-teal-600 dark:text-teal-400',
          bg: 'bg-teal-50 dark:bg-teal-950/50',
          page: 'invoices' as const,
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <motion.div key={i} variants={item}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow duration-300 border-0 shadow-sm"
              onClick={() => setActivePage(card.page)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${card.bg}`}>
                    <span className={card.color}>{card.icon}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
                <p className="text-xl font-bold mt-1">{card.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

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
