# Admin Sticker API

Base path: `/admin/stickers`

Role: hanya **SUPERADMIN**.

## Upload & Storage

- Gambar stiker dikirim lewat multipart form field `image`.
- Client admin cukup mengirim file gambar langsung ke endpoint sticker melalui field `image`, atau mengirim URL langsung melalui field `image_url`.
- Jika mengirim `image` (file), server akan meng-upload file tersebut ke storage/B2 dan menyimpan URL storage/CDN ke field `image_url`.
- Jika mengirim `image_url` berupa URL `http(s)`, server akan mengunduh gambar lalu meng-upload ulang ke storage/B2. URL asli tidak disimpan.
- Jika mengirim `image_url` berupa path static lokal (mis. `/static/...`) atau URL localhost/static server (mis. `http://localhost:3001/static/...`), server akan membaca file sumber lalu meng-upload ulang ke storage/B2.
- Jika `image_url` sudah merupakan URL storage/CDN (prefix `CDN_BASE_URL_STORAGE`), server akan menyimpan nilai tersebut apa adanya.
- Nilai yang disimpan di `image_url` adalah **full URL** storage/CDN, misalnya (contoh):
  - `CDN_BASE_URL_STORAGE=https://cdn.nanimeid.com`
  - File storage key: `catalog/stickers/happy_1701400000000.png`
  - `image_url`: `https://cdn.nanimeid.com/catalog/stickers/happy_1701400000000.png`

> Catatan:
> - `CDN_BASE_URL_STORAGE` harus terpasang agar server bisa mengenali URL storage/CDN secara konsisten.
> - Client harus memakai `data.image_url` dari response sebagai callback URL final setelah create/update.

Rekomendasi:
- Untuk flow admin standar, kirim file langsung lewat field `image` atau kirim URL langsung lewat `image_url` ke endpoint sticker ini.

## Migrasi Asset Sticker ke Storage B2

Jika `Sticker.image_url` kamu masih menunjuk ke path/URL lama (misal `static/uploads/stikers/...`) dan ingin dipindahkan ke storage B2, gunakan script:

`src/scripts/migrateStickersToB2.js`

Dry-run (default):

```bash
node src/scripts/migrateStickersToB2.js --dry-run
```

Apply:

```bash
node src/scripts/migrateStickersToB2.js --apply
```

Opsi umum:

- `--limit=100`
- `--only-legacy` (skip yang sudah di B2)

---

## GET /admin/stickers

List semua stiker dengan pagination dan optional search.

Query:
- `page` (default `1`)
- `limit` (default `50`, max `200`)
- `q` (opsional) – cari berdasarkan `code`, `name`, atau `description` (case-insensitive)

Response 200:
```json
{
  "status": 200,
  "message": "Berhasil mengambil daftar stiker",
  "data": [
    {
      "id": 1,
      "code": "STK_HAPPY_1",
      "name": "Happy Emote",
      "description": "Stiker wajah senang",
      "image_url": "https://cdn.nanimeid.com/static/uploads/stikers/happy_1701400000000.png",
      "poin_collection": 50,
      "is_active": true,
      "sort_order": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 50,
  "total": 1,
  "totalPages": 1
}
```

---

## GET /admin/stickers/:id

Ambil detail satu stiker.

