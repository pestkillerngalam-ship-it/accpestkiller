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
    const expense = await db.expense.create({
      data: {
        ...body,
        date: new Date(body.date),
      },
    });

    await db.transactionLog.create({
      data: {
        type: 'expense',
        description: body.description,
        amount: body.amount,
        date: new Date(body.date),
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
