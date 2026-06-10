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
    let settings = await db.companySettings.findFirst();
    if (!settings) {
      settings = await db.companySettings.create({
        data: {
          companyName: 'PT Pest Killer Ngalam',
          address: '',
          phone: '',
          email: '',
          website: '',
          npwp: '',
          logo: '',
          stamp: '',
          bankName: '',
          bankAccount: '',
          bankHolder: '',
          initialCapital: 0,
          initialBalance: 0,
        },
      });
    }
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    const body = await request.json();
    let settings = await db.companySettings.findFirst();
    if (!settings) {
      settings = await db.companySettings.create({ data: body });
    } else {
      settings = await db.companySettings.update({ where: { id: settings.id }, data: body });
    }
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