Response 200:
```json
{
  "status": 200,
  "message": "Berhasil mengambil data stiker",
  "data": {
    "id": 1,
    "code": "STK_HAPPY_1",
    "name": "Happy Emote",
    "description": "Stiker wajah senang",
    "image_url": "https://cdn.nanimeid.com/static/uploads/stikers/happy_1701400000000.png",
    "poin_collection": 50,
    "is_active": true,
    "sort_order": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

404 jika `id` tidak ditemukan.

---

## Sticker Ownership (Admin)

Endpoint khusus SUPERADMIN untuk cek dan mengelola kepemilikan stiker per user.

### GET /admin/stickers/:id/users

List semua user yang memiliki stiker tertentu.

Query (opsional):
- `page` (default `1`)
- `limit` (default `20`, max `100`)
- `userId` (opsional, filter hanya 1 user tertentu)

Response 200:
```json
{
  "status": 200,
  "message": "OK",
  "items": [
    {
      "id": 10,
      "user_id": 123,
      "sticker_id": 1,
      "acquired_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### POST /admin/stickers/:id/users

Tambah kepemilikan stiker untuk user tertentu.

Headers:
```http
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json
```

Body JSON:
- `user_id` (number, wajib)

Behavior:
- Jika user sudah punya stiker ini, endpoint tetap sukses dan mengembalikan data ownership yang ada (idempoten).

Response 201:
```json
{
  "status": 201,
  "message": "Ownership stiker ditambahkan",
  "data": {
    "id": 10,
    "user_id": 123,
    "sticker_id": 1,
    "acquired_at": "2024-01-01T00:00:00.000Z"
  }
}
```

Error contoh:
- 400: `sticker id wajib`, `user_id wajib`
- 404: `Sticker tidak ditemukan`

---

### DELETE /admin/stickers/:id/users/:userId

Hapus kepemilikan stiker untuk user tertentu.

Response 200:
```json
{
  "status": 200,
  "message": "Ownership stiker dihapus"
}
```

Error contoh:
- 400: `sticker id dan userId wajib`
- 404: `Ownership stiker tidak ditemukan`

---

## POST /admin/stickers

Buat stiker baru (dengan upload gambar).

Headers:
```http
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: multipart/form-data
```

Body (multipart form):
- `code` (text, wajib, unik)
- `name` (text, wajib)
- `description` (text, opsional)
- `poin_collection` (text angka, opsional, default `50`)
- `is_active` (text `true`/`false`, opsional, default `true`)
- `sort_order` (text angka, opsional, default `0`)
- `image` (file, opsional) – gambar stiker
- `image_url` (string, opsional) – alternatif tanpa upload file

Catatan create:
- Salah satu dari `image` atau `image_url` wajib dikirim.
- Jika `image_url` adalah URL `http(s)` non-storage/CDN, server akan download lalu upload ulang ke storage/B2.
- Jika `image_url` adalah `/static/...` atau URL localhost/static server, server akan baca file lokal lalu upload ulang ke storage/B2.
- Jika `image_url` sudah URL storage/CDN, nilainya dipakai apa adanya.

Response 201:
```json
{
  "status": 201,
  "message": "Sticker berhasil dibuat",
  "data": {
    "id": 2,
    "code": "STK_SAD_1",
    "name": "Sad Emote",
    "description": "Stiker wajah sedih",
    "image_url": "https://cdn.nanimeid.com/static/uploads/stikers/sad_1701400100000.png",
    "poin_collection": 50,
    "is_active": true,
    "sort_order": 10,
    "createdAt": "2024-01-01T00:10:00.000Z",
    "updatedAt": "2024-01-01T00:10:00.000Z"
  }
}
```

400 error contoh:
- `code dan name wajib`
- `file gambar (image) atau image_url wajib`
- `image_url tidak valid`
- `image harus berupa gambar`
- `code sudah digunakan` (duplikat `code`)

---

## PUT /admin/stickers/:id

Update data stiker, bisa sekaligus ganti gambar.

Headers:
```http
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: multipart/form-data
```

Body (multipart form – semua opsional):
- `code` (text)
- `name` (text)
- `description` (text)
- `poin_collection` (text angka)
- `is_active` (text `true`/`false`)
- `sort_order` (text angka)
- `image` (file) – jika dikirim, gambar stiker akan diganti dan `image_url` diupdate ke URL storage/CDN
- `image_url` (string) – alternatif ganti gambar tanpa upload file

Catatan update:
- Jika `image_url` adalah URL `http(s)` non-storage/CDN, server akan download lalu upload ulang ke storage/B2.
- Jika `image_url` adalah `/static/...` atau URL localhost/static server, server akan baca file lokal lalu upload ulang ke storage/B2.
- Jika `image_url` sudah URL storage/CDN, nilainya dipakai apa adanya.
- Jika `image` dikirim, file akan di-upload ke storage/B2 dan hasil URL storage/CDN disimpan ke `image_url`.

Response 200:
```json
{
  "status": 200,
  "message": "Sticker berhasil diupdate",
  "data": {
    "id": 1,
    "code": "STK_HAPPY_1",
    "name": "Happy Emote (Updated)",
    "description": "Deskripsi baru",
    "image_url": "https://cdn.nanimeid.com/static/uploads/stikers/happy_1701400200000.png",
    "poin_collection": 50,
    "is_active": true,
    "sort_order": 5,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:20:00.000Z"
  }
}
```

404 jika `id` tidak ditemukan.

400 jika `code` bentrok dengan stiker lain (`code sudah digunakan`).

---

## DELETE /admin/stickers/:id

Hapus stiker.

Response 200:
```json
{
  "status": 200,
  "message": "Sticker berhasil dihapus"
}
```

404 jika `id` tidak ditemukan.
