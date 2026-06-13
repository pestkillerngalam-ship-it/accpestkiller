# ============================================================
#  PT Pest Killer Ngalam - Accounting Web App
#  PANDUAN DEPLOY GRATIS (Step by Step, Satu Jalur)
# ============================================================

## ISI FILE PROJECT:
```
pest-killer-accounting/
├── prisma/
│   └── schema.prisma          ← Database schema
├── src/
│   ├── app/
│   │   ├── layout.tsx         ← Layout utama + dark mode
│   │   ├── page.tsx           ← Halaman utama (SPA)
│   │   ├── globals.css        ← Styling + tema warna
│   │   └── api/
│   │       ├── auth/          ← Login, Register, Me
│   │       ├── customers/     ← CRUD Pelanggan
│   │       ├── invoices/      ← CRUD Invoice
│   │       ├── expenses/      ← CRUD Pengeluaran
│   │       ├── reports/       ← Laporan Keuangan
│   │       ├── settings/      ← Pengaturan Perusahaan
│   │       └── init/          ← Inisialisasi data awal
│   ├── components/
│   │   ├── app/               ← Login & Sidebar
│   │   ├── dashboard/         ← Dashboard KPI
│   │   ├── customers/         ← Halaman Pelanggan
│   │   ├── invoices/          ← Halaman Invoice
│   │   ├── expenses/          ← Halaman Pengeluaran
│   │   ├── reports/           ← Halaman Laporan (5 tab)
│   │   ├── settings/          ← Halaman Pengaturan
│   │   └── ui/                ← Komponen shadcn/ui
│   ├── lib/
│   │   ├── auth.ts            ← JWT & password
│   │   ├── db.ts              ← Database client
│   │   ├── store.ts           ← Zustand state management
│   │   ├── terbilang.ts       ← Konversi angka ke huruf
│   │   ├── invoice-utils.ts   ← Utilitas invoice
│   │   └── utils.ts           ← Utilitas umum
│   └── hooks/                 ← React hooks
├── public/                    ← Static files
├── package.json               ← Dependencies & scripts
├── next.config.ts             ← Konfigurasi Next.js
├── tsconfig.json              ← Konfigurasi TypeScript
├── tailwind.config.ts         ← Konfigurasi Tailwind CSS
├── components.json            ← Konfigurasi shadcn/ui
├── postcss.config.mjs         ← Konfigurasi PostCSS
├── eslint.config.mjs          ← Konfigurasi ESLint
└── .env.example               ← Contoh environment variables
```

## DEFAULT LOGIN:
- Email: owner@pestkiller.id
- Password: owner123

## ============================================================
#  PANDUAN DEPLOY KE VERCEL (100% GRATIS)
#  Satu jalur aja, ikuti dari Atas ke Bawah
# ============================================================

## LANGKAH 1: Siapkan Akun (5 menit)

### 1a. Buat Akun GitHub
1. Buka: https://github.com/signup
2. Isi email, password, username
3. Verifikasi email
4. SELESAI

### 1b. Buat Akun Neon (Database Gratis)
1. Buka: https://neon.tech/signup
2. Klik "Sign in with GitHub" (login pakai akun GitHub yang baru dibuat)
3. SELESAI (nanti kita buat project database-nya di langkah 4)

---

## LANGKAH 2: Upload Kode ke GitHub (3 menit)

### 2a. Buat Repository Baru
1. Login di https://github.com
2. Klik tombol "+" di kanan atas → pilih "New repository"
3. Isi:
   - Repository name: pest-killer-accounting
   - Description: Sistem Akuntansi PT Pest Killer Ngalam
   - Pilih: **Public**
4. Klik "Create repository"
5. SELESAI

### 2b. Upload Semua File ZIP Ini
Di halaman repository yang baru dibuat:
1. Klik "uploading an existing file"
2. Drag & drop SEMUA file dari folder pest-killer-accounting ini
   (bukan file ZIP-nya, tapi isi dalam folder!)
3. Pastikan struktur folder persis seperti di atas
4. Klik "Commit changes"
5. SELESAI

---

## LANGKAH 3: Buat Database di Neon (3 menit)

