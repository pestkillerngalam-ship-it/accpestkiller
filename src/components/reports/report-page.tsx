'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Printer, Download } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { formatCurrency } from '@/lib/invoice-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface ReportData {
  kpis: {
    totalIncome: number;
    allIncome: number;
    totalExpense: number;
    netProfit: number;
    cashBalance: number;
    neracaCash: number;
    initialBalance: number;
    initialCapital: number;
    totalReceivable: number;
    activeCustomers: number;
    incomeThisMonth: number;
    expenseThisMonth: number;
    prevIncome: number;
    prevExpense: number;
  };
  monthlyData: { month: string; income: number; expense: number; profit: number }[];
  expenseByCategory: { category: string; total: number }[];
  receivableByCustomer: { customerName: string; total: number; invoiceCount: number }[];
}

const PIE_COLORS = ['#3b82f6', '#f97316', '#a855f7', '#10b981', '#6b7280'];
const categoryLabels: Record<string, string> = {
  operasional: 'Operasional',
  bbm: 'BBM',
  pestisida: 'Pestisida',
  gaji: 'Gaji',
  pajak: 'Pajak',
  lainnya: 'Lainnya',
};

export default function ReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlyTaxInvoice, setOnlyTaxInvoice] = useState(false);
  const token = useAppStore((s) => s.token);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = (filename: string, rows: string[][]) => {
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('File CSV berhasil diunduh');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !data) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const incomeData = data.monthlyData;
  const expenseByCategoryData = data.expenseByCategory.map((e) => ({
    ...e,
    label: categoryLabels[e.category] || e.category,
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 space-y-4">
      <Tabs defaultValue="pendapatan">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="pendapatan" className="text-xs sm:text-sm">Pendapatan</TabsTrigger>
          <TabsTrigger value="pengeluaran" className="text-xs sm:text-sm">Pengeluaran</TabsTrigger>
          <TabsTrigger value="laba-rugi" className="text-xs sm:text-sm">Laba Rugi</TabsTrigger>
          <TabsTrigger value="piutang" className="text-xs sm:text-sm">Piutang</TabsTrigger>
          <TabsTrigger value="neraca" className="text-xs sm:text-sm">Neraca</TabsTrigger>
        </TabsList>

        {/* Pendapatan */}
        <TabsContent value="pendapatan" className="mt-4 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">Laporan Pendapatan</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch id="taxOnly" checked={onlyTaxInvoice} onCheckedChange={setOnlyTaxInvoice} />
                    <Label htmlFor="taxOnly" className="text-xs">Hanya Faktur Pajak</Label>
                  </div>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-1" /> Cetak
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    exportCSV('pendapatan', [
                      ['Bulan', 'Pendapatan'],
                      ...incomeData.map((d) => [d.month, d.income.toString()]),
                    ]);
                  }}>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Total Pendapatan</p>
                  <p className="text-xl font-bold text-emerald-700">{formatCurrency(data.kpis.totalIncome)}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Pendapatan Bulan Ini</p>
                  <p className="text-xl font-bold text-emerald-700">{formatCurrency(data.kpis.incomeThisMonth)}</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="income" name="Pendapatan" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pengeluaran */}
        <TabsContent value="pengeluaran" className="mt-4 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">Laporan Pengeluaran</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-1" /> Cetak
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    exportCSV('pengeluaran', [
                      ['Kategori', 'Total'],
                      ...expenseByCategoryData.map((d) => [d.label, d.total.toString()]),
                    ]);
                  }}>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div className="bg-red-50 dark:bg-red-950/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Total Pengeluaran</p>
                  <p className="text-xl font-bold text-red-700">{formatCurrency(data.kpis.totalExpense)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Pengeluaran Bulan Ini</p>
                  <p className="text-xl font-bold text-red-700">{formatCurrency(data.kpis.expenseThisMonth)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseByCategoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                      <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} width={80} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="total" name="Total" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseByCategoryData.filter((d) => d.total > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        dataKey="total"
                        nameKey="label"
                        label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                      >
                        {expenseByCategoryData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Laba Rugi */}
        <TabsContent value="laba-rugi" className="mt-4 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">Laporan Laba Rugi</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-1" /> Cetak
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    exportCSV('laba-rugi', [
                      ['Bulan', 'Pendapatan', 'Pengeluaran', 'Laba/Rugi'],
                      ...incomeData.map((d) => [d.month, d.income.toString(), d.expense.toString(), d.profit.toString()]),
                    ]);
                  }}>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Pendapatan</p>
                  <p className="text-lg font-bold text-emerald-700">{formatCurrency(data.kpis.totalIncome)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Pengeluaran</p>
                  <p className="text-lg font-bold text-red-700">{formatCurrency(data.kpis.totalExpense)}</p>
                </div>
                <div className={`rounded-lg p-4 ${data.kpis.netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/50' : 'bg-red-50 dark:bg-red-950/50'}`}>
                  <p className="text-xs text-muted-foreground">Laba Bersih</p>
                  <p className={`text-lg font-bold ${data.kpis.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatCurrency(data.kpis.netProfit)}
                  </p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="income" name="Pendapatan" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Laba/Rugi" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Piutang */}
        <TabsContent value="piutang" className="mt-4 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">Laporan Piutang</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-1" /> Cetak
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    exportCSV('piutang', [
                      ['Pelanggan', 'Jumlah', 'Jumlah Invoice'],
                      ...data.receivableByCustomer.map((d) => [d.customerName, d.total.toString(), d.invoiceCount.toString()]),
                    ]);
                  }}>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="bg-orange-50 dark:bg-orange-950/50 rounded-lg p-4 inline-block">
                  <p className="text-xs text-muted-foreground">Total Piutang</p>
                  <p className="text-xl font-bold text-orange-700">{formatCurrency(data.kpis.totalReceivable)}</p>
                </div>
              </div>
              {data.receivableByCustomer.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>Tidak ada piutang</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pelanggan</TableHead>
                      <TableHead className="text-right">Jumlah Invoice</TableHead>
                      <TableHead className="text-right">Total Piutang</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.receivableByCustomer.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.customerName}</TableCell>
                        <TableCell className="text-right">{row.invoiceCount}</TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatCurrency(row.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Neraca */}
        <TabsContent value="neraca" className="mt-4 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">Neraca (Balance Sheet)</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-1" /> Cetak
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const kasBank = data.kpis.neracaCash || 0;
                    const piutang = data.kpis.totalReceivable;
                    const totalAset = kasBank + piutang;
                    const modalAwal = data.kpis.initialCapital || 0;
                    const labaBerjalan = (data.kpis.allIncome || 0) - data.kpis.totalExpense;
                    const totalModal = modalAwal + labaBerjalan;
                    const selisih = totalAset - totalModal;
                    exportCSV('neraca', [
                      ['Aset', 'Jumlah'],
                      ['Kas & Bank', kasBank.toString()],
                      ['Piutang Usaha', piutang.toString()],
                      ['Total Aset', totalAset.toString()],
                      ['', ''],
                      ['Modal', 'Jumlah'],
                      ['Modal Awal', modalAwal.toString()],
                      ['Laba/(Rugi) Berjalan', labaBerjalan.toString()],
                      ['Total Modal', totalModal.toString()],
                      ['', ''],
                      ['Selisih', selisih.toString()],
                    ]);
                  }}>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                // Neraca (Balance Sheet) — Accrual basis
                // Kas & Bank = Modal Awal + Pendapatan Lunas - Pengeluaran
                const kasBank = data.kpis.neracaCash || 0;
                const piutang = data.kpis.totalReceivable;
                const totalAset = kasBank + piutang;
                // Laba Berjalan = Semua Pendapatan (lunas + belum) - Pengeluaran
                const modalAwal = data.kpis.initialCapital || 0;
                const labaBerjalan = (data.kpis.allIncome || 0) - data.kpis.totalExpense;
                const totalModal = modalAwal + labaBerjalan;
                const selisih = totalAset - totalModal;
                const isBalanced = Math.abs(selisih) < 1; // Handle floating point
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold text-base mb-3 text-emerald-700 border-b pb-2">ASET</h3>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-muted-foreground">Kas & Bank</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(kasBank)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-muted-foreground">Piutang Usaha</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(piutang)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="font-bold bg-emerald-50 dark:bg-emerald-950/30">
                            <TableCell>Total Aset</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(totalAset)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    <div>
                      <h3 className="font-bold text-base mb-3 text-emerald-700 border-b pb-2">MODAL</h3>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-muted-foreground">Modal Awal</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(modalAwal)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-muted-foreground">Laba/(Rugi) Berjalan</TableCell>
                            <TableCell className={`text-right font-medium ${labaBerjalan >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {formatCurrency(labaBerjalan)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="font-bold bg-emerald-50 dark:bg-emerald-950/30">
                            <TableCell>Total Modal</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(totalModal)}
                            </TableCell>
                          </TableRow>
                          {isBalanced && (
                            <TableRow className="bg-emerald-50 dark:bg-emerald-950/30">
                              <TableCell className="text-emerald-700 dark:text-emerald-400 font-medium" colSpan={2}>
                                ✓ Neraca Seimbang (Aset = Modal)
                              </TableCell>
                            </TableRow>
                          )}
                          {!isBalanced && selisih !== 0 && (
                            <TableRow className="bg-amber-50 dark:bg-amber-950/30">
                              <TableCell className="text-amber-700 dark:text-amber-400 font-medium">Selisih (Aset - Modal)</TableCell>
                              <TableCell className={`text-right font-medium ${selisih > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                                {formatCurrency(selisih)}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
