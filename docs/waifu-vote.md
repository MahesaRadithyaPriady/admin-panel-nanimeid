# Panduan Voting Waifu (Bahasa Indonesia)

Dokumen ini menjelaskan alur, aturan, dan endpoint API untuk fitur Vote Waifu di NanimeID. Hanya pengguna yang sudah login yang dapat melakukan voting. Sistem menerapkan batas 1 vote per 24 jam per pengguna (global), memiliki anti-spam, serta statistik real-time (total_votes).

API base prefix: `/1.0.10` (mengikuti `VERSION` di env). Sesuaikan jika berbeda di environment Anda.

---

## 1) Alur Utama (User Flow)
- **Pengguna**
  1. Login/Register terlebih dahulu (wajib).
  2. Buka halaman Vote Waifu.
  3. Pilih karakter → klik tombol "❤️ Vote".
  4. Backend mengecek apakah user sudah melakukan vote dalam 24 jam terakhir.
     - Jika belum: vote disimpan, `total_votes` waifu bertambah +1, FE tampilkan pesan sukses: "Terima kasih sudah memilih <nama_waifu> hari ini 💖".
     - Jika sudah: FE tampilkan notifikasi: "Kamu sudah voting hari ini! Coba lagi besok 🕓".

---

## 2) Aturan dan Validasi Backend
- **Per akun**: 1 vote per 24 jam (global, bukan per-waifu). Bisa diubah ke per-waifu jika dibutuhkan.
- **Harus login**: Wajib header `Authorization: Bearer <access_token>` saat vote.
- **Harus kirim fingerprint**: Body vote wajib mengirim `fingerprint_hash`.
- **Batas waktu**: Server menghitung 24 jam dari kolom `createdAt` pada tabel `WaifuVote` terakhir milik user.
- **Validasi server**: Aturan dicek di backend, bukan hanya di frontend.
- **Reset event**: Admin dapat reset semua vote untuk event baru/bulanan.

Aturan anti multi-account (berbasis device):
- **Per device**: 1 vote per 24 jam (global) berdasarkan `fingerprint_hash`.
- **1 akun = 1 device**: satu akun hanya boleh terikat ke 1 `fingerprint_hash`. Jika user sudah pernah vote dengan device A, vote dengan device B akan ditolak.
- **1 device = 1 akun**: satu `fingerprint_hash` tidak boleh dipakai oleh akun lain untuk melakukan vote.

---

## 3) Struktur Data (Ringkas)
- **Model `Waifu`**
  - Kolom utama: `id`, `name`, `anime_title`, `image_url`, `description`, `total_votes`, `createdAt`, `updatedAt`.
- **Model `WaifuVote`**
  - Kolom utama: `id`, `user_id`, `waifu_id`, `fingerprint_hash`, `createdAt`.

---

## 4) Endpoint Publik

### 4.0. Syarat & Ketentuan Vote Waifu (Terms)
- Endpoint: `GET /1.0.10/waifu/vote/terms`
- Auth: tidak perlu
- Catatan: Konten terms diambil dari tabel `WaifuVoteTerms` (record yang `is_active = true`).