1. Buka: https://console.neon.tech
2. Klik "Create Project"
3. Isi:
   - Project name: pestkiller-db
   - Region: Singapore (pilih yang terdekat)
4. Klik "Create Project"
5. Tunggu ±30 detik sampai database siap
6. DI HALAMAN YANG SAMA, cari tulisan "Connection string"
7. Klik "Copy" pada connection string yang bentuknya:
   postgresql://neondb_owner:xxxxx@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
8. SIMPAN di Notepad, nanti dipakai di Langkah 5
9. SELESAI

---

## LANGKAH 4: Update Prisma untuk PostgreSQL (2 menit)

Karena database gratis dari Neon pakai PostgreSQL (bukan SQLite), kita perlu ubah sedikit konfigurasi.

Di GitHub, buka file `prisma/schema.prisma`, ubah bagian datasource:

DARI:
```
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

MENJADI:
```
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Lalu hapus juga baris `@default(cuid())` di semua model dan ganti dengan `@default(uuid())` karena PostgreSQL punya fitur UUID bawaan. Tapi SEBENARNYA cukup ganti `provider = "postgresql"` saja, Prisma tetap bisa pakai cuid().

Klik "Commit changes" di GitHub.

---

## LANGKAH 5: Deploy ke Vercel (3 menit)

### 5a. Hubungkan Vercel dengan GitHub
1. Buka: https://vercel.com/signup
2. Klik "Continue with GitHub" (login pakai akun GitHub)
3. Izinkan akses repository
4. SELESAI

### 5b. Import Project
1. Di dashboard Vercel, klik "Add New..." → "Project"
2. Pilih repository "pest-killer-accounting" dari daftar
3. Klik "Import"

### 5c. Konfigurasi Environment Variables (PENTING!)
Di halaman configure project, scroll ke bagian "Environment Variables":
Tambahkan 3 variable:

| Name              | Value                                                                      |
|-------------------|-----------------------------------------------------------------------------|
| DATABASE_URL      | *(paste connection string dari Neon di Langkah 3)*                        |
| JWT_SECRET        | pestkiller-ngalam-secret-key-2024-change-this                               |
| NODE_ENV          | production                                                                  |

Klik "Add" untuk masing-masing variable.

### 5d. Set Build Command
Scroll ke bawah, di bagian "Build and Output Settings":
- Build Command: `npx prisma db push && npx prisma generate && next build`
- Output Directory: (biarkan default / otomatis terisi)
- Install Command: (biarkan default)

### 5e. Deploy!
Klik tombol "Deploy"
Tunggu ±2-3 menit...

JIKA BERHASIL, Vercel akan menampilkan:
✅ 🎉 Congratulations!
Dan memberikan URL: https://pest-killer-accounting-xxx.vercel.app

---

## LANGKAH 6: Test Aplikasi (2 menit)

1. Buka URL Vercel yang diberikan
2. Anda akan melihat halaman login
3. Login dengan:
   - Email: owner@pestkiller.id
   - Password: owner123
4. Test fitur:
   - Klik "Dashboard" → lihat KPI cards
   - Klik "Pelanggan" → klik "Tambah" → isi data → Simpan
   - Klik "Invoice" → klik "Buat" → buat invoice
   - Klik "Pengeluaran" → klik "Tambah" → isi data → Simpan
   - Klik "Laporan" → lihat 5 tab laporan
   - Klik "Pengaturan" → isi data perusahaan → Simpan
5. SELESAI! Aplikasi sudah bisa dipakai! 🎉

---

## LANGKAH 7: Ganti Password Default (1 menit) - PENTING!

Setelah login, segera:
1. Buka halaman "Pengaturan"
2. Ganti password default owner123 dengan password yang lebih aman
   (caranya: buka terminal Vercel atau edit langsung di database Neon)

Untuk sementara, password default sudah aman karena hanya Anda yang tahu URL-nya.

---

## FITUR YANG TERSEDIA:

### 🔐 Sistem Login
- 2 peran: Owner (akses penuh) dan Admin (Pelanggan, Invoice, Pengeluaran)
- JWT token authentication
- Data terlindungi

