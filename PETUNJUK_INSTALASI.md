# Panduan Instalasi & Deploy ke Vercel

## 1. Persiapan Awal & Prasyarat Sistem

Sebelum clone repositori, pastikan environment sudah siap.

### 1.1. Install & Setup NVM (Node Version Manager)
Gunakan Node.js v22. Jika belum ada, install NVM dan Node:
- **Windows (nvm-windows):** Download dari [coreybutler/nvm-windows](https://github.com/coreybutler/nvm-windows/releases).
- **Mac/Linux:** `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash`

Set Node ke v22:
```bash
nvm install 22
nvm use 22
```

### 1.2. Install PNPM
Setelah Node.js terinstall, pasang pnpm secara global:
```bash
npm install -g pnpm
```

### 1.3. Install Python & Visual C++ (Wajib untuk Windows)
Beberapa dependensi Node memerlukan Python dan compiler C++:
1. **Python:** Install dari web resmi atau Microsoft Store. Centang opsi **"Add Python to PATH"** saat instalasi.
2. **Visual C++:** Install [Visual C++ Redistributable terbaru](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) dan pastikan Anda memiliki **Visual Studio Build Tools** (opsi "Desktop development with C++").

*Alternatif cepat di Windows (sebagai Administrator):*
```powershell
npm install --global windows-build-tools
```

### 1.4. Siapkan Akun & Database
- **Akun Vercel** untuk hosting.
- **Git** untuk version control.
- **PostgreSQL eksternal**, misalnya Supabase atau Railway.

## 2. Clone Repositori

```bash
git clone <URL-repo-anda>
cd Storva
```

## 3. Install Dependensi

Proyek menggunakan struktur monorepo. Install seluruh dependensi dari root proyek:

```bash
pnpm install
```

## 4. Konfigurasi Environment

Buat file environment lokal dari template:

```bash
cp .env.example .env
```

Isi nilai yang dibutuhkan di `.env`, terutama `DATABASE_URL` dan variabel environment lain yang digunakan aplikasi.

Jangan commit `.env` ke repositori.

## 5. Siapkan Database

Generate Prisma Client:

```bash
pnpm prisma generate
```

Jalankan migrasi database untuk lingkungan development:

```bash
pnpm prisma migrate dev --name init
```

## 6. Jalankan Aplikasi Lokal

```bash
pnpm dev
```

Buka alamat berikut di browser:

```text
http://localhost:3000
```

Pastikan halaman web tampil dan tidak ada error di terminal.

## 7. Upload Repositori ke Git

Jika repositori belum menggunakan Git remote:

```bash
git add .
git commit -m "Initial project setup"
git branch -M main
git remote add origin <URL-repo-anda>
git push -u origin main
```

## 8. Deploy ke Vercel

### Opsi A: Dashboard Vercel

1. Buka [Vercel](https://vercel.com).
2. Login atau buat akun.
3. Klik **Add New Project**.
4. Import repositori Git.
5. Pilih project Storva.
6. Atur framework sesuai aplikasi. Jika menggunakan Next.js, pilih **Next.js**.
7. Pastikan root directory menunjuk ke folder aplikasi yang benar jika proyek memakai monorepo.
8. Tambahkan seluruh variabel dari `.env` ke bagian **Environment Variables**.
9. Klik **Deploy**.

### Opsi B: Vercel CLI

Install Vercel CLI:

```bash
npm install -g vercel
```

Login:

```bash
vercel login
```

Jalankan deployment pertama dari root proyek:

```bash
vercel
```

Untuk deployment production:

```bash
vercel --prod
```

## 9. Konfigurasi Environment di Vercel

Buka project di Vercel, lalu pilih:

**Settings -> Environment Variables**

Tambahkan nilai production untuk:

- `DATABASE_URL`
- Secret key aplikasi.
- API key yang digunakan aplikasi.
- Variabel `NEXT_PUBLIC_*` jika tersedia.

Pilih environment yang sesuai: **Production**, **Preview**, atau **Development**.

Setelah mengubah environment variables, lakukan redeploy.

## 10. Migrasi Database Production

Setelah deployment berhasil, jalankan migrasi ke database production:

```bash
pnpm prisma migrate deploy
```

Pastikan `DATABASE_URL` menunjuk ke database production, bukan database lokal.

## 11. Verifikasi Web App

1. Buka URL deployment, misalnya:
   `https://nama-project.vercel.app`
2. Pastikan halaman utama tampil.
3. Uji login atau fitur utama aplikasi.
4. Uji koneksi database.
5. Periksa **Vercel -> Project -> Deployments -> Logs** jika muncul error.

## 12. Deployment Berikutnya

Dengan integrasi Git, setiap push ke branch `main` memicu deployment production:

```bash
git add .
git commit -m "Update application"
git push origin main
```

Atau gunakan Vercel CLI:

```bash
vercel --prod
```

## Catatan Penting

- Jangan masukkan `.env` ke Git.
- Database harus bisa diakses dari server Vercel.
- Pastikan database production menggunakan SSL jika diwajibkan provider.
- Jalankan `pnpm prisma migrate deploy` untuk migrasi production, bukan `pnpm prisma migrate dev`.
