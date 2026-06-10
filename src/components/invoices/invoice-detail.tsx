'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  Printer,
  Share2,
  MessageSquare,
  FileCheck,
  Upload,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateShort } from '@/lib/invoice-utils';
import { terbilang } from '@/lib/terbilang';
import { toast } from 'sonner';

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
  customer: { companyName: string; pic: string; address: string; npwp: string; whatsapp: string; email: string };
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

interface CompanySettings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  npwp: string;
  logo: string;
  stamp: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
  onRefresh: () => void;
  token: string | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  unpaid: { label: 'Belum Lunas', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  paid: { label: 'Lunas', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
};

export default function InvoiceDetail({ open, onOpenChange, invoiceId, onRefresh, token }: Props) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('invoice');

  useEffect(() => {
    if (open && invoiceId) {
      fetchInvoice();
      fetchSettings();
    }
  }, [open, invoiceId]);

  const fetchInvoice = async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setInvoice(await res.json());
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

  const updateInvoice = async (data: Partial<Invoice>) => {
    if (!invoiceId) return;
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success('Invoice berhasil diperbarui');
        fetchInvoice();
        onRefresh();
      }
    } catch {
      toast.error('Gagal memperbarui invoice');
    }
  };

  const handleStatusChange = (status: string) => {
    updateInvoice({ status });
  };

  const handleTaxInvoiceSave = () => {
    if (!invoice) return;
    const isCreated = invoice.taxInvoiceStatus === 'created';
    updateInvoice({
      taxInvoiceStatus: isCreated ? 'not_created' : 'created',
      taxInvoiceDate: isCreated ? null : new Date().toISOString(),
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (invoice && reader.result) {
        updateInvoice({ taxInvoiceImage: reader.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePrint = () => {
    const el = document.getElementById('invoice-print-area');
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Invoice ${invoice?.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        .total-section { border-top: 2px solid #333; padding-top: 10px; }
        img.logo { max-height: 60px; }
        img.stamp { max-height: 80px; }
        @media print { body { margin: 0; } }
      </style></head><body>
      ${el.innerHTML}
      <script>window.onload=function(){window.print();window.close();}</script>
      </body></html>
    `);
    win.document.close();
  };

  const handleWhatsAppShare = () => {
    if (!invoice) return;
    const msg = `Yth. ${invoice.customer.pic},\n\nBerikut invoice kami:\nNo: ${invoice.invoiceNumber}\nTotal: Rp ${formatCurrency(invoice.total)}\nTanggal: ${formatDate(invoice.issueDate)}\n\nTerima kasih.`;
    const phone = invoice.customer.whatsapp.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading || !invoice) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <div className="p-8 text-center text-muted-foreground">Memuat...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const sc = statusConfig[invoice.status] || statusConfig.draft;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">{invoice.invoiceNumber}</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={sc.className}>{sc.label}</Badge>
              <Select value={invoice.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="unpaid">Belum Lunas</SelectItem>
                  <SelectItem value="paid">Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="faktur">Faktur Pajak</TabsTrigger>
            <TabsTrigger value="aksi">Aksi</TabsTrigger>
          </TabsList>

          <TabsContent value="invoice" className="mt-4">
            <div id="invoice-print-area">
              <div className="space-y-6 text-sm">
                {/* Header */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    {settings?.logo && <img src={settings.logo} alt="Logo" className="h-14 mb-2" />}
                    <h2 className="font-bold text-base">{settings?.companyName || 'PT Pest Killer Ngalam'}</h2>
                    <p className="text-muted-foreground text-xs">{settings?.address}</p>
                    <p className="text-muted-foreground text-xs">{settings?.phone} | {settings?.email}</p>
                    {settings?.npwp && <p className="text-muted-foreground text-xs">NPWP: {settings.npwp}</p>}
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-lg text-emerald-700">INVOICE</h3>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-muted-foreground">Tanggal: {formatDate(invoice.issueDate)}</p>
                    <p className="text-muted-foreground">Jatuh Tempo: {formatDate(invoice.dueDate)}</p>
                  </div>
                </div>

                {/* Customer */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-semibold mb-1">Kepada:</p>
                  <p className="font-medium">{invoice.customer.companyName}</p>
                  <p className="text-muted-foreground">PIC: {invoice.customer.pic}</p>
                  {invoice.customer.address && <p className="text-muted-foreground">{invoice.customer.address}</p>}
                  {invoice.customer.npwp && <p className="text-muted-foreground">NPWP: {invoice.customer.npwp}</p>}
                </div>

                {/* Items Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.qty}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Pajak ({invoice.taxType === 'ppn12' ? 'PPN 12%' : ''})</span>
                        <span>{formatCurrency(invoice.taxAmount)}</span>
                      </div>
                    )}
                    {invoice.discount > 0 && (
                      <div className="flex justify-between">
                        <span>Diskon</span>
                        <span>- {formatCurrency(invoice.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total</span>
                      <span className="text-emerald-700">{formatCurrency(invoice.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Terbilang */}
                <div className="bg-emerald-50 dark:bg-emerald-950/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Terbilang:</p>
                  <p className="font-medium text-emerald-700">{terbilang(invoice.total)}</p>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div>
                    <p className="font-semibold mb-1">Catatan:</p>
                    <p className="text-muted-foreground">{invoice.notes}</p>
                  </div>
                )}

                {/* Bank */}
                {settings?.bankName && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="font-semibold mb-1">Pembayaran:</p>
                    <p>{settings.bankName} - {settings.bankAccount} a.n. {settings.bankHolder}</p>
                  </div>
                )}

                {/* Stamp */}
                <div className="flex justify-end mt-8">
                  <div className="text-center">
                    {settings?.stamp && <img src={settings.stamp} alt="Stempel" className="h-20 mb-2" />}
                    <p>Hormat kami,</p>
                    <div className="mt-12">
                      <p className="font-medium">{settings?.companyName || 'PT Pest Killer Ngalam'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="faktur" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nomor Faktur Pajak</Label>
                  <Input
                    value={invoice.taxInvoiceNumber}
                    onChange={(e) => updateInvoice({ taxInvoiceNumber: e.target.value })}
                    placeholder="Masukkan nomor faktur pajak"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Faktur Pajak</Label>
                  <Input
                    type="date"
                    value={invoice.taxInvoiceDate?.split('T')[0] || ''}
                    onChange={(e) => updateInvoice({ taxInvoiceDate: e.target.value || null })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant={invoice.taxInvoiceStatus === 'created' ? 'default' : 'outline'}
                  className={invoice.taxInvoiceStatus === 'created' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                  onClick={handleTaxInvoiceSave}
                >
                  <FileCheck className="w-4 h-4 mr-1" />
                  {invoice.taxInvoiceStatus === 'created' ? 'Faktur Sudah Dibuat' : 'Tandai Faktur Dibuat'}
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Upload Gambar Faktur Pajak</Label>
                <Input type="file" accept="image/*" onChange={handleImageUpload} />
                {invoice.taxInvoiceImage && (
                  <img src={invoice.taxInvoiceImage} alt="Faktur Pajak" className="max-h-48 rounded-lg border" />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="aksi" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button onClick={handlePrint} className="h-20" variant="outline">
                <Printer className="w-8 h-8 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Cetak Invoice</p>
                  <p className="text-xs text-muted-foreground">Buka dialog cetak</p>
                </div>
              </Button>
              <Button onClick={handleWhatsAppShare} className="h-20 bg-green-600 hover:bg-green-700 text-white">
                <MessageSquare className="w-8 h-8 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Kirim via WhatsApp</p>
                  <p className="text-xs">Kirim ke pelanggan</p>
                </div>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
