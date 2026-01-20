# Admin Watch Event Configs API

Endpoint admin untuk mengelola konfigurasi event nonton (watch event). Konfigurasi dipilih oleh service berdasarkan:
- `is_active = true`
- dan window waktu `starts_at/ends_at` (jika diisi)
- prioritas: config aktif terbaru (ID terbesar) yang match window.

Base path: `/${VERSION}/admin`

Auth:
- `authenticateAdmin`
- `requirePermission(MENU_PERMISSIONS.WATCH_EVENT_CONFIGS)` (`watch-event-configs`)

## Model

Field utama `WatchEventConfig`:
- `is_active`: boolean
- `daily_reset`: boolean
- `thresholds`: array | null
- `starts_at`: ISO datetime | null
- `ends_at`: ISO datetime | null

### Tier-aware (`thresholds`)

`thresholds` adalah array dengan urutan yang menentukan tier.

Bentuk item threshold:
- `id` (optional): string (disarankan untuk stabil key)
- `minutes` (optional): number > 0
- `episodes` (optional): number > 0
- `coin_reward`: number >= 0
- `reward_type` (optional): `NONE | STICKER | BORDER | SUPERBADGE`
- `reward_id` (optional): number

Aturan:
- Setiap item wajib punya minimal salah satu dari `minutes` atau `episodes`.
- Kombinasi `id` harus unik di dalam array.
- Jika `reward_type != NONE`, maka `reward_id` wajib `> 0` dan mengarah ke master item yang aktif:
  - `BORDER` -> `AvatarBorder.id`
  - `STICKER` -> `Sticker.id`
  - `SUPERBADGE` -> `Badge.id`

Catatan:
- Pada mode tier-aware, claim **tidak mereset** `minutes_watched_today/episodes_watched_today` (reset hanya harian berdasarkan tanggal server).

## GET `/watch-event-configs`

Query params:
- `page` (default 1)
- `limit` (default 20, max 100)
- `is_active` (optional, `true|false`)

Response 200:
```json
{
  "status": 200,
  "message": "OK",
  "items": [ /* list WatchEventConfig */ ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

## GET `/watch-event-configs/:id`

Response 200:
```json
{ "status": 200, "message": "OK", "data": { /* WatchEventConfig */ } }
```

## POST `/watch-event-configs`

### Contoh body (tier 25/50 menit)
```json
{
  "is_active": true,
  "daily_reset": true,
  "thresholds": [
    { "id": "T25", "minutes": 25, "coin_reward": 10, "reward_type": "NONE", "reward_id": 0 },
    { "id": "T50", "minutes": 50, "coin_reward": 20, "reward_type": "STICKER", "reward_id": 12 }
  ],
  "starts_at": "2025-12-24T00:00:00.000Z",
  "ends_at": "2025-12-31T23:59:59.000Z"
}
```

### Contoh body (tier 50/100 menit)
```json
{
  "is_active": true,
  "daily_reset": true,
  "thresholds": [
    { "id": "T50", "minutes": 50, "coin_reward": 20, "reward_type": "BORDER", "reward_id": 5 },
    { "id": "T100", "minutes": 100, "coin_reward": 40, "reward_type": "SUPERBADGE", "reward_id": 9 }
  ]
}
```

Response 201:
```json
{ "status": 201, "message": "Config dibuat", "data": { /* created */ } }
```

Error 400 (validasi gagal):
```json
{
  "status": 400,
  "message": "Validasi gagal",
  "errors": ["..."]
}
```

## PUT `/watch-event-configs/:id`

Body: update menggunakan PUT. Field yang tidak dikirim akan memakai nilai lama.

Response 200:
```json
{ "status": 200, "message": "Config diupdate", "data": { /* updated */ } }
```

## PATCH `/watch-event-configs/:id/toggle`

Toggle `is_active`.

Response 200:
```json
{ "status": 200, "message": "Config ditoggle", "data": { /* updated */ } }
```

## DELETE `/watch-event-configs/:id`

Response 200:
```json
{ "status": 200, "message": "Config dihapus" }
```
