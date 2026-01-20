# VIP Tiers Admin API

Base path: `/admin` (tanpa prefix version)

Auth:
- `authenticateAdmin`
- `requirePermission(MENU_PERMISSIONS.VIP_TIERS)`

Model ringkas (`VipTier`):
- `id: number`
- `name: string` (unique)
- `rank: number` (urutan tier; makin besar = makin tinggi)
- `is_active: boolean`
- `createdAt`, `updatedAt`

---

## GET /admin/vip-tiers

List VIP tiers.

Query (opsional):
- `page` (default 1)
- `limit` (default 50, max 200)
- `q` (search by `name`)
- `active` (true/false)

Response 200:
```json
{
  "status": 200,
  "message": "OK",
  "items": [
    { "id": 1, "name": "Bronze", "rank": 1, "is_active": true }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 1, "totalPages": 1 }
}
```

---

## GET /admin/vip-tiers/:id

Get detail VIP tier.

Response 200:
```json
{ "status": 200, "message": "OK", "data": { "id": 1, "name": "Bronze", "rank": 1, "is_active": true } }
```

---

## POST /admin/vip-tiers

Create VIP tier.

Body:
```json
{ "name": "Bronze", "rank": 1, "is_active": true }
```

Response 201:
```json
{ "status": 201, "message": "VIP tier dibuat", "data": { "id": 1, "name": "Bronze", "rank": 1, "is_active": true } }
```

---

## PUT /admin/vip-tiers/:id

Update VIP tier.

Body (contoh):
```json
{ "name": "Silver", "rank": 2, "is_active": true }
```

Response 200:
```json
{ "status": 200, "message": "VIP tier diupdate", "data": { "id": 2, "name": "Silver", "rank": 2, "is_active": true } }
```

---

## PATCH /admin/vip-tiers/:id/toggle

Toggle active status.

Body:
```json
{ "is_active": false }
```

Response 200:
```json
{ "status": 200, "message": "Status VIP tier diupdate", "data": { "id": 1, "name": "Bronze", "rank": 1, "is_active": false } }
```

---

## DELETE /admin/vip-tiers/:id

Delete VIP tier.

Response 200:
```json
{ "status": 200, "message": "VIP tier dihapus", "data": { "id": 1, "name": "Bronze", "rank": 1, "is_active": true } }
```
