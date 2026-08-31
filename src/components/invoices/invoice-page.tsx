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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Eye, Pencil, Trash2, Download, FileText } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { formatCurrency, formatDateShort } from '@/lib/invoice-utils';
import { Skeleton } from '@/components/ui/skeleton';
import InvoiceForm from './invoice-form';
import InvoiceDetail from './invoice-detail';

interface InvoiceItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: { id: string; companyName: string; pic: string; address: string; npwp: string; whatsapp: string; email: string };
  issueDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  taxType: string;
  taxAmount: number;
  discount: number;
  total: number;
  notes: string;
  taxInvoiceNumber: string;
  taxInvoiceDate: string | null;
  taxInvoiceStatus: string;
  taxInvoiceImage: string;
  items: InvoiceItem[];
}

interface Customer {
  id: string;
  companyName: string;
}

export default function InvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const token = useAppStore((s) => s.token);

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
  }, [search, statusFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/invoices?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setInvoices(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCustomers(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    setEditId(id);
    setFormOpen(true);
  };

  const openDetail = (id: string) => {
    setViewId(id);
    setDetailOpen(true);
  };

  const handleDuplicate = (invoice: Invoice) => {
    setEditId(invoice.id);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus invoice ini?')) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Invoice berhasil dihapus');
      fetchInvoices();
    } catch {
      toast.error('Gagal menghapus invoice');
    }
  };

  const downloadInvoicePDF = async (id: string, invoiceNumber?: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoiceNumber || id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success('Download dimulai');
        return;
      }
      console.warn('PDF endpoint returned non-OK, falling back to HTML');
    } catch (err) {
      console.warn('PDF generation failed, will fallback to HTML', err);
    }

    // Fallback: open a new tab first (to reduce popup blocking), then load HTML and print
    try {
      const win = window.open('', '_blank', 'noopener,noreferrer');
      if (!win) {
        toast.error('Tidak bisa membuka jendela baru (pop-up diblokir)');
        return;
      }
      win.document.title = invoiceNumber ? `Invoice ${invoiceNumber}` : 'Invoice';

      const resHtml = await fetch(`/api/invoices/${id}/pdf-html`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resHtml.ok) {
        win.document.body.innerText = 'Gagal memuat invoice. Silakan coba lagi.';
        toast.error('Gagal memuat fallback HTML');
        return;
      }
      const html = await resHtml.text();
      win.document.open();
      win.document.write(html);
      win.document.close();

      setTimeout(() => {
        try { win.print(); } catch (e) { /* ignore */ }
      }, 500);

      toast.success('Versi cetak invoice terbuka di tab baru');
    } catch (err) {
      console.error('Fallback HTML error', err);
      toast.error('Gagal menyiapkan fallback PDF/HTML');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm('Hapus semua invoice terpilih?')) return;
    try {
      for (const id of selectedIds) {
        await fetch(`/api/invoices/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      }
      toast.success('Invoice terhapus');
      setSelectedIds([]);
      fetchInvoices();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus beberapa invoice');
    }
  };

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline'; className: string }> = {
    draft: { label: 'Draft', variant: 'secondary', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    unpaid: { label: 'Belum Lunas', variant: 'outline', className: 'border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400' },
    paid: { label: 'Lunas', variant: 'default', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              Daftar Invoice ({invoices.length})
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari invoice..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="unpaid">Belum Lunas</SelectItem>
                  <SelectItem value="paid">Lunas</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4 mr-1" /> Buat
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada invoice</p>
            </div>
          ) : (
            <div>
              {selectedIds.length > 0 && (
                <div className="p-2 border-b flex items-center gap-2">
                  <Button onClick={handleBulkDelete} className="bg-red-600 text-white">Hapus ({selectedIds.length})</Button>
                  <Button onClick={async () => {
                    for (const id of selectedIds) {
                      await downloadInvoicePDF(id);
                      await new Promise((r) => setTimeout(r, 400));
                    }
                  }} className="bg-emerald-600 text-white">Download PDF ({selectedIds.length})</Button>
                  <Button variant="outline" onClick={() => { setSelectedIds([]); }}>Batal</Button>
                </div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.length > 0 && selectedIds.length === invoices.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(invoices.map(i => i.id));
                            else setSelectedIds([]);
                          }}
                        />
                      </TableHead>
                      <TableHead>No. Invoice</TableHead>
                      <TableHead>Pelanggan</TableHead>
                      <TableHead className="hidden md:table-cell">Tanggal</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">No. Faktur Pajak</TableHead>
                      <TableHead className="w-28">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {invoices.map((inv) => {
                        const sc = statusConfig[inv.status] || statusConfig.draft;
                        return (
                          <motion.tr
                            key={inv.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <TableCell className="w-12">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(inv.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedIds(prev => [...prev, inv.id]);
                                  else setSelectedIds(prev => prev.filter(x => x !== inv.id));
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium text-sm">{inv.invoiceNumber}</TableCell>
                            <TableCell>{inv.customer?.companyName || '-'}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {formatDateShort(inv.issueDate)}
                            </TableCell>
                            <TableCell className="font-medium">{formatCurrency(inv.total)}</TableCell>
                            <TableCell>
                              <Badge variant={sc.variant} className={sc.className}>
                                {sc.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {inv.taxInvoiceNumber ? (
                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-xs">
                                  {inv.taxInvoiceNumber}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(inv.id)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(inv.id)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadInvoicePDF(inv.id, inv.invoiceNumber)}>
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(inv.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <InvoiceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editId={editId}
        customers={customers}
        onSave={() => { fetchInvoices(); setFormOpen(false); }}
        token={token}
      />

      <InvoiceDetail
        open={detailOpen}
        onOpenChange={setDetailOpen}
        invoiceId={viewId}
        onRefresh={() => fetchInvoices()}
        token={token}
      />
    </motion.div>
  );
}
