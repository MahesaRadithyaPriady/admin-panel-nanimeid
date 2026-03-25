# Episode Video Issues & Anime Requests API

Dokumentasi gabungan untuk:
- Episode video issue reporting (user)
- Episode video issues management (admin)
- Anime requests (user + admin)

Base path versi API: `/${VERSION}` (default `v1`), contoh: `/v1`.

---

# A) Episode Video Issues (User)

Berkas sumber:
- Routes: `src/routes/episodeVideoIssues.routes.js`
- Controller: `src/controllers/episodeVideoIssues.controller.js`

## A1. List Reasons

GET /episode-video-issues/reasons

Public (tidak perlu token).

Response 200:
```json
{
  "message": "OK",
  "items": [
    {
      "id": 1,
      "code": "NO_AUDIO",
      "title": "Video Tidak Ada Audio",
      "description": "Suara tidak terdengar",
      "is_active": true,
      "sort_order": 0
    }
  ]
}
```

---

## A2. Create Issue Report

POST /episode-video-issues/reports

Auth: `authenticate` (token user)

Body:
```json
{
  "episode_id": 999,
  "reason_id": 1,
  "note": "Tidak ada suara",
  "metadata": { "app_version": "1.2.3" }
}
```

Response 201:
```json
{ "message": "Created", "item": { "id": 10 } }
```

Error codes:
- 400 BAD_REQUEST: field wajib kosong
- 401 UNAUTHORIZED

---

## A3. List My Issue Reports

GET /episode-video-issues/reports/me

Auth: `authenticate` (token user)

Query params:
- page: number (default 1)
- limit: number (default 20, max 100)
- status: `PENDING` | `IN_PROGRESS` | `FIXED`

Response 200:
```json
{
  "message": "OK",
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1, "hasNext": false, "hasPrev": false },
  "items": [
    {
      "id": 10,
      "user_id": 123,
      "episode_id": 999,
      "reason_id": 1,
      "status": "PENDING",
      "pin": false,
      "note": "Tidak ada suara",
      "createdAt": "2025-12-21T00:00:00.000Z",
      "updatedAt": "2025-12-21T00:00:00.000Z",
      "reason": { "id": 1, "code": "NO_AUDIO", "title": "Video Tidak Ada Audio" },
      "episode": {
        "id": 999,
        "judul_episode": "Episode 1",
        "nomor_episode": 1,
        "anime": { "id": 12, "nama_anime": "Naruto" }
      }
    }
  ]
}
```

---

## A4. Get My Issue Report By Id

GET /episode-video-issues/reports/me/:id

Auth: `authenticate` (token user)

Response 200:
```json
{ "message": "OK", "item": { "id": 10, "status": "PENDING" } }
```

Error codes:
- 400 BAD_REQUEST: `id` tidak valid
- 401 UNAUTHORIZED
- 404 NOT_FOUND

---

## A5. List Issue Reports By Episode Id

GET /episode-video-issues/reports/episode/:episodeId

Auth: `authenticate` (token user)

Response 200:
```json
{
  "message": "OK",
  "items": [
    {
      "id": 10,
      "user_id": 123,
      "episode_id": 999,
      "reason_id": 1,
      "status": "PENDING",
      "pin": true,
      "note": "Tidak ada suara",
      "metadata": null,
      "createdAt": "2025-12-21T00:00:00.000Z",
      "updatedAt": "2025-12-21T00:00:00.000Z",
      "reason": { "id": 1, "code": "NO_AUDIO", "title": "Video Tidak Ada Audio" },
      "user": {
        "id": 123,
        "username": "alice",
        "profile": { "full_name": "Alice", "avatar_url": "https://..." },
        "superbadge_active": { "id": 1, "code": "SB_001", "name": "VIP", "badge_url": "https://..." },
        "avatar_border_active": { "id": 10, "code": "BORDER_S", "title": "Border S", "image_url": "https://..." }
      }
    }
  ]
}
```

Catatan:
- Diurutkan pinned dulu (`pin=true`), lalu `createdAt` terbaru.
- `superbadge_active` dan `avatar_border_active` bisa `null`.

---

# B) Episode Video Issues (Admin)

(Ini sama dengan docs admin sebelumnya, disatukan di sini.)

