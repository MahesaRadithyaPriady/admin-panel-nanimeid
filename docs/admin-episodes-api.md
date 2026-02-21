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
      "intro_start_seconds": 0,
      "intro_duration_seconds": 90,
      "outro_start_seconds": 1330,
      "outro_duration_seconds": 90,
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
- Content-Type: multipart/form-data

Body (multipart form):

- `image` (file, opsional) — thumbnail episode (hanya file gambar)
- Alternatif (tanpa upload file): kirim `thumbnail_episode` berisi URL thumbnail (mis. URL CDN/B2 hasil presigned upload)
- Field lain dikirim sebagai text:
  - `judul_episode`, `nomor_episode`
  - `deskripsi_episode`, `durasi_episode`, `intro_start_seconds`, `intro_duration_seconds`, `outro_start_seconds`, `outro_duration_seconds`, `tanggal_rilis_episode`
  - `qualities` (opsional; JSON string array)

Contoh request (multipart/form-data):

```http
POST /admin/anime/1/episodes
Authorization: Bearer <ADMIN_JWT>
Content-Type: multipart/form-data

body:
  judul_episode: Episode 1
  nomor_episode: 1
  deskripsi_episode: Pembuka
  image: <file image/jpeg>
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
    "intro_start_seconds": 0,
    "intro_duration_seconds": 90,
    "outro_start_seconds": 1330,
    "outro_duration_seconds": 90,
    "tanggal_rilis_episode": "2025-08-31T12:00:00.000Z",
    "qualities": [
      { "id": 1, "episode_id": 10, "nama_quality": "720p", "source_quality": "https://cdn/video720.mp4" },
      { "id": 2, "episode_id": 10, "nama_quality": "1080p", "source_quality": "https://cdn/video1080.mp4" }
    ]
  }
}
```

Catatan:
- Jika field intro/outro tidak dikirim, akan menggunakan default dari database:
  - `intro_start_seconds`: 0
  - `intro_duration_seconds`: 90
  - `outro_start_seconds`: null
  - `outro_duration_seconds`: 90

Error codes:
- 400 BAD_REQUEST: field wajib kosong (`judul_episode`, `nomor_episode`, `image`) atau `animeId` tidak valid
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
    "intro_start_seconds": 0,
    "intro_duration_seconds": 90,
    "outro_start_seconds": 1330,
    "outro_duration_seconds": 90,
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
- Content-Type: multipart/form-data

Body (multipart form, partial allowed):

- `image` (file gambar, opsional) — thumbnail episode baru
- Field lain sama seperti create, semua opsional

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
perbaiaki