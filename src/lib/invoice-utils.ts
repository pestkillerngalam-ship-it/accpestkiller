export function roundToNearestThousand(amount: number): number {
  return Math.ceil(amount / 1000) * 1000;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  return `INV/PESTKILLER/${month}/${year}/0001`;
}

export async function getNextInvoiceNumber(existingNumbers: string[]): Promise<string> {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  const prefix = `INV/PESTKILLER/${month}/${year}/`;
  const existingInPeriod = existingNumbers
    .filter((n) => n.startsWith(prefix))
    .map((n) => {
      const parts = n.split('/');
      return parseInt(parts[4], 10);
    })
    .filter((n) => !isNaN(n));

  const nextNum = existingInPeriod.length > 0 ? Math.max(...existingInPeriod) + 1 : 1;
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

// Default due date: 10 days from invoice date
export function getDefaultDueDate(issueDate: string): string {
  const d = new Date(issueDate);
  d.setDate(d.getDate() + 10);
  return d.toISOString().split('T')[0];
}

// Auto description for pest control
export function getDefaultDescription(): string {
  const now = new Date();
  const bulan = now.toLocaleDateString('id-ID', { month: 'long' });
  const tahun = now.getFullYear();
  return `Jasa Pest Control Bulan ${bulan} ${tahun}`;
}