Auth: `authenticateAdmin`
Permission: `requirePermission(MENU_PERMISSIONS.EPISODE_VIDEO_ISSUES)`

## B1. Reasons CRUD

- GET /admin/episode-video-issues/reasons
- POST /admin/episode-video-issues/reasons
- GET /admin/episode-video-issues/reasons/:id
- PUT /admin/episode-video-issues/reasons/:id
- DELETE /admin/episode-video-issues/reasons/:id

## B2. Reports CRUD + status

- GET /admin/episode-video-issues/reports
- POST /admin/episode-video-issues/reports
- GET /admin/episode-video-issues/reports/:id
- PUT /admin/episode-video-issues/reports/:id
- PATCH /admin/episode-video-issues/reports/:id/status
- DELETE /admin/episode-video-issues/reports/:id

Catatan:
- Status enum: `PENDING`, `IN_PROGRESS`, `FIXED`.

---

# C) Anime Requests (User)

Berkas sumber:
- Routes: `src/routes/animeRequests.routes.js`
- Controller: `src/controllers/animeRequests.controller.js`

## C1. Create Anime Request

POST /anime-requests

Auth: `authenticate` (token user)

Aturan kuota (per minggu, reset setiap Senin 00:00 UTC):
- Non VIP: 1 request/minggu
- VIP Bronze: 2 request/minggu
- VIP Gold: 2 request/minggu
- VIP Diamond: 3 request/minggu
- VIP Master: 4 request/minggu

Body:
```json
{
  "nama_anime": "Naruto",
  "season": 1,
  "note": "Tolong upload"
}
```

Response 201:
```json
{ "message": "Created", "item": { "id": 1 } }
```

Jika kuota habis (429):
```json
{
  "success": false,
  "code": "QUOTA_EXCEEDED",
  "message": "Kuota request anime minggu ini sudah habis",
  "quota": {
    "tier": "NON_VIP",
    "weekly_limit": 1,
    "used": 1,
    "remaining": 0,
    "reset_at": "2025-01-06T00:00:00.000Z",
    "window": { "start_at": "2024-12-30T00:00:00.000Z", "end_at": "2025-01-06T00:00:00.000Z" },
    "vip": null
  }
}
```

---

## C2. List My Anime Requests

GET /anime-requests/me

Auth: `authenticate` (token user)

Query params:
- page: number (default 1)
- limit: number (default 20, max 100)
- status: `PENDING` | `UNDER_REVIEW` | `UPLOAD_IN_PROGRESS` | `COMPLETED` | `REJECTED`

Response 200:
```json
{ "message": "OK", "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }, "items": [ { "id": 1 } ] }
```

---

## C3. Get My Anime Request Quota

GET /anime-requests/me/quota

Auth: `authenticate` (token user)

Response 200:
```json
{
  "message": "OK",
  "quota": {
    "tier": "GOLD",
    "weekly_limit": 2,
    "used": 1,
    "remaining": 1,
    "reset_at": "2025-01-06T00:00:00.000Z",
    "window": { "start_at": "2024-12-30T00:00:00.000Z", "end_at": "2025-01-06T00:00:00.000Z" },
    "vip": { "vip_level": "Gold", "status": "ACTIVE", "end_at": "2025-02-01T00:00:00.000Z" }
  }
}
```

---

## C4. Get My Anime Request By Id

GET /anime-requests/me/:id

Auth: `authenticate` (token user)

Response 200:
```json
{ "message": "OK", "item": { "id": 1, "status": "PENDING" } }
```

Error codes:
- 400 BAD_REQUEST
- 401 UNAUTHORIZED
- 404 NOT_FOUND

---

# D) Anime Requests (Admin)

Auth: `authenticateAdmin`
Permission: `requirePermission(MENU_PERMISSIONS.DAFTAR_KONTEN)`

Dokumentasi admin anime request dipisah di:
- `src/docs/admin-anime-requests-api.md`

Gunakan file tersebut untuk endpoint admin berikut:
- `GET /admin/anime-requests`
- `GET /admin/anime-requests/stats`
- `POST /admin/anime-requests`
- `GET /admin/anime-requests/:id`
- `PUT /admin/anime-requests/:id`
- `DELETE /admin/anime-requests/:id`
- `POST /admin/anime-requests/:id/take`
