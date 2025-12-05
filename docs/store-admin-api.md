# Store Admin API (SUPERADMIN)

Base path: `/${VERSION}/store/admin`
Auth: `authenticateAdmin` + `authorizeAdminRoles("SUPERADMIN")`

## GET `/items`
- Deskripsi: Daftar item store dengan filter dan paginasi.
- Query:
  - `q?`: cari di `title`, `sku`, `item_type` (case-insensitive)
  - `active?`: `true|false` (default: semua)
  - `page?`: default 1
  - `limit?`: default 20, max 100
- Respon:
```json
{
  "success": true,
  "items": [
    {
      "id": 1,
      "sku": "VIP_GOLD_30D",
      "title": "VIP Gold 30 Days",
      "description": "30 hari VIP",
      "item_type": "VIP",
      "coin_price": 2000,
      "coin_amount": null,
      "vip_days": 30,
      "badge_name": null,
      "badge_icon": null,
      "badge_id": null,
      "sticker_id": null,
      "title_color": null,
      "is_active": true,
      "sort_order": 0,
      "metadata": null,
      "createdAt": "2025-11-03T00:00:00.000Z",
      "updatedAt": "2025-11-03T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```
- Contoh:
```bash
curl "$BASE/store/admin/items?q=VIP&active=true&page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## GET `/items/:id`
- Deskripsi: Detail item store.
- Respon: `{ success, data }` atau 404 jika tidak ada.
- Contoh:
```bash
curl "$BASE/store/admin/items/1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## POST `/items`
- Deskripsi: Membuat item store baru.
- Body (field umum; gunakan sesuai `item_type`):
```json
{
  "sku": "VIP_GOLD_30D",
  "title": "VIP Gold 30 Days",
  "description": "30 hari VIP",
  "item_type": "VIP", // COIN | VIP | BADGE | SUPERBADGE | STICKER
  "coin_price": 2000,
  "coin_amount": null,
  "vip_days": 30,
  "badge_name": null,
  "badge_icon": null,
  "badge_id": null, // required for SUPERBADGE
  "sticker_id": null, // required for STICKER (refer ke master Sticker.id)
  "title_color": null,
  "is_active": true,
  "sort_order": 0,
  "metadata": { "note": "optional" }
}
```
- Respon: `{ success: true, data }`
- Contoh:
```bash
curl -X POST "$BASE/store/admin/items" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sku":"COIN_1000","title":"Coins 1000","item_type":"COIN","coin_price":0,"coin_amount":1000,"is_active":true
  }'
```

## PUT `/items/:id`
- Deskripsi: Update item store.
- Body: sama seperti POST (partial allowed).
- Respon: `{ success: true, data }`
- Contoh:
```bash
curl -X PUT "$BASE/store/admin/items/1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"coin_price":2500,"is_active":false}'
```

## DELETE `/items/:id`
- Deskripsi: Hapus item store.
- Respon: `{ success: true }`
- Contoh:
```bash
curl -X DELETE "$BASE/store/admin/items/1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Contoh item SUPERBADGE

Membuat item store yang menjual super badge dari master `Badge` dengan `id = 10`:

```jsonc
{
  "sku": "SUPERBADGE_XMAS_2025",
  "title": "Super Badge Christmas 2025",
  "description": "Super badge spesial event Natal 2025",
  "item_type": "SUPERBADGE",
  "coin_price": 5000,
  "coin_amount": null,
  "vip_days": null,
  "badge_name": null,  // diabaikan untuk SUPERBADGE
  "badge_icon": null,  // diabaikan untuk SUPERBADGE
  "badge_id": 10,      // wajib: refer ke master Badge.id
  "title_color": null,
  "is_active": true,
  "sort_order": 0,
  "metadata": { "note": "Event-only" }
}
```

### Contoh item STICKER

Membuat item store yang menjual sticker dari master `Sticker` dengan `id = 20`:

```jsonc
{
  "sku": "STICKER_LOVE_2025",
  "title": "Sticker Love 2025",
  "description": "Sticker spesial event Valentine 2025",
  "item_type": "STICKER",
  "coin_price": 1000,
  "coin_amount": null,
  "vip_days": null,
  "badge_name": null,  
  "badge_icon": null,  
  "badge_id": null,     
  "sticker_id": 20,     // wajib: refer ke master Sticker.id
  "title_color": null,
  "is_active": true,
  "sort_order": 0,
  "metadata": { "note": "Event-only" }
}
```

## Catatan
- `item_type` dinormalisasi ke uppercase.
- Numerik seperti `coin_price`, `coin_amount`, `vip_days`, `sort_order` dinormalisasi ke angka.
- Item tipe:
  - `COIN`: gunakan `coin_amount` dan `coin_price`.
  - `VIP`: gunakan `vip_days` dan `coin_price`.
  - `BADGE`: gunakan `badge_name`, `badge_icon`, `title_color` dan `coin_price` (badge biasa ke `UserBadge`).
  - `SUPERBADGE`: gunakan `badge_id` (relasi ke master `Badge`) dan `coin_price`. Frontend harus menyediakan UI untuk memilih dari daftar `Badge` (super badge) yang sudah dibuat di admin, lalu menyimpan `badge_id` pada StoreItem.
  - `STICKER`: gunakan `sticker_id` (relasi ke master `Sticker`) dan `coin_price`. Frontend harus menyediakan UI untuk memilih dari daftar `Sticker` yang sudah dibuat di admin, lalu menyimpan `sticker_id` pada StoreItem.
