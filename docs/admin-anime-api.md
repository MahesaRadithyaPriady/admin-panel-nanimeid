# Admin Anime API

Endpoint admin untuk membuat anime baru. Hanya role SUPERADMIN dan UPLOADER.

- Base URL: `/admin`
- Auth: `Authorization: Bearer <ADMIN_JWT>`

Catatan upload:
- Endpoint admin anime saat ini menggunakan `multipart/form-data` untuk upload cover.
- Untuk flow upload yang lebih cepat (direct-to-B2), lihat `Admin Uploads API` bagian **Direct Upload ke B2 (Presigned PUT URL)**.
- Jika mengirim `gambar_anime` berupa URL `http(s)`, server akan **mengunduh** gambar dari URL tersebut lalu **meng-upload ulang** ke storage menggunakan **signed URL** (PUT).
  - **URL asli tidak disimpan**.
  - Client wajib menggunakan **URL callback** dari response (`item.gambar_anime`) sebagai URL cover yang valid (URL storage/CDN).
  - Jika `gambar_anime` SUDAH merupakan URL storage/CDN (prefix `CDN_BASE_URL_STORAGE`), server akan menyimpan nilai tersebut apa adanya (tidak download ulang).

## Buat Anime (SUPERADMIN | UPLOADER)
- Method: POST
- Path: `/anime`
- Header: `Content-Type: multipart/form-data`

Body (multipart form):

- `image` (file, opsional) — cover anime (hanya file gambar)
- Alternatif (tanpa upload file): kirim `gambar_anime` berisi URL cover.
  - Jika `gambar_anime` adalah URL `http(s)`, server akan **download** dan **re-upload** ke storage.
  - Jika `gambar_anime` adalah path static lokal (mis. `/static/...`), server akan menyimpan nilai tersebut apa adanya.

Callback URL:
- Jika request menggunakan URL remote `http(s)` dan URL tersebut BUKAN URL storage/CDN, maka value `gambar_anime` di database akan **diganti** menjadi URL storage.
- Client tidak perlu menebak URL storage; cukup pakai `item.gambar_anime` dari response sebagai **callback**.
- Field lain mengikuti JSON, dikirim sebagai text:
  - `nama_anime`, `rating_anime`, `status_anime`, `sinopsis_anime`, `label_anime`
  - `type` / `content_type`, `is_21_plus`
  - `tags_anime`, `genre_anime`, `studio_anime`, `fakta_menarik`
  - `aliases`, `schedule`, `schedules`

Contoh request (multipart/form-data):

```http
POST /admin/anime
Authorization: Bearer <ADMIN_JWT>
Content-Type: multipart/form-data

body:
  nama_anime: Naruto
  rating_anime: 8.6
  status_anime: ongoing
  type: ANIME
  is_21_plus: false
  sinopsis_anime: Seorang ninja...
  label_anime: TV
  tags_anime: shounen,action
  genre_anime: Action,Adventure
  image: <file image/jpeg>
```

- Field wajib: `nama_anime`, `rating_anime`, `status_anime`, `sinopsis_anime`, `label_anime`
- Cover wajib dikirim melalui **salah satu**:
  - `image` (file)
  - `gambar_anime` (URL)
- Batasan untuk `gambar_anime` URL `http(s)`:
  - Harus mengarah ke konten `image/*`
  - Max size: 10MB
  - Timeout download: 15s
- **Khusus `status_anime = "ongoing"`**:
  - Wajib mengirim **minimal satu jadwal** melalui field `schedule` *atau* `schedules`.
  - Jika tidak ada jadwal yang valid (`hari` & `jam` kosong), server akan mengembalikan **400** dengan pesan bahwa jadwal wajib diisi.
- Opsi tambahan: `aliases` dapat berupa array of string atau array of object `{ alias, language?, type? }`. Duplikasi akan di-skip otomatis.
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
    "gambar_anime": "https://<CDN_STORAGE>/<key>",
    "tags_anime": ["shounen","action"],
    "rating_anime": "8.6",
    "view_anime": 1000,
    "tanggal_rilis_anime": "2024-05-01T00:00:00.000Z",
    "status_anime": "ongoing",
    "genre_anime": ["Action","Adventure"],
    "sinopsis_anime": "Seorang ninja...",
    "label_anime": "TV",
    "content_type": "ANIME",
    "is_21_plus": false,
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
- Response 200: 
  ```json
  {
    "message": "OK",
    "item": {
      "id": 1,
      "nama_anime": "Naruto",
      // ... other anime fields ...
      "episodes": [
        // ... list of episodes ...
      ],
      "aliases": [
        {
          "id": 1,
          "anime_id": 1,
          "alias": "Naruto Shippuden",
          "language": "EN",
          "type": "AKA",
          "priority": 2,
          "createdAt": "2024-05-15T13:45:30.000Z",
          "updatedAt": "2024-05-15T13:45:30.000Z"
        }
        // ... more aliases ...
      ],
      "schedules": [
        {
          "id": 10,
          "anime_id": 1,
          "hari": "Senin",
          "jam": "20:30",
          "is_active": true,
          "createdAt": "2025-11-30T09:00:00.000Z",
          "updatedAt": "2025-11-30T09:00:00.000Z"
        }
        // ... jadwal lain (jika ada) ...
      ]
    }
  }
  ```
- Error 404: anime tidak ditemukan

## Daftar Anime (SUPERADMIN | UPLOADER)
- Method: GET
- Path: `/anime`
- Deskripsi: Ambil daftar anime untuk keperluan admin dengan dukungan filter kata kunci, status, dan genre.

