# Prime Store Admin API (SUPERADMIN)

Base path: `/${VERSION}/admin`
Auth: `authenticateAdmin` + `authorizeAdminRoles("SUPERADMIN")`

## Overview
- Mengelola katalog **Prime Store** terpisah dari Store biasa.
- Menjual item tipe: `VIP`, `BADGE`, `SUPERBADGE`, `BORDER`, `STICKER`, `VOUCHER`.
- Mendukung **diskon harian** per item (`PrimeStoreDailyDiscount`) yang bisa berganti tiap hari.
 - Untuk tipe `VIP`, bisa memakai durasi custom (`vip_days`) atau mengacu ke paket VIP eksisting (`vip_plan_id`) dari **VIP Plan Admin API**.

## Prisma Models (Ringkas)

```prisma
model PrimeStoreItem {
  id              Int                @id @default(autoincrement())
  sku             String             @unique
  title           String
  description     String?
  base_coin_price Int
  vip_days        Int?               // durasi VIP custom (hari)
  vip_plan_id     Int?               // optional: referensi ke VipPlan.id jika pakai paket VIP eksisting
  badge_name      String?
  badge_icon      String?
  title_color     String?
  super_badge_id  Int?
  border_id       Int?
  sticker_id      Int?
  voucher_template_code String?
  item_type       PrimeStoreItemType @default(VIP)
  is_active       Boolean            @default(true)
  sort_order      Int                @default(0)
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  daily_discounts PrimeStoreDailyDiscount[]
}

enum PrimeStoreItemType {
  VIP
  BADGE
  SUPERBADGE
  BORDER
  STICKER
  VOUCHER
}

model PrimeStoreDailyDiscount {
  id               Int      @id @default(autoincrement())
  item_id          Int
  discount_percent Int
  valid_date       DateTime
  is_active        Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  item PrimeStoreItem @relation(fields: [item_id], references: [id], onDelete: Cascade)
}
```

---

## Items

### GET `/prime-store/items`
- Deskripsi: Daftar item Prime Store dengan filter dan paginasi.
- Query:
  - `q?`: cari di `title`, `sku`, atau `item_type` (case-insensitive).
  - `active?`: `true|false` (default: semua).
  - `page?`: default 1.
  - `limit?`: default 20, max 100.
- Respon:
```json
{
  "success": true,
  "items": [
    {
      "id": 1,
      "sku": "PRIME_VIP_GOLD_30D",
      "title": "Prime VIP Gold 30 Days",
      "description": "VIP Prime 30 hari",
      "base_coin_price": 2500,
      "item_type": "VIP",
      "vip_days": 30,
      "vip_plan_id": null,
      "badge_name": null,
      "badge_icon": null,
      "title_color": null,
      "super_badge_id": null,
      "border_id": null,
      "sticker_id": null,
      "voucher_template_code": null,
      "is_active": true,
      "sort_order": 0,
      "createdAt": "2025-11-03T00:00:00.000Z",
      "updatedAt": "2025-11-03T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### GET `/prime-store/items/:id`
- Deskripsi: Detail satu item Prime Store.
- Respon: `{ success, data }` atau 404 jika tidak ada.

### POST `/prime-store/items`
- Deskripsi: Membuat item Prime Store baru.
- Body (field umum; gunakan sesuai `item_type`):
```json
{
  "sku": "PRIME_VIP_GOLD_30D",
  "title": "Prime VIP Gold 30 Days",
  "description": "VIP Prime 30 hari",
  "item_type": "VIP", // VIP | BADGE | SUPERBADGE | BORDER | STICKER | VOUCHER
  "base_coin_price": 2500,
  // Pilih salah satu untuk VIP:
  // - vip_days: durasi custom (tanpa referensi VipPlan)
  // - vip_plan_id: referensi ke VipPlan.id yang sudah dikonfigurasi di VIP Plan Admin
  "vip_days": 30,
  "vip_plan_id": null,
  "badge_name": null,
  "badge_icon": null,
  "title_color": null,
  "super_badge_id": null,
  "border_id": null,
  "sticker_id": null,
  "voucher_template_code": null,
  "is_active": true,
  "sort_order": 0
}
```
- Respon: `{ success: true, data }`.

### PUT `/prime-store/items/:id`
- Deskripsi: Update item Prime Store (partial allowed).
- Body: sama seperti POST (field boleh subset).
- Respon: `{ success: true, data }`.

### DELETE `/prime-store/items/:id`
- Deskripsi: Hapus item Prime Store.
- Respon: `{ success: true }`.

---

## Daily Discounts

### GET `/prime-store/daily-discounts`
- Deskripsi: Daftar konfigurasi diskon harian Prime Store.
- Query:
  - `date?`: ISO string tanggal (opsional). Jika diisi, filter ke tanggal tersebut.
  - `page?`, `limit?`.
- Respon:
```json
{
  "success": true,
  "items": [
    {
      "id": 1,
      "item_id": 1,
      "discount_percent": 20,
      "valid_date": "2025-12-02T00:00:00.000Z",
      "is_active": true,
      "createdAt": "2025-12-01T10:00:00.000Z",
      "updatedAt": "2025-12-01T10:00:00.000Z",
      "item": {
        "id": 1,
        "sku": "PRIME_VIP_GOLD_30D",
        "title": "Prime VIP Gold 30 Days",
        "base_coin_price": 2500,
        "item_type": "VIP"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

### PUT `/prime-store/items/:itemId/daily-discount`
- Deskripsi: Membuat atau meng-update diskon harian untuk satu item pada tanggal tertentu.
- Body:
```json
{
  "discount_percent": 20,
  "valid_date": "2025-12-02T00:00:00.000Z",
  "is_active": true
}
```
- Catatan:
  - Jika kombinasi `(item_id, valid_date)` sudah ada, akan di-update.
  - Jika belum ada, akan dibuat baru.

### DELETE `/prime-store/daily-discounts/:id`
- Deskripsi: Hapus satu konfigurasi diskon harian.
- Respon: `{ success: true }`.

---

## Catatan
- Harga final yang ditampilkan ke user dapat dihitung di service/frontend: `final_price = base_coin_price * (1 - discount_percent/100)` untuk diskon aktif hari itu.
- `item_type` dinormalisasi ke uppercase di service.
- Field seperti `base_coin_price`, `vip_days`, `vip_plan_id`, `super_badge_id`, `border_id`, `sticker_id`, `sort_order` dinormalisasi ke angka oleh service.
- Untuk VIP:
  - Jika `vip_plan_id` diisi: item ini menjual paket VIP berdasarkan `VipPlan` eksisting.
  - Jika `vip_plan_id` null dan `vip_days` diisi: item ini menjual VIP custom dengan durasi hari sesuai `vip_days`.
  - Admin dianjurkan memilih salah satu pendekatan agar konsisten (tidak wajib divalidasi di level API).
 - Integrasi dengan **VIP Plan Admin API**:
   - Daftar paket VIP dapat diambil via endpoint `/${VERSION}/admin/vip-plans` (lihat `vip-plan-admin-api.md`).
   - Field `vip_plan_id` pada `PrimeStoreItem` harus mengacu ke `VipPlan.id` yang valid dari daftar tersebut.
   - Contoh alur di panel admin: saat membuat item Prime Store bertipe `VIP`, admin bisa memilih salah satu VIP plan aktif dari daftar `vip-plans` **ATAU** mengosongkan `vip_plan_id` dan mengisi `vip_days` untuk durasi custom.
