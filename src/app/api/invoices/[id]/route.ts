import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

async function authenticate(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    const { id } = await params;
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { customer: true, items: true },
    });
    if (!invoice) return NextResponse.json({ error: 'Invoice tidak ditemukan' }, { status: 404 });
    return NextResponse.json(invoice);
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    const existing = await db.invoice.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Invoice tidak ditemukan' }, { status: 404 });

    // Handle items update
    if (body.items) {
      await db.invoiceItem.deleteMany({ where: { invoiceId: id } });
    }

    const { items, ...invoiceData } = body;
    const updateData: Record<string, unknown> = { ...invoiceData };
    if (updateData.issueDate) updateData.issueDate = new Date(updateData.issueDate as string);
    if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate as string);
    if (updateData.taxInvoiceDate) updateData.taxInvoiceDate = new Date(updateData.taxInvoiceDate as string);
    if (updateData.taxInvoiceDate === null) updateData.taxInvoiceDate = null;

    const invoice = await db.invoice.update({
      where: { id },
      data: {
        ...updateData,
        items: items ? {
          create: items.map((item: { description: string; qty: number; unitPrice: number; total: number }) => ({
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        } : undefined,
      },
      include: { customer: true, items: true },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Invoice update error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    const { id } = await params;
    await db.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}