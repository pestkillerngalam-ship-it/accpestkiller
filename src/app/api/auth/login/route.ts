import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, signToken, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 });
    }
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
    }
    const token = signToken({ userId: user.id, email: user.email, name: user.name, role: user.role });
    return NextResponse.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
