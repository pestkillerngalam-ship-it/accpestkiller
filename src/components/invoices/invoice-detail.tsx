'use client';

import { useEffect, useState, useRef } from 'react';
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
  Eye,
  Download,
  X,
  Mail,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateShort, hitungPajak } from '@/lib/invoice-utils';
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && invoiceId) {
      fetchInvoice();
      fetchSettings();
    }
  }, [open, invoiceId]);

  // Load preview iframe content
  useEffect(() => {
    if (previewOpen && invoice) {
      const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
      if (iframe) {
        const html = generatePrintHTML();
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
        }
      }
    }
  }, [previewOpen, invoice]);

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



  const handleFakturUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Hanya terima PDF
    if (file.type !== 'application/pdf') {
      toast.error('Hanya file PDF yang diterima. Download faktur dari Coretax dalam format PDF.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (invoice && reader.result) {
        updateInvoice({ taxInvoiceImage: reader.result as string });
        toast.success('Faktur pajak berhasil diupload');
      }
    };
    reader.readAsDataURL(file);
  };

  const generatePrintHTML = () => {
    if (!invoice) return '';
    const companyName = settings?.companyName || 'PT Pest Killer Ngalam';
    const logoHTML = settings?.logo ? `<img src="${settings.logo}" alt="Logo" style="max-height:60px;margin-bottom:8px;" />` : '';
    const stampHTML = settings?.stamp ? `<img src="${settings.stamp}" alt="Stempel" style="max-height:80px;margin-bottom:8px;" />` : '';

    let taxInvoiceImageHTML = '';
    if (invoice.taxInvoiceImage) {
      // Deteksi apakah base64 adalah PDF atau gambar
      const isPDF = invoice.taxInvoiceImage.startsWith('data:application/pdf');
      if (isPDF) {
        taxInvoiceImageHTML = `
          <div style="margin-top:30px; padding-top:20px; border-top: 3px solid #10b981;">
            <h3 style="text-align:center; color:#10b981; font-size:14px; margin-bottom:10px; font-weight:bold;">FAKTUR PAJAK</h3>
            ${invoice.taxInvoiceNumber ? `<p style="text-align:center; font-size:12px; color:#666; margin-bottom:10px;">No. Faktur: ${invoice.taxInvoiceNumber}</p>` : ''}
            <div style="text-align:center;">
              <iframe src="${invoice.taxInvoiceImage}" style="width:100%; height:600px; border:1px solid #ddd; border-radius:8px;"></iframe>
            </div>
          </div>
        `;
      } else {
        taxInvoiceImageHTML = `
          <div style="margin-top:30px; padding-top:20px; border-top: 3px solid #10b981;">
            <h3 style="text-align:center; color:#10b981; font-size:14px; margin-bottom:10px; font-weight:bold;">FAKTUR PAJAK</h3>
            ${invoice.taxInvoiceNumber ? `<p style="text-align:center; font-size:12px; color:#666; margin-bottom:10px;">No. Faktur: ${invoice.taxInvoiceNumber}</p>` : ''}
            <div style="text-align:center;">
              <img src="${invoice.taxInvoiceImage}" alt="Faktur Pajak" style="max-width:100%; height:auto; border:1px solid #ddd; border-radius:8px;" />
            </div>
          </div>
        `;
      }
    }

    // Hitung ulang DPP Nilai Lain untuk ditampilkan di PDF
    const { dppNilaiLain } = hitungPajak(invoice.subtotal, invoice.taxType, 0);

    // Bangun HTML baris pajak untuk PDF (menggunakan string concatenation untuk menghindari masalah parsing)
    let taxRowsHTML = '';
    if ((invoice.taxType === 'include_pajak' || invoice.taxType === 'inclusive_ppn') && invoice.taxAmount > 0) {
      taxRowsHTML += '<div class="row"><span>DPP Nilai Lain (11/12)</span><span>' + formatCurrency(dppNilaiLain) + '</span></div>';
      taxRowsHTML += '<div class="row"><span>PPN 12% x DPP Nilai Lain</span><span>' + formatCurrency(invoice.taxAmount) + '</span></div>';
    } else if ((invoice.taxType === 'exclude_pajak' || invoice.taxType === 'non_inclusive_ppn') && invoice.taxAmount > 0) {
      taxRowsHTML += '<div class="row"><span>DPP Nilai Lain (11/12)</span><span>' + formatCurrency(dppNilaiLain) + '</span></div>';
      taxRowsHTML += '<div class="row"><span>PPN 12% x DPP Nilai Lain</span><span>' + formatCurrency(invoice.taxAmount) + '</span></div>';
    } else if (!invoice.taxType || invoice.taxType === 'none') {
      taxRowsHTML = '<div class="row"><span>Pajak</span><span>Tanpa Pajak</span></div>';
    }

    return `
      <html><head><title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #333;
          line-height: 1.5;
          font-size: 11px;
        }
        .invoice-container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 20px;
        }
        .header-bar {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .header-bar .company-info h2 {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        .header-bar .company-info p {
          font-size: 10px;
          opacity: 0.9;
        }
        .header-bar .invoice-badge {
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 2px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .info-box {
          background: #f9fafb;
          border-radius: 8px;
          padding: 12px;
          border: 1px solid #e5e7eb;
        }
        .info-box h4 {
          font-size: 10px;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
        }
        .info-box p {
          font-size: 11px;
          margin-bottom: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background: #f3f4f6;
          padding: 10px 8px;
          text-align: left;
          font-size: 10px;
          text-transform: uppercase;
          color: #6b7280;
          border-bottom: 2px solid #e5e7eb;
          letter-spacing: 0.5px;
        }
        th.right, td.right { text-align: right; }
        th.center, td.center { text-align: center; }
        td {
          padding: 10px 8px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 11px;
        }
        tr:nth-child(even) td {
          background: #f9fafb;
        }
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 20px;
        }
        .totals-box {
          width: 280px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        .totals-box .row {
          display: flex;
          justify-content: space-between;
          padding: 8px 16px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 11px;
        }
        .totals-box .row.total {
          background: #059669;
          color: white;
          font-weight: bold;
          font-size: 14px;
          padding: 12px 16px;
        }
        .terbilang-box {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 8px;
          padding: 10px 16px;
          margin-bottom: 20px;
          text-align: center;
        }
        .terbilang-box p:first-child {
          font-size: 9px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .terbilang-box p:last-child {
          font-size: 12px;
          color: #059669;
          font-weight: 600;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          color: #9ca3af;
          font-size: 10px;
        }
        .footer p { margin-bottom: 4px; }
        .sign-area {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .sign-area .stamp-box {
          width: 200px;
          text-align: center;
          padding-bottom: 0;
        }
        .sign-area .stamp-box .stamp-img {
          max-height: 90px;
          opacity: 0.9;
        }
        .sign-area .sign-box {
          width: 200px;
          text-align: center;
        }
        .sign-area .sign-box .sign-line {
          margin-top: 60px;
          border-top: 1px solid #333;
          padding-top: 8px;
          font-weight: bold;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style></head><body>
      <div class="invoice-container">
        <!-- Header Bar -->
        <div class="header-bar">
          <div class="company-info">
            ${logoHTML ? `<div style="margin-bottom:6px;">${logoHTML}</div>` : ''}
            <h2>${companyName}</h2>
            <p>${settings?.address || ''}</p>
            <p>${settings?.phone || ''} | ${settings?.email || ''}</p>
            ${settings?.npwp ? `<p>NPWP: ${settings.npwp}</p>` : ''}
          </div>
          <div class="invoice-badge">INVOICE</div>
        </div>

        <!-- Info Grid -->
        <div class="info-grid">
          <div class="info-box">
            <h4>Detail Invoice</h4>
            <p><strong>${invoice.invoiceNumber}</strong></p>
            <p>Tanggal: ${formatDate(invoice.issueDate)}</p>
            <p>Jatuh Tempo: ${formatDate(invoice.dueDate)}</p>
          </div>
          <div class="info-box">
            <h4>Kepada</h4>
            <p><strong>${invoice.customer.companyName}</strong></p>
            <p>PIC: ${invoice.customer.pic}</p>
            ${invoice.customer.address ? `<p>${invoice.customer.address}</p>` : ''}
            ${invoice.customer.npwp ? `<p>NPWP: ${invoice.customer.npwp}</p>` : ''}
          </div>
        </div>

        ${invoice.taxInvoiceNumber ? `
        <div style="background:#fef3c7; border:1px solid #fbbf24; border-radius:8px; padding:8px 16px; margin-bottom:16px; text-align:center;">
          <span style="font-size:10px; color:#92400e;">No. Faktur Pajak: <strong>${invoice.taxInvoiceNumber}</strong></span>
        </div>
        ` : ''}

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th class="center">No</th>
              <th>Deskripsi</th>
              <th class="right">Qty</th>
              <th class="right">Harga</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map((item, idx) => `
              <tr>
                <td class="center">${idx + 1}</td>
                <td>${item.description}</td>
                <td class="right">${item.qty}</td>
                <td class="right">${formatCurrency(item.unitPrice)}</td>
                <td class="right">${formatCurrency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals-section">
          <div class="totals-box">
            <div class="row"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal)}</span></div>
            ${taxRowsHTML}
            ${invoice.discount > 0 ? `<div class="row"><span>Diskon</span><span>- ${formatCurrency(invoice.discount)}</span></div>` : ''}
            <div class="row total"><span>Total</span><span>${formatCurrency(invoice.total)}</span></div>
          </div>
        </div>

        <!-- Terbilang -->
        <div class="terbilang-box">
          <p>Terbilang:</p>
          <p>${terbilang(invoice.total)}</p>
        </div>

        ${invoice.notes ? `<div style="margin-bottom:20px;"><p style="font-weight:600; margin-bottom:4px;">Catatan:</p><p style="color:#6b7280;">${invoice.notes}</p></div>` : ''}

        <!-- Bank Info -->
        ${settings?.bankName ? `
        <div class="info-box" style="margin-bottom:20px;">
          <h4>Informasi Pembayaran</h4>
          <p><strong>${settings.bankName}</strong></p>
          <p>No. Rekening: ${settings.bankAccount}</p>
          <p>a.n. ${settings.bankHolder}</p>
        </div>
        ` : ''}

        <!-- Signature & Stamp -->
        <div class="sign-area">
          <div class="stamp-box">
            ${stampHTML ? '<div class="stamp-img">' + stampHTML + '</div>' : '<div style="height:90px;"></div>'}
          </div>
          <div class="sign-box">
            <p style="font-size:10px; color:#6b7280;">Hormat kami,</p>
            <div class="sign-line">${companyName}</div>
          </div>
        </div>

        <!-- Tax Invoice Image (Auto-merged) -->
        ${taxInvoiceImageHTML}

        <!-- Footer -->
        <div class="footer">
          <p><strong>Terima kasih atas kepercayaan Anda</strong></p>
          <p>${companyName} — ${settings?.phone || ''} — ${settings?.email || ''}</p>
        </div>
      </div>
      </body></html>
    `;
  };

  const handlePrint = () => {
    const html = generatePrintHTML();
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 1000);
  };

  const handleDownloadPDF = () => {
    const html = generatePrintHTML();
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    }, 1000);
  };

  const handleWhatsAppShare = async () => {
    if (!invoice) return;
    const html = generatePrintHTML();

    // Try Web Share API first (can share files to WhatsApp)
    if (navigator.share && navigator.canShare) {
      try {
        const blob = new Blob([html], { type: 'text/html' });
        const file = new File([blob], invoice.invoiceNumber + '.html', { type: 'text/html' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Invoice ' + invoice.invoiceNumber,
            text: 'Invoice ' + invoice.invoiceNumber + ' - ' + invoice.customer.companyName,
            files: [file],
          });
          return;
        }
      } catch (e) {
        // User cancelled or share failed, fall through to text
      }
    }

    // Fallback: text-based WhatsApp message
    const msg = 'Yth. ' + invoice.customer.pic + ',\n\nBerikut invoice kami:\nNo: ' + invoice.invoiceNumber + '\nPelanggan: ' + invoice.customer.companyName + '\nTotal: Rp ' + formatCurrency(invoice.total) + '\nTanggal: ' + formatDate(invoice.issueDate) + '\nJatuh Tempo: ' + formatDate(invoice.dueDate) + '\n\nTerima kasih.';
    const phone = invoice.customer.whatsapp.replace(/[^0-9]/g, '');
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
  };

  const handleEmailShare = () => {
    if (!invoice) return;
    const subject = encodeURIComponent('Invoice ' + invoice.invoiceNumber + ' - ' + invoice.customer.companyName);
    const body = encodeURIComponent(
      'Yth. ' + invoice.customer.pic + ',\n\nBerikut detail invoice kami:\n\nNo. Invoice: ' + invoice.invoiceNumber + '\nPelanggan: ' + invoice.customer.companyName + '\nTanggal: ' + formatDate(invoice.issueDate) + '\nJatuh Tempo: ' + formatDate(invoice.dueDate) + '\nSubtotal: Rp ' + formatCurrency(invoice.subtotal) + '\nTotal: Rp ' + formatCurrency(invoice.total) + '\n\nTerbilang: ' + terbilang(invoice.total) + '\n\n' + (settings?.bankName ? 'Pembayaran:\n' + settings.bankName + '\nNo. Rekening: ' + settings.bankAccount + '\na.n. ' + settings.bankHolder : '') + '\n\nTerima kasih atas kepercayaan Anda.\n\nHormat kami,\n' + (settings?.companyName || 'PT Pest Killer Ngalam')
    );
    const email = invoice.customer.email;
    window.open('mailto:' + email + '?subject=' + subject + '&body=' + body, '_blank');
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

  // Hitung DPP Nilai Lain untuk ditampilkan (gunakan fungsi hitungPajak)
  const pajakCalc = hitungPajak(invoice.subtotal, invoice.taxType, 0);
  const dppNilaiLain = pajakCalc.dppNilaiLain;

  return (
    <>
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
              <div ref={printRef} id="invoice-print-area">
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
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 text-center">
                      <span className="text-xs text-amber-800 dark:text-amber-300">
                        No. Faktur Pajak: <strong>{invoice.taxInvoiceNumber}</strong>
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
                      {(invoice.taxType === 'include_pajak' || invoice.taxType === 'inclusive_ppn') && invoice.taxAmount > 0 && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>DPP Nilai Lain (11/12)</span>
                            <span>{formatCurrency(dppNilaiLain)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>PPN 12% x DPP Nilai Lain</span>
                            <span>{formatCurrency(invoice.taxAmount)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">* Harga sudah termasuk PPN (DPP Nilai Lain 11/12)</p>
                        </>
                      )}
                      {(invoice.taxType === 'exclude_pajak' || invoice.taxType === 'non_inclusive_ppn') && invoice.taxAmount > 0 && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>DPP Nilai Lain (11/12)</span>
                            <span>{formatCurrency(dppNilaiLain)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>PPN 12% x DPP Nilai Lain</span>
                            <span>{formatCurrency(invoice.taxAmount)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">* PPN 12% ditambahkan (DPP Nilai Lain 11/12)</p>
                        </>
                      )}
                      {(invoice.taxType === 'none' || !invoice.taxType) && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Pajak</span>
                          <span>Tanpa Pajak</span>
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

                  {/* Stamp & Signature */}
                  <div className="flex justify-between items-end mt-8">
                    <div className="text-center w-[200px]">
                      {settings?.stamp && <img src={settings.stamp} alt="Stempel" className="h-[90px] mb-1 opacity-90" />}
                    </div>
                    <div className="text-center w-[200px]">
                      <p className="text-sm text-muted-foreground">Hormat kami,</p>
                      <div className="mt-[60px]">
                        <div className="border-t border-foreground pt-2">
                          <p className="font-medium">{settings?.companyName || 'PT Pest Killer Ngalam'}</p>
                        </div>
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
                  <Label>Upload Faktur Pajak (PDF dari Coretax)</Label>
                  <Input type="file" accept=".pdf,application/pdf" onChange={handleFakturUpload} />
                  <p className="text-xs text-muted-foreground">Download faktur pajak dari Coretax dalam format PDF, lalu upload di sini.</p>
                  {invoice.taxInvoiceImage && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-emerald-600 mb-1">Faktur Pajak berhasil diupload</p>
                      {invoice.taxInvoiceImage.startsWith('data:application/pdf') ? (
                        <iframe src={invoice.taxInvoiceImage} className="w-full h-64 rounded-lg border" title="Faktur Pajak PDF" />
                      ) : (
                        <img src={invoice.taxInvoiceImage} alt="Faktur Pajak" className="max-h-48 rounded-lg border" />
                      )}
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
                <Button onClick={handleDownloadPDF} className="h-20 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Download className="w-8 h-8 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">Download PDF</p>
                    <p className="text-xs text-emerald-100">Simpan sebagai PDF</p>
                  </div>
                </Button>
                <Button onClick={() => setPreviewOpen(true)} className="h-20" variant="outline">
                  <Eye className="w-8 h-8 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">Preview Invoice</p>
                    <p className="text-xs text-muted-foreground">Lihat tampilan cetak</p>
                  </div>
                </Button>
                <Button onClick={handleWhatsAppShare} className="h-20 bg-green-600 hover:bg-green-700 text-white">
                  <MessageSquare className="w-8 h-8 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">Kirim via WhatsApp</p>
                    <p className="text-xs">Kirim ke pelanggan</p>
                  </div>
                </Button>
                <Button onClick={handleEmailShare} className="h-20 bg-blue-600 hover:bg-blue-700 text-white">
                  <Mail className="w-8 h-8 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">Kirim via Email</p>
                    <p className="text-xs text-blue-100">Buka email client</p>
                  </div>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Full-screen Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Preview Invoice</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
            <h3 className="font-semibold text-sm">Preview Invoice — {invoice?.invoiceNumber}</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Printer className="w-4 h-4 mr-1" /> Cetak
              </Button>
              <Button size="sm" onClick={handleDownloadPDF} variant="outline">
                <Download className="w-4 h-4 mr-1" /> PDF
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPreviewOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 bg-white">
            <iframe
              id="preview-iframe"
              className="w-full border-0"
              style={{ minHeight: 'calc(95vh - 60px)' }}
              title="Preview Invoice"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
