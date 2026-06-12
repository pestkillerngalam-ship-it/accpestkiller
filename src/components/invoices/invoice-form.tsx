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
import { Plus, Trash2, Upload, X, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getDefaultDueDate, getDefaultDescription, roundToNearestThousand, formatCurrency } from '@/lib/invoice-utils';

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
  // Faktur Pajak fields
  taxInvoiceNumber: string;
  taxInvoiceDate: string;
  taxInvoiceImage: string;
}

const emptyItem = (): InvoiceItemRow => ({
  id: crypto.randomUUID(),
  description: getDefaultDescription(),
  qty: 1,
  unitPrice: 0,
  total: 0,
});

const getEmptyForm = (): FormState => {
  const today = new Date().toISOString().split('T')[0];
  return {
    customerId: '',
    issueDate: today,
    dueDate: getDefaultDueDate(today),
    status: 'unpaid',
    taxType: 'ppn12',
    discount: 0,
    notes: '',
    items: [emptyItem()],
    taxInvoiceNumber: '',
    taxInvoiceDate: today,
    taxInvoiceImage: '',
  };
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
  const [form, setForm] = useState<FormState>(getEmptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (editId) {
        fetchInvoice();
      } else {
        setForm(getEmptyForm());
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
          taxInvoiceNumber: data.taxInvoiceNumber || '',
          taxInvoiceDate: data.taxInvoiceDate?.split('T')[0] || '',
          taxInvoiceImage: data.taxInvoiceImage || '',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleIssueDateChange = (newDate: string) => {
    setForm({ ...form, issueDate: newDate, dueDate: getDefaultDueDate(newDate) });
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

  // PPN Inclusive (DPP) calculation with pembulatan ke atas
  // User enters FINAL price (already includes PPN)
  const subtotal = form.items.reduce((s, i) => s + i.total, 0);
  const taxRate = form.taxType === 'ppn12' ? 0.12 : 0;
  let dpp = 0;
  let taxAmount = 0;
  let total = 0;

  if (form.taxType !== 'none' && subtotal > 0) {
    // DPP inclusive: DPP = Total / 1.12, then round up to nearest thousand
    dpp = roundToNearestThousand(subtotal / (1 + taxRate));
    taxAmount = Math.round(dpp * taxRate);
    total = dpp + taxAmount - form.discount;
  } else {
    dpp = subtotal;
    total = subtotal - form.discount;
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Limit to 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran gambar maks 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setForm((prev) => ({ ...prev, taxInvoiceImage: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.customerId) {
      toast.error('Pilih pelanggan terlebih dahulu');
      return;
    }
    if (form.items.some((i) => !i.description || i.unitPrice <= 0)) {
      toast.error('Isi deskripsi dan harga semua item');
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
          customerId: form.customerId,
          issueDate: form.issueDate,
          dueDate: form.dueDate,
          status: form.status,
          taxType: form.taxType,
          discount: form.discount,
          notes: form.notes,
          items: form.items,
          subtotal,
          taxAmount,
          total,
          invoiceNumber: editId ? undefined : '',
          // Faktur Pajak fields
          taxInvoiceNumber: form.taxInvoiceNumber,
          taxInvoiceDate: form.taxInvoiceDate || null,
          taxInvoiceImage: form.taxInvoiceImage,
          taxInvoiceStatus: form.taxInvoiceNumber ? 'created' : 'not_created',
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
        <div className="space-y-5">
          {/* === INFO INVOICE === */}
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
              <Input type="date" value={form.issueDate} onChange={(e) => handleIssueDateChange(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Jatuh Tempo <span className="text-xs text-muted-foreground">(otomatis +10 hari)</span></Label>
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
                  <SelectItem value="ppn12">PPN 12% (Inclusive / DPP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* === ITEM INVOICE === */}
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
                      placeholder="Jasa Pest Control Bulan ..."
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
                    {idx === 0 && <p className="text-xs text-muted-foreground mb-1">
                      Harga {form.taxType !== 'none' ? '(incl. PPN)' : ''}
                    </p>}
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

          {/* === TOTALS === */}
          <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>Rp {fmt(subtotal)}</span>
            </div>
            {form.taxType !== 'none' && (
              <>
                <div className="flex justify-between text-sm">
                  <span>DPP (dibulatkan ke atas)</span>
                  <span>Rp {fmt(dpp)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>PPN 12%</span>
                  <span>Rp {fmt(taxAmount)}</span>
                </div>
                <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-2">
                  * Harga sudah termasuk PPN. DPP = Rp {fmt(subtotal)} / 1,12 = Rp {fmt(subtotal / 1.12)} &rarr; dibulatkan = Rp {fmt(dpp)}
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

          {/* === FAKTUR PAJAK (Integrated) === */}
          <div className="border rounded-lg p-4 space-y-4 bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-600" />
              <Label className="font-semibold text-amber-700 dark:text-amber-400">Faktur Pajak</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Nomor Faktur Pajak</Label>
                <Input
                  value={form.taxInvoiceNumber}
                  onChange={(e) => setForm({ ...form, taxInvoiceNumber: e.target.value })}
                  placeholder="Masukkan nomor faktur pajak"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Tanggal Faktur Pajak</Label>
                <Input
                  type="date"
                  value={form.taxInvoiceDate}
                  onChange={(e) => setForm({ ...form, taxInvoiceDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Upload Gambar Faktur Pajak</Label>
              <p className="text-xs text-muted-foreground">Gambar akan otomatis digabungkan ke dalam PDF invoice saat dicetak</p>
              {form.taxInvoiceImage ? (
                <div className="relative inline-block">
                  <img src={form.taxInvoiceImage} alt="Faktur Pajak" className="max-h-40 rounded-lg border" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => setForm({ ...form, taxInvoiceImage: '' })}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 transition-colors">
                  <div className="text-center">
                    <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Klik atau drag untuk upload</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG (maks 2MB)</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>
          </div>

          {/* === CATATAN === */}
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

          {/* === SUBMIT === */}
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