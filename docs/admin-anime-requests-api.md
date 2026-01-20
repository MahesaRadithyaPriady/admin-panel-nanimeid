# Admin Anime Requests API

Endpoint untuk memanage request anime dari user. Admin dapat melihat daftar request, update status (pending/ditinjau/proses upload/selesai), serta mengambil tanggung jawab request (set `admin_id`).

- Auth: `authenticateAdmin`
- Permission: `requirePermission(MENU_PERMISSIONS.DAFTAR_KONTEN)`
- Berkas sumber:
  - Routes: `src/routes/admin.routes.js`
  - Controllers: `src/controllers/adminAnimeRequests.controller.js`
  - Prisma models: `prisma/schema.prisma` (`AnimeRequest`, `AnimeRequestStatus`)

---

## List Anime Requests

GET /admin/anime-requests

Query params:
- page: number (default 1)
- limit: number (default 20, max 100)
- status: `PENDING` | `UNDER_REVIEW` | `UPLOAD_IN_PROGRESS` | `COMPLETED` | `REJECTED`
- user_id: number
- admin_id: number
- q: string (search `nama_anime`)

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
      "id": 1,
      "user_id": 10,
      "admin_id": null,
      "nama_anime": "Naruto",
      "season": 1,
      "status": "PENDING",
      "note": "Tolong upload",
      "createdAt": "2025-12-21T00:00:00.000Z",
      "updatedAt": "2025-12-21T00:00:00.000Z",
      "user": { "id": 10, "username": "alice" },
      "admin": null
    }
  ]
}
```

---

## Create Anime Request (admin/manual)

POST /admin/anime-requests

Body:
```json
{
  "user_id": 10,
  "nama_anime": "Naruto",
  "season": 1,
  "status": "PENDING",
  "note": "Tolong upload"
}
```

Response 201:
```json
{ "message": "Created", "item": { "id": 1 } }
```

Error codes:
- 400 BAD_REQUEST: field wajib kosong (`user_id`, `nama_anime`)

---

## Detail Anime Request

GET /admin/anime-requests/:id

Response 200:
```json
{ "message": "OK", "item": { "id": 1, "nama_anime": "Naruto" } }
```

Error codes:
- 400 BAD_REQUEST: `id` tidak valid
- 404 NOT_FOUND

---

## Update Anime Request

PUT /admin/anime-requests/:id

Body (partial allowed):
```json
{
  "nama_anime": "Naruto Shippuden",
  "season": 2,
  "status": "UNDER_REVIEW",
  "note": "Sedang dicek"
}
```

Response 200:
```json
{ "message": "Updated", "item": { "id": 1 } }
```

Error codes:
- 400 BAD_REQUEST: `id` tidak valid
- 404 NOT_FOUND

---

## Delete Anime Request

DELETE /admin/anime-requests/:id

Response 200:
```json
{ "message": "Deleted" }
```

Error codes:
- 400 BAD_REQUEST: `id` tidak valid
- 404 NOT_FOUND

---

## Take Anime Request (set admin_id)

POST /admin/anime-requests/:id/take

Behavior:
- Mengisi `admin_id` dengan `req.admin.id`.
- Jika sudah diambil admin lain, akan mengembalikan konflik.

Response 200:
```json
{ "message": "Taken", "item": { "id": 1, "admin_id": 5 } }
```

Error codes:
- 400 BAD_REQUEST: `id` tidak valid
- 401 UNAUTHORIZED
- 404 NOT_FOUND
- 409 CONFLICT: request sudah diambil admin lain
