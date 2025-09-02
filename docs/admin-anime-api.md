# Admin Anime API

Endpoint admin untuk membuat anime baru. Hanya role SUPERADMIN dan UPLOADER.

- Base URL: `/admin`
- Auth: `Authorization: Bearer <ADMIN_JWT>`

## Buat Anime (SUPERADMIN | UPLOADER)
- Method: POST
- Path: `/anime`
- Header: `Content-Type: application/json`
- Body (JSON):
```json
{
  "nama_anime": "Naruto",
  "gambar_anime": "https://cdn.example.com/naruto.jpg",
  "tags_anime": ["shounen","action"],
  "rating_anime": "8.6",
  "view_anime": 1000,
  "tanggal_rilis_anime": "2024-05-01T00:00:00.000Z",
  "status_anime": "ongoing",
  "genre_anime": ["Action","Adventure"],
  "sinopsis_anime": "Seorang ninja...",
  "label_anime": "TV",
  "studio_anime": ["Pierrot"],
  "fakta_menarik": ["Diadaptasi dari manga"]
}
```
- Field wajib: `nama_anime`, `gambar_anime`, `rating_anime`, `status_anime`, `sinopsis_anime`, `label_anime`
- Catatan:
  - `tags_anime`, `genre_anime`, `studio_anime`, `fakta_menarik` boleh array atau string dipisah koma.
  - `view_anime` default 0 jika tidak dikirim.
  - `tanggal_rilis_anime` opsional (ISO date string).

- Response 201:
```json
{
  "message": "Anime created",
  "item": {
    "id": 1,
    "nama_anime": "Naruto",
    "gambar_anime": "https://cdn.example.com/naruto.jpg",
    "tags_anime": ["shounen","action"],
    "rating_anime": "8.6",
    "view_anime": 1000,
    "tanggal_rilis_anime": "2024-05-01T00:00:00.000Z",
    "status_anime": "ongoing",
    "genre_anime": ["Action","Adventure"],
    "sinopsis_anime": "Seorang ninja...",
    "label_anime": "TV",
    "studio_anime": ["Pierrot"],
    "fakta_menarik": ["Diadaptasi dari manga"]
  }
}
```

- Error:
  - 400: field wajib kosong
  - 401/403: tidak ada token atau role tidak diizinkan
  - 500: error tak terduga

## Lokasi Kode
- Route: `src/routes/admin.routes.js` (POST `/admin/anime`)
- Controller: `src/controllers/adminAnime.controller.js` (fungsi `createAnimeAdmin`)
