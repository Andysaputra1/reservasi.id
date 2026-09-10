# Database Reservasi.id

SQL untuk fondasi panel admin `/panel`. Folder ini **belum membuat halaman panel
atau menghubungkan frontend ke Supabase**. Website tetap memakai data lokal sampai
integrasi berikutnya selesai.

## Jalankan di Supabase

Key publishable di `.env` tidak memiliki akses DDL untuk membuat tabel. Jalankan
file berikut satu per satu melalui **Supabase Dashboard → SQL Editor → New query**,
sebagai role `postgres`, pada project yang sesuai:

1. `migrations/202609100001_content_schema.sql`
2. `migrations/202609100002_storage.sql`
3. `migrations/202609100003_seed_content.sql`

Setiap file memakai transaksi. Lanjutkan hanya jika file sebelumnya berhasil.
Migrasi ditujukan untuk pemasangan pertama: jangan jalankan ulang file yang sudah
berhasil, karena tabel/policy/data awal akan bentrok. Tidak ada perintah menghapus
tabel lama. Jika project sudah punya tabel dengan nama yang sama, sesuaikan terlebih
dahulu; jangan menghapus data untuk memaksa migrasi berhasil.

Alternatif untuk project yang dikelola Supabase CLI: folder ini memakai struktur
`supabase/migrations` dan nama timestamp standar. Pilih satu cara penerapan.
SQL Editor tidak mencatat riwayat CLI secara otomatis; jangan kemudian menjalankan
`db push` tanpa menyelaraskan migration history.

## Tetapkan admin

