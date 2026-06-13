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
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { pic: { contains: search } },
        { whatsapp: { contains: search } },
      ];
    }
    if (status) where.status = status;
    const customers = await db.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { invoices: true } } },
    });
    return NextResponse.json(customers);
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    const body = await request.json();
    const customer = await db.customer.create({ data: body });
    return NextResponse.json(customer, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
