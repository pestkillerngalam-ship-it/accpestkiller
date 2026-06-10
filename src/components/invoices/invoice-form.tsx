'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Customer { id: string; companyName: string; }

interface InvoiceItemRow {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface FormState {
  customerId: string;
  issueDate: string;
  dueDate: string;
  status: string;
  taxType: string;
  discount: number;
  notes: string;
  items: InvoiceItemRow[];
}

const emptyItem = (): InvoiceItemRow => ({
  id: crypto.randomUUID(),
  description: '',
  qty: 1,
  unitPrice: 0,
  total: 0,
});

const emptyForm: FormState = {
  customerId: '',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  status: 'draft',
  taxType: 'none',
  discount: 0,
  notes: '',
  items: [emptyItem()],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId: string | null;
  customers: Customer[];
  onSave: () => void;
  token: string | null;
}

export default function InvoiceForm({ open, onOpenChange, editId, customers, onSave, token }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (editId) {
        fetchInvoice();
      } else {
        setForm(emptyForm);
      }
    }
  }, [open, editId]);

  const fetchInvoice = async () => {
    if (!editId) return;
    try {
      const res = await fetch(`/api/invoices/${editId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setForm({
          customerId: data.customerId,
          issueDate: data.issueDate?.split('T')[0] || '',
          dueDate: data.dueDate?.split('T')[0] || '',
          status: data.status,
          taxType: data.taxType,
          discount: data.discount,
          notes: data.notes,
          items: data.items?.length > 0
            ? data.items.map((i: { id: string; description: string; qty: number; unitPrice: number; total: number }) => ({
                id: i.id,
                description: i.description,
                qty: i.qty,
                unitPrice: i.unitPrice,
                total: i.total,
              }))
            : [emptyItem()],
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateItem = (idx: number, field: keyof InvoiceItemRow, value: string | number) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[idx], [field]: value };
      if (field === 'qty' || field === 'unitPrice') {
        item.total = Number(item.qty) * Number(item.unitPrice);
      }
      items[idx] = item;
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeItem = (idx: number) => {
    if (form.items.length <= 1) return;
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const subtotal = form.items.reduce((s, i) => s + i.total, 0);
  const taxRate = form.taxType === 'ppn12' ? 0.12 : form.taxType === 'dpp_other' ? 0.11 : 0;
  const dpp = form.taxType !== 'none' ? subtotal / (1 + taxRate) : subtotal;
  const taxAmount = form.taxType !== 'none' ? dpp * taxRate : 0;
  const total = dpp + taxAmount - form.discount;

  const handleSubmit = async () => {
    if (!form.customerId) {
      toast.error('Pilih pelanggan terlebih dahulu');
      return;
    }
    if (form.items.some((i) => !i.description)) {
      toast.error('Isi deskripsi semua item');
      return;
    }
    setLoading(true);
    try {
      const url = editId ? `/api/invoices/${editId}` : '/api/invoices';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          subtotal,
          taxAmount,
          total,
          invoiceNumber: editId ? undefined : '', // server generates
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editId ? 'Invoice berhasil diperbarui' : 'Invoice berhasil dibuat');
      onSave();
    } catch {
      toast.error('Gagal menyimpan invoice');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? 'Edit Invoice' : 'Buat Invoice Baru'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Pelanggan</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pelanggan" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tanggal Invoice</Label>
              <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Jatuh Tempo</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="unpaid">Belum Lunas</SelectItem>
                  <SelectItem value="paid">Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pajak</Label>
              <Select value={form.taxType} onValueChange={(v) => setForm({ ...form, taxType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa Pajak</SelectItem>
                  <SelectItem value="ppn12">PPN 12% (DPP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="font-semibold">Item</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" /> Tambah Item
              </Button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-5">
                    {idx === 0 && <p className="text-xs text-muted-foreground mb-1">Deskripsi</p>}
                    <Input
                      placeholder="Deskripsi layanan"
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    {idx === 0 && <p className="text-xs text-muted-foreground mb-1">Qty</p>}
                    <Input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    {idx === 0 && <p className="text-xs text-muted-foreground mb-1">Harga Satuan</p>}
                    <Input
                      type="number"
                      value={item.unitPrice || ''}
                      onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    {idx === 0 && <p className="text-xs text-muted-foreground mb-1">Total</p>}
                    <Input value={fmt(item.total)} readOnly className="bg-muted" />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-red-600"
                      onClick={() => removeItem(idx)}
                      disabled={form.items.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>Rp {fmt(subtotal)}</span>
            </div>
            {form.taxType !== 'none' && (
              <>
                <div className="flex justify-between text-sm">
                  <span>DPP ({form.taxType === 'ppn12' ? 'PPN 12%' : 'Lainnya'})</span>
                  <span>Rp {fmt(dpp)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pajak</span>
                  <span>Rp {fmt(taxAmount)}</span>
                </div>
              </>
            )}
            {form.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Diskon</span>
                <span>- Rp {fmt(form.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span>
              <span className="text-emerald-600">Rp {fmt(total)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Diskon (Rp)</Label>
            <Input
              type="number"
              value={form.discount || ''}
              onChange={(e) => setForm({ ...form, discount: Number(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button
              onClick={handleSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
