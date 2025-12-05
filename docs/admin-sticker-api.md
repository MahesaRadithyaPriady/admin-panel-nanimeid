# Admin Sticker API

Base path: `/admin/stickers`

Role: hanya **SUPERADMIN**.

## Upload & Storage

- Gambar stiker dikirim lewat multipart form field `image`.
- File fisik akan disimpan ke folder `static/uploads/stikers`.
- Aplikasi akan membangun URL penuh menggunakan environment `URL_BASE_UPLOAD`.
- Nilai yang disimpan di `image_url` adalah **full URL**, misalnya (contoh):
  - `URL_BASE_UPLOAD=https://cdn.nanimeid.com`
  - File: `static/uploads/stikers/happy_1701400000000.png`
  - `image_url`: `https://cdn.nanimeid.com/static/uploads/stikers/happy_1701400000000.png`

> Catatan:
> - Jika `URL_BASE_UPLOAD` tidak diset, fallback `image_url` akan berupa path relatif: `/static/uploads/stikers/..`.
> - Endpoint HTTP final biasanya: `API_PREFIX + image_url`, misal `https://api.nanimeid.com/api/v1/static/uploads/stikers/...` bila API di-deploy terpisah dari CDN.

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
- `is_active` (text `true`/`false`, opsional, default `true`)
- `sort_order` (text angka, opsional, default `0`)
- `image` (file, wajib) – gambar stiker (png/jpg/webp, max ~4MB)

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
    "is_active": true,
    "sort_order": 10,
    "createdAt": "2024-01-01T00:10:00.000Z",
    "updatedAt": "2024-01-01T00:10:00.000Z"
  }
}
```

400 error contoh:
- `code dan name wajib`
- `file gambar (image) wajib`
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
- `is_active` (text `true`/`false`)
- `sort_order` (text angka)
- `image` (file) – jika dikirim, gambar stiker akan diganti dan `image_url` diupdate

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
