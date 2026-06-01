# Literasiku

Aplikasi PWA literasi perpustakaan digital — pinjam buku, aktivitas literasi, dan sistem poin. Dibangun dengan **Vite + React + TypeScript**, backend **Supabase**, deploy ke **Vercel**.

## Fitur

- **Siswa (member)**: baca buku PDF di browser, aktivitas literasi, poin
- **Guru**: daftar/login sebagai guru, unggah & kelola buku digital (PDF + cover opsional)
- **Admin**: dashboard, kelola aktivitas literasi, persetujuan submission
- **Digital only**: tidak ada stok/peminjaman fisik — semua buku tersedia sebagai PDF
- **PWA**: installable, offline shell, auto-update service worker

## Tech Stack

- Vite 8, React 19, TypeScript
- Tailwind CSS 4, komponen UI custom (shadcn-style)
- Supabase (Auth, PostgreSQL, Storage, RLS)
- TanStack Query, React Router 7, React Hook Form + Zod
- vite-plugin-pwa

## Setup Lokal

### 1. Clone & install

```bash
npm install
```

### 2. Supabase

1. Buat project di [supabase.com](https://supabase.com)
2. Di **SQL Editor**, jalankan:
   - Proyek baru: [`001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)
   - Sudah pakai schema lama (**dua langkah terpisah**, wajib berurutan):
     1. [`002a_add_guru_enum.sql`](supabase/migrations/002a_add_guru_enum.sql) — Run, tunggu sukses
     2. [`002b_digital_guru.sql`](supabase/migrations/002b_digital_guru.sql) — Run
   - Jangan gabungkan keduanya dalam satu Run (PostgreSQL error `unsafe use of new value "guru"`).
   - **Error daftar** `type "user_role" does not exist`: jalankan [`003_repair_signup.sql`](supabase/migrations/003_repair_signup.sql) di SQL Editor.
3. Pastikan **Authentication → Email** aktif
4. Bucket `book-covers` dan `book-pdfs` dibuat otomatis oleh migrasi

### 3. Environment

Salin `.env.example` ke `.env`:

```bash
cp .env.example .env
```

Isi variabel:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### 4. Jalankan

```bash
npm run dev
```

Buka http://localhost:5173

### 5. Peran pengguna

- **Guru / Siswa**: pilih saat halaman **Daftar**
- **Admin** (opsional): set manual di SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE id = 'UUID_USER_ANDA';
```

## Iklan (Web / PWA)

**AdMob tidak mendukung PWA/web** (hanya Android/iOS native). Untuk Literasiku di browser & PWA, gunakan **[Google AdSense](https://www.google.com/adsense/)**:

1. Daftar AdSense dan verifikasi situs (domain Vercel production).
2. Buat unit iklan **Display** → salin **Publisher ID** (`ca-pub-...`) dan **Slot ID**.
3. Tambahkan ke `.env` / Vercel Environment Variables:

```env
VITE_ADSENSE_CLIENT=ca-pub-xxxxxxxx
VITE_ADSENSE_SLOT_BANNER=1234567890
```

4. Deploy ulang. Iklan tampil untuk **siswa** & **landing** (bukan di panel guru/admin).

> Jika nanti dibungkus **app Android native** (bukan PWA), barulah pakai AdMob dengan unit ID terpisah.

## Deploy ke Vercel

1. Push repo ke GitHub
2. Import di [vercel.com](https://vercel.com) — preset **Vite**
3. Tambahkan environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

File [`vercel.json`](vercel.json) sudah mengatur SPA rewrite.

## Struktur Proyek

```
src/
  components/   # UI & layout
  contexts/     # Auth
  pages/        # Halaman anggota & admin
  lib/          # Supabase client, utils
  routes/       # Protected & admin guards
supabase/migrations/  # Schema SQL
public/               # PWA icons, favicon
```

## Scripts

| Perintah | Keterangan |
|----------|------------|
| `npm run dev` | Development server |
| `npm run build` | Build production + PWA |
| `npm run preview` | Preview build lokal |

## Lisensi

MIT
