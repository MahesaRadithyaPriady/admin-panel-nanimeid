# Admin Topup Moderation API

Dokumentasi endpoint SUPERADMIN untuk moderasi permintaan topup manual (mis. QRIS). Admin memvalidasi apakah request valid atau tidak; kredit koin akan terjadi otomatis oleh server ketika status berubah ke `APPROVED`/`PAID` melalui `TopupService.setStatus()`.

Prefix versi mengikuti konfigurasi aplikasi (contoh: `/1.0.10`). Endpoint dimount di bawah prefix admin di `app.js`:

- `app.use(`${API_PREFIX}/admin`, adminRoutes);`

Sehingga path final menjadi: `/<VERSION>/admin/...`

---

## Authorization & Role
- Wajib token admin (`Authorization: Bearer <ADMIN_TOKEN>`)
- Role minimal: `SUPERADMIN`

---

## GET /admin/topup/requests
Ambil daftar permintaan topup manual.

- Method: `GET`
- Auth: Admin token + role SUPERADMIN
- Query params:
  - `userId` (opsional): filter by user id tertentu
  - `status` (opsional): `PENDING|APPROVED|REJECTED|PAID|CANCELED`
  - `page`, `limit`

### Contoh Request
```
GET /1.0.10/admin/topup/requests?status=PENDING&page=1&limit=20
Authorization: Bearer <ADMIN_TOKEN>
```

### Contoh Response (200)
```json
{
  "message": "OK",
  "items": [
    {
      "id": 123,
      "user_id": 1702,
      "amount_coins": 1000,
      "payment_method": "MANUAL_QRIS",
      "payment_ref": "https://host/1.0.10/static/uploads/banners/xxx.jpg",
      "note": "Seeder manual QRIS",
      "status": "PENDING"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

---

## GET /admin/topup/requests/:id
Ambil detail satu permintaan topup manual.

- Method: `GET`
- Auth: Admin token + role SUPERADMIN

### Contoh Request
```
GET /1.0.10/admin/topup/requests/123
Authorization: Bearer <ADMIN_TOKEN>
```

### Contoh Response (200)
```json
{
  "message": "OK",
  "data": {
    "id": 123,
    "user_id": 1702,
    "amount_coins": 1000,
    "payment_method": "MANUAL_QRIS",
    "payment_ref": "https://host/1.0.10/static/uploads/banners/xxx.jpg",
    "note": "Seeder manual QRIS",
    "status": "PENDING"
  }
}
```

---

## PATCH /admin/topup/requests/:id/status
Ubah status permintaan topup manual. Gunakan `APPROVED` jika valid (akan mengkredit koin otomatis), atau `REJECTED` jika tidak valid. `PAID` juga mengkredit bila belum pernah dikredit.

- Method: `PATCH`
- Auth: Admin token + role SUPERADMIN
- Body JSON:
```json
{ "status": "APPROVED" }
```
- Nilai status yang diperbolehkan: `PENDING|APPROVED|REJECTED|PAID|CANCELED`

### Contoh Request (approve)
```
PATCH /1.0.10/admin/topup/requests/123/status
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{ "status": "APPROVED" }
```

### Contoh Response (200)
```json
{
  "message": "Status diupdate",
  "data": {
    "id": 123,
    "status": "APPROVED"
  }
}
```

### Catatan Penting
- Saat status menjadi `APPROVED` atau `PAID`, server akan melakukan kredit koin idempoten menggunakan `WalletService.earn()` dengan `ref = TOPUP:<id>`.
- Jika request pernah dikredit sebelumnya, pengkreditan tidak akan dilakukan lagi (idempotent check pada `coinTransaction.ref`).

---

## Error Umum
- 400 `status wajib`
- 400 `status tidak valid`
- 404 `Topup request tidak ditemukan`
- 401/403 jika token invalid atau role bukan SUPERADMIN

---

## Catatan Implementasi
- Controller: `src/controllers/adminTopup.controller.js`
  - `adminListTopupRequests()` → `TopupService.list()`
  - `adminGetTopupRequest()` → `TopupService.get()`
  - `adminSetTopupStatus()` → `TopupService.setStatus()` (auto kredit pada `APPROVED/PAID`)
- Routes: `src/routes/admin.routes.js`
  - `GET /topup/requests`, `GET /topup/requests/:id`, `PATCH /topup/requests/:id/status`
