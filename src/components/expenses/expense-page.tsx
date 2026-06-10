'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Plus, Pencil, Trash2, Receipt } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { formatCurrency, formatDateShort } from '@/lib/invoice-utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Expense {
  id: string;
  category: string;
  date: string;
  description: string;
  amount: number;
  notes: string;
}

const categories = [
  { value: 'operasional', label: 'Operasional' },
  { value: 'bbm', label: 'BBM' },
  { value: 'pestisida', label: 'Pestisida' },
  { value: 'gaji', label: 'Gaji' },
  { value: 'lainnya', label: 'Lainnya' },
];

const categoryColors: Record<string, string> = {
  operasional: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  bbm: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  pestisida: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  gaji: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  lainnya: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const emptyExpense = {
  category: 'operasional',
  date: new Date().toISOString().split('T')[0],
  description: '',
  amount: 0,
  notes: '',
};

export default function ExpensePage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyExpense);
  const token = useAppStore((s) => s.token);

  useEffect(() => {
    fetchExpenses();
  }, [search, categoryFilter]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await fetch(`/api/expenses?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const filtered = search
          ? data.filter((e: Expense) =>
              e.description.toLowerCase().includes(search.toLowerCase())
            )
          : data;
        setExpenses(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(emptyExpense);
    setEditId(null);
    setDialogOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setForm({
      category: expense.category,
      date: expense.date?.split('T')[0] || '',
      description: expense.description,
      amount: expense.amount,
      notes: expense.notes,
    });
    setEditId(expense.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editId ? `/api/expenses/${editId}` : '/api/expenses';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(editId ? 'Pengeluaran berhasil diperbarui' : 'Pengeluaran berhasil ditambahkan');
      setDialogOpen(false);
      fetchExpenses();
    } catch {
      toast.error('Gagal menyimpan pengeluaran');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/expenses/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Pengeluaran berhasil dihapus');
      setDeleteOpen(false);
      fetchExpenses();
    } catch {
      toast.error('Gagal menghapus pengeluaran');
    }
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              Daftar Pengeluaran
              <Badge variant="outline" className="ml-1">{expenses.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari pengeluaran..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4 mr-1" /> Tambah
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada pengeluaran</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead className="w-20">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {expenses.map((e) => (
                        <motion.tr
                          key={e.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell className="text-sm">{formatDateShort(e.date)}</TableCell>
                          <TableCell>{e.description}</TableCell>
                          <TableCell>
                            <Badge className={categoryColors[e.category] || ''}>
                              {categories.find((c) => c.value === e.category)?.label || e.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            -{formatCurrency(e.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => { setDeleteId(e.id); setDeleteOpen(true); }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                  <p className="text-xl font-bold text-red-600">-{formatCurrency(totalExpenses)}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi pengeluaran" />
            </div>
            <div className="space-y-2">
              <Label>Jumlah (Rp)</Label>
              <Input type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengeluaran?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
