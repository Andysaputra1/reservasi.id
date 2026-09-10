# Database Reservasi.id

Panel admin tersedia di `/panel`. Website membaca konten terpublikasi dari Supabase,
termasuk poster, kota, foto, destinasi, teks dua bahasa, dan kontak. Panel memakai
Supabase Auth dengan username `administrator` yang dipetakan ke email akun admin.

## Jalankan di Supabase

Key publishable di `.env` tidak memiliki akses DDL untuk membuat tabel. Jalankan
file berikut satu per satu melalui **Supabase Dashboard → SQL Editor → New query**,
sebagai role `postgres`, pada project yang sesuai:

1. `migrations/202609100001_content_schema.sql`
2. `migrations/202609100002_storage.sql`
3. `migrations/202609100003_seed_content.sql`
4. `migrations/202609100004_poster_lifecycle.sql`
5. `migrations/202609100005_content_workflow.sql`

Project saat ini sudah menerapkan kelima migrasi. Jangan menjalankannya ulang.

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

Login panel memakai **username `administrator` dan password**.
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
mengatur password. Pemetaan username diterapkan di `src/lib/supabase.ts`. Password dimasukkan di form login dan diverifikasi oleh Supabase Auth.
Email akun dapat digunakan untuk pemulihan password ketika alur reset password
dan redirect URL aplikasi sudah dikonfigurasi. Form login tetap memakai username.

Login saja tidak memberikan akses admin. Hanya akun yang terdaftar di
`private.admin_users` yang dapat mengubah data. Panel login melalui Supabase
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
Foreign key mencegah penghapusan negara/provider yang masih digunakan. Hapus relasi atau
ganti referensi dahulu. Foto milik konten dilepas dan dibersihkan otomatis oleh migrasi 005. Poster memiliki `kind` (promo/harga), `status` (draft/tayang/arsip), `valid_from`,
`valid_until`, serta `expiry_action` (label/sembunyikan). Tanggal mengikuti WIB.
Tanggal mulai di masa depan membuat poster terjadwal. Tanggal akhir kosong berarti
berlaku sampai diperbarui. Pada akhir masa berlaku, pilihan `hide` menutup akses
publik lewat RLS; pilihan `label` tetap menampilkan poster dengan penanda berakhir.
`save_poster` menyimpan metadata dan tujuan dalam satu transaksi. Status publikasi
poster otomatis menyelaraskan `is_published` lewat trigger.

## Foto dan Storage

Bucket `website-media` dibuat public untuk gambar website, dengan batas 10 MB per
file dan tipe JPEG, PNG, WebP, AVIF. Hanya admin yang dapat upload, mengganti,
mendaftar, dan menghapus file lewat API berdasarkan policy yang disediakan.
**Siapa pun yang memiliki URL dapat membuka gambar di bucket public**, termasuk
gambar yang metadata-nya masih draft. Jangan gunakan bucket ini untuk dokumen
pribadi. Jika project punya policy Storage lain yang terlalu luas, policy tersebut
juga harus diperiksa karena policy PostgreSQL yang permisif digabung dengan OR.

SQL tidak mengupload file. Seed `media_assets.source_path` mengarah ke 32 file asli
dan thumbnail di repo. **Ke-32 file awal untuk project saat ini sudah diupload; 13 thumbnail terpisah kemudian dipensiunkan oleh migrasi 005**, dan
`object_path` sudah diisi. Untuk pemasangan pada project baru:

1. Upload melalui Storage Dashboard atau Storage API menggunakan sesi admin.
2. Gunakan nama unik, misalnya `posters/<uuid>.webp`, lalu simpan path tersebut
   pada `media_assets.object_path` terkait. Simpan path, bukan signed URL.
3. Frontend memprioritaskan Storage jika `object_path` tersedia; fallback
   lokal memakai pemetaan asset Vite, bukan menjadikan `src/...` URL produksi.
4. Saat mengganti gambar, upload file baru, ubah referensi database, baru hapus
   file lama setelah memastikan tidak ada referensi lain. Ini menghindari cache
   gambar lama dan tautan rusak. Penghapusan konten menggunakan antrean `media_cleanup` untuk menghapus file melalui Storage API.

Jangan menulis/menghapus baris `storage.objects` secara manual pada project asli;
gunakan Storage API untuk operasi file.

## Environment saat integrasi frontend

Project ini memakai Vite. Nama environment yang digunakan adalah `VITE_SUPABASE_URL` dan
`VITE_SUPABASE_PUBLISHABLE_KEY` (lihat `.env.example`). `.env` lokal sudah
disesuaikan tanpa mengubah nilai key. Konfigurasi build juga menerima nama lama
`NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` agar
kompatibel dengan pengaturan hosting sebelumnya. Publishable key boleh dipakai frontend
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

