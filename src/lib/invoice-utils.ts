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

/**
 * Kalkulator Pajak — Mekanisme DPP Nilai Lain (Aturan PPN 12% penyesuaian 11/12)
 *
 * @param nilaiInput - Subtotal harga item (angka)
 * @param kategoriPajak - 'none' | 'include_pajak' | 'exclude_pajak'
 *   (juga menerima nilai lama: 'inclusive_ppn', 'non_inclusive_ppn', 'ppn12')
 * @param discount - Diskon dalam Rupiah (default 0)
 * @returns { dppNilaiLain, ppnTerutang, totalBayar }
 *
 * Rumus:
 * 1. none (tanpa_pajak): DPP=0, PPN=0, Total=nilaiInput
 * 2. exclude_pajak: DPP=(11/12)×nilaiInput, PPN=12%×DPP, Total=nilaiInput+PPN
 * 3. include_pajak: hargaJual=nilaiInput/1.11, DPP=(11/12)×hargaJual, PPN=12%×DPP
 */
export function hitungPajak(
  nilaiInput: number,
  kategoriPajak: string,
  discount: number = 0
): { dppNilaiLain: number; ppnTerutang: number; totalBayar: number } {
  const DPP_FACTOR = 11 / 12;
  const PPN_RATE = 0.12;

  // Normalisasi kategori pajak (dukung nilai lama)
  const kat = kategoriPajak === 'inclusive_ppn' ? 'include_pajak'
    : kategoriPajak === 'non_inclusive_ppn' ? 'exclude_pajak'
    : kategoriPajak === 'ppn12' ? 'exclude_pajak'
    : kategoriPajak;

  if (kat === 'exclude_pajak') {
    const dpp = Math.round(DPP_FACTOR * nilaiInput);
    const ppn = Math.round(PPN_RATE * dpp);
    const total = Math.round(nilaiInput + ppn - discount);
    return { dppNilaiLain: dpp, ppnTerutang: ppn, totalBayar: total };
  }

  if (kat === 'include_pajak') {
    const hargaJual = nilaiInput / 1.11;
    const dpp = Math.round(DPP_FACTOR * hargaJual);
    const ppn = Math.round(PPN_RATE * dpp);
    const total = Math.round(nilaiInput - discount);
    return { dppNilaiLain: dpp, ppnTerutang: ppn, totalBayar: total };
  }

  // tanpa_pajak / none
  return {
    dppNilaiLain: 0,
    ppnTerutang: 0,
    totalBayar: Math.round(nilaiInput - discount),
  };
}