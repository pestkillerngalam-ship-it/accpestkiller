export function roundToNearestThousand(amount: number): number {
  return Math.ceil(amount / 1000) * 1000;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  return `INV/PESTKILLER/${year}/0001`;
}

export async function getNextInvoiceNumber(existingNumbers: string[]): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const prefix = `INV/PESTKILLER/${year}/`;
  const existingInYear = existingNumbers
    .filter((n) => n.startsWith(prefix))
    .map((n) => {
      const parts = n.split('/');
      return parseInt(parts[3], 10);
    })
    .filter((n) => !isNaN(n));

  const nextNum = existingInYear.length > 0 ? Math.max(...existingInYear) + 1 : 1;
  return `${prefix}${nextNum.toString().padStart(4, '0')}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}