Paket tes tersedia sebagai development dependencies. Jalankan `npm test` untuk tes panel dan database, serta `npm run build` untuk pemeriksaan TypeScript dan build produksi.
Tes ini tidak terhubung ke project Supabase. Upload HTTP, login Auth sungguhan,
policy lain yang sudah ada, dan batas MIME/ukuran perlu diperiksa saat integrasi.

Referensi resmi: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Storage access control](https://supabase.com/docs/guides/storage/security/access-control),
[public buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals),
[migrations](https://supabase.com/docs/guides/deployment/database-migrations).


## Menggunakan panel

- Buka `/panel`, masuk dengan username `administrator` dan password akun admin.
- Pilih menu, lalu **Tambah** atau **Edit**. Negara, kota, layanan, provider,
  destinasi, dan foto beranda memakai formulir masing-masing. Tidak ada pustaka gambar atau pemilih gambar lama.
- Untuk poster, pilih negara/kota, provider, layanan, gambar, jenis penawaran,
  tanggal, tindakan setelah berakhir, dan status. Simpan setelah selesai.
- Publikasikan data pendukung yang masih draft sebelum menayangkan poster.
- Setiap konten memakai satu gambar miliknya sendiri. Pilih file langsung di editor;
  upload baru dilakukan saat **Simpan perubahan**. Gambar poster dan thumbnail memakai
  file yang sama. Untuk memakai gambar serupa pada konten lain, upload kembali.
- Mengganti gambar atau menghapus konten otomatis mengantrekan foto lama untuk
  dihapus melalui Storage API. Metadata dilepas dalam transaksi database. Panel
  mencoba penghapusan file setelah save/delete dan saat login. Jika gagal karena
  koneksi, pesan ditampilkan dengan tombol **Coba bersihkan foto**; antrean tetap
  tersimpan untuk percobaan ulang. Gambar yang masih direferensikan tidak dihapus.
- **Preview** tersedia dari daftar poster dan editor. Preview editor mencakup judul,
  deskripsi, pilihan foto lokal, layanan, provider, tujuan, dan tanggal yang belum
  disimpan. Membuka preview tidak memublikasikan konten.
- Slug tidak diisi admin. Database membuatnya dari provider, layanan, dan judul
  poster, dengan akhiran `-2`, `-3`, dan seterusnya bila ada duplikat. ID UUID tetap
  menjadi identitas utama. Entitas lain menggunakan nama atau judulnya.
- **Posisi tampil** berupa pilihan 1 sampai jumlah konten (ditambah satu untuk
  konten baru). `save_content` menggeser posisi lain secara atomik; `delete_content`
  merapatkan urutan setelah penghapusan. Tidak ada nomor urut ganda dari alur panel.
- Teks dua bahasa, kontak/logo, visibilitas bagian, dan autoplay bisa diedit melalui
  **Teks & pengaturan**. Nomor WhatsApp berlaku untuk seluruh tombol inquiry aktif.
- Tombol **Pesan tiket** mengarahkan ke katalog terkini, sehingga tidak menampilkan
  jadwal/harga dari JSON lama yang belum dikelola melalui panel.
- **Lihat website** membuka tampilan publik. Client publik terpisah dari sesi admin,
  sehingga draft tetap tidak muncul saat admin melihat website.
- Halaman publik mengambil perubahan saat dibuka, saat kembali ke tab, dan tiap
  60 detik. Jika koneksi awal gagal, halaman menawarkan coba lagi, tanpa diam-diam
  menampilkan katalog lokal yang mungkin sudah kedaluwarsa. Mode data lokal hanya
  digunakan ketika environment Supabase sama sekali belum dikonfigurasi.

## Hosting

Build dengan `npm run build`. Pastikan dua environment public Supabase tersedia
pada hosting sebelum build. Tidak ada service-role key di browser. `vercel.json`
dan `public/_redirects` menyediakan fallback `/panel` untuk Vercel dan host yang
mendukung `_redirects`. Pada host lain, arahkan `/panel` dan `/panel/` ke `index.html`.

## Pemeriksaan panel

Tes DOM lokal (API dimock) tersedia di `tests/panel.test.mjs`:

```text
node tests/panel.test.mjs <path-ke-jsdom/lib/api.js>
```

Tes memeriksa login username, akses panel, validasi tanggal, payload penyimpanan
poster dan relasi tujuan, serta regresi klik kedua dropdown. Tes SQL juga memeriksa
penjadwalan, expiry, dan rollback penyimpanan atomik. Integrasi langsung pada project
saat ini sudah diuji menggunakan poster draft sementara yang kemudian dihapus.

Logo di Teks & pengaturan menggunakan upload langsung. Hapus logo lalu simpan untuk kembali ke logo bawaan.
