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
  FileDown,
  Eye,
  X,
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

function generatePrintHTML(invoice: Invoice, settings: CompanySettings | null) {
  const taxLabel = invoice.taxType === 'ppn12' ? 'PPN 12%' : invoice.taxType === 'dpp_other' ? 'DPP Nilai Lain' : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #333; font-size: 11pt; line-height: 1.5; }

        /* Header */
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24pt; padding-bottom: 16pt; border-bottom: 3px solid #059669; }
        .header-left { display: flex; align-items: center; gap: 12pt; }
        .header-left img { max-height: 50pt; max-width: 80pt; object-fit: contain; }
        .header-left .company-name { font-size: 14pt; font-weight: bold; color: #059669; }
        .header-left .company-info { font-size: 8.5pt; color: #666; line-height: 1.6; }
        .header-right { text-align: right; }
        .header-right .invoice-label { font-size: 18pt; font-weight: bold; color: #059669; letter-spacing: 2pt; }
        .header-right .invoice-meta { font-size: 9pt; color: #666; margin-top: 4pt; }

        /* Customer */
        .customer-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6pt; padding: 12pt; margin-bottom: 16pt; }
        .customer-box .label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 1pt; margin-bottom: 4pt; }
        .customer-box .name { font-weight: bold; font-size: 11pt; }

        /* Tax Invoice Number */
        .tax-badge { display: inline-block; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 3pt 10pt; border-radius: 4pt; font-size: 9pt; font-weight: 600; margin-bottom: 12pt; }

        /* Table */
        table { width: 100%; border-collapse: collapse; margin-bottom: 16pt; }
        th { background: #059669; color: white; padding: 8pt 10pt; text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5pt; }
        th.right, td.right { text-align: right; }
        th.center, td.center { text-align: center; }
        td { padding: 7pt 10pt; border-bottom: 1px solid #e5e7eb; font-size: 10pt; }
        tr:nth-child(even) td { background: #f9fafb; }
        tr:last-child td { border-bottom: none; }

        /* Totals */
        .totals { display: flex; justify-content: flex-end; margin-bottom: 16pt; }
        .totals-box { width: 220pt; }
        .totals-row { display: flex; justify-content: space-between; padding: 4pt 0; font-size: 10pt; }
        .totals-row.grand { border-top: 2px solid #333; padding-top: 8pt; margin-top: 4pt; font-weight: bold; font-size: 12pt; }
        .totals-row.grand .amount { color: #059669; }

        /* Terbilang */
        .terbilang { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6pt; padding: 10pt; text-align: center; margin-bottom: 16pt; }
        .terbilang .label { font-size: 8pt; color: #888; }
        .terbilang .value { font-size: 10pt; font-weight: 600; color: #059669; }

        /* Bank */
        .bank-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6pt; padding: 10pt; margin-bottom: 20pt; }
        .bank-box .label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 1pt; margin-bottom: 4pt; }

        /* Signature */
        .signature { text-align: right; margin-top: 30pt; }
        .signature .stamp { max-height: 60pt; margin-bottom: 4pt; }
        .signature .line { border-bottom: 1px solid #333; width: 180pt; margin-left: auto; margin-bottom: 4pt; }
        .signature .company { font-weight: bold; font-size: 10pt; }

        /* Tax Invoice Image - Auto Merge */
        .tax-invoice-section { margin-top: 20pt; padding-top: 16pt; border-top: 2px dashed #059669; }
        .tax-invoice-section .section-title { text-align: center; font-size: 10pt; font-weight: bold; color: #059669; margin-bottom: 10pt; text-transform: uppercase; letter-spacing: 1pt; }
        .tax-invoice-section img { max-width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 4pt; }

        /* Footer */
        .footer { text-align: center; margin-top: 24pt; padding-top: 12pt; border-top: 1px solid #e5e7eb; font-size: 8pt; color: #999; }

        /* Notes */
        .notes { font-size: 9pt; color: #666; margin-bottom: 16pt; }

        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          ${settings?.logo ? `<img src="${settings.logo}" alt="Logo" />` : ''}
          <div>
            <div class="company-name">${settings?.companyName || 'PT Pest Killer Ngalam'}</div>
            <div class="company-info">
              ${settings?.address ? `${settings.address}<br/>` : ''}
              ${settings?.phone ? `Telp: ${settings.phone}` : ''}${settings?.email ? ` | ${settings.email}` : ''}<br/>
              ${settings?.npwp ? `NPWP: ${settings.npwp}` : ''}
            </div>
          </div>
        </div>
        <div class="header-right">
          <div class="invoice-label">INVOICE</div>
          <div class="invoice-meta">
            No: <strong>${invoice.invoiceNumber}</strong><br/>
            Tanggal: ${formatDate(invoice.issueDate)}<br/>
            Jatuh Tempo: ${formatDate(invoice.dueDate)}
          </div>
        </div>
      </div>

      ${invoice.taxInvoiceNumber ? `<div class="tax-badge">No. Faktur Pajak: ${invoice.taxInvoiceNumber}</div>` : ''}

      <div class="customer-box">
        <div class="label">Kepada:</div>
        <div class="name">${invoice.customer.companyName}</div>
        <div style="font-size:9pt;color:#666;line-height:1.6">
          PIC: ${invoice.customer.pic}<br/>
          ${invoice.customer.address ? `${invoice.customer.address}<br/>` : ''}
          ${invoice.customer.npwp ? `NPWP: ${invoice.customer.npwp}` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:30pt">No</th>
            <th>Deskripsi</th>
            <th class="center" style="width:40pt">Qty</th>
            <th class="right" style="width:100pt">Harga Satuan</th>
            <th class="right" style="width:100pt">Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map((item, idx) => `
            <tr>
              <td class="center">${idx + 1}</td>
              <td>${item.description}</td>
              <td class="center">${item.qty}</td>
              <td class="right">${formatCurrency(item.unitPrice)}</td>
              <td class="right">${formatCurrency(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-box">
          <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal)}</span></div>
          ${invoice.taxAmount > 0 ? `
            <div class="totals-row"><span>${taxLabel}</span><span>${formatCurrency(invoice.taxAmount)}</span></div>
          ` : ''}
          ${invoice.discount > 0 ? `
            <div class="totals-row"><span>Diskon</span><span>- ${formatCurrency(invoice.discount)}</span></div>
          ` : ''}
          <div class="totals-row grand"><span>Total</span><span class="amount">Rp ${formatCurrency(invoice.total)}</span></div>
        </div>
      </div>

      <div class="terbilang">
        <div class="label">Terbilang:</div>
        <div class="value">${terbilang(invoice.total)}</div>
      </div>

      ${invoice.notes ? `<div class="notes"><strong>Catatan:</strong> ${invoice.notes}</div>` : ''}

      ${settings?.bankName ? `
        <div class="bank-box">
          <div class="label">Pembayaran ke:</div>
          <div style="font-size:10pt">
            <strong>${settings.bankName}</strong> — ${settings.bankAccount} a.n. <strong>${settings.bankHolder}</strong>
          </div>
        </div>
      ` : ''}

      <div class="signature">
        ${settings?.stamp ? `<img class="stamp" src="${settings.stamp}" alt="Stempel" />` : ''}
        <p style="font-size:9pt">Hormat kami,</p>
        <div class="line"></div>
        <div class="company">${settings?.companyName || 'PT Pest Killer Ngalam'}</div>
      </div>

      ${invoice.taxInvoiceImage ? `
        <div class="tax-invoice-section">
          <div class="section-title">Faktur Pajak</div>
          ${invoice.taxInvoiceNumber ? `<p style="text-align:center;font-size:9pt;color:#666;margin-bottom:8pt">No: ${invoice.taxInvoiceNumber}</p>` : ''}
          <img src="${invoice.taxInvoiceImage}" alt="Faktur Pajak" />
        </div>
      ` : ''}

      <div class="footer">
        Dokumen ini sah dan dibuat secara elektronik oleh sistem akuntansi ${settings?.companyName || 'PT Pest Killer Ngalam'}.<br/>
        Terima kasih atas kepercayaan Anda.
      </div>
    </body>
    </html>
  `;
}

export default function InvoiceDetail({ open, onOpenChange, invoiceId, onRefresh, token }: Props) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('invoice');
  const [previewOpen, setPreviewOpen] = useState(false);

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

  // Print / PDF functions
  const getPrintHTML = () => {
    if (!invoice) return '';
    return generatePrintHTML(invoice, settings);
  };

  const handlePrint = () => {
    const html = getPrintHTML();
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 5000);
  };

  const handleDownloadPDF = () => {
    const html = getPrintHTML();
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    // Wait for images to load then trigger print (Save as PDF)
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 10000);
    }, 1500);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-base">{invoice.invoiceNumber}</DialogTitle>
                {invoice.taxInvoiceNumber && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-xs">
                    FP: {invoice.taxInvoiceNumber}
                  </Badge>
                )}
              </div>
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

                  {/* Tax Invoice Number Badge */}
                  {invoice.taxInvoiceNumber && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2 text-center">
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        No. Faktur Pajak: {invoice.taxInvoiceNumber}
                        {invoice.taxInvoiceDate && ` — Tanggal: ${formatDate(invoice.taxInvoiceDate)}`}
                      </span>
                    </div>
                  )}

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

                  {/* Tax Invoice Image Preview */}
                  {invoice.taxInvoiceImage && (
                    <div className="border-t-2 border-dashed border-emerald-300 pt-4">
                      <p className="text-center text-xs font-semibold text-emerald-600 mb-2 uppercase tracking-wider">Faktur Pajak</p>
                      <img src={invoice.taxInvoiceImage} alt="Faktur Pajak" className="max-h-64 mx-auto rounded-lg border" />
                    </div>
                  )}
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
                  <p className="text-xs text-muted-foreground">Gambar akan otomatis digabungkan ke dalam PDF invoice</p>
                  <Input type="file" accept="image/*" onChange={handleImageUpload} />
                  {invoice.taxInvoiceImage && (
                    <div className="relative inline-block">
                      <img src={invoice.taxInvoiceImage} alt="Faktur Pajak" className="max-h-48 rounded-lg border" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => updateInvoice({ taxInvoiceImage: '' })}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
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
                <Button onClick={handleDownloadPDF} className="h-20 bg-red-600 hover:bg-red-700 text-white">
                  <FileDown className="w-8 h-8 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">Download PDF</p>
                    <p className="text-xs">Simpan sebagai PDF</p>
                  </div>
                </Button>
                <Button onClick={() => setPreviewOpen(true)} className="h-20" variant="outline">
                  <Eye className="w-8 h-8 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">Preview Invoice</p>
                    <p className="text-xs text-muted-foreground">Lihat tampilan akhir</p>
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

      {/* Preview Fullscreen Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0">
          <div className="flex items-center justify-between p-3 border-b bg-muted/50">
            <DialogTitle className="text-sm font-medium">Preview Invoice</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleDownloadPDF} className="bg-red-600 hover:bg-red-700 text-white">
                <FileDown className="w-4 h-4 mr-1" /> PDF
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" /> Cetak
              </Button>
            </div>
          </div>
          <div className="overflow-auto" style={{ height: 'calc(95vh - 56px)' }}>
            <iframe
              srcDoc={getPrintHTML()}
              className="w-full min-h-full border-0"
              style={{ minWidth: '210mm' }}
              title="Invoice Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}