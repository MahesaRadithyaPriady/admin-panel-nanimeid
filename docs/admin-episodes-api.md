# Admin Episodes API

Endpoint untuk mengelola Episode anime beserta Qualities-nya. Semua endpoint dilindungi oleh JWT admin dan role-based access control.

- Auth: `authenticateAdmin`
- Role: `authorizeAdminRoles("SUPERADMIN", "UPLOADER")`
- Berkas sumber:
  - Routes: `src/routes/admin.routes.js`
  - Controllers: `src/controllers/adminAnime.controller.js`
  - Prisma models: `prisma/schema.prisma` (`Anime`, `Episode`, `EpisodeQuality`)

Catatan upload:
- Jika mengirim `thumbnail_episode` berupa URL `http(s)`, server akan **mengunduh** gambar dari URL tersebut lalu **meng-upload ulang** ke storage menggunakan **signed URL** (PUT).
  - **URL asli tidak disimpan**.
  - Client wajib menggunakan **URL callback** dari response (`item.thumbnail_episode`) sebagai URL thumbnail yang valid (URL storage/CDN).
  - Jika `thumbnail_episode` SUDAH merupakan URL storage/CDN (prefix `CDN_BASE_URL_STORAGE`), server akan menyimpan nilai tersebut apa adanya (tidak download ulang).

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
      "hls_master_url": null,
      "qualities": [
        {
          "id": 1,
          "episode_id": 10,
          "nama_quality": "720p",
          "source_quality": "https://cdn/video720.mp4",
          "hls_status": "PENDING",
          "hls_url": null,
          "hls_size": null,
          "hls_encoded_at": null,
          "hls_error": null
        },
        {
          "id": 2,
          "episode_id": 10,
          "nama_quality": "1080p",
          "source_quality": "https://cdn/video1080.mp4",
          "hls_status": "DONE",
          "hls_url": "https://cdn.example.com/hls/ep1_1080p/index.m3u8",
          "hls_size": 524288000,
          "hls_encoded_at": "2024-01-15T10:30:00.000Z",
          "hls_error": null
        }
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
- Alternatif (tanpa upload file): kirim `thumbnail_episode` berisi URL thumbnail.
  - Jika `thumbnail_episode` adalah URL `http(s)`, server akan **download** dan **re-upload** ke storage.
  - Jika `thumbnail_episode` adalah path static lokal (mis. `/static/...`) atau URL localhost/static server (mis. `http://localhost:3001/static/...`), server akan membaca file sumber tersebut lalu **re-upload** ke storage.

Callback URL:
- Jika request menggunakan URL remote `http(s)` dan URL tersebut BUKAN URL storage/CDN, maka value `thumbnail_episode` di database akan **diganti** menjadi URL storage.
- Client tidak perlu menebak URL storage; cukup pakai `item.thumbnail_episode` dari response sebagai **callback**.
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
    "thumbnail_episode": "https://<CDN_STORAGE>/<key>",
    "deskripsi_episode": "Pembuka",
    "durasi_episode": 1420,
    "intro_start_seconds": 0,
    "intro_duration_seconds": 90,
    "outro_start_seconds": 1330,
    "outro_duration_seconds": 90,
    "tanggal_rilis_episode": "2025-08-31T12:00:00.000Z",
    "hls_master_url": null,
    "qualities": [
      {
        "id": 1,
        "episode_id": 10,
        "nama_quality": "720p",
        "source_quality": "https://cdn/video720.mp4",
        "hls_status": "PENDING",
        "hls_url": null,
        "hls_size": null,
        "hls_encoded_at": null,
        "hls_error": null
      },
      {
        "id": 2,
        "episode_id": 10,
        "nama_quality": "1080p",
        "source_quality": "https://cdn/video1080.mp4",
        "hls_status": "DONE",
        "hls_url": "https://cdn.example.com/hls/ep1_1080p/index.m3u8",
        "hls_size": 524288000,
        "hls_encoded_at": "2024-01-15T10:30:00.000Z",
        "hls_error": null
      }
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
- **Setiap URL dalam `qualities` akan diperiksa secara otomatis** (HTTP HEAD request dengan timeout 10 detik) sebelum episode dibuat.

Response 201 (tambahan field):
```json
{
  "message": "Episode created",
  "item": { ... },
  "url_checks": [
    {
      "nama_quality": "720p",
      "source_quality": "https://cdn/video720.mp4",
      "accessible": true,
      "status": 200,
      "content_type": "video/mp4",
      "size_bytes": 157286400,
      "error": null
    }
  ],
  "url_check_summary": {
    "total": 2,
    "accessible": 2,
    "failed": 0,
    "has_issues": false
  }
}
```

Field tambahan dalam response:
- `url_checks`: Array hasil pengecekan HTTP HEAD ke setiap URL quality
- `url_check_summary`: Ringkasan hasil pengecekan (`total`, `accessible`, `failed`, `has_issues`)

Error codes:
- 400 BAD_REQUEST: field wajib kosong (`judul_episode`, `nomor_episode`, `image/thumbnail_episode`) atau `animeId` tidak valid
- 401 UNAUTHORIZED, 403 FORBIDDEN
- 409 CONFLICT: duplikasi kombinasi unik `[anime_id, nomor_episode]`
- 500 ERROR

Batasan untuk `thumbnail_episode` URL `http(s)`:
- Harus mengarah ke konten `image/*`
- Max size: 10MB
- Timeout download: 15s

---

## Batch Create Episodes

POST /admin/anime/:animeId/episodes/batch

Digunakan untuk membuat multiple episodes sekaligus dalam satu request. Cocok untuk upload anime dengan banyak episode.

Headers:
- Content-Type: application/json

Body (JSON):
```json
{
  "episodes": [
    {
      "judul_episode": "Episode 1",
      "nomor_episode": 1,
      "deskripsi_episode": "Pembuka cerita",
      "durasi_episode": 1420,
      "thumbnail_episode": "https://example.com/thumb1.jpg",
      "qualities": [
        { "nama_quality": "720p", "source_quality": "https://cdn/video720.mp4" },
        { "nama_quality": "1080p", "source_quality": "https://cdn/video1080.mp4" }
      ]
    },
    {
      "judul_episode": "Episode 2",
      "nomor_episode": 2,
      "deskripsi_episode": "Kelanjutan cerita",
      "durasi_episode": 1420,
      "thumbnail_episode": "https://example.com/thumb2.jpg",
      "qualities": [
        { "nama_quality": "720p", "source_quality": "https://cdn/ep2_720.mp4" }
      ]
    }
  ]
}
```

Catatan:
- Maksimal 100 episodes per batch
- Setiap episode dalam array memiliki field yang sama dengan single create
- `qualities` bersifat opsional per episode
- Jika ada episode yang gagal, episode lain tetap diproses
- Thumbnail URL akan di-download dan di-upload ke storage jika bukan CDN URL

Response 201:
```json
{
  "message": "Batch create completed: 2 success, 0 failed",
  "anime_id": 1,
  "total": 2,
  "success": 2,
  "failed": 0,
  "items": [
    {
      "success": true,
      "id": 101,
      "nomor_episode": 1,
      "judul_episode": "Episode 1",
      "qualities": [
        { "nama_quality": "720p", "source_quality": "https://cdn/video720.mp4" }
      ]
    },
    {
      "success": true,
      "id": 102,
      "nomor_episode": 2,
      "judul_episode": "Episode 2",
      "qualities": [
        { "nama_quality": "720p", "source_quality": "https://cdn/ep2_720.mp4" }
      ]
    }
  ]
}
```

Error Response (partial failure):
```json
{
  "message": "Batch create completed: 1 success, 1 failed",
  "anime_id": 1,
  "total": 2,
  "success": 1,
  "failed": 1,
  "items": [
    {
      "success": true,
      "id": 101,
      "nomor_episode": 1,
      "judul_episode": "Episode 1",
      "qualities": []
    }
  ],
  "errors": [
    { "nomor_episode": 1, "error": "Duplikasi nomor episode pada anime ini" }
  ]
}
```

Error codes:
- 400 BAD_REQUEST: `animeId` tidak valid, `episodes` bukan array, atau melebihi 100 item
- 401 UNAUTHORIZED, 403 FORBIDDEN
- 404 NOT_FOUND: anime tidak ditemukan
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
    "hls_master_url": "https://cdn.example.com/hls/ep1/master.m3u8",
    "qualities": [
      {
        "id": 1,
        "episode_id": 10,
        "nama_quality": "720p",
        "source_quality": "https://cdn/video720.mp4",
        "hls_status": "DONE",
        "hls_url": "https://cdn.example.com/hls/ep1_720p/index.m3u8",
        "hls_size": 314572800,
        "hls_encoded_at": "2024-01-15T10:30:00.000Z",
        "hls_error": null
      }
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
- `thumbnail_episode` (string URL, opsional) — thumbnail episode baru (alternatif tanpa upload file)
- Field lain sama seperti create, semua opsional

Catatan:
- Jika `thumbnail_episode` adalah URL `http(s)`, server akan **download** lalu **re-upload** ke storage, dan menyimpan URL storage.
- Jika `thumbnail_episode` adalah path static lokal (mis. `/static/...`) atau URL localhost/static server (mis. `http://localhost:3001/static/...`), server akan membaca file lokalnya lalu **re-upload** ke storage, dan menyimpan URL storage.

Catatan:
- Jika properti `qualities` disertakan (array), maka semua kualitas lama episode akan dihapus lalu dibuat ulang sesuai isi array.
- Jika `qualities` tidak dikirim, qualities tidak diubah.
- **Setiap URL dalam `qualities` akan diperiksa secara otomatis** (HTTP HEAD request dengan timeout 10 detik) sebelum update dilakukan.

Response 200:
```json
{
  "message": "Episode updated",
  "item": {
    "id": 10,
    "hls_master_url": null,
    "qualities": [
      {
        "id": 3,
        "episode_id": 10,
        "nama_quality": "480p",
        "source_quality": "https://cdn/video480.mp4",
        "hls_status": "PENDING",
        "hls_url": null,
        "hls_size": null,
        "hls_encoded_at": null,
        "hls_error": null
      }
    ]
  },
  "url_checks": [
    {
      "nama_quality": "480p",
      "source_quality": "https://cdn/video480.mp4",
      "accessible": true,
      "status": 200,
      "content_type": "video/mp4",
      "size_bytes": 157286400,
      "error": null
    },
    {
      "nama_quality": "720p",
      "source_quality": "https://invalid-url/video720.mp4",
      "accessible": false,
      "status": 404,
      "content_type": null,
      "size_bytes": null,
      "error": "HTTP 404: Not Found"
    }
  ],
  "url_check_summary": {
    "total": 2,
    "accessible": 1,
    "failed": 1,
    "has_issues": true
  }
}
```

Field tambahan dalam response:
- `url_checks`: Array hasil pengecekan HTTP HEAD ke setiap URL quality
  - `accessible`: `true` jika URL bisa diakses (HTTP 200)
  - `status`: HTTP status code
  - `content_type`: Content-Type dari response
  - `size_bytes`: Ukuran file (Content-Length)
  - `error`: Error message jika URL tidak accessible
- `url_check_summary`: Ringkasan hasil pengecekan
  - `total`: Total URL yang diperiksa
  - `accessible`: Jumlah URL yang accessible (HTTP 200)
  - `failed`: Jumlah URL yang tidak accessible
  - `has_issues`: `true` jika ada URL yang tidak accessible

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

## Set/Update Episode Video (Qualities)

POST /admin/episodes/:id/video

Digunakan untuk mengatur atau mengupdate URL video (qualities) untuk episode tertentu secara terpisah dari update episode utama.

Headers:
- Content-Type: application/json

Body (JSON):
```json
{
  "qualities": [
    { "nama_quality": "720p", "source_quality": "https://cdn/video720.mp4" },
    { "nama_quality": "1080p", "source_quality": "https://cdn/video1080.mp4" }
  ],
  "hls_master_url": "https://cdn.example.com/hls/ep1/master.m3u8"
}
```

Catatan:
- `qualities` (opsional): Array objek quality. Jika dikirim, semua quality lama akan dihapus dan diganti dengan yang baru.
- `hls_master_url` (opsional): URL master playlist HLS. Kirim `null` untuk menghapus.
- Minimal salah satu field (`qualities` atau `hls_master_url`) harus dikirim.

Response 200:
```json
{
  "message": "Episode video updated",
  "item": {
    "id": 10,
    "anime_id": 1,
    "judul_episode": "Episode 1",
    "nomor_episode": 1,
    "thumbnail_episode": "https://cdn.example.com/ep1.jpg",
    "qualities": [
      {
        "id": 1,
        "episode_id": 10,
        "nama_quality": "720p",
        "source_quality": "https://cdn/video720.mp4",
        "hls_status": "PENDING",
        "hls_url": null,
        "hls_size": null,
        "hls_encoded_at": null,
        "hls_error": null
      },
      {
        "id": 2,
        "episode_id": 10,
        "nama_quality": "1080p",
        "source_quality": "https://cdn/video1080.mp4",
        "hls_status": "PENDING",
        "hls_url": null,
        "hls_size": null,
        "hls_encoded_at": null,
        "hls_error": null
      }
    ],
    "hls_master_url": "https://cdn.example.com/hls/ep1/master.m3u8"
  }
}
```

Error codes:
- 400 BAD_REQUEST: `id` tidak valid atau `qualities` bukan array
- 401 UNAUTHORIZED, 403 FORBIDDEN
- 404 NOT_FOUND: episode tidak ditemukan
- 500 ERROR

---

## Check Episode Quality Status (Verify Video Working)

GET /admin/episodes/:id/quality-check

Digunakan untuk memeriksa status dan kondisi semua quality video pada episode. Endpoint ini membantu admin memastikan apakah video sudah bisa diputar atau ada masalah.

Response 200:
```json
{
  "message": "OK",
  "episode": {
    "id": 10,
    "anime_id": 1,
    "nama_anime": "Naruto",
    "nomor_episode": 1,
    "judul_episode": "Episode 1"
  },
  "summary": {
    "total": 4,
    "working": 3,
    "failed": 1,
    "pending": 0,
    "processing": 0,
    "has_issues": true
  },
  "qualities": [
    {
      "id": 1,
      "nama_quality": "360p",
      "source_quality": "https://cdn/video360.mp4",
      "has_source_url": true,
      "url_check": {
        "accessible": true,
        "status": 200,
        "content_type": "video/mp4",
        "size_bytes": 157286400,
        "error": null
      },
      "hls_status": "DONE",
      "hls_url": "https://cdn/hls/360/playlist.m3u8",
      "has_hls_url": true,
      "hls_encoded_at": "2024-01-15T10:30:00.000Z",
      "hls_error": null,
      "is_working": true,
      "issues": []
    },
    {
      "id": 2,
      "nama_quality": "720p",
      "source_quality": "https://cdn/video720.mp4",
      "has_source_url": true,
      "url_check": {
        "accessible": false,
        "status": 404,
        "content_type": null,
        "size_bytes": null,
        "error": "HTTP 404: Not Found"
      },
      "hls_status": "PENDING",
      "hls_url": null,
      "has_hls_url": false,
      "hls_encoded_at": null,
      "hls_error": null,
      "is_working": false,
      "issues": ["Source URL tidak accessible: HTTP 404: Not Found"]
    }
  ]
}
```

Field response:
- `episode`: Informasi episode yang diperiksa
- `summary`: Ringkasan status quality
  - `total`: Total jumlah quality
  - `working`: Jumlah quality yang berfungsi (bisa diputar)
  - `failed`: Jumlah quality dengan HLS failed
  - `pending`: Jumlah quality dengan HLS pending
  - `processing`: Jumlah quality yang sedang di-encode
  - `has_issues`: `true` jika ada quality yang bermasalah
- `qualities`: Detail per quality
  - `url_check`: Hasil pengecekan HTTP HEAD ke source URL
    - `accessible`: `true` jika URL bisa diakses (HTTP 200)
    - `status`: HTTP status code (200, 404, 403, dll)
    - `content_type`: Content-Type header dari response
    - `size_bytes`: Content-Length (ukuran file dalam bytes)
    - `error`: Error message jika URL tidak accessible
  - `is_working`: `true` jika quality bisa diputar (punya source URL yang accessible)
  - `has_source_url`: `true` jika source_quality terisi
  - `has_hls_url`: `true` jika HLS URL tersedia
  - `issues`: Array string berisi masalah yang ditemukan

Kriteria `is_working`:
- `true` jika: source URL tersedia dan accessible (HTTP 200) - HLS status tidak wajib DONE
- `false` jika: source URL kosong, URL tidak accessible (404/403), atau semua HLS failed

Catatan: **HLS PENDING bukan masalah/error** selama source URL accessible. Video tetap bisa diputar menggunakan source URL original tanpa HLS.

Error codes:
- 400 BAD_REQUEST: `id` tidak valid
- 401 UNAUTHORIZED, 403 FORBIDDEN
- 404 NOT_FOUND: episode tidak ditemukan
- 500 ERROR

---

## Tips & Catatan

- `nomor_episode` unik per `anime_id` (lihat constraint `@@unique([anime_id, nomor_episode])`).
- `tanggal_rilis_episode` mengikuti format ISO 8601 (UTC) bila dikirim.
- Untuk performa, gunakan pagination saat mengambil daftar episode.
- Kualitas video (720p/1080p, dll) didefinisikan di model `EpisodeQuality` dan dikelola via:
  - Body `qualities` pada create/update episode, atau
  - Endpoint terpisah `POST /admin/episodes/:id/video` untuk update video saja.
- Endpoint `POST /admin/episodes/:id/video` berguna untuk mengupdate URL video tanpa mengubah metadata episode (judul, thumbnail, dll).
- **Endpoint `GET /admin/episodes/:id/quality-check` melakukan pengecekan HTTP HEAD ke setiap URL quality** dengan timeout 10 detik per URL. Pastikan URL tidak behind firewall yang memblokir server backend.

---

## Schema Response (dengan HLS Fields)

### Episode Object
```json
{
  "id": 10,
  "anime_id": 1,
  "judul_episode": "Episode 1",
  "nomor_episode": 1,
  "thumbnail_episode": "https://cdn.example.com/ep1.jpg",
  "deskripsi_episode": "Pembuka",
  "durasi_episode": 1420,
  "intro_start_seconds": 0,
  "intro_duration_seconds": 90,
  "outro_start_seconds": 1330,
  "outro_duration_seconds": 90,
  "tanggal_rilis_episode": "2025-08-31T12:00:00.000Z",
  "hls_master_url": "string | null (URL master playlist .m3u8 — adaptive multi-quality)",
  "qualities": ["EpisodeQuality"],
  "anime": { "id": 1, "nama_anime": "Naruto" }
}
```

### EpisodeQuality Object
```json
{
  "id": 1,
  "episode_id": 10,
  "nama_quality": "720p | 1080p | 480p | 360p",
  "source_quality": "string (URL video original MP4)",
  "hls_status": "PENDING | PROCESSING | DONE | FAILED | SKIPPED",
  "hls_url": "string | null (URL rendition playlist .m3u8)",
  "hls_size": "number | null (ukuran segmen HLS dalam bytes)",
  "hls_encoded_at": "string | null (ISO 8601 datetime)",
  "hls_error": "string | null (error message jika gagal)",
  "hls_job_id": "string | null (ID job encoder eksternal)",
  "hls_metadata": "object | null (bitrate, resolution, segments, duration)"
}
```

### HLS Status
| Status | Deskripsi |
|--------|-----------|
| `PENDING` | Belum pernah di-encode |
| `PROCESSING` | Sedang di-encode / upload ke B2 |
| `DONE` | Selesai, `hls_url` tersedia |
| `FAILED` | Gagal encode, ada `hls_error` |
| `SKIPPED` | Sengaja di-skip oleh admin |

> **Catatan:** Field `hls_size` dikembalikan sebagai `number` (bukan BigInt) karena sudah di-serialize oleh backend.

---

## Lokasi Kode
- Route: `src/routes/admin.routes.js`
  - GET `/admin/anime/:animeId/episodes` - List episodes per anime
  - POST `/admin/anime/:animeId/episodes` - Create single episode (with file upload)
  - POST `/admin/anime/:animeId/episodes/batch` - Batch create episodes (JSON only)
  - GET `/admin/episodes/:id` - Detail episode
  - PUT `/admin/episodes/:id` - Update episode (with file upload)
  - DELETE `/admin/episodes/:id` - Delete episode
  - POST `/admin/episodes/:id/video` - Update video only
  - GET `/admin/episodes/:id/quality-check` - Check episode quality status
- Controller: `src/controllers/adminAnime.controller.js` (fungsi `listEpisodesAdmin`, `createEpisodeAdmin`, `batchCreateEpisodesAdmin`, `getEpisodeAdminById`, `updateEpisodeAdmin`, `deleteEpisodeAdmin`, `setEpisodeVideoAdmin`, `checkEpisodeQualityStatus`)
