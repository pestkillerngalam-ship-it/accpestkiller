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
    const customer = await db.customer.findUnique({
      where: { id },
      include: { _count: { select: { invoices: true } } },
    });
    if (!customer) return NextResponse.json({ error: 'Pelanggan tidak ditemukan' }, { status: 404 });
    return NextResponse.json(customer);
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

    const existing = await db.customer.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Pelanggan tidak ditemukan' }, { status: 404 });

    const customer = await db.customer.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Customer update error:', error);
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
    await db.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Customer delete error:', error);
    // Jika pelanggan masih punya invoice relasi, berikan pesan yang lebih spesifik
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2003') {
      return NextResponse.json({ error: 'Pelanggan tidak bisa dihapus karena masih memiliki invoice terkait' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}