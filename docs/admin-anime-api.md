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

## Detail Anime (SUPERADMIN | UPLOADER)
- Method: GET
- Path: `/anime/:id`
- Response 200: `{ "message": "OK", "item": { ... } }`
- Error 404: anime tidak ditemukan

## Cari Anime (SUPERADMIN | UPLOADER)
- Method: GET
- Path: `/anime/search`
- Query Params:
  - `q` (wajib): kata kunci, cocok ke `nama_anime`, `sinopsis_anime`, `tags_anime`, `genre_anime`
  - `limit` (opsional, default 10, max 50)
  - `includeEpisodes` (opsional, `true|false`, default `false`) — jika `true`, sertakan `episodes` dan `qualities`
- Response 200: `{ "message": "OK", "items": [ ... ] }`

### Contoh
```
GET /admin/anime/search?q=naruto&limit=5&includeEpisodes=false
Authorization: Bearer <ADMIN_JWT>
```

Contoh curl:
```
curl -G \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  --data-urlencode "q=naruto" \
  --data-urlencode "limit=5" \
  --data-urlencode "includeEpisodes=false" \
  https://<HOST>/<VERSION>/admin/anime/search
```

Contoh Response (200):
```json
{
  "message": "OK",
  "items": [
    {
      "id": 1,
      "nama_anime": "Naruto",
      "gambar_anime": "https://...",
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
  ]
}
```

## Update Anime (SUPERADMIN | UPLOADER)
- Method: PUT
- Path: `/anime/:id`
- Body (opsional): field yang ingin diubah
  - String: `nama_anime`, `gambar_anime`, `rating_anime`, `status_anime`, `sinopsis_anime`, `label_anime`
  - Number: `view_anime`
  - Date ISO: `tanggal_rilis_anime` (null untuk hapus tanggal)
  - Array/String-koma: `tags_anime`, `genre_anime`, `studio_anime`, `fakta_menarik`
- Response 200: `{ "message": "Anime updated", "item": { ... } }`
- Error 404: anime tidak ditemukan

## Hapus Anime (SUPERADMIN | UPLOADER)
- Method: DELETE
- Path: `/anime/:id`
- Response 200: `{ "message": "Anime deleted" }`
- Error 404: anime tidak ditemukan

## Error Umum
- 400: ID tidak valid atau field wajib kosong
- 401/403: token tidak ada atau role tidak diizinkan
- 500: error tak terduga

## Lokasi Kode
- Route: `src/routes/admin.routes.js` (GET `/admin/anime`, GET `/admin/anime/search`, POST `/admin/anime`, GET/PUT/DELETE `/admin/anime/:id`)
- Controller: `src/controllers/adminAnime.controller.js` (fungsi `listAnimeAdmin`, `searchAnimeAdmin`, `createAnimeAdmin`, `getAnimeAdminById`, `updateAnimeAdmin`, `deleteAnimeAdmin`)
