// Fallback: if server PDF generation fails, client can request HTML view and window.print.
// This route returns the invoice HTML (same as PDF HTML) so the client can open a new tab and print to PDF.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

async function authenticate(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

function renderInvoiceHtml(invoice: any) {
  const itemsHtml = (invoice.items || []).map((it: any) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd">${it.description}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${it.qty}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${Number(it.unitPrice).toLocaleString('id-ID')}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${Number(it.total).toLocaleString('id-ID')}</td>
    </tr>
  `).join('');

  const companyName = invoice.customer?.companyName || 'Pestkiller';
  const invoiceNumber = invoice.invoiceNumber || '';
  const issueDate = new Date(invoice.issueDate).toLocaleDateString('id-ID');
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('id-ID');

  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Invoice ${invoiceNumber}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #111827; }
      .container { max-width: 800px; margin: 0 auto; padding: 24px; }
      h1 { margin: 0 0 8px 0 }
      table { width: 100%; border-collapse: collapse; margin-top: 12px }
      .meta { margin-top: 12px; }
      .right { text-align: right }
      .bold { font-weight: 700 }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Invoice</h1>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div class="bold">${companyName}</div>
          </div>
          <div class="right">
            <div>Invoice: <span class="bold">${invoiceNumber}</span></div>
            <div>Tanggal: ${issueDate}</div>
            <div>Jatuh Tempo: ${dueDate}</div>
            <div>Status: ${invoice.status || ''}</div>
          </div>
        </div>
      </div>

      <div class="meta">
        <div><strong>Tagih ke:</strong></div>
        <div>${invoice.customer?.companyName || '-'}</div>
        <div>${invoice.customer?.address || ''}</div>
        <div>${invoice.customer?.email || ''}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Deskripsi</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Qty</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Harga Satuan</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;margin-top:12px">
        <table style="width:300px;border-collapse:collapse">
          <tr>
            <td style="padding:8px;border:1px solid #ddd">Subtotal</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">Rp ${Number(invoice.subtotal || 0).toLocaleString('id-ID')}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd">Pajak</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">Rp ${Number(invoice.taxAmount || 0).toLocaleString('id-ID')}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd" class="bold">Total</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right" class="bold">Rp ${Number(invoice.total || 0).toLocaleString('id-ID')}</td>
          </tr>
        </table>
      </div>

    </div>
  </body>
  </html>
  `;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: 'ID invoice diperlukan' }, { status: 400 });

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { customer: true, items: true },
    });

    if (!invoice) return NextResponse.json({ error: 'Invoice tidak ditemukan' }, { status: 404 });

    const html = renderInvoiceHtml(invoice);

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Invoice HTML error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
