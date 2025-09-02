# Admin Episodes API

Endpoint untuk mengelola Episode anime beserta Qualities-nya. Semua endpoint dilindungi oleh JWT admin dan role-based access control.

- Auth: `authenticateAdmin`
- Role: `authorizeAdminRoles("SUPERADMIN", "UPLOADER")`
- Berkas sumber:
  - Routes: `src/routes/admin.routes.js`
  - Controllers: `src/controllers/adminAnime.controller.js`
  - Prisma models: `prisma/schema.prisma` (`Anime`, `Episode`, `EpisodeQuality`)

---

## Daftar Episodes per Anime

GET /admin/anime/:animeId/episodes

Query params:
- page: number (default 1)
- limit: number (default 50, max 200)

Response 200:
```json
{
  "message": "OK",
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "items": [
    {
      "id": 10,
      "anime_id": 1,
      "judul_episode": "Episode 1",
      "nomor_episode": 1,
      "thumbnail_episode": "https://img/ep1.jpg",
      "deskripsi_episode": "Pembuka",
      "durasi_episode": 1420,
      "tanggal_rilis_episode": "2025-08-31T12:00:00.000Z",
      "qualities": [
        { "id": 1, "episode_id": 10, "nama_quality": "720p", "source_quality": "https://cdn/video720.mp4" },
        { "id": 2, "episode_id": 10, "nama_quality": "1080p", "source_quality": "https://cdn/video1080.mp4" }
      ]
    }
  ]
}
```

Error codes:
- 400 BAD_REQUEST: `animeId` tidak valid
- 401 UNAUTHORIZED, 403 FORBIDDEN
- 500 ERROR

---

## Buat Episode untuk Anime

POST /admin/anime/:animeId/episodes

Headers:
- Content-Type: application/json

Body:
```json
{
  "judul_episode": "Episode 1",
  "nomor_episode": 1,
  "thumbnail_episode": "https://img/ep1.jpg",
  "deskripsi_episode": "Pembuka",
  "durasi_episode": 1420,
  "tanggal_rilis_episode": "2025-08-31T12:00:00.000Z",
  "qualities": [
    { "nama_quality": "720p", "source_quality": "https://cdn/video720.mp4" },
    { "nama_quality": "1080p", "source_quality": "https://cdn/video1080.mp4" }
  ]
}
```

Response 201:
```json
{
  "message": "Episode created",
  "item": {
    "id": 10,
    "anime_id": 1,
    "judul_episode": "Episode 1",
    "nomor_episode": 1,
    "thumbnail_episode": "https://img/ep1.jpg",
    "deskripsi_episode": "Pembuka",
    "durasi_episode": 1420,
    "tanggal_rilis_episode": "2025-08-31T12:00:00.000Z",
    "qualities": [
      { "id": 1, "episode_id": 10, "nama_quality": "720p", "source_quality": "https://cdn/video720.mp4" },
      { "id": 2, "episode_id": 10, "nama_quality": "1080p", "source_quality": "https://cdn/video1080.mp4" }
    ]
  }
}
```

Error codes:
- 400 BAD_REQUEST: field wajib kosong (`judul_episode`, `nomor_episode`, `thumbnail_episode`) atau `animeId` tidak valid
- 401 UNAUTHORIZED, 403 FORBIDDEN
- 409 CONFLICT: duplikasi kombinasi unik `[anime_id, nomor_episode]`
- 500 ERROR

---

## Detail Episode (termasuk Qualities)

GET /admin/episodes/:id

Response 200:
```json
{
  "message": "OK",
  "item": {
    "id": 10,
    "anime_id": 1,
    "judul_episode": "Episode 1",
    "nomor_episode": 1,
    "thumbnail_episode": "https://img/ep1.jpg",
    "deskripsi_episode": "Pembuka",
    "durasi_episode": 1420,
    "tanggal_rilis_episode": "2025-08-31T12:00:00.000Z",
    "qualities": [
      { "id": 1, "episode_id": 10, "nama_quality": "720p", "source_quality": "https://cdn/video720.mp4" }
    ],
    "anime": { "id": 1, "nama_anime": "Naruto" }
  }
}
```

Error codes:
- 400 BAD_REQUEST: `id` tidak valid
- 401 UNAUTHORIZED, 403 FORBIDDEN
- 404 NOT_FOUND
- 500 ERROR

---

## Update Episode (replace-all qualities bila dikirim)

PUT /admin/episodes/:id

Headers:
- Content-Type: application/json

Body (partial allowed):
```json
{
  "judul_episode": "Episode 1 (Revisi)",
  "nomor_episode": 1,
  "thumbnail_episode": "https://img/ep1-new.jpg",
  "deskripsi_episode": null,
  "durasi_episode": 1400,
  "tanggal_rilis_episode": "2025-09-01T12:00:00.000Z",
  "qualities": [
    { "nama_quality": "480p", "source_quality": "https://cdn/video480.mp4" }
  ]
}
```

Catatan:
- Jika properti `qualities` disertakan (array), maka semua kualitas lama episode akan dihapus lalu dibuat ulang sesuai isi array.
- Jika `qualities` tidak dikirim, qualities tidak diubah.

Response 200:
```json
{
  "message": "Episode updated",
  "item": { "id": 10, "qualities": [ { "nama_quality": "480p", "source_quality": "https://cdn/video480.mp4" } ] }
}
```

Error codes:
- 400 BAD_REQUEST: `id` tidak valid
- 401 UNAUTHORIZED, 403 FORBIDDEN
- 404 NOT_FOUND: episode tidak ada
- 409 CONFLICT: duplikasi nomor episode pada anime yang sama
- 500 ERROR

---

## Hapus Episode

DELETE /admin/episodes/:id

Response 200:
```json
{ "message": "Episode deleted" }
```

Error codes:
- 400 BAD_REQUEST: `id` tidak valid
- 401 UNAUTHORIZED, 403 FORBIDDEN
- 404 NOT_FOUND
- 500 ERROR

---

## Tips & Catatan

- `nomor_episode` unik per `anime_id` (lihat constraint `@@unique([anime_id, nomor_episode])`).
- `tanggal_rilis_episode` mengikuti format ISO 8601 (UTC) bila dikirim.
- Untuk performa, gunakan pagination saat mengambil daftar episode.
- Kualitas video (720p/1080p, dll) didefinisikan di model `EpisodeQuality` dan dikelola via body `qualities` pada create/update episode.
