# VIP Feature Requirements Admin API

Base path: `/admin` (tanpa prefix version)

Auth:
- `authenticateAdmin`
- `requirePermission(MENU_PERMISSIONS.VIP_FEATURE_REQUIREMENTS)`

Model ringkas (`VipFeatureRequirement`):
- `id: number`
- `feature: VipFeature` (unique)
- `min_tier_name: string` (nama tier minimum)
- `is_enabled: boolean`
- `createdAt`, `updatedAt`

Catatan:
- `min_tier_name` harus cocok dengan `VipTier.name` yang **aktif**.

---

## GET /admin/vip-feature-requirements

List requirements.

Query (opsional):
- `page` (default 1)
- `limit` (default 50, max 200)
- `q` (search by `min_tier_name` atau exact `feature`)
- `enabled` (true/false)

Response 200:
```json
{
  "status": 200,
  "message": "OK",
  "items": [
    { "id": 1, "feature": "CLIP", "min_tier_name": "Bronze", "is_enabled": true }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 1, "totalPages": 1 }
}
```

---

## GET /admin/vip-feature-requirements/:id

Get detail by id.

Response 200:
```json
{ "status": 200, "message": "OK", "data": { "id": 1, "feature": "CLIP", "min_tier_name": "Bronze", "is_enabled": true } }
```

---

## PUT /admin/vip-feature-requirements/:id

Update requirement by id.

Body (contoh):
```json
{ "min_tier_name": "Silver", "is_enabled": true }
```

Response 200:
```json
{ "status": 200, "message": "VIP feature requirement diupdate", "data": { "id": 1, "feature": "CLIP", "min_tier_name": "Silver", "is_enabled": true } }
```

---

## PUT /admin/vip-feature-requirements/by-feature/:feature

Upsert requirement by `feature`.

Path param:
- `feature`: nilai `VipFeature` (contoh: `STICKER`, `AVATAR_BORDER`, `CLIP`, `STORE`)

Body:
```json
{ "min_tier_name": "Bronze", "is_enabled": true }
```

Response 200:
```json
{ "status": 200, "message": "VIP feature requirement diupsert", "data": { "id": 1, "feature": "STICKER", "min_tier_name": "Bronze", "is_enabled": true } }
```

---

## PATCH /admin/vip-feature-requirements/:id/toggle

Toggle `is_enabled`.

Body:
```json
{ "is_enabled": false }
```

Response 200:
```json
{ "status": 200, "message": "Status VIP feature requirement diupdate", "data": { "id": 1, "feature": "STICKER", "min_tier_name": "Bronze", "is_enabled": false } }
```
