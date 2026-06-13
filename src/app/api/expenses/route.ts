import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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
    const category = searchParams.get('category') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    }
    const expenses = await db.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(expenses);
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
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

    const expense = await db.expense.create({
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

    await db.transactionLog.create({
      data: {
        type: 'expense',
        description: body.description,
        amount: totalAmount,
        date: new Date(body.date),
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Expense create error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}