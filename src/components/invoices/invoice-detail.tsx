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
  MessageSquare,
  FileCheck,
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

  // Load preview iframe content — use setTimeout because Dialog needs time to render the iframe into DOM
  useEffect(() => {
    if (previewOpen && invoice) {
      const timer = setTimeout(() => {
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
      }, 150);
      return () => clearTimeout(timer);
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
    var companyName = settings && settings.companyName ? settings.companyName : 'PT Pest Killer Ngalam';
    var companyAddress = settings && settings.address ? settings.address : '';
    var companyPhone = settings && settings.phone ? settings.phone : '';
    var companyEmail = settings && settings.email ? settings.email : '';
    var companyNPWP = settings && settings.npwp ? settings.npwp : '';
    var directorName = settings && settings.bankHolder ? settings.bankHolder : 'Sulianto';

    var logoHTML = settings && settings.logo
      ? '<img src="' + settings.logo + '" style="max-height:45px;max-width:120px;object-fit:contain;" />'
      : '';

    // ========== DETERMINE TAX STATUS ==========
    var hasTax = (invoice.taxType === 'include_pajak' || invoice.taxType === 'inclusive_ppn' || invoice.taxType === 'exclude_pajak' || invoice.taxType === 'non_inclusive_ppn') && invoice.taxAmount > 0;

    // ========== CALCULATE DISPLAY VALUES ==========
    var pajakResult = hitungPajak(invoice.subtotal, invoice.taxType, 0);
    var hargaJual = invoice.subtotal;
    var dppNilaiLain = 0;
    var ppnAmount = 0;

    if (hasTax) {
      if (invoice.taxType === 'include_pajak' || invoice.taxType === 'inclusive_ppn') {
        hargaJual = Math.round(invoice.subtotal / 1.11);
      }
      dppNilaiLain = pajakResult.dppNilaiLain;
      ppnAmount = invoice.taxAmount;
    }

    // ========== DOCUMENT TITLE ==========
    var docTitle = hasTax ? 'INVOICE & FAKTUR PAJAK' : 'INVOICE';

    // ========== SIGNATURE DATE ==========
    var signDate = 'Malang, ' + formatDate(invoice.issueDate);

    // ========== BUILD ITEMS HTML ==========
    var itemsHTML = '';
    for (var i = 0; i < invoice.items.length; i++) {
      var item = invoice.items[i];
      itemsHTML += '<tr>'
        + '<td style="width:25px;text-align:center;padding:4px 3px;font-size:9pt;color:#333;border-bottom:1px solid #e5e5e5;">' + (i + 1) + '</td>'
        + '<td style="padding:4px 4px;font-size:9pt;color:#333;border-bottom:1px solid #e5e5e5;">' + item.description + '</td>'
        + '<td style="width:40px;text-align:center;padding:4px 3px;font-size:9pt;color:#333;border-bottom:1px solid #e5e5e5;">' + item.qty + '</td>'
        + '<td style="width:95px;text-align:right;padding:4px 4px;font-size:9pt;color:#333;border-bottom:1px solid #e5e5e5;">' + formatCurrency(item.unitPrice) + '</td>'
        + '<td style="width:105px;text-align:right;padding:4px 4px;font-size:9pt;color:#333;border-bottom:1px solid #e5e5e5;">' + formatCurrency(item.total) + '</td>'
        + '</tr>';
    }

    // ========== BUILD CALCULATION SUMMARY (right column) ==========
    var calcHTML = '';
    if (hasTax) {
      calcHTML += '<tr><td style="padding:2px 0;font-size:9pt;color:#555;border:none;">Harga Jual/Penggantian</td><td style="padding:2px 0;font-size:9pt;color:#333;text-align:right;border:none;">' + formatCurrency(hargaJual) + '</td></tr>';
      calcHTML += '<tr><td style="padding:2px 0;font-size:9pt;color:#555;border:none;">DPP Nilai Lain (11/12)</td><td style="padding:2px 0;font-size:9pt;color:#333;text-align:right;border:none;">' + formatCurrency(dppNilaiLain) + '</td></tr>';
      calcHTML += '<tr><td style="padding:2px 0;font-size:9pt;color:#555;border:none;">PPN 12%</td><td style="padding:2px 0;font-size:9pt;color:#333;text-align:right;border:none;">' + formatCurrency(ppnAmount) + '</td></tr>';
    } else {
      calcHTML += '<tr><td style="padding:2px 0;font-size:9pt;color:#555;border:none;">Harga Jual/Penggantian</td><td style="padding:2px 0;font-size:9pt;color:#333;text-align:right;border:none;">' + formatCurrency(hargaJual) + '</td></tr>';
    }

    if (invoice.discount > 0) {
      calcHTML += '<tr><td style="padding:2px 0;font-size:9pt;color:#dc2626;border:none;">Diskon</td><td style="padding:2px 0;font-size:9pt;color:#dc2626;text-align:right;border:none;">- ' + formatCurrency(invoice.discount) + '</td></tr>';
    }

    // ========== FAKTUR PAJAK ROWS (only if hasTax) ==========
    var fakturRowsHTML = '';
    if (hasTax) {
      if (invoice.taxInvoiceNumber) {
        fakturRowsHTML += '<tr><td style="padding:1px 0;font-size:8pt;color:#666;border:none;">No. Faktur Pajak</td><td style="padding:1px 0;font-size:8pt;border:none;">: ' + invoice.taxInvoiceNumber + '</td></tr>';
      }
      if (invoice.taxInvoiceDate) {
        fakturRowsHTML += '<tr><td style="padding:1px 0;font-size:8pt;color:#666;border:none;">Tgl Faktur Pajak</td><td style="padding:1px 0;font-size:8pt;border:none;">: ' + formatDate(invoice.taxInvoiceDate) + '</td></tr>';
      }
    }

    // ========== CUSTOMER DATA ROWS ==========
    var customerAddrHTML = '';
    if (invoice.customer.address) {
      customerAddrHTML = '<tr><td style="padding:1px 0;font-size:8pt;color:#666;border:none;vertical-align:top;">Alamat</td><td style="padding:1px 0;font-size:8pt;border:none;">: ' + invoice.customer.address + '</td></tr>';
    }
    var customerNPWPHTML = '';
    if (invoice.customer.npwp) {
      customerNPWPHTML = '<tr><td style="padding:1px 0;font-size:8pt;color:#666;border:none;">NPWP Pembeli</td><td style="padding:1px 0;font-size:8pt;border:none;">: ' + invoice.customer.npwp + '</td></tr>';
    }

    // ========== BANK INFO BOX ==========
    var bankHTML = '';
    if (settings && settings.bankName) {
      bankHTML = '<div style="border:1px solid #d0d0d0;padding:4px 7px;">'
        + '<div style="font-size:7pt;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Informasi Rekening Bank Transfer</div>'
        + '<table style="width:100%;border:none;"><tbody>'
        + '<tr><td style="padding:1px 0;font-size:8pt;color:#666;border:none;">Bank</td><td style="padding:1px 0;font-size:8pt;border:none;font-weight:600;">: ' + settings.bankName + '</td></tr>'
        + '<tr><td style="padding:1px 0;font-size:8pt;color:#666;border:none;">No. Rekening</td><td style="padding:1px 0;font-size:8pt;border:none;">: ' + settings.bankAccount + '</td></tr>'
        + '<tr><td style="padding:1px 0;font-size:8pt;color:#666;border:none;">a.n.</td><td style="padding:1px 0;font-size:8pt;border:none;">: ' + settings.bankHolder + '</td></tr>'
        + '</tbody></table></div>';
    }

    // ========== NOTES ==========
    var notesHTML = '';
    if (invoice.notes) {
      notesHTML = '<p style="font-size:8pt;color:#666;margin:4px 0 0 0;"><b>Catatan:</b> ' + invoice.notes + '</p>';
    }

    // ========== STAMP CONTENT ==========
    var stampContentHTML = '';
    if (settings && settings.stamp) {
      stampContentHTML = '<div style="height:70px;"><img src="' + settings.stamp + '" style="height:70px;width:auto;display:block;opacity:0.85;" /></div>';
    } else {
      stampContentHTML = '<div style="height:70px;"></div>';
    }
    // Extra spacer to match right column height (name+director+line below 70px space)
    stampContentHTML += '<div style="height:30px;"></div>';

    // ==================== 1-LEMBAR A4: INVOICE & FAKTUR PAJAK GABUNGAN ====================
    var html = '<!DOCTYPE html><html><head><title></title>'
      + '<style>'
      + '@page{size:A4;margin:10mm 12mm;}'
      + '*{box-sizing:border-box;margin:0;padding:0;}'
      + 'body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#222;line-height:1.4;}'
      + '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}'
      + '</style></head><body>'

      // ===== 1. HEADER (2 Kolom) =====
      + '<table width="100%" style="border-collapse:collapse;margin-bottom:5px;">'
      + '<tr>'
      + '<td style="width:58%;vertical-align:top;padding:0;">'
      + (logoHTML ? '<div style="margin-bottom:3px;">' + logoHTML + '</div>' : '')
      + '<div style="font-size:12pt;font-weight:700;color:#1e3a5f;">' + companyName + '</div>'
      + '<div style="font-size:8pt;color:#555;line-height:1.5;margin-top:1px;">'
      + (companyAddress ? companyAddress + '<br/>' : '')
      + (companyPhone ? 'Telp: ' + companyPhone : '')
      + (companyPhone && companyEmail ? ' | ' : '')
      + (companyEmail ? companyEmail : '')
      + '</div>'
      + (companyNPWP ? '<div style="font-size:8pt;color:#555;">NPWP Penjual: ' + companyNPWP + '</div>' : '')
      + '</td>'
      + '<td style="width:42%;vertical-align:top;text-align:right;padding:0;">'
      + '<div style="font-size:15pt;font-weight:700;color:#1e3a5f;letter-spacing:2px;">' + docTitle + '</div>'
      + '</td>'
      + '</tr></table>'

      // ===== GARIS PEMISAH =====
      + '<div style="height:2px;background:#1e3a5f;margin:3px 0 6px 0;"></div>'

      // ===== 2. BLOK DATA (2 Kolom Sejajar) =====
      + '<table width="100%" style="border-collapse:collapse;margin-bottom:6px;">'
      + '<tr>'
      + '<td style="width:50%;vertical-align:top;padding-right:10px;">'
      + '<div style="font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1e3a5f;border-bottom:1.5px solid #1e3a5f;display:inline-block;margin-bottom:3px;padding-bottom:1px;">Kepada</div>'
      + '<table style="width:100%;border:none;"><tbody>'
      + '<tr><td style="padding:1px 0;font-size:8pt;color:#666;border:none;">Perusahaan</td><td style="padding:1px 0;font-size:9pt;font-weight:600;border:none;">: ' + invoice.customer.companyName + '</td></tr>'
      + '<tr><td style="padding:1px 0;font-size:8pt;color:#666;border:none;">PIC</td><td style="padding:1px 0;font-size:9pt;border:none;">: ' + invoice.customer.pic + '</td></tr>'
      + customerAddrHTML
      + customerNPWPHTML
      + '</tbody></table>'
      + '</td>'
      + '<td style="width:50%;vertical-align:top;padding-left:10px;">'
      + '<div style="font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1e3a5f;border-bottom:1.5px solid #1e3a5f;display:inline-block;margin-bottom:3px;padding-bottom:1px;">Detail Dokumen</div>'
      + '<table style="width:100%;border:none;"><tbody>'
      + '<tr><td style="padding:1px 0;font-size:8pt;color:#666;border:none;">No. Invoice</td><td style="padding:1px 0;font-size:8pt;border:none;">: ' + invoice.invoiceNumber + '</td></tr>'
      + '<tr><td style="padding:1px 0;font-size:8pt;color:#666;border:none;">Tanggal Invoice</td><td style="padding:1px 0;font-size:8pt;border:none;">: ' + formatDate(invoice.issueDate) + '</td></tr>'
      + '<tr><td style="padding:1px 0;font-size:8pt;color:#666;border:none;">Jatuh Tempo</td><td style="padding:1px 0;font-size:8pt;border:none;">: ' + formatDate(invoice.dueDate) + '</td></tr>'
      + fakturRowsHTML
      + '</tbody></table>'
      + '</td>'
      + '</tr></table>'

      // ===== 3. TABEL ITEM =====
      + '<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6px;">'
      + '<thead><tr>'
      + '<th style="width:25px;background:#1e3a5f;color:#fff;padding:4px 3px;font-size:7.5pt;text-align:center;border:1px solid #1e3a5f;">No</th>'
      + '<th style="background:#1e3a5f;color:#fff;padding:4px 4px;font-size:7.5pt;text-align:left;border:1px solid #1e3a5f;">Deskripsi Jasa</th>'
      + '<th style="width:40px;background:#1e3a5f;color:#fff;padding:4px 3px;font-size:7.5pt;text-align:center;border:1px solid #1e3a5f;">Qty</th>'
      + '<th style="width:95px;background:#1e3a5f;color:#fff;padding:4px 4px;font-size:7.5pt;text-align:right;border:1px solid #1e3a5f;">Harga Satuan</th>'
      + '<th style="width:105px;background:#1e3a5f;color:#fff;padding:4px 4px;font-size:7.5pt;text-align:right;border:1px solid #1e3a5f;">Jumlah</th>'
      + '</tr></thead>'
      + '<tbody>' + itemsHTML + '</tbody>'
      + '</table>'

      // ===== 4. RINGKASAN BAWAH (2 Kolom) =====
      + '<table width="100%" style="border-collapse:collapse;margin-bottom:8px;">'
      + '<tr>'
      + '<td style="width:52%;vertical-align:top;padding-right:10px;">'
      + '<div style="border:1px solid #d0d0d0;padding:4px 7px;margin-bottom:5px;">'
      + '<div style="font-size:7pt;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px;">Terbilang</div>'
      + '<div style="font-size:9pt;font-style:italic;color:#333;">' + terbilang(invoice.total) + '</div>'
      + '</div>'
      + bankHTML
      + notesHTML
      + '</td>'
      + '<td style="width:48%;vertical-align:top;padding-left:10px;">'
      + '<table style="width:100%;border-collapse:collapse;"><tbody>'
      + calcHTML
      + '<tr><td colspan="2" style="border:none;padding:0;height:1.5px;background:#1e3a5f;"></td></tr>'
      + '<tr>'
      + '<td style="padding:3px 0 0 0;font-size:11pt;font-weight:700;color:#1e3a5f;border:none;">TOTAL</td>'
      + '<td style="padding:3px 0 0 0;font-size:11pt;font-weight:700;color:#1e3a5f;text-align:right;border:none;">Rp ' + formatCurrency(invoice.total) + '</td>'
      + '</tr>'
      + '</tbody></table>'
      + '</td>'
      + '</tr></table>'

      // ===== 5. FOOTER: STEMPEL (kiri) + TTD (kanan) — TABEL border:none =====
      + '<table width="100%" style="border:none;">'
      + '<tr>'
      + '<td style="width:50%;text-align:left;border:none;vertical-align:bottom;">'
      + '<div style="font-size:8pt;color:#888;">[Tempat Stempel Perusahaan]</div>'
      + stampContentHTML
      + '</td>'
      + '<td style="width:50%;text-align:center;border:none;vertical-align:top;">'
      + '<div style="font-size:8pt;color:#666;">' + signDate + '</div>'
      + '<div style="font-size:9pt;font-weight:700;color:#333;margin-top:1px;">' + companyName + '</div>'
      + '<div style="height:70px;"></div>'
      + '<div style="border-bottom:1px solid #333;width:200px;margin:0 auto;"></div>'
      + '<div style="font-size:9pt;font-weight:700;color:#333;margin-top:3px;">' + directorName + '</div>'
      + '<div style="font-size:8pt;color:#666;">Direktur</div>'
      + '</td>'
      + '</tr></table>'

      + '</body></html>';

    return html;
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

                  {/* Stamp & Signature - Table based for perfect sync */}
                  <div className="mt-8">
                    <table style={{ width: '100%', border: 'none' }}>
                      <tbody>
                        <tr style={{ height: '110px' }}>
                          <td style={{ width: '50%', verticalAlign: 'bottom', textAlign: 'center', border: 'none' }}>
                            {settings?.stamp ? (
                              <img src={settings.stamp} alt="Stempel" style={{ maxHeight: '85px', maxWidth: '130px', objectFit: 'contain', opacity: 0.9 }} />
                            ) : (
                              <div style={{ height: '85px' }} />
                            )}
                          </td>
                          <td style={{ width: '50%', verticalAlign: 'bottom', textAlign: 'center', border: 'none' }}>
                            <p className="text-xs text-muted-foreground" style={{ marginBottom: '60px' }}>Hormat kami,</p>
                            <div className="border-t border-foreground pt-2">
                              <p className="font-medium">{settings?.companyName || 'PT Pest Killer Ngalam'}</p>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
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