Respons sukses (contoh):
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "id": 1,
    "version": 1,
    "title": "Syarat & Ketentuan Vote Waifu",
    "content": "...",
    "rules": {
      "cooldown_hours": 24,
      "require_login": true,
      "require_fingerprint_hash": true,
      "one_account_one_device": true,
      "one_device_one_account": true,
      "one_device_one_vote_per_cooldown": true,
      "one_account_one_vote_per_cooldown": true
    },
    "is_active": true,
    "createdAt": "2025-10-05T00:00:00.000Z",
    "updatedAt": "2025-10-05T00:00:00.000Z"
  }
}
```

### 4.1. Daftar Waifu (dengan pagination)
- Endpoint: `GET /1.0.10/waifu`
- Query params:
  - `page` (default 1)
  - `limit` (default 20)
  - `q` (opsional; cari di `name`, `anime_title`, `description`)
- Respons (contoh):
```json
{
  "status": 200,
  "message": "OK",
  "items": [
    {
      "id": 1,
      "name": "Rem",
      "anime_title": "Re:Zero",
      "image_url": "https://...",
      "description": "...",
      "total_votes": 123,
      "createdAt": "2025-10-05T00:00:00.000Z",
      "updatedAt": "2025-10-05T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### 4.2. Detail Waifu
- Endpoint: `GET /1.0.10/waifu/:id`
- Respons (contoh):
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "id": 1,
    "name": "Rem",
    "anime_title": "Re:Zero",
    "image_url": "https://...",
    "description": "...",
    "total_votes": 123,
    "createdAt": "2025-10-05T00:00:00.000Z",
    "updatedAt": "2025-10-05T00:00:00.000Z"
  }
}
```

---

## 5) Endpoint Vote (User Login Wajib)

### 5.1. Vote Waifu
- Endpoint: `POST /1.0.10/waifu/:id/vote`
- Auth: Wajib (Bearer token)
- Body:
```json
{ "fingerprint_hash": "<sha256-from-client>" }
```
- Perilaku:
  - Jika user belum vote dalam 24 jam terakhir → vote tersimpan, `total_votes` waifu +1.
  - Jika user sudah vote dalam 24 jam terakhir → respon 429 dengan info sisa waktu.
  - Jika device sudah vote dalam 24 jam terakhir → respon 429 dengan info sisa waktu.
  - Jika device terikat ke akun lain / akun terikat ke device lain → respon 409.
- Respons sukses (contoh):
```json
{
  "status": 200,
  "message": "Terima kasih sudah memilih!",
  "data": { "waifu_id": 1, "total_votes": 124 }
}
```
- Respons saat cooldown (contoh):
```json
{
  "status": 429,
  "message": "Kamu sudah voting dalam 24 jam terakhir. Coba lagi dalam ~12 jam.",
  "meta": {
    "last_waifu_id": 1,
    "nextAllowedAt": "2025-10-06T01:23:45.000Z"
  }
}
```

- Respons saat device cooldown (contoh):
```json
{
  "status": 429,
  "message": "Device ini sudah voting dalam 24 jam terakhir. Coba lagi dalam ~12 jam.",
  "meta": {
    "last_waifu_id": 1,
    "nextAllowedAt": "2025-10-06T01:23:45.000Z"
  }
}
```

- Respons saat konflik device/account (contoh):
```json
{
  "status": 409,
  "message": "Device ini sudah terikat ke akun lain",
  "code": "DEVICE_LINKED_TO_OTHER_USER",
  "meta": { "fingerprint_hash": "<sha256>" }
}
```

- Respons saat `fingerprint_hash` tidak dikirim (contoh):
```json
{
  "status": 400,
  "message": "Kamu Belum Bisa Melakukan Vote",
  "code": "001"
}
```

### 5.2. Cek Cooldown Vote (Kapan Bisa Vote Lagi)
- Endpoint: `GET /1.0.10/waifu/vote/cooldown?fingerprint_hash=<sha256>`
- Auth: Wajib (Bearer token)
- Query:
  - `fingerprint_hash` (wajib)

Respons sukses (contoh):
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "can_vote": false,
    "nextAllowedAt": "2025-10-06T01:23:45.000Z",
    "user": {
      "can_vote": false,
      "nextAllowedAt": "2025-10-06T01:23:45.000Z",
      "last_waifu_id": 16
    },
    "device": {
      "can_vote": true,
      "nextAllowedAt": null,
      "last_waifu_id": null,
      "last_user_id": null
    }
  }
}
```

Respons saat `fingerprint_hash` tidak dikirim (contoh):
```json
{ "status": 400, "message": "Kamu Belum Bisa Melakukan Vote", "code": "001" }
```

---

## 6) Endpoint Admin

> Semua endpoint admin di bawah ini memerlukan token admin yang valid.

### 6.1. Buat Waifu
- Endpoint: `POST /1.0.10/waifu`
- Format request yang didukung:
  - JSON (mengirim `image_url` sebagai tautan publik)
  - multipart/form-data (unggah file pada field `image`)

Catatan sumber gambar:
- Jika upload file `image`, server akan meng-upload file ke storage/B2 dan menyimpan URL storage/CDN ke `image_url`.
- Jika `image_url` adalah URL `http(s)` non-storage/CDN, server akan download lalu upload ulang ke storage/B2.
- Jika `image_url` adalah path `/static/...` atau URL localhost/static server, server akan membaca file lokal lalu upload ulang ke storage/B2.
- Jika `image_url` sudah berupa URL storage/CDN, nilainya disimpan apa adanya.

Contoh (JSON):
```json
{
  "name": "Rem",
  "anime_title": "Re:Zero",
  "image_url": "https://cdn.example.com/images/rem.png",
  "description": "..."
}
```

Contoh (multipart/form-data):
```
POST /1.0.10/waifu
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: multipart/form-data

Fields:
- name: Rem
- anime_title: Re:Zero
- description: ...
- image: <FILE UPLOAD> (PNG/JPG disarankan)
```

- Catatan penyimpanan gambar:
  - Database menyimpan kolom `image_url` berupa tautan (URL) saja, sama seperti border.
  - Jika mengunggah file, server akan meng-upload file ke storage/B2 dan mengisi `image_url` dengan URL storage/CDN final.
  - Jika mengirim `image_url` yang belum berupa URL storage/CDN, server akan memindahkan sumber gambar itu ke storage/B2 terlebih dahulu.
  - Client harus memakai `data.image_url` dari response sebagai URL final yang valid.
- Respons (contoh):
```json
{
  "status": 201,
  "message": "Created",
  "data": {
    "id": 10,
    "name": "Rem",
    "anime_title": "Re:Zero",
    "image_url": "https://<CDN_STORAGE>/waifu/images/1728381600000-ab12cd34.png",
    "description": "...",
    "total_votes": 0,
    "createdAt": "2025-10-08T11:35:00.000Z",
    "updatedAt": "2025-10-08T11:35:00.000Z"
  }
}
```

### 6.2. Update Waifu
- Endpoint: `PUT /1.0.10/waifu/:id`
- Body (JSON) menerima kolom yang ingin diperbarui (`name`, `anime_title`, `image_url`, `description`, ...). Juga dapat menggunakan multipart/form-data dengan field `image` untuk mengganti gambar.
- Perilaku penggantian gambar:
  - Jika upload file (multipart), server meng-upload file ke storage/B2 dan mengisi `image_url` dengan URL storage/CDN hasil upload.
  - Jika mengirim `image_url` sebagai URL `http(s)` non-storage/CDN, server akan download lalu upload ulang ke storage/B2.
  - Jika mengirim `image_url` sebagai path `/static/...` atau URL localhost/static server, server akan membaca file lokal lalu upload ulang ke storage/B2.
  - Jika `image_url` sudah berupa URL storage/CDN, nilai tersebut disimpan langsung.
- Respons (contoh):
```json
{
  "status": 200,
  "message": "Updated",
  "data": {
    "id": 10,
    "name": "Rem",
    "anime_title": "Re:Zero",
    "image_url": "https://<CDN_STORAGE>/waifu/images/1728381999000-ef56gh78.webp",
    "description": "updated desc",
    "total_votes": 0,
    "createdAt": "2025-10-08T11:35:00.000Z",
    "updatedAt": "2025-10-08T11:40:00.000Z"
  }
}
```

### 6.3. Hapus Waifu
- Endpoint: `DELETE /1.0.10/waifu/:id`
- Respons: `200 OK` dengan data waifu yang dihapus.

### 6.4. Reset Semua Vote
- Endpoint: `POST /1.0.10/waifu/reset`
- Perilaku: hapus semua `WaifuVote`, set `Waifu.total_votes` ke 0.
- Respons: `200 OK` dengan `{ reset: true }`.

---

## 7) Catatan Implementasi BE
- Voting diimplementasikan di `src/services/waifu.service.js` → fungsi `voteWaifu()` menggunakan transaksi:
  - Membuat `WaifuVote` baru.
  - Menginkrement `Waifu.total_votes` atomik.
- Validasi 24 jam global dilakukan dengan cek `WaifuVote` terbaru user (`createdAt >= now() - 24h`).
- Jika ingin mengubah menjadi **1 vote per waifu per 24 jam**, ubah filter menjadi `where: { user_id: uid, waifu_id: wid, createdAt: { gte: since } }`.

### Penyimpanan Gambar Waifu
- DB hanya menyimpan `image_url` (tautan) sebagai sumber gambar.
- Jika menerima unggahan file, backend meng-upload file itu ke storage/B2 dan menyimpan URL storage/CDN final di `image_url`.
- Jika menerima `image_url` berupa URL remote `http(s)` atau path `/static/...`, backend akan memindahkan sumber gambar itu ke storage/B2 lalu menyimpan URL storage/CDN final.
- Jika menerima `image_url` yang sudah berupa URL storage/CDN, nilai tersebut disimpan apa adanya.

---

## 8) Rekomendasi UI/UX
- Tampilkan countdown sisa waktu vote berikutnya saat menerima respon 429 (gunakan `meta.nextAllowedAt`).
- Beri indikator loading saat proses vote berlangsung agar tidak double submit.
- Tampilkan urutan waifu berdasarkan `total_votes` (sudah default di endpoint list).
