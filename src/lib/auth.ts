import crypto from 'crypto';

const JWT_SECRET = 'pestkiller-ngalam-secret-key-2024-very-secure';

interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export function signToken(payload: JWTPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: decoded.userId, email: decoded.email, name: decoded.name, role: decoded.role };
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
