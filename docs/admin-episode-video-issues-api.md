# Admin Episode Video Issues API

Endpoint untuk mengelola master alasan (reason) laporan masalah video episode dan memanage laporan (report) dari user. Semua endpoint dilindungi oleh JWT admin dan permission.

- Auth: `authenticateAdmin`
- Permission: `requirePermission(MENU_PERMISSIONS.EPISODE_VIDEO_ISSUES)`
- Berkas sumber:
  - Routes: `src/routes/admin.routes.js`
  - Controllers: `src/controllers/adminEpisodeVideoIssues.controller.js`
  - Prisma models: `prisma/schema.prisma` (`EpisodeVideoIssueReason`, `EpisodeVideoIssueReport`, `EpisodeVideoIssueStatus`)

---

## Permission

Permission baru:
- `episode-video-issues`

Admin harus memiliki permission tersebut (kecuali `SUPERADMIN`).

---

# Reasons

## List Reasons

GET /admin/episode-video-issues/reasons

Query params:
- include_inactive: boolean (default `false`) — jika `true` maka include reason non-aktif

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
      "sort_order": 0,
      "createdAt": "2025-12-21T00:00:00.000Z",
      "updatedAt": "2025-12-21T00:00:00.000Z"
    }
  ]
}
```

---

## Create Reason

POST /admin/episode-video-issues/reasons

Body:
```json
{
  "code": "NO_AUDIO",
  "title": "Video Tidak Ada Audio",
  "description": "Suara tidak terdengar",
  "is_active": true,
  "sort_order": 0
}
```

Response 201:
```json
{ "message": "Created", "item": { "id": 1, "code": "NO_AUDIO" } }
```

Error codes:
- 400 BAD_REQUEST: field wajib kosong
- 409 CONFLICT: `code` sudah digunakan

---

## Detail Reason

GET /admin/episode-video-issues/reasons/:id

Response 200:
```json
{ "message": "OK", "item": { "id": 1, "code": "NO_AUDIO" } }
```

Error codes:
- 400 BAD_REQUEST: `id` tidak valid
- 404 NOT_FOUND

---

## Update Reason

PUT /admin/episode-video-issues/reasons/:id

Body (partial allowed):
```json
{
  "title": "No Audio",
  "description": null,
  "is_active": false,
  "sort_order": 10
}
```

Response 200:
```json
{ "message": "Updated", "item": { "id": 1 } }
```

Error codes:
- 400 BAD_REQUEST: `id` tidak valid
- 404 NOT_FOUND
- 409 CONFLICT: `code` sudah digunakan

---

## Delete Reason

DELETE /admin/episode-video-issues/reasons/:id

Response 200:
```json
{ "message": "Deleted" }
```

Error codes:
- 400 BAD_REQUEST: `id` tidak valid
- 404 NOT_FOUND

---

# Reports

## List Reports

GET /admin/episode-video-issues/reports

Query params:
- page: number (default 1)
- limit: number (default 20, max 100)
- status: `PENDING` | `IN_PROGRESS` | `FIXED`
- episode_id: number
- user_id: number
- reason_id: number

Response 200:
```json
{
  "message": "OK",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "items": [
    {
      "id": 10,
      "user_id": 123,
      "episode_id": 999,
      "reason_id": 1,
      "status": "PENDING",
      "note": "Tidak ada suara",
      "metadata": null,
      "createdAt": "2025-12-21T00:00:00.000Z",
      "updatedAt": "2025-12-21T00:00:00.000Z",
      "user": { "id": 123, "username": "alice" },
      "episode": {
        "id": 999,
        "anime_id": 77,
        "judul_episode": "Episode 1",
        "nomor_episode": 1,
        "anime": { "id": 77, "nama_anime": "Naruto" }
      },
      "reason": { "id": 1, "code": "NO_AUDIO", "title": "Video Tidak Ada Audio" }
    }
  ]
}
```

---

## Create Report (admin/manual)

POST /admin/episode-video-issues/reports

Body:
```json
{
  "user_id": 123,
  "episode_id": 999,
  "reason_id": 1,
  "status": "PENDING",
  "note": "Tidak ada suara",
  "metadata": { "app_version": "1.2.3" }
}
```

Response 201:
```json
{ "message": "Created", "item": { "id": 10 } }
```

---

## Detail Report

GET /admin/episode-video-issues/reports/:id

Response 200:
```json
{ "message": "OK", "item": { "id": 10, "status": "PENDING" } }
```

Error codes:
- 400 BAD_REQUEST: `id` tidak valid
- 404 NOT_FOUND

---

## Update Report (fields)

PUT /admin/episode-video-issues/reports/:id

Body (partial allowed):
```json
{
  "reason_id": 2,
  "note": "Diganti alasan",
  "metadata": { "extra": true },
  "status": "IN_PROGRESS"
}
```

Response 200:
```json
{ "message": "Updated", "item": { "id": 10 } }
```

---

## Update Report Status

PATCH /admin/episode-video-issues/reports/:id/status

Body:
```json
{ "status": "FIXED" }
```

Response 200:
```json
{ "message": "Status updated", "item": { "id": 10, "status": "FIXED" } }
```

---

## Delete Report

DELETE /admin/episode-video-issues/reports/:id

Response 200:
```json
{ "message": "Deleted" }
```

---

## Notes

- `EpisodeVideoIssueReason` bersifat dinamis; admin bisa menambah/mematikan reason via endpoint reasons.
- `EpisodeVideoIssueReport.status` mengikuti enum: `PENDING`, `IN_PROGRESS`, `FIXED`.
- Endpoint `POST /admin/episode-video-issues/reports` dibuat untuk kebutuhan admin (manual). Jika kamu butuh endpoint user untuk submit report, bisa dibuat terpisah di routes publik.
