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
import { Search, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Customer {
  id: string;
  companyName: string;
  pic: string;
  whatsapp: string;
  email: string;
  address: string;
  npwp: string;
  serviceFrequency: string;
  monthlyContract: number;
  status: string;
  notes: string;
  _count?: { invoices: number };
}

const emptyCustomer = {
  companyName: '',
  pic: '',
  whatsapp: '',
  email: '',
  address: '',
  npwp: '',
  serviceFrequency: '',
  monthlyContract: 0,
  status: 'active',
  notes: '',
};

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCustomer);
  const token = useAppStore((s) => s.token);

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/customers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCustomers(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(emptyCustomer);
    setEditId(null);
    setDialogOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setForm({
      companyName: customer.companyName,
      pic: customer.pic,
      whatsapp: customer.whatsapp,
      email: customer.email,
      address: customer.address,
      npwp: customer.npwp,
      serviceFrequency: customer.serviceFrequency,
      monthlyContract: customer.monthlyContract,
      status: customer.status,
      notes: customer.notes,
    });
    setEditId(customer.id);
    setDialogOpen(true);
  };

  const openDelete = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editId ? `/api/customers/${editId}` : '/api/customers';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Gagal menyimpan');
      toast.success(editId ? 'Pelanggan berhasil diperbarui' : 'Pelanggan berhasil ditambahkan');
      setDialogOpen(false);
      fetchCustomers();
    } catch (err) {
      toast.error('Gagal menyimpan pelanggan');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/customers/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      toast.success('Pelanggan berhasil dihapus');
      setDeleteOpen(false);
      fetchCustomers();
    } catch (err) {
      toast.error('Gagal menghapus pelanggan');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Daftar Pelanggan ({customers.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari pelanggan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
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
          ) : customers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada pelanggan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Perusahaan</TableHead>
                    <TableHead>PIC</TableHead>
                    <TableHead className="hidden md:table-cell">WhatsApp</TableHead>
                    <TableHead className="hidden lg:table-cell">Kontrak/Bulan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Invoice</TableHead>
                    <TableHead className="w-20">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {customers.map((c) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">{c.companyName}</TableCell>
                        <TableCell>{c.pic}</TableCell>
                        <TableCell className="hidden md:table-cell">{c.whatsapp || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {c.monthlyContract > 0 ? `Rp ${c.monthlyContract.toLocaleString('id-ID')}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={c.status === 'active' ? 'default' : 'secondary'}
                            className={c.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : ''}
                          >
                            {c.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{c._count?.invoices || 0}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => openDelete(c.id)}>
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
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nama Perusahaan</Label>
                <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>PIC</Label>
                <Input value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Alamat</Label>
                <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>NPWP</Label>
                <Input value={form.npwp} onChange={(e) => setForm({ ...form, npwp: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Frekuensi Layanan</Label>
                <Input
                  value={form.serviceFrequency}
                  onChange={(e) => setForm({ ...form, serviceFrequency: e.target.value })}
                  placeholder="Mingguan/Bulanan"
                />
              </div>
              <div className="space-y-2">
                <Label>Kontrak Bulanan (Rp)</Label>
                <Input
                  type="number"
                  value={form.monthlyContract || ''}
                  onChange={(e) => setForm({ ...form, monthlyContract: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Tidak Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Catatan</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pelanggan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Semua data pelanggan akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
