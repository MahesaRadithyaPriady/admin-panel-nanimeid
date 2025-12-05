# VIP Plan Admin API (SUPERADMIN)

Base path: `/${VERSION}/admin`
Auth: `authenticateAdmin` + `authorizeAdminRoles("SUPERADMIN")`

## Overview
- Mengelola master paket VIP (`VipPlan`).
- Set nama, deskripsi, daftar benefit, harga koin (`price_coins`), warna (`color`), dan status aktif.

## Model Fields (ringkas)
- `id` (number)
- `name` (string, unique)
- `description` (string|null)
- `benefits` (string[])
- `price_coins` (number)
- `color` (string, hex, contoh `#FFD700`)
- `is_active` (boolean)
- `createdAt`, `updatedAt`

---

## List VIP Plans

**GET** `/${VERSION}/admin/vip-plans`

- Deskripsi: Ambil daftar paket VIP. Default hanya yang aktif.
- Query params (opsional):
  - `page` (number, default: 1)
  - `pageSize` (number, default: 20, max: 100)
  - `includeInactive` (boolean, default: false)
- Response:
```json
{
  "message": "OK",
  "code": 200,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Gold",
        "description": "Akses fitur premium",
        "benefits": ["No ads", "1080p", "Early access"],
        "price_coins": 1000,
        "color": "#FFD700",
        "is_active": true,
        "createdAt": "2025-09-27T06:00:00.000Z",
        "updatedAt": "2025-09-27T06:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

## Get VIP Plan by ID

**GET** `/${VERSION}/admin/vip-plans/:id`

- Deskripsi: Ambil detail satu VIP plan.
- Response (200): objek plan seperti di atas.
- Error: 400 (id tidak valid), 404 (plan tidak ditemukan).

---

## Create VIP Plan

**POST** `/${VERSION}/admin/vip-plans`

- Headers: `Content-Type: application/json`
- Body:
```json
{
  "name": "Gold",
  "description": "Akses fitur premium",
  "benefits": ["No ads", "1080p", "Early access"],
  "price_coins": 1000,
  "color": "#FFD700",
  "is_active": true
}
```
- Response (201):
```json
{
  "message": "VIP plan dibuat",
  "code": 201,
  "data": { /* VipPlan */ }
}
```
- Error umum:
  - 400: `name`/`price_coins`/`color` invalid.
  - 409: `name` sudah digunakan.

---

## Update VIP Plan

**PUT** `/${VERSION}/admin/vip-plans/:id`

- Body (contoh):
```json
{
  "name": "Diamond",
  "benefits": ["No ads", "4K", "Priority support"],
  "price_coins": 2500,
  "color": "#00BFFF",
  "is_active": true
}
```
- Response (200):
```json
{
  "message": "VIP plan diupdate",
  "code": 200,
  "data": { /* VipPlan setelah update */ }
}
```
- Error umum: 400 (id/payload invalid), 404 (plan tidak ditemukan), 409 (name sudah digunakan).

---

## Toggle Active Status

**PATCH** `/${VERSION}/admin/vip-plans/:id/toggle`

- Body:
```json
{
  "is_active": false
}
```
- Response (200):
```json
{
  "message": "Status VIP plan diupdate",
  "code": 200,
  "data": { /* VipPlan setelah toggle */ }
}
```
- Error: 400 (id/is_active invalid), 404 (plan tidak ditemukan).

---

## Delete VIP Plan

**DELETE** `/${VERSION}/admin/vip-plans/:id`

- Deskripsi: Hapus satu paket VIP.
- Response (200):
```json
{
  "message": "VIP plan dihapus",
  "code": 200,
  "data": { /* VipPlan yang dihapus */ }
}
```

---

## Notes

- Endpoint ini mirror dari API VIP plan biasa tapi diproteksi admin dan base path berada di `/admin/vip-plans`.
- `color` harus format hex: `#RRGGBB` atau `#RGB`.
- `price_coins` harus > 0.
- `benefits` dikirim sebagai array string.
