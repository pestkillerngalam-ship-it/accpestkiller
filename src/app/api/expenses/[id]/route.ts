import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

async function authenticate(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
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

    // Calculate tax
    let taxAmount = 0;
    const taxType = body.taxType || 'none';
    if (taxType === 'ppn12') {
      taxAmount = Math.round(body.amount * 0.12);
    } else if (taxType === 'pph23') {
      taxAmount = Math.round(body.amount * 0.02);
    }
    const totalAmount = body.amount + taxAmount;

    const expense = await db.expense.update({
      where: { id },
      data: {
        category: body.category,
        date: new Date(body.date),
        description: body.description,
        amount: body.amount,
        taxType,
        taxAmount,
        totalAmount,
        notes: body.notes || '',
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Expense update error:', error);
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
    await db.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}