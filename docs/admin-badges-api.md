# Admin Badges API

Dokumentasi endpoint admin untuk mengelola master `Badge`.

Semua endpoint di bawah berada di bawah prefix: `/admin` dan **wajib** menggunakan autentikasi admin (`Authorization: Bearer <admin_jwt>`), serta role `SUPERADMIN`.

## Model `Badge`

Field utama di tabel `Badge`:

- `id: number`
- `code: string` (unik) — kode internal badge, dipakai di konfigurasi lain.
- `name: string` — nama badge.
- `description: string | null` — deskripsi opsional.
- `badge_url: string` — URL icon/gambar badge (PNG/GIF/SVG, dll).
- `is_active: boolean` — apakah badge aktif di katalog.
- `sort_order: number` — urutan tampilan (semakin kecil semakin atas).
- `width: number | null` — lebar gambar dalam piksel (jika diketahui dari upload).
- `height: number | null` — tinggi gambar dalam piksel (jika diketahui dari upload).
- `createdAt: string` — waktu dibuat.
- `updatedAt: string` — waktu diupdate.

---

## GET /admin/badges

List badge dengan pagination.

Query params (opsional):

- `page`: number (default: 1)
- `limit`: number (default: 50, max: 200)
- `q`: string — filter dengan `code`/`name`/`description` yang mengandung teks ini (case-insensitive)
- `active`: boolean (`true` / `false`) — filter hanya yang aktif / tidak aktif

Contoh request:

```http
GET /admin/badges?page=1&limit=20&q=vip&active=true
Authorization: Bearer <ADMIN_TOKEN>
```

Response 200:

```json
{
  "status": 200,
  "message": "OK",
  "items": [
    {
      "id": 1,
      "code": "VIP_GOLD",
      "name": "VIP Gold",
      "description": "Badge untuk member VIP Gold",
      "badge_url": "https://cdn.nanime.id/static/badges/vip_gold.png",
      "is_active": true,
      "sort_order": 10,
      "createdAt": "2025-12-01T10:00:00.000Z",
      "updatedAt": "2025-12-01T10:00:00.000Z"
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

## GET /admin/badges/:id

Ambil detail satu badge berdasarkan ID.

```http
GET /admin/badges/1
Authorization: Bearer <ADMIN_TOKEN>
```

Response 200:

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "id": 1,
    "code": "VIP_GOLD",
    "name": "VIP Gold",
    "description": "Badge untuk member VIP Gold",
    "badge_url": "https://cdn.nanime.id/static/badges/vip_gold.png",
    "is_active": true,
    "sort_order": 10,
    "createdAt": "2025-12-01T10:00:00.000Z",
    "updatedAt": "2025-12-01T10:00:00.000Z"
  }
}
```

Error:

- 400: `id` tidak valid
- 404: badge tidak ditemukan

---

## POST /admin/badges

Membuat badge baru.

Endpoint ini mendukung **dua cara** pengisian gambar:

1. Mengirim URL langsung di `badge_url` (JSON).
2. Mengupload file gambar lewat field `image` (multipart/form-data). File akan disimpan ke `static/uploads/badges`, dan URL penuh dibangun dari env `URL_BASE_UPLOAD`.

Dengan upload file, server akan mencoba membaca `width` dan `height` gambar dan menyimpannya ke DB.

Body (JSON, tanpa file):

- `code` (string, wajib, unik)
- `name` (string, wajib)
- `description` (string, opsional)
- `badge_url` (string, wajib jika tidak upload file) — URL icon badge
- `is_active` (boolean, opsional, default: true)
- `sort_order` (number, opsional, default: 0)

Contoh request (JSON saja):

```http
POST /admin/badges
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "code": "VIP_PLATINUM",
  "name": "VIP Platinum",
  "description": "Badge khusus VIP Platinum",
  "badge_url": "https://cdn.nanime.id/static/badges/vip_platinum.png",
  "is_active": true,
  "sort_order": 20
}
```

Contoh request (upload file):