Login panel direncanakan memakai **username `administrator` dan password**.
Form tidak meminta email. Di balik layar, username tersebut dipetakan ke
`andychensaputra@gmail.com`, email akun admin di Supabase Auth.
[Login password Supabase](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
menggunakan email atau nomor telepon, sehingga pemetaan ini mempertahankan Auth
dan RLS yang sudah disiapkan tanpa membuat sistem password sendiri.

1. Di **Authentication → Users → Add user → Create new user**, gunakan email
   `andychensaputra@gmail.com` dan password terbaru yang telah kamu pilih.
2. Aktifkan **Auto Confirm User** saat membuat akun admin melalui dashboard.
3. Jalankan `setup/admin.sql` di SQL Editor untuk memberikan akses admin.

Password tidak disimpan dalam migrasi, source code, atau `.env` frontend. File SQL
ini hanya memberikan akses pada akun yang sudah dibuat, bukan membuat akun atau
mengatur password. Pemetaan username akan diterapkan saat halaman `/panel` dibuat.
Email akun dapat digunakan untuk pemulihan password ketika alur reset password
dan redirect URL aplikasi sudah dikonfigurasi. Form login tetap memakai username.

Login saja tidak memberikan akses admin. Hanya akun yang terdaftar di
`private.admin_users` yang dapat mengubah data. Panel nanti login melalui Supabase
Auth dan memanggil RPC `is_admin()` untuk memeriksa akses. RLS tetap melindungi data
meskipun pemeriksaan UI dilewati. Signup publik dapat dimatikan di pengaturan Auth
jika hanya admin yang perlu login.

Untuk mencabut akses, jalankan SQL berikut dengan UUID akun yang benar:

```sql
delete from private.admin_users where user_id = 'UUID_AKUN';
```

## Data yang tersedia

| Tabel | Kegunaan |
| --- | --- |
| `countries`, `cities` | Negara dan kota untuk dropdown dan tujuan |
| `service_types`, `providers` | Jenis layanan serta provider/logo |
| `posters` | Judul, deskripsi ID/EN, gambar, thumbnail, periode promo, urutan |
| `poster_countries`, `poster_cities` | Satu poster dapat memiliki beberapa tujuan |
| `media_assets` | Referensi gambar dan teks alternatif ID/EN |
| `destinations` | Kartu destinasi, badge, deskripsi, foto, tujuan filter |
| `hero_slides` | Foto hero dan urutannya |
| `site_content` | Kontak, pengaturan carousel/section, teks dan terjemahan |

Data awal: 3 negara, 5 kota, 2 jenis layanan, 13 provider, 13 poster,
3 destinasi, 3 foto hero, dan teks website saat ini. Relasi kota per poster belum
diisi karena tidak semua poster punya cakupan kota yang pasti; negara sudah diisi
sesuai katalog. Harga dan jadwal keberangkatan tidak dikarang atau diimpor dari JSON
lama. Informasi tersebut tetap mengikuti poster, sesuai konsep website sekarang.

Data baru default draft (`is_published = false`), urutan memakai `sort_order`.
Publik hanya membaca baris yang dipublikasikan; admin dapat membaca dan mengubah
semua baris. Status publikasi tiap entitas berdiri sendiri: ketika memublikasikan
poster, panel harus memastikan provider, layanan, tujuan, dan medianya juga siap.
Foreign key mencegah penghapusan data yang masih digunakan. Hapus relasi atau
ganti referensi dahulu. `valid_until` hanya penanda periode, tidak otomatis
menghapus/menyembunyikan poster yang kedaluwarsa.

## Foto dan Storage

Bucket `website-media` dibuat public untuk gambar website, dengan batas 10 MB per
file dan tipe JPEG, PNG, WebP, AVIF. Hanya admin yang dapat upload, mengganti,
mendaftar, dan menghapus file lewat API berdasarkan policy yang disediakan.
**Siapa pun yang memiliki URL dapat membuka gambar di bucket public**, termasuk
gambar yang metadata-nya masih draft. Jangan gunakan bucket ini untuk dokumen
pribadi. Jika project punya policy Storage lain yang terlalu luas, policy tersebut
juga harus diperiksa karena policy PostgreSQL yang permisif digabung dengan OR.

SQL tidak mengupload file. Seed `media_assets.source_path` mengarah ke 32 file asli
dan thumbnail di repo. `object_path` masih kosong sampai upload dilakukan:

1. Upload melalui Storage Dashboard atau Storage API menggunakan sesi admin.
2. Gunakan nama unik, misalnya `posters/<uuid>.webp`, lalu simpan path tersebut
   pada `media_assets.object_path` terkait. Simpan path, bukan signed URL.
3. Frontend nanti memprioritaskan Storage jika `object_path` tersedia; fallback
   lokal harus memakai pemetaan asset Vite, bukan menjadikan `src/...` URL produksi.
4. Saat mengganti gambar, upload file baru, ubah referensi database, baru hapus
   file lama setelah memastikan tidak ada referensi lain. Ini menghindari cache
   gambar lama dan tautan rusak. Penghapusan metadata tidak otomatis menghapus file.

Jangan menulis/menghapus baris `storage.objects` secara manual pada project asli;
gunakan Storage API untuk operasi file.

## Environment saat integrasi frontend

Project ini memakai Vite. Nama `NEXT_PUBLIC_SUPABASE_URL` dan
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` yang sekarang ada perlu disesuaikan saat
integrasi menjadi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY`.
Nilai `.env` belum diubah oleh migrasi ini. Publishable key boleh dipakai frontend
dengan RLS, tetapi database password dan service-role/secret key tidak boleh
memakai prefix `VITE_` atau masuk bundle browser.

## Validasi

`tests/check-migrations.mjs` menjalankan seluruh migrasi di PostgreSQL lokal
berbasis PGlite, dengan mock schema Auth/Storage. Tes memeriksa seed, file gambar,
bootstrap admin, visibilitas draft, penolakan perubahan oleh pengunjung/user biasa,
dan akses admin termasuk Storage. Jalankan dengan Node dan path paket PGlite:

```text
node supabase/tests/check-migrations.mjs <path-ke-@electric-sql/pglite/dist/index.js>
```

Paket tes dipasang terpisah di folder sementara, bukan dependency aplikasi.
Tes ini tidak terhubung ke project Supabase. Upload HTTP, login Auth sungguhan,
policy lain yang sudah ada, dan batas MIME/ukuran perlu diperiksa saat integrasi.

Referensi resmi: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Storage access control](https://supabase.com/docs/guides/storage/security/access-control),
[public buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals),
[migrations](https://supabase.com/docs/guides/deployment/database-migrations).
