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
    const companyName = settings?.companyName || 'PT Pest Killer Ngalam';
    const logoHTML = settings?.logo
      ? '<img src="' + settings.logo + '" alt="Logo" style="max-height:50px;max-width:140px;object-fit:contain;" />'
      : '';
    const stampHTML = settings?.stamp
      ? '<img src="' + settings.stamp + '" alt="Stempel" style="max-height:85px;max-width:130px;object-fit:contain;" />'
      : '';

    // Hitung ulang DPP Nilai Lain untuk ditampilkan di PDF
    var pajakResult = hitungPajak(invoice.subtotal, invoice.taxType, 0);
    var dppNilaiLain = pajakResult.dppNilaiLain;

    // Bangun HTML baris pajak (string concatenation untuk menghindari masalah parsing Turbopack)
    var taxRowsHTML = '';
    if ((invoice.taxType === 'include_pajak' || invoice.taxType === 'inclusive_ppn') && invoice.taxAmount > 0) {
      taxRowsHTML += '<tr><td style="padding:3px 0;color:#666;">DPP Nilai Lain (11/12)</td><td style="text-align:right;padding:3px 0;">' + formatCurrency(dppNilaiLain) + '</td></tr>';
      taxRowsHTML += '<tr><td style="padding:3px 0;color:#666;">PPN 12% x DPP Nilai Lain</td><td style="text-align:right;padding:3px 0;">' + formatCurrency(invoice.taxAmount) + '</td></tr>';
    } else if ((invoice.taxType === 'exclude_pajak' || invoice.taxType === 'non_inclusive_ppn') && invoice.taxAmount > 0) {
      taxRowsHTML += '<tr><td style="padding:3px 0;color:#666;">DPP Nilai Lain (11/12)</td><td style="text-align:right;padding:3px 0;">' + formatCurrency(dppNilaiLain) + '</td></tr>';
      taxRowsHTML += '<tr><td style="padding:3px 0;color:#666;">PPN 12% x DPP Nilai Lain</td><td style="text-align:right;padding:3px 0;">' + formatCurrency(invoice.taxAmount) + '</td></tr>';
    } else {
      taxRowsHTML += '<tr><td style="padding:3px 0;color:#666;">Pajak</td><td style="text-align:right;padding:3px 0;">Tanpa Pajak</td></tr>';
    }

    // Bangun baris faktur pajak info
    var fakturInfoHTML = '';
    if (invoice.taxInvoiceNumber) {
      fakturInfoHTML += '<tr><td style="padding:2px 0;color:#666;vertical-align:top;">No. Faktur Pajak</td><td style="padding:2px 0;font-weight:600;">' + invoice.taxInvoiceNumber + '</td></tr>';
    }
    if (invoice.taxInvoiceDate) {
      fakturInfoHTML += '<tr><td style="padding:2px 0;color:#666;">Tgl. Faktur Pajak</td><td style="padding:2px 0;">' + formatDate(invoice.taxInvoiceDate) + '</td></tr>';
    }

    // Bangun baris item table (ALL inline styles untuk jaminan print/PDF)
    var itemsHTML = '';
    for (var i = 0; i < invoice.items.length; i++) {
      var item = invoice.items[i];
      itemsHTML += '<tr>';
      itemsHTML += '<td style="text-align:center;padding:6px 6px;border-bottom:1px solid #f3f4f6;font-size:10px;color:#374151;">' + (i + 1) + '</td>';
      itemsHTML += '<td style="padding:6px 6px;border-bottom:1px solid #f3f4f6;font-size:10px;color:#374151;">' + item.description + '</td>';
      itemsHTML += '<td style="text-align:right;padding:6px 6px;border-bottom:1px solid #f3f4f6;font-size:10px;color:#374151;">' + item.qty + '</td>';
      itemsHTML += '<td style="text-align:right;padding:6px 6px;border-bottom:1px solid #f3f4f6;font-size:10px;color:#374151;">' + formatCurrency(item.unitPrice) + '</td>';
      itemsHTML += '<td style="text-align:right;padding:6px 6px;border-bottom:1px solid #f3f4f6;font-size:10px;color:#374151;">' + formatCurrency(item.total) + '</td>';
      itemsHTML += '</tr>';
    }

    // Bangun baris diskon
    var discountHTML = '';
    if (invoice.discount > 0) {
      discountHTML = '<tr><td style="padding:3px 0;color:#666;">Diskon</td><td style="text-align:right;padding:3px 0;color:#dc2626;">- ' + formatCurrency(invoice.discount) + '</td></tr>';
    }

    // Bangun catatan
    var notesHTML = '';
    if (invoice.notes) {
      notesHTML = '<p style="font-size:9px;color:#666;margin-bottom:8px;"><span style="font-weight:600;">Catatan:</span> ' + invoice.notes + '</p>';
    }

    // Bangun info bank
    var bankHTML = '';
    if (settings && settings.bankName) {
      bankHTML = '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;padding:8px 12px;margin-bottom:10px;">';
      bankHTML += '<p style="font-size:8px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px;margin-bottom:3px;">Informasi Pembayaran</p>';
      bankHTML += '<table style="width:auto;border:none;margin:0;"><tbody>';
      bankHTML += '<tr><td style="padding:1px 8px 1px 0;color:#666;font-size:10px;border:none;">Bank</td><td style="padding:1px 0;font-size:10px;font-weight:600;border:none;">: ' + settings.bankName + '</td></tr>';
      bankHTML += '<tr><td style="padding:1px 8px 1px 0;color:#666;font-size:10px;border:none;">No. Rekening</td><td style="padding:1px 0;font-size:10px;border:none;">: ' + settings.bankAccount + '</td></tr>';
      bankHTML += '<tr><td style="padding:1px 8px 1px 0;color:#666;font-size:10px;border:none;">a.n.</td><td style="padding:1px 0;font-size:10px;border:none;">: ' + settings.bankHolder + '</td></tr>';
      bankHTML += '</tbody></table></div>';
    }

    // Bangun info NPWP customer
    var customerNPWPHTML = '';
    if (invoice.customer.npwp) {
      customerNPWPHTML = '<tr><td style="padding:2px 0;color:#666;">NPWP</td><td style="padding:2px 0;font-size:9px;">' + invoice.customer.npwp + '</td></tr>';
    }

    // Bangun info alamat customer
    var customerAddressHTML = '';
    if (invoice.customer.address) {
      customerAddressHTML = '<tr><td style="padding:2px 0;color:#666;vertical-align:top;">Alamat</td><td style="padding:2px 0;">' + invoice.customer.address + '</td></tr>';
    }

    // Alamat perusahaan
    var companyAddress = (settings && settings.address) ? settings.address : '';
    var companyPhone = (settings && settings.phone) ? settings.phone : '';
    var companyEmail = (settings && settings.email) ? settings.email : '';
    var companyNPWP = (settings && settings.npwp) ? settings.npwp : '';

    return '<!DOCTYPE html><html><head><title>Invoice ' + invoice.invoiceNumber + '</title>'
      + '<style>'
      + '@page { size: A4; margin: 12mm 15mm; }'
      + '* { box-sizing: border-box; margin: 0; padding: 0; }'
      + 'body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; line-height: 1.4; font-size: 10px; }'
      + '.page { width: 100%; max-width: 210mm; margin: 0 auto; }'

      // Thin green accent bar at top
      + '.accent-bar { height: 4px; background: linear-gradient(90deg, #059669, #10b981, #34d399); margin-bottom: 14px; border-radius: 2px; }'

      // Header: Logo left, INVOICE right
      + '.header { display: table; width: 100%; margin-bottom: 12px; }'
      + '.header-left { display: table-cell; vertical-align: middle; width: 60%; }'
      + '.header-right { display: table-cell; vertical-align: middle; text-align: right; width: 40%; }'
      + '.header-right .inv-title { font-size: 22px; font-weight: 700; color: #059669; letter-spacing: 3px; }'
      + '.header-right .inv-number { font-size: 11px; font-weight: 600; color: #374151; margin-top: 2px; }'
      + '.company-name { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 2px; }'
      + '.company-detail { font-size: 9px; color: #6b7280; line-height: 1.4; }'

      // Horizontal line
      + '.divider { border: none; border-top: 1.5px solid #e5e7eb; margin: 10px 0; }'

      // Info section: 2 columns using table
      + '.info-section { display: table; width: 100%; margin-bottom: 10px; }'
      + '.info-left { display: table-cell; vertical-align: top; width: 50%; padding-right: 12px; }'
      + '.info-right { display: table-cell; vertical-align: top; width: 50%; padding-left: 12px; }'
      + '.info-label { font-size: 8px; text-transform: uppercase; color: #059669; font-weight: 700; letter-spacing: 1px; margin-bottom: 5px; padding-bottom: 3px; border-bottom: 1.5px solid #059669; display: inline-block; }'
      + '.info-table { width: 100%; border: none; }'
      + '.info-table td { padding: 2px 0; font-size: 10px; border: none; vertical-align: top; }'
      + '.info-table .lbl { color: #6b7280; width: 35%; padding-right: 6px; }'
      + '.info-table .val { color: #111827; font-weight: 500; }'

      // Items table
      + '.items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed; }'
      + '.items-table thead th { background: #059669; color: white; padding: 6px 6px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }'
      + '.items-table thead th.r { text-align: right; }'
      + '.items-table thead th.c { text-align: center; }'
      + '.items-table tbody td { padding: 5px 6px; border-bottom: 1px solid #f3f4f6; font-size: 10px; color: #374151; }'
      + '.items-table tbody td.r { text-align: right; }'
      + '.items-table tbody td.c { text-align: center; }'
      + '.items-table tbody tr:nth-child(even) td { background: #f9fafb; }'

      // Totals section - right aligned
      + '.totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 8px; }'
      + '.totals-table { border-collapse: collapse; }'
      + '.totals-table td { padding: 3px 12px; font-size: 10px; color: #374151; border: none; }'
      + '.totals-table td.r { text-align: right; min-width: 120px; }'
      + '.totals-table tr.total-row td { border-top: 2px solid #059669; font-weight: 700; font-size: 12px; color: #059669; padding-top: 5px; }'

      // Terbilang
      + '.terbilang { background: #ecfdf5; border-left: 3px solid #059669; padding: 5px 10px; margin-bottom: 10px; font-size: 9px; color: #374151; }'
      + '.terbilang strong { color: #059669; }'

      // Signature area - absolute positioning for pixel-perfect alignment
      + '.sign-area { position: relative; height: 120px; margin-top: 20px; }'
      + '.sign-stamp { position: absolute; bottom: 0; left: 0; width: 50%; text-align: center; }'
      + '.sign-sig { position: absolute; bottom: 0; right: 0; width: 50%; text-align: center; }'
      + '.sign-sig .hormat { font-size: 9px; color: #6b7280; margin: 0 0 55px 0; }'
      + '.sign-sig .sign-name { font-size: 11px; font-weight: 700; color: #111827; border-top: 1px solid #111827; padding-top: 4px; margin: 0; }'

      // Footer
      + '.footer { text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid #e5e7eb; }'
      + '.footer p { font-size: 8px; color: #9ca3af; margin: 1px 0; }'

      + '@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }'
      + '</style></head><body>'
      + '<div class="page">'

      // Green accent bar
      + '<div class="accent-bar"></div>'

      // Header
      + '<div class="header">'
      + '<div class="header-left">'
      + (logoHTML ? '<div style="margin-bottom:4px;">' + logoHTML + '</div>' : '')
      + '<div class="company-name">' + companyName + '</div>'
      + '<div class="company-detail">'
      + (companyAddress ? companyAddress + '<br/>' : '')
      + (companyPhone ? 'Telp: ' + companyPhone + ' | ' : '')
      + (companyEmail ? companyEmail + '<br/>' : '')
      + (companyNPWP ? 'NPWP: ' + companyNPWP : '')
      + '</div>'
      + '</div>'
      + '<div class="header-right">'
      + '<div class="inv-title">INVOICE</div>'
      + '<div class="inv-number">' + invoice.invoiceNumber + '</div>'
      + '</div>'
      + '</div>'

      + '<hr class="divider"/>'

      // Info Section: Invoice Details (left) + Customer (right)
      + '<div class="info-section">'
      + '<div class="info-left">'
      + '<div class="info-label">Detail Invoice</div>'
      + '<table class="info-table"><tbody>'
      + '<tr><td class="lbl">No. Invoice</td><td class="val">' + invoice.invoiceNumber + '</td></tr>'
      + '<tr><td class="lbl">Tanggal</td><td class="val">' + formatDate(invoice.issueDate) + '</td></tr>'
      + '<tr><td class="lbl">Jatuh Tempo</td><td class="val">' + formatDate(invoice.dueDate) + '</td></tr>'
      + fakturInfoHTML
      + '</tbody></table>'
      + '</div>'
      + '<div class="info-right">'
      + '<div class="info-label">Kepada</div>'
      + '<table class="info-table"><tbody>'
      + '<tr><td class="lbl">Perusahaan</td><td class="val">' + invoice.customer.companyName + '</td></tr>'
      + '<tr><td class="lbl">PIC</td><td class="val">' + invoice.customer.pic + '</td></tr>'
      + customerAddressHTML
      + customerNPWPHTML
      + '</tbody></table>'
      + '</div>'
      + '</div>'

      + '<hr class="divider"/>'

      // Items Table
      + '<table class="items-table">'
      + '<thead><tr>'
      + '<th class="c" style="width:35px;">No</th>'
      + '<th>Deskripsi</th>'
      + '<th class="r" style="width:45px;">Qty</th>'
      + '<th class="r" style="width:110px;">Harga Satuan</th>'
      + '<th class="r" style="width:110px;">Jumlah</th>'
      + '</tr></thead>'
      + '<tbody>' + itemsHTML + '</tbody>'
      + '</table>'

      // Totals
      + '<div class="totals-wrap">'
      + '<table class="totals-table"><tbody>'
      + '<tr><td>Subtotal</td><td class="r">' + formatCurrency(invoice.subtotal) + '</td></tr>'
      + taxRowsHTML
      + discountHTML
      + '<tr class="total-row"><td>TOTAL</td><td class="r">Rp ' + formatCurrency(invoice.total) + '</td></tr>'
      + '</tbody></table>'
      + '</div>'

      // Terbilang
      + '<div class="terbilang">'
      + 'Terbilang: <strong>' + terbilang(invoice.total) + '</strong>'
      + '</div>'

      // Notes
      + notesHTML

      // Bank Info
      + bankHTML

      // Signature & Stamp - table with inline styles, guaranteed bottom alignment
      + '<table style="width:100%;border:none;margin-top:20px;"><tr style="height:100px;">'
      + '<td style="width:50%;vertical-align:bottom;text-align:center;border:none;padding:0;">'
      + (stampHTML ? stampHTML : '<div style="height:80px;"></div>')
      + '</td>'
      + '<td style="width:50%;vertical-align:bottom;text-align:center;border:none;padding:0;">'
      + '<p style="font-size:9px;color:#6b7280;margin:0 0 55px 0;">Hormat kami,</p>'
      + '<p style="font-size:11px;font-weight:700;color:#111827;border-top:1px solid #111827;padding-top:4px;margin:0;">' + companyName + '</p>'
      + '</td>'
      + '</tr></table>'

      // Footer
      + '<div class="footer">'
      + '<p><strong>Terima kasih atas kepercayaan Anda</strong></p>'
      + '<p>' + companyName + (companyPhone ? ' | ' + companyPhone : '') + (companyEmail ? ' | ' + companyEmail : '') + '</p>'
      + '</div>'

      + '</div>'
      + '</body></html>';
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
