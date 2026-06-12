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
  const companyName = settings?.companyName || 'PT Pest Killer Ngalam';
  const taxRate = invoice.taxType === 'ppn12' ? 0.12 : 0;
  const dppRaw = taxRate > 0 && invoice.subtotal > 0 ? invoice.subtotal / (1 + taxRate) : invoice.subtotal;
  const dpp = Math.ceil(dppRaw / 1000) * 1000;
  const ppn = Math.round(dpp * taxRate);
  const grandTotal = dpp + ppn - (invoice.discount || 0);

  // Check if tax invoice image is provided — if so, use compact layout for 1-page feel
  const hasTaxImage = !!invoice.taxInvoiceImage;
  const compactMode = hasTaxImage;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        @page { size: A4; margin: 10mm 14mm 10mm 14mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: ${compactMode ? '9.5pt' : '10pt'}; line-height: 1.45; }

        /* ===== HEADER ===== */
        .header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: ${compactMode ? '10pt' : '16pt'};
          padding-bottom: ${compactMode ? '8pt' : '12pt'};
          border-bottom: 2.5px solid #1a1a1a;
        }
        .header-left { display: flex; align-items: flex-start; gap: 10pt; }
        .header-left img { max-height: ${compactMode ? '42pt' : '50pt'}; max-width: 60pt; object-fit: contain; }
        .company-name { font-size: ${compactMode ? '13pt' : '14pt'}; font-weight: 800; color: #1a1a1a; letter-spacing: 0.3pt; }
        .company-tagline { font-size: ${compactMode ? '7pt' : '7.5pt'}; color: #666; margin-top: 1pt; letter-spacing: 0.8pt; text-transform: uppercase; font-weight: 600; }
        .company-info { font-size: ${compactMode ? '7.5pt' : '8pt'}; color: #555; line-height: 1.6; margin-top: 3pt; }
        .header-right { text-align: right; min-width: 160pt; }
        .invoice-title { font-size: ${compactMode ? '20pt' : '22pt'}; font-weight: 800; color: #059669; letter-spacing: 2pt; }
        .invoice-meta { font-size: ${compactMode ? '8pt' : '8.5pt'}; color: #333; margin-top: 4pt; line-height: 1.8; }
        .invoice-meta .due { color: #dc2626; font-weight: 700; }

        /* ===== TAX BADGE ===== */
        .tax-badge {
          display: inline-block; background: #fffbeb; border: 1px solid #fcd34d;
          color: #92400e; padding: 2pt 10pt; border-radius: 3pt;
          font-size: ${compactMode ? '7.5pt' : '8pt'}; font-weight: 700;
          margin-bottom: ${compactMode ? '8pt' : '12pt'}; letter-spacing: 0.2pt;
        }

        /* ===== CUSTOMER ===== */
        .customer-box {
          background: #f9fafb; border-left: 3px solid #059669;
          border-radius: 0 4pt 4pt 0;
          padding: ${compactMode ? '8pt 12pt' : '10pt 14pt'};
          margin-bottom: ${compactMode ? '8pt' : '12pt'};
        }
        .customer-label { font-size: ${compactMode ? '6.5pt' : '7pt'}; color: #888; text-transform: uppercase; letter-spacing: 1.5pt; margin-bottom: 2pt; font-weight: 600; }
        .customer-name { font-weight: 700; font-size: ${compactMode ? '10pt' : '10.5pt'}; }
        .customer-detail { font-size: ${compactMode ? '8pt' : '8.5pt'}; color: #555; line-height: 1.6; margin-top: 1pt; }

        /* ===== ITEMS TABLE ===== */
        table.items { width: 100%; border-collapse: collapse; margin-bottom: ${compactMode ? '10pt' : '14pt'}; }
        table.items thead th {
          background: #1a1a1a; color: white;
          padding: ${compactMode ? '5pt 8pt' : '6pt 8pt'};
          text-align: left; font-size: ${compactMode ? '7.5pt' : '8pt'};
          text-transform: uppercase; letter-spacing: 0.4pt; font-weight: 600;
        }
        .r { text-align: right; }
        .c { text-align: center; }
        table.items td {
          padding: ${compactMode ? '5pt 8pt' : '6pt 8pt'};
          border-bottom: 1px solid #e5e7eb; font-size: ${compactMode ? '9pt' : '9.5pt'};
        }
        table.items tbody tr:nth-child(even) td { background: #fafafa; }
        table.items tbody tr:last-child td { border-bottom: 2px solid #1a1a1a; }

        /* ===== TOTALS ===== */
        .totals { display: flex; justify-content: flex-end; margin-bottom: ${compactMode ? '8pt' : '12pt'}; }
        .totals-box { width: 240pt; }
        .totals-row { display: flex; justify-content: space-between; padding: 2.5pt 0; font-size: ${compactMode ? '9pt' : '9.5pt'}; color: #444; }
        .totals-row.grand {
          border-top: 2px solid #1a1a1a; padding-top: 6pt; margin-top: 3pt;
          font-weight: 800; font-size: ${compactMode ? '11pt' : '12pt'}; color: #1a1a1a;
        }
        .totals-row.grand .val { color: #059669; }

        /* ===== TERBILANG ===== */
        .terbilang {
          background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4pt;
          padding: ${compactMode ? '6pt 12pt' : '8pt 14pt'};
          margin-bottom: ${compactMode ? '8pt' : '12pt'};
        }
        .terbilang .lbl { font-size: ${compactMode ? '6.5pt' : '7pt'}; color: #888; text-transform: uppercase; letter-spacing: 0.8pt; }
        .terbilang .val { font-size: ${compactMode ? '8.5pt' : '9pt'}; font-weight: 600; color: #333; font-style: italic; }

        /* ===== BANK ===== */
        .bank-box {
          background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4pt;
          padding: ${compactMode ? '8pt 12pt' : '10pt 14pt'};
          margin-bottom: ${compactMode ? '6pt' : '8pt'};
        }
        .bank-box .lbl { font-size: ${compactMode ? '6.5pt' : '7pt'}; color: #888; text-transform: uppercase; letter-spacing: 0.8pt; margin-bottom: 3pt; font-weight: 600; }
        .bank-box .detail { font-size: ${compactMode ? '8.5pt' : '9pt'}; font-weight: 600; }
        .bank-box .note { font-size: ${compactMode ? '7pt' : '7.5pt'}; color: #666; margin-top: 3pt; line-height: 1.5; }

        /* ===== SIGNATURE ===== */
        .signature { display: flex; justify-content: space-between; align-items: flex-end; margin-top: ${compactMode ? '14pt' : '22pt'}; padding-top: 6pt; }
        .sig-left img { max-height: 40pt; }
        .sig-right { text-align: center; }
        .sig-right .greet { font-size: ${compactMode ? '8pt' : '8.5pt'}; color: #555; }
        .sig-right .line { border-bottom: 1px solid #1a1a1a; width: 160pt; margin: 3pt auto 3pt; }
        .sig-right .name { font-weight: 700; font-size: ${compactMode ? '9pt' : '9.5pt'}; }
        .sig-right .title { font-size: ${compactMode ? '7pt' : '7.5pt'}; color: #666; }

        /* ===== TAX INVOICE SECTION ===== */
        .tax-section {
          margin-top: 10pt; padding-top: 10pt;
          border-top: 2px dashed #1a1a1a;
        }
        .tax-section .sec-title { text-align: center; font-size: 8pt; font-weight: 700; color: #555; margin-bottom: 6pt; text-transform: uppercase; letter-spacing: 1.5pt; }
        .tax-section .sec-sub { text-align: center; font-size: ${compactMode ? '7.5pt' : '8pt'}; color: #666; margin-bottom: 6pt; }
        .tax-section img { width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 3pt; }

        /* ===== FOOTER ===== */
        .footer { text-align: center; margin-top: 12pt; padding-top: 6pt; border-top: 1px solid #e5e7eb; font-size: 6.5pt; color: #aaa; letter-spacing: 0.2pt; }

        /* ===== NOTES ===== */
        .notes { font-size: ${compactMode ? '8pt' : '8.5pt'}; color: #555; margin-bottom: ${compactMode ? '8pt' : '12pt'}; padding-left: 2pt; }

        @media print { body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <!-- HEADER -->
      <div class="header">
        <div class="header-left">
          ${settings?.logo ? `<img src="${settings.logo}" alt="Logo" />` : ''}
          <div>
            <div class="company-name">${companyName}</div>
            <div class="company-tagline">Pest Control &bull; Rodent Control &bull; Termite Control</div>
            <div class="company-info">
              ${settings?.address || 'Jln Bandulan, Kec Sukun, Kota Malang, Jawa Timur'}<br/>
              ${settings?.phone ? `Telp: ${settings.phone}` : ''}${settings?.email ? ` | Email: ${settings.email}` : ''}<br/>
              ${settings?.npwp ? `NPWP: ${settings.npwp}` : ''}
            </div>
          </div>
        </div>
        <div class="header-right">
          <div class="invoice-title">INVOICE</div>
          <div class="invoice-meta">
            No: <strong>${invoice.invoiceNumber}</strong><br/>
            Tanggal: ${formatDate(invoice.issueDate)}<br/>
            Jatuh Tempo: <span class="due">${formatDate(invoice.dueDate)}</span>
          </div>
        </div>
      </div>

      <!-- TAX INVOICE BADGE -->
      ${invoice.taxInvoiceNumber ? `<div class="tax-badge">No. Faktur Pajak: ${invoice.taxInvoiceNumber}${invoice.taxInvoiceDate ? ` &mdash; Tanggal: ${formatDateShort(invoice.taxInvoiceDate)}` : ''}</div>` : ''}

      <!-- CUSTOMER -->
      <div class="customer-box">
        <div class="customer-label">Kepada Yth.</div>
        <div class="customer-name">${invoice.customer.companyName}</div>
        <div class="customer-detail">
          PIC: ${invoice.customer.pic}<br/>
          ${invoice.customer.address ? `Alamat: ${invoice.customer.address}<br/>` : ''}
          ${invoice.customer.npwp ? `NPWP: ${invoice.customer.npwp}` : ''}
        </div>
      </div>

      <!-- ITEMS TABLE -->
      <table class="items">
        <thead>
          <tr>
            <th class="c" style="width:28pt">No</th>
            <th>Deskripsi</th>
            <th class="r" style="width:120pt">Harga Jual</th>
            <th class="r" style="width:120pt">Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map((item, idx) => `
            <tr>
              <td class="c">${idx + 1}</td>
              <td>${item.description}</td>
              <td class="r">Rp ${formatCurrency(item.unitPrice)}</td>
              <td class="r">Rp ${formatCurrency(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- TOTALS -->
      <div class="totals">
        <div class="totals-box">
          <div class="totals-row"><span>Jumlah</span><span>Rp ${formatCurrency(invoice.subtotal)}</span></div>
          ${ppn > 0 ? `
            <div class="totals-row"><span>DPP (dibulatkan)</span><span>Rp ${formatCurrency(dpp)}</span></div>
            <div class="totals-row"><span>PPN 12%</span><span>Rp ${formatCurrency(ppn)}</span></div>
          ` : ''}
          ${invoice.discount > 0 ? `
            <div class="totals-row"><span>Diskon</span><span>- Rp ${formatCurrency(invoice.discount)}</span></div>
          ` : ''}
          <div class="totals-row grand"><span>Jumlah Dibayar</span><span class="val">Rp ${formatCurrency(grandTotal)}</span></div>
        </div>
      </div>

      <!-- TERBILANG -->
      <div class="terbilang">
        <div class="lbl">Terbilang</div>
        <div class="val">${terbilang(grandTotal)}</div>
      </div>

      <!-- NOTES -->
      ${invoice.notes ? `<div class="notes"><strong>Catatan:</strong> ${invoice.notes}</div>` : ''}

      <!-- BANK INFO -->
      ${settings?.bankName ? `
        <div class="bank-box">
          <div class="lbl">Pembayaran Bisa Ditransfer Melalui</div>
          <div class="detail">${settings.bankName}: ${settings.bankAccount} atas nama ${settings.bankHolder}</div>
          ${settings?.phone ? `<div class="note">(Pembayaran mohon dikonfirmasi melalui nomor WA ${settings.phone} disertai bukti SS transfer, terima kasih)</div>` : ''}
        </div>
      ` : ''}

      <!-- SIGNATURE -->
      <div class="signature">
        <div class="sig-left">
          ${settings?.logo ? `<img src="${settings.logo}" alt="Logo" />` : ''}
        </div>
        <div class="sig-right">
          <div class="greet">Hormat Kami,</div>
          <div style="height: ${compactMode ? '45pt' : '55pt'}"></div>
          <div class="line"></div>
          <div class="name">${settings?.bankHolder || 'Sulianto'}</div>
          <div class="title">Direktur</div>
        </div>
      </div>

      <!-- TAX INVOICE IMAGE (auto-merged) -->
      ${invoice.taxInvoiceImage ? `
        <div class="tax-section">
          <div class="sec-title">Lampiran Faktur Pajak</div>
          ${invoice.taxInvoiceNumber ? `<div class="sec-sub">No: ${invoice.taxInvoiceNumber}</div>` : ''}
          <img src="${invoice.taxInvoiceImage}" alt="Faktur Pajak" />
        </div>
      ` : ''}

      <!-- FOOTER -->
      <div class="footer">
        Dokumen ini dibuat secara elektronik oleh ${companyName}
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
                    <div className="w-72 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{formatCurrency(invoice.subtotal)}</span>
                      </div>
                      {invoice.taxAmount > 0 && invoice.taxType === 'ppn12' && (() => {
                        const dppR = Math.ceil((invoice.subtotal / 1.12) / 1000) * 1000;
                        const ppn = Math.round(dppR * 0.12);
                        return (
                          <>
                            <div className="flex justify-between text-sm">
                              <span>DPP (dibulatkan)</span>
                              <span>{formatCurrency(dppR)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>PPN 12%</span>
                              <span>{formatCurrency(ppn)}</span>
                            </div>
                          </>
                        );
                      })()}
                      {invoice.discount > 0 && (
                        <div className="flex justify-between text-sm">
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