# Admin Sign-In Event Configs API

Endpoint admin untuk mengelola konfigurasi event sign-in (daily check-in). Sistem mendukung **banyak konfigurasi**, dan konfigurasi yang dipakai user dipilih oleh service berdasarkan:
- `is_active = true`
- dan window waktu `starts_at/ends_at` (jika diisi)
- prioritas: config aktif terbaru (ID terbesar) yang match window.

Base path: `/${VERSION}/admin`

Auth:
- `authenticateAdmin`
- `requirePermission(MENU_PERMISSIONS.SIGNIN_EVENT_CONFIGS)` (`signin-event-configs`)

## Model

Field utama `SignInEventConfig`:
- `is_active`: boolean
- `days_total`: number (>= 1)
- `daily_coin_rewards`: `number[]` panjang = `days_total` (koin per hari)
- `daily_reward_types`: `("NONE"|"BORDER"|"STICKER"|"SUPERBADGE")[]` panjang = `days_total`
- `daily_reward_ids`: `number[]` panjang = `days_total`
  - Jika type `NONE` -> id harus `0`
  - Jika type selain `NONE` -> id harus mengarah ke master item yang aktif:
    - `BORDER` -> `AvatarBorder.id`
    - `STICKER` -> `Sticker.id`
    - `SUPERBADGE` -> `Badge.id`
- `starts_at`: ISO datetime | null
- `ends_at`: ISO datetime | null

Catatan:
- Backend akan **menormalisasi** array menjadi panjang `days_total`.
- Validasi: `starts_at <= ends_at` jika keduanya ada.

## GET `/signin-event-configs`

Query params:
- `page` (default 1)
- `limit` (default 20, max 100)
- `is_active` (optional, `true|false`)

Response 200:
```json
{
  "status": 200,
  "message": "OK",
  "items": [ /* list SignInEventConfig */ ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

## GET `/signin-event-configs/:id`

Response 200:
```json
{ "status": 200, "message": "OK", "data": { /* SignInEventConfig */ } }
```

## POST `/signin-event-configs`

Body contoh:
```json
{
  "is_active": true,
  "days_total": 7,
  "daily_coin_rewards": [5,10,15,20,25,30,35],
  "daily_reward_types": ["NONE","NONE","BORDER","NONE","STICKER","NONE","SUPERBADGE"],
  "daily_reward_ids": [0,0,12,0,3,0,9],
  "starts_at": "2025-12-24T00:00:00.000Z",
  "ends_at": "2025-12-31T23:59:59.000Z"
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

## PUT `/signin-event-configs/:id`

Body: partial update tidak didukung (gunakan PUT, tapi field yang tidak dikirim akan memakai nilai lama).

Response 200:
```json
{ "status": 200, "message": "Config diupdate", "data": { /* updated */ } }
```

## PATCH `/signin-event-configs/:id/toggle`

Toggle `is_active`.

Response 200:
```json
{ "status": 200, "message": "Config ditoggle", "data": { /* updated */ } }
```

## DELETE `/signin-event-configs/:id`

Response 200:
```json
{ "status": 200, "message": "Config dihapus" }
```