```http
POST /admin/badges
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: multipart/form-data

body:
  code: VIP_PLATINUM
  name: VIP Platinum
  description: Badge khusus VIP Platinum
  is_active: true
  sort_order: 20
  image: <file image/png>
```

Response 201:

```json
{
  "status": 201,
  "message": "Badge dibuat",
  "data": {
    "id": 2,
    "code": "VIP_PLATINUM",
    "name": "VIP Platinum",
    "description": "Badge khusus VIP Platinum",
    "badge_url": "https://cdn.nanime.id/static/uploads/badges/vip_platinum.png",
    "is_active": true,
    "sort_order": 20,
    "width": 256,
    "height": 256,
    "createdAt": "2025-12-01T10:05:00.000Z",
    "updatedAt": "2025-12-01T10:05:00.000Z"
  }
}
```

Error:

- 400: validasi gagal (misal `code`, `name`, atau `badge_url` / file image kosong)
- 409: `code` sudah digunakan (unique constraint)

---

## PUT /admin/badges/:id

Update badge yang sudah ada.

Body (JSON) — semua field opsional, hanya yang dikirim yang akan diupdate:

- `code` (string)
- `name` (string)
- `description` (string atau null)
- `badge_url` (string)
- `is_active` (boolean)
- `sort_order` (number)

Endpoint ini juga mendukung upload file baru via field `image` (multipart/form-data). Jika file dikirim, maka:

- `badge_url` akan diisi otomatis menggunakan `URL_BASE_UPLOAD` + `/static/uploads/badges/<filename>`.
- `width` dan `height` akan diperbarui sesuai dimensi file.

Contoh request (JSON):

```http
PUT /admin/badges/2
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "name": "VIP Platinum+",
  "is_active": false
}
```

Response 200:

```json
{
  "status": 200,
  "message": "Badge diupdate",
  "data": {
    "id": 2,
    "code": "VIP_PLATINUM",
    "name": "VIP Platinum+",
    "description": "Badge khusus VIP Platinum",
    "badge_url": "https://cdn.nanime.id/static/badges/vip_platinum.png",
    "is_active": false,
    "sort_order": 20,
    "createdAt": "2025-12-01T10:05:00.000Z",
    "updatedAt": "2025-12-01T10:10:00.000Z"
  }
}
```

Error:

- 400: `id` tidak valid atau input tidak sesuai
- 404: badge tidak ditemukan
- 409: `code` bentrok dengan badge lain

---

## DELETE /admin/badges/:id

Menghapus badge.

```http
DELETE /admin/badges/2
Authorization: Bearer <ADMIN_TOKEN>
```

Response 200:

```json
{ "status": 200, "message": "Badge dihapus" }
```

Error:

- 400: `id` tidak valid
- 404: badge tidak ditemukan

---

## Catatan

- Endpoint ini hanya bisa diakses oleh admin dengan role **SUPERADMIN**.
- Saat ini belum ada relasi langsung antara `Badge` dan `UserBadge`; user masih disimpan dengan `badge_name`/`badge_icon` di `UserBadge`. Integrasi ke master `Badge` bisa ditambahkan kemudian.

---

# Badge Ownership (UserBadge)

Admin bisa mengelola kepemilikan badge per user melalui endpoint di bawah. Semua endpoint memerlukan autentikasi admin (`Authorization: Bearer <admin_jwt>`) dan role **SUPERADMIN**.

## GET /admin/badges/:badgeId/owners

List semua user yang memiliki badge tertentu.

Query params (opsional):

- `page`: number (default: 1)
- `limit`: number (default: 50, max: 200)
- `q`: string — filter berdasarkan `username`, `email`, atau `badge_name` (case-insensitive)
- `active`: boolean (`true` / `false`) — filter hanya yang aktif / tidak aktif

Contoh request:

```http
GET /admin/badges/1/owners?page=1&limit=20&q=test&active=true
Authorization: Bearer <ADMIN_TOKEN>
```

Response 200:

```json
{
  "status": 200,
  "message": "OK",
  "items": [
    {
      "id": 5,
      "user_id": 12,
      "badge_id": 1,
      "badge_name": "VIP Gold",
      "badge_icon": "https://cdn.nanime.id/static/uploads/badges/vip_gold.png",
      "active": true,
      "expires_at": "2026-12-31T23:59:59.000Z",
      "created_at": "2025-12-01T10:00:00.000Z",
      "user": {
        "id": 12,
        "username": "testuser",
        "email": "test@example.com",
        "avatar_url": "https://cdn.nanime.id/static/uploads/avatars/12.png"
      }
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

Error:
- 400: `badgeId` tidak valid
- 500: gagal mengambil data

---

## POST /admin/badges/:badgeId/owners

Memberikan badge ke seorang user.

Body (JSON):

- `user_id` (number, wajib) — ID user
- `badge_name` (string, opsional) — nama badge (default: nama dari master `Badge`)
- `badge_icon` (string, opsional) — URL icon badge (default: `badge_url` dari master `Badge`)
- `active` (boolean, opsional, default: true)
- `expires_at` (string ISO datetime, opsional) — kapan badge kadaluarsa (null = tidak kadaluarsa)

Contoh request:

```http
POST /admin/badges/1/owners
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "user_id": 12,
  "badge_name": "VIP Gold",
  "badge_icon": "https://cdn.nanome.id/static/uploads/badges/vip_gold.png",
  "active": true,
  "expires_at": "2026-12-31T23:59:59.000Z"
}
```

Response 201:

```json
{
  "status": 201,
  "message": "Badge owner ditambahkan",
  "data": {
    "id": 6,
    "user_id": 12,
    "badge_id": 1,
    "badge_name": "VIP Gold",
    "badge_icon": "https://cdn.nanome.id/static/uploads/badges/vip_gold.png",
    "active": true,
    "expires_at": "2026-12-31T23:59:59.000Z",
    "created_at": "2025-12-01T10:05:00.000Z"
  }
}
```

Error:
- 400: `badgeId` atau `user_id` tidak valid
- 404: `Badge` atau `User` tidak ditemukan
- 409: owner sudah ada (unique constraint)

---

## PATCH /admin/badges/:badgeId/owners/:ownerId

Update data kepemilikan badge (nama, icon, status active, atau expires_at).

Body (JSON) — semua field opsional:

- `badge_name` (string)
- `badge_icon` (string)
- `active` (boolean)
- `expires_at` (string ISO datetime atau null)

Contoh request:

```http
PATCH /admin/badges/1/owners/6
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "active": false,
  "expires_at": "2025-12-31T23:59:59.000Z"
}
```

Response 200:

```json
{
  "status": 200,
  "message": "Owner diupdate",
  "data": {
    "id": 6,
    "user_id": 12,
    "badge_id": 1,
    "badge_name": "VIP Gold",
    "badge_icon": "https://cdn.nanome.id/static/uploads/badges/vip_gold.png",
    "active": false,
    "expires_at": "2025-12-31T23:59:59.000Z",
    "created_at": "2025-12-01T10:05:00.000Z"
  }
}
```

Error:
- 400: `badgeId` atau `ownerId` tidak valid
- 404: owner tidak ditemukan

---

## DELETE /admin/badges/:badgeId/owners/:ownerId

Menghapus kepemilikan badge dari user.

```http
DELETE /admin/badges/1/owners/6
Authorization: Bearer <ADMIN_TOKEN>
```

Response 200:

```json
{ "status": 200, "message": "Owner dihapus" }
```

Error:
- 400: `badgeId` atau `ownerId` tidak valid
- 404: owner tidak ditemukan

---

## Catatan Ownership

- `badgeId` di URL merujuk ke ID master `Badge`.
- `ownerId` di URL adalah ID record di tabel `UserBadge` (bukan user_id).
- Saat menambah owner, jika `badge_name`/`badge_icon` tidak dikirim, akan diisi otomatis dari master `Badge`.
- `expires_at` opsional; jika `null` atau tidak dikirim, badge tidak akan kadaluarsa.
- Endpoint ini hanya untuk **SUPERADMIN**.