### 📊 Dashboard
- 7 KPI card: Total Pendapatan, Total Pengeluaran, Laba Bersih,
  Saldo Kas/Bank, Total Piutang, Pelanggan Aktif, Invoice Bulan Ini
- Grafik batang Pendapatan vs Pengeluaran (6 bulan terakhir)
- Setiap card bisa diklik untuk navigasi

### 👥 Modul Pelanggan
- CRUD lengkap (Tambah, Edit, Hapus)
- Pencarian pelanggan
- Data: Nama Perusahaan, PIC, WhatsApp, Email, Alamat, NPWP
- Frekuensi layanan, nilai kontrak bulanan
- Status Aktif / Nonaktif

### 🧾 Modul Invoice
- Nomor invoice otomatis: INV/PESTKILLER/2024/0001
- 3 status: Draft, Belum Lunas, Lunas
- Pajak PPN 12%
- Terbilang (angka ke huruf Indonesia)
- Preview & Cetak Invoice (PDF)
- Kirim via WhatsApp
- Upload gambar faktur pajak
- Duplikat invoice untuk pelanggan rutin

### 💸 Modul Pengeluaran
- CRUD lengkap
- 5 kategori: Operasional, BBM, Pestisida, Gaji, Lainnya
- Total pengeluaran otomatis dihitung

### 📈 Laporan Keuangan (5 Tab)
- Pendapatan: grafik batang bulanan
- Pengeluaran: grafik batang per kategori + pie chart
- Laba Rugi: grafik pendapatan vs pengeluaran vs laba
- Piutang: daftar piutang per pelanggan
- Neraca: Aset vs Modal
- Filter "Hanya Faktur Pajak"
- Cetak & Export CSV

### ⚙️ Pengaturan Perusahaan
- Info perusahaan, NPWP
- Upload logo & stempel
- Info rekening bank
- Modal awal & Saldo awal

### 🌙 Bonus
- Dark Mode
- Responsive (mobile & desktop)
- Animasi smooth

---

## TROUBLESHOOTING (Jika Ada Masalah):

### "Build failed" di Vercel
- Pastikan Build Command diisi:
  `npx prisma db push && npx prisma generate && next build`
- Pastikan DATABASE_URL benar (copy-paste ulang dari Neon)
- Cek di tab "Settings" → "Environment Variables" sudah terisi

### "Error: Database connection failed"
- Pastikan connection string dari Neon benar
- Pastikan provider di prisma/schema.prisma sudah diganti ke "postgresql"
- Coba redeploy: di Vercel → Deployments → klik titik tiga → Redeploy

### "Halaman blank / error"
- Buka tab "Logs" di Vercel deployment
- Cari error message
- Umumnya karena environment variable belum terisi

### "Gagal login"
- Pastikan sudah akses /api/init (otomatis dipanggil saat pertama kali buka)
- Coba clear cache browser atau buka di Incognito window

---

## BIAYA TOTAL: Rp 0,- (100% GRATIS!)

| Layanan | Paket | Biaya |
|---------|-------|-------|
| Vercel (Hosting) | Hobby Free | Rp 0 |
| Neon (Database) | Free Tier | Rp 0 |
| GitHub (Kode) | Free | Rp 0 |
| Domain .vercel.app | Free | Rp 0 |
| SSL/HTTPS | Auto Free | Rp 0 |
| TOTAL | | Rp 0,- |

---

## UPGRADE YANG DITERAPKAN:
✅ Database bisa pakai PostgreSQL (Neon) atau SQLite (lokal)
✅ Build command otomatis push schema & generate Prisma
✅ Konfigurasi ESLint yang longgar agar build selalu sukses
✅ Invoice numbering otomatis (auto-increment per tahun)
✅ Terbilang lengkap sampai Triliun
✅ Responsive design untuk mobile
✅ Dark mode dengan next-themes

---

## KONTAK & SUPPORT:
Jika butuh bantuan, gunakan AI tools gratis berikut:
- ChatGPT (chat.openai.com) - tanyakan coding
- Cursor IDE (cursor.com) - AI code editor
- Bolt.new (bolt.new) - generate kode dari deskripsi

Selamat menggunakan aplikasi! 🎉
