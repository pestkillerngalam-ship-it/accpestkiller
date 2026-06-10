import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  try {
    const existingOwner = await db.user.findFirst({ where: { role: 'owner' } });
    if (existingOwner) {
      return NextResponse.json({ message: 'Data awal sudah diinisialisasi' });
    }

    await db.user.create({
      data: {
        email: 'owner@pestkiller.id',
        password: hashPassword('owner123'),
        name: 'Owner',
        role: 'owner',
      },
    });

    const existingSettings = await db.companySettings.findFirst();
    if (!existingSettings) {
      await db.companySettings.create({
        data: {
          companyName: 'PT Pest Killer Ngalam',
          address: 'Jl. Raya Malang No. 100, Malang, Jawa Timur',
          phone: '0341-123456',
          email: 'info@pestkiller-ngalam.id',
          website: 'www.pestkiller-ngalam.id',
          npwp: '12.345.678.9-012.000',
          bankName: 'Bank BRI',
          bankAccount: '0001-2345-6789-01',
          bankHolder: 'PT Pest Killer Ngalam',
          initialCapital: 100000000,
          initialBalance: 50000000,
        },
      });
    }

    return NextResponse.json({ message: 'Data awal berhasil diinisialisasi' }, { status: 201 });
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const userCount = await db.user.count();
    const settingsCount = await db.companySettings.count();
    return NextResponse.json({ initialized: userCount > 0 && settingsCount > 0 });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
