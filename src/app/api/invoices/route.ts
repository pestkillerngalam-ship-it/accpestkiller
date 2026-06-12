import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getNextInvoiceNumber } from '@/lib/invoice-utils';

async function authenticate(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customer: { companyName: { contains: search } } },
      ];
    }
    const invoices = await db.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: true,
      },
    });
    return NextResponse.json(invoices);
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    const body = await request.json();
    const { items, ...invoiceData } = body;

    // Generate invoice number: INV/PESTKILLER/MM/YYYY/0001
    const allInvoices = await db.invoice.findMany({ select: { invoiceNumber: true } });
    const invoiceNumber = await getNextInvoiceNumber(allInvoices.map(i => i.invoiceNumber));

    const invoice = await db.invoice.create({
      data: {
        ...invoiceData,
        invoiceNumber,
        issueDate: new Date(invoiceData.issueDate),
        dueDate: new Date(invoiceData.dueDate),
        taxInvoiceDate: invoiceData.taxInvoiceDate ? new Date(invoiceData.taxInvoiceDate) : null,
        taxInvoiceStatus: invoiceData.taxInvoiceStatus || (invoiceData.taxInvoiceNumber ? 'created' : 'not_created'),
        items: {
          create: items.map((item: { description: string; qty: number; unitPrice: number; total: number }) => ({
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        },
      },
      include: { customer: true, items: true },
    });

    // Log transaction
    if (invoice.status === 'paid') {
      await db.transactionLog.create({
        data: {
          type: 'income',
          description: `Pembayaran ${invoice.invoiceNumber} - ${invoice.customer.companyName}`,
          amount: invoice.total,
          date: new Date(),
        },
      });
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Invoice create error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}