- Query Params:
  - `page` (opsional, default `1`)
  - `limit` (opsional, default `20`, max `100`)
  - `q` (opsional): kata kunci, akan dicocokkan ke:
    - `nama_anime` (contains, case-insensitive)
    - `sinopsis_anime` (contains, case-insensitive)
    - `tags_anime` (array, `has` terhadap `q.toLowerCase()`)
    - `genre_anime` (array, `has` terhadap `q`)
  - `status` (opsional): filter exact ke field `status_anime` (contoh: `ONGOING`, `Completed`, dll sesuai data)
  - `genre` (opsional): filter exact ke salah satu elemen array `genre_anime` (`has: genre`)
  - `includeEpisodes` (opsional, `true|false`, default `true`):
    - `true`: response menyertakan `episodes` (+`qualities`) untuk setiap anime
    - `false`: hanya data anime tanpa list episode

- Response 200:
```json
{
  "message": "OK",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "totalPages": 6,
    "hasNext": true,
    "hasPrev": false
  },
  "items": [
    {
      "id": 1,
      "nama_anime": "Naruto",
      "gambar_anime": "https://...",
      "tags_anime": ["shounen", "action"],
      "rating_anime": "8.6",
      "view_anime": 1000,
      "tanggal_rilis_anime": "2024-05-01T00:00:00.000Z",
      "status_anime": "ongoing",
      "genre_anime": ["Action", "Adventure"],
      "sinopsis_anime": "Seorang ninja...",
      "label_anime": "TV",
      "studio_anime": ["Pierrot"],
      "fakta_menarik": ["Diadaptasi dari manga"],
      "episodes": [
        {
          "id": 100,
          "judul_episode": "Episode 1",
          "nomor_episode": 1,
          "qualities": [
            { "nama_quality": "720p", "source_quality": "..." }
          ]
        }
      ]
    }
  ]
}
```

### Contoh
```
GET /admin/anime?page=1&limit=20&q=naruto&status=ONGOING&genre=Action&includeEpisodes=true
Authorization: Bearer <ADMIN_JWT>
```

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
- Header: `Content-Type: multipart/form-data`

Body (opsional): field yang ingin diubah. Untuk mengganti cover bisa:

- Upload file pada field `image`, atau
- Kirim `gambar_anime` (URL)

Catatan untuk `gambar_anime` saat update:
- Jika `gambar_anime` adalah URL `http(s)`, server akan **download** lalu **re-upload** ke storage, dan menyimpan URL storage.
- Jika `gambar_anime` adalah path static lokal (mis. `/static/...`), server akan menyimpan nilai tersebut apa adanya.

  - `image` (file gambar, opsional) — cover anime baru
  - `gambar_anime` (string URL, opsional) — cover anime baru (alternatif tanpa upload file)
  - String: `nama_anime`, `rating_anime`, `status_anime`, `sinopsis_anime`, `label_anime`
  - Enum: `type` atau `content_type` (opsional): salah satu dari `ANIME|FILM|DONGHUA` (tersimpan ke field `content_type`)
  - Boolean: `is_21_plus` (opsional)
  - Number: `view_anime`
  - Date ISO: `tanggal_rilis_anime` (null untuk hapus tanggal)
  - Array/String-koma: `tags_anime`, `genre_anime`, `studio_anime`, `fakta_menarik`
  - Jadwal (opsional, hanya diproses jika status akhir `ongoing`):
    - `schedule`: object tunggal `{ hari, jam, is_active? }`
    - `schedules`: array objek jadwal
    - Jika status akhir **bukan** `ongoing`, semua jadwal untuk anime tsb akan DIHAPUS otomatis.
    - Jika status akhir `ongoing` dan `schedule`/`schedules` DIKIRIM, maka jadwal lama akan DIGANTI dengan payload baru.
  - Aliases (opsional, REPLACE semantics):
    - Kirim `aliases` (array of string/obj) atau single `alias` (+opsional `language`, `type`, `priority`).
    - Jika `aliases` DIKIRIM, maka daftar alias untuk anime tsb akan DIGANTI sesuai payload:
      - Alias yang ada di DB namun tidak ada di payload akan DIHAPUS.
      - Alias yang ada di payload dan sudah ada di DB akan DIUPDATE (language/type/priority).
      - Alias baru akan DICIPTAKAN.
    - Field `priority` bertipe number, default `null` (semakin kecil semakin atas pada related-anime).
- Response 200: `{ "message": "Anime updated", "item": { ... }, "insertedAliases": <jumlah alias baru>, "updatedAliases": <jumlah alias yang diupdate> }`
- Error 404: anime tidak ditemukan

## Hapus Anime (SUPERADMIN | UPLOADER)
- Method: DELETE
- Path: `/anime/:id`
- Response 200: `{ "message": "Anime deleted" }`
- Catatan:
  - Jadwal pada tabel `AnimeSchedule` akan ikut terhapus karena relasi `onDelete: Cascade` di Prisma schema.
- Error 404: anime tidak ditemukan

## Error Umum
- 400: ID tidak valid atau field wajib kosong
- 401/403: token tidak ada atau role tidak diizinkan
- 500: error tak terduga

## Lokasi Kode
- Route: `src/routes/admin.routes.js` (GET `/admin/anime`, GET `/admin/anime/search`, POST `/admin/anime`, GET/PUT/DELETE `/admin/anime/:id`)
- Controller: `src/controllers/adminAnime.controller.js` (fungsi `listAnimeAdmin`, `searchAnimeAdmin`, `createAnimeAdmin`, `getAnimeAdminById`, `updateAnimeAdmin`, `deleteAnimeAdmin`)

---

<!-- Bagian Anime Relations (Admin) dihapus karena fitur relasi ditiadakan -->
