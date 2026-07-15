# Admin Anime API

Endpoint admin untuk mengelola anime, film, donghua, dan tokusatsu. Hanya role SUPERADMIN dan UPLOADER.

- Base URL: `/admin`
- Auth: `Authorization: Bearer <ADMIN_JWT>`

## Content Type (`content_type`)

Setiap anime memiliki field `content_type` (enum `AnimeContentType`) yang menentukan jenis konten:

| Value | Deskripsi | Contoh |
|---|---|---|
| `ANIME` | Anime Jepang (default) | Naruto, One Piece |
| `FILM` | Film/movie | Your Name, Suzume |
| `DONGHUA` | Anime China | Mo Dao Zu Shi, Heaven Official's Blessing |
| `TOKUSATSU` | Tokusatsu (live action Jepang) | Kamen Rider, Ultraman |

Field ini berbeda dari `label_anime` (format tayang: `TV`, `Movie`, `ONA`, `OVA`, `Special`).
- `content_type` = jenis konten (ANIME/FILM/DONGHUA/TOKUSATSU)
- `label_anime` = format tayang (TV/Movie/ONA/OVA/Special)

### Cara Set Anime menjadi Movie/Film

Untuk mengubah anime menjadi movie/film, kirim `type` atau `content_type` dengan value `FILM`:

```http
PUT /admin/anime/:id
Authorization: Bearer <ADMIN_JWT>
Content-Type: multipart/form-data

body:
  type: FILM
```

Atau saat membuat anime baru:

```http
POST /admin/anime
Authorization: Bearer <ADMIN_JWT>
Content-Type: multipart/form-data

body:
  nama_anime: Suzume no Tojimari
  type: FILM
  label_anime: Movie
  ... (field lainnya)
```

### Filter Anime by Content Type

Gunakan query param `content_type` pada endpoint `GET /admin/anime`:

```
GET /admin/anime?content_type=FILM&page=1&limit=20
GET /admin/anime?content_type=DONGHUA
GET /admin/anime?content_type=TOKUSATSU
GET /admin/anime?content_type=ANIME
```

Catatan upload:
- Endpoint admin anime saat ini menggunakan `multipart/form-data` untuk upload cover.
- Untuk flow upload yang lebih cepat (direct-to-B2), lihat `Admin Uploads API` bagian **Direct Upload ke B2 (Presigned PUT URL)**.
- Jika mengirim `gambar_anime` berupa URL `http(s)`, server akan **mengunduh** gambar dari URL tersebut lalu **meng-upload ulang** ke storage menggunakan **signed URL** (PUT).
  - **URL asli tidak disimpan**.
  - Client wajib menggunakan **URL callback** dari response (`item.gambar_anime`) sebagai URL cover yang valid (URL storage/CDN).
  - Jika `gambar_anime` SUDAH merupakan URL storage/CDN (prefix `CDN_BASE_URL_STORAGE`), server akan menyimpan nilai tersebut apa adanya (tidak download ulang).
- Jika `gambar_anime` berupa path static lokal (mis. `/static/...`) atau URL localhost/static server (mis. `http://localhost:3001/static/...`), server akan membaca file sumber lalu **meng-upload ulang** ke storage/B2.

## Buat Anime (SUPERADMIN | UPLOADER)
- Method: POST
- Path: `/anime`
- Header: `Content-Type: multipart/form-data`

Body (multipart form):

- `image` (file, opsional) — cover anime (hanya file gambar)
- Alternatif (tanpa upload file): kirim `gambar_anime` berisi URL cover.
  - Jika `gambar_anime` adalah URL `http(s)`, server akan **download** dan **re-upload** ke storage.
  - Jika `gambar_anime` adalah path static lokal (mis. `/static/...`) atau URL localhost/static server (mis. `http://localhost:3001/static/...`), server akan membaca file sumber lalu **re-upload** ke storage/B2.

Callback URL:
- Jika request menggunakan URL remote `http(s)` dan URL tersebut BUKAN URL storage/CDN, maka value `gambar_anime` di database akan **diganti** menjadi URL storage.
- Client tidak perlu menebak URL storage; cukup pakai `item.gambar_anime` dari response sebagai **callback**.
- Field lain mengikuti JSON, dikirim sebagai text:
  - `nama_anime`, `rating_anime`, `status_anime`, `sinopsis_anime`, `label_anime`
  - `type` / `content_type` (opsional): `ANIME|FILM|DONGHUA|TOKUSATSU` (default: `ANIME`)
  - `is_21_plus`
  - `tags_anime`, `genre_anime`, `studio_anime`, `fakta_menarik`
  - `aliases`, `schedule`, `schedules`

Format alias yang direkomendasikan:
- **Jangan kirim JSON array yang panjang/ribet di form**.
- Gunakan field `aliases` sebagai **teks biasa** yang dipisah **baris baru** atau **koma**.
- Contoh yang direkomendasikan:

```text
aliases: Naruto Shippuden
Boruto
Naruto TV
```

atau:

```text
aliases: Naruto Shippuden, Boruto, Naruto TV
```

- Jika hanya satu alias, boleh kirim `alias`.
- Untuk kebutuhan advanced, masih bisa kirim `alias` + `language` + `type` + `priority` untuk **satu alias**.
- Untuk membantu admin memilih alias yang sudah ada, gunakan endpoint **GET `/admin/anime/aliases?q=...`** lalu kirim alias terpilih kembali di field `aliases`.

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
  aliases: Naruto Shippuden, Boruto
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
- Opsi tambahan alias:
  - `aliases` mendukung input text dipisah koma / baris.
  - Duplikasi alias akan di-skip otomatis.
  - Alias boleh dipilih dari hasil lookup endpoint `/admin/anime/aliases` atau ditulis baru.
- Catatan:
  - `tags_anime`, `genre_anime`, `studio_anime`, `fakta_menarik` boleh array atau string dipisah koma.
  - `view_anime` default 0 jika tidak dikirim.
  - `tanggal_rilis_anime` opsional (ISO date string).
  - `is_21_plus` menerima boolean asli atau string multipart `true` / `false`.

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

Contoh response untuk content_type `FILM`:
```json
{
  "message": "Anime created",
  "item": {
    "id": 2,
    "nama_anime": "Suzume no Tojimari",
    "gambar_anime": "https://<CDN_STORAGE>/<key>",
    "content_type": "FILM",
    "label_anime": "Movie",
    "status_anime": "Completed",
    "rating_anime": "8.4",
    "is_21_plus": false
  }
}
```

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
    - `title_en` (contains, case-insensitive)
    - `title_jp` (contains, case-insensitive)
    - `sinopsis_anime` (contains, case-insensitive)
    - `tags_anime` (array, `has` terhadap `q.toLowerCase()`)
    - `genre_anime` (array, `has` terhadap `q`)
  - `status` (opsional): filter exact ke field `status_anime` (contoh: `ONGOING`, `Completed`, dll sesuai data)
  - `genre` (opsional): filter exact ke salah satu elemen array `genre_anime` (`has: genre`)
  - `content_type` (opsional): filter by jenis konten — `ANIME`, `FILM`, `DONGHUA`, `TOKUSATSU` (case-insensitive)
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
      "content_type": "ANIME",
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
GET /admin/anime?page=1&limit=20&q=naruto&status=ONGOING&genre=Action&content_type=ANIME&includeEpisodes=true
Authorization: Bearer <ADMIN_JWT>
```

Filter hanya film/movie:
```
GET /admin/anime?content_type=FILM&page=1&limit=20
Authorization: Bearer <ADMIN_JWT>
```

Filter hanya donghua:
```
GET /admin/anime?content_type=DONGHUA&page=1&limit=20
Authorization: Bearer <ADMIN_JWT>
```

## Statistik Anime per Status (SUPERADMIN | UPLOADER)
- Method: GET
- Path: `/anime/stats`
- Deskripsi: Mendapatkan count/jumlah anime per status untuk dashboard. Berguna untuk menampilkan badge counter di UI (misal: Berlangsung: 15, Selesai: 45).

- Response 200:
```json
{
  "message": "OK",
  "counts": {
    "ONGOING": 15,
    "COMPLETED": 45,
    "HIATUS": 3,
    "UPCOMING": 8
  },
  "total": 71
}
```

- Field:
  - `counts`: Object dengan key status anime dan value jumlah anime
  - `total`: Total keseluruhan anime

- Error:
  - 401/403: tidak ada token atau role tidak diizinkan
  - 500: error tak terduga

### Contoh
```
GET /admin/anime/stats
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

## Cari Alias Anime (SUPERADMIN | UPLOADER)
- Method: GET
- Path: `/anime/aliases`
- Deskripsi: Ambil daftar alias anime yang sudah ada untuk kebutuhan autocomplete / search saat form create atau update anime.

- Query Params:
  - `q` (opsional): kata kunci pencarian alias atau nama anime sumber
  - `limit` (opsional, default `20`, max `100`)

- Response 200:
```json
{
  "message": "OK",
  "items": [
    {
      "alias": "Naruto Shippuden",
      "language": "EN",
      "type": "AKA",
      "priority": 2,
      "source_anime_id": 1,
      "source_anime_name": "Naruto"
    }
  ],
  "pagination": {
    "limit": 20,
    "returned": 1
  }
}
```

### Contoh
```
GET /admin/anime/aliases?q=naruto&limit=10
Authorization: Bearer <ADMIN_JWT>
```

Contoh curl:
```
curl -G \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  --data-urlencode "q=naruto" \
  --data-urlencode "limit=10" \
  https://<HOST>/<VERSION>/admin/anime/aliases
```

Contoh Response (200):
```json
{
  "message": "OK",
  "items": [
    {
      "alias": "Naruto Shippuden",
      "language": "EN",
      "type": "AKA",
      "priority": 2,
      "source_anime_id": 1,
      "source_anime_name": "Naruto"
    }
  ],
  "pagination": {
    "limit": 10,
    "returned": 1
  }
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
- Jika `gambar_anime` adalah path static lokal (mis. `/static/...`) atau URL localhost/static server (mis. `http://localhost:3001/static/...`), server akan membaca file sumber lalu **re-upload** ke storage/B2, dan menyimpan URL storage.

  - `image` (file gambar, opsional) — cover anime baru
  - `gambar_anime` (string URL, opsional) — cover anime baru (alternatif tanpa upload file)
  - String: `nama_anime`, `rating_anime`, `status_anime`, `sinopsis_anime`, `label_anime`
    - `label_anime` adalah format tayang (contoh: `Movie`, `TV`, `ONA`, `OVA`, `Special`) — field terpisah dari `content_type`
  - Enum: `type` atau `content_type` (opsional): salah satu dari `ANIME|FILM|DONGHUA|TOKUSATSU` (tersimpan ke field `content_type`, enum DB `AnimeContentType`)
    - `ANIME` — Anime Jepang (default)
    - `FILM` — Film/movie
    - `DONGHUA` — Anime China
    - `TOKUSATSU` — Tokusatsu (Kamen Rider, Ultraman, dll)
  - Boolean: `is_21_plus` (opsional, menerima boolean asli atau string `true` / `false` dari multipart form)
  - Number: `view_anime`
  - Date ISO: `tanggal_rilis_anime` (null untuk hapus tanggal)
  - Array/String-koma: `tags_anime`, `genre_anime`, `studio_anime`, `fakta_menarik`
  - Jadwal (opsional, hanya diproses jika status akhir `ongoing`):
    - `schedule`: object tunggal `{ hari, jam, is_active? }`
    - `schedules`: array objek jadwal
    - Jika status akhir **bukan** `ongoing`, semua jadwal untuk anime tsb akan DIHAPUS otomatis.
    - Jika status akhir `ongoing` dan `schedule`/`schedules` DIKIRIM, maka jadwal lama akan DIGANTI dengan payload baru.
  - Aliases (opsional, REPLACE semantics):
    - Kirim `aliases` sebagai teks biasa dipisah koma/baris, atau single `alias`.
    - Contoh praktis:

```text
aliases: Naruto Shippuden
Boruto
Naruto TV
```

    - Untuk 1 alias advanced, boleh kirim `alias` + `language` + `type` + `priority`.
    - Disarankan ambil pilihan dari endpoint `GET /admin/anime/aliases?q=...` lalu kirim alias terpilih di field `aliases`.
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

## Episode Management (SUPERADMIN | UPLOADER)

### Daftar Episode
- Method: GET
- Path: `/anime/:animeId/episodes`
- Response 200: `{ "message": "OK", "items": [ ... ] }`

### Buat Episode
- Method: POST
- Path: `/anime/:animeId/episodes`
- Header: `Content-Type: multipart/form-data`

Body:
- `judul_episode` (wajib)
- `nomor_episode` (wajib, number)
- `qualities` (wajib, array JSON): `[{ "nama_quality": "720p", "source_quality": "https://..." }]`
- `thumbnail_episode` (URL) atau `image` (file) — **opsional**, jika tidak dikirim akan **otomatis di-generate dari video**
- `durasi_episode` (opsional, number dalam detik) — jika tidak dikirim, **otomatis dideteksi dari video**
- `deskripsi_episode`, `intro_start_seconds`, `intro_duration_seconds`, `outro_start_seconds`, `outro_duration_seconds`, `tanggal_rilis_episode`

### Buat Episode Batch
- Method: POST
- Path: `/anime/:animeId/episodes/batch`
- Body: JSON array of episode objects (sama field seperti create single)

### Detail Episode
- Method: GET
- Path: `/episodes/:id`
- Response 200: `{ "message": "OK", "item": { ... } }`

### Update Episode
- Method: PUT
- Path: `/episodes/:id`
- Header: `Content-Type: multipart/form-data`
- Body (opsional): field yang ingin diubah (sama seperti create)

### Hapus Episode
- Method: DELETE
- Path: `/episodes/:id`
- Response 200: `{ "message": "Episode deleted" }`

### Set/Update Episode Video (Qualities)
- Method: POST
- Path: `/episodes/:id/video`
- Body:
  - `qualities` (array JSON): `[{ "nama_quality": "720p", "source_quality": "https://..." }]`
  - `hls_master_url` (opsional, string URL)
- Response 200: `{ "message": "Episode video updated", "item": { ... } }`

## Episode Subtitles (SUPERADMIN | UPLOADER)

Setiap episode dapat memiliki multiple subtitle tracks dengan format **ASS**, **SRT**, atau **VTT**. File subtitle di-upload ke backend, disimpan ke CDN (B2 storage), dan URL-nya disimpan di database.

### Upload Subtitle
- Method: POST
- Path: `/episodes/:id/subtitles`
- Header: `Content-Type: multipart/form-data`

Body:
- `subtitle` (wajib, file): file subtitle dengan ekstensi `.ass`, `.srt`, atau `.vtt` (max 5MB)
- `language` (wajib, string): kode bahasa, contoh: `id`, `en`, `ja`, `ko`
- `label` (wajib, string): nama tampilan, contoh: `Indonesia`, `English`, `日本語`
- `is_default` (opsional, boolean/string): set `true` untuk jadikan subtitle default

**Catatan:**
- Jika upload subtitle dengan `language` yang sudah ada, akan **replace** subtitle lama (upsert).
- File subtitle lama di CDN akan tetap ada (tidak dihapus saat replace).
- Jika `is_default: true`, semua subtitle lain untuk episode ini akan di-set `is_default: false`.
- Format dideteksi otomatis dari ekstensi file.

Response 200:
```json
{
  "message": "Subtitle uploaded",
  "item": {
    "id": 1,
    "episode_id": 31054,
    "language": "id",
    "label": "Indonesia",
    "format": "ass",
    "url": "https://cdn-stable.nanimeid.xyz/file/storage-nanimeid/catalog/episodes/subtitles/...",
    "is_default": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### List Subtitles
- Method: GET
- Path: `/episodes/:id/subtitles`
- Response 200:
```json
{
  "message": "OK",
  "items": [
    {
      "id": 1,
      "episode_id": 31054,
      "language": "id",
      "label": "Indonesia",
      "format": "ass",
      "url": "https://...",
      "is_default": true,
      "createdAt": "...",
      "updatedAt": "..."
    },
    {
      "id": 2,
      "episode_id": 31054,
      "language": "en",
      "label": "English",
      "format": "srt",
      "url": "https://...",
      "is_default": false,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### Set Default Subtitle
- Method: PATCH
- Path: `/episodes/:id/subtitles/:subtitleId/default`
- Response 200: `{ "message": "Default subtitle updated" }`
- Catatan: Hanya 1 subtitle default per episode. Subtitle lain akan di-set `is_default: false`.

### Delete Subtitle
- Method: DELETE
- Path: `/episodes/:id/subtitles/:subtitleId`
- Response 200: `{ "message": "Subtitle deleted" }`
- Catatan: File subtitle di CDN juga akan dihapus (best-effort).

### Format Subtitle

| Format | Ekstensi | MIME Type | Deskripsi |
|---|---|---|---|
| ASS | `.ass` | `text/plain` | Advanced SubStation Alpha — support styling, positioning |
| SRT | `.srt` | `text/plain` | SubRip — format paling umum, plain text |
| VTT | `.vtt` | `text/vtt` | WebVTT — format web standard, support cues |

### Database Schema

Table `EpisodeSubtitle`:
- `id` — auto increment
- `episode_id` — FK ke Episode (onDelete: Cascade)
- `language` — kode bahasa (unique per episode)
- `label` — nama tampilan
- `format` — `ass` | `srt` | `vtt`
- `url` — CDN URL ke file subtitle
- `is_default` — boolean, hanya 1 `true` per episode
- `createdAt`, `updatedAt`

Unique constraint: `[episode_id, language]` — 1 bahasa per episode.

### Auto-Detection Durasi & Thumbnail Episode

Backend **otomatis mendeteksi durasi video** (`durasi_episode`) dan **meng-generate thumbnail** dari video menggunakan `ffprobe` dan `ffmpeg` pada endpoint berikut:

- **POST** `/admin/anime/:animeId/episodes` — saat membuat episode baru
- **POST** `/admin/anime/:animeId/episodes/batch` — saat batch create episode
- **POST** `/admin/episodes/:id/video` — saat set/update video qualities (thumbnail hanya jika episode belum punya)

#### Durasi (`durasi_episode`)

**Cara kerja:**
1. Jika admin **tidak mengirim** `durasi_episode` (atau `null`), backend akan probe video dari URL `source_quality` pertama yang valid.
2. Backend menggunakan `ffprobe` untuk membaca metadata durasi video (dalam detik).
3. Jika berhasil, `durasi_episode` di-update otomatis di database.
4. Jika gagal (URL tidak accessible, ffprobe tidak tersedia, dll), `durasi_episode` tetap `null` — tidak ada error.
5. Jika admin **mengirim** `durasi_episode` secara manual, auto-detection **dilewati** (manual override).

#### Thumbnail (`thumbnail_episode`)

**Cara kerja:**
1. Jika admin **tidak mengirim** thumbnail (file `image` atau URL `thumbnail_episode`), backend akan meng-generate thumbnail dari video.
2. Backend menggunakan `ffprobe` untuk mendapatkan durasi, lalu memilih **timestamp random** antara 10%-80% durasi (menghindari frame hitam di intro/outro).
3. Backend menggunakan `ffmpeg` untuk ekstrak frame pada timestamp tersebut, resize ke 640px width.
4. Thumbnail di-upload ke storage (B2/CDN) dan URL disimpan ke `thumbnail_episode`.
5. Jika gagal, thumbnail tetap `null` — tidak ada error.
6. Jika admin **mengirim** thumbnail (file atau URL), auto-generation **dilewati** (manual override).
7. Pada endpoint `POST /admin/episodes/:id/video`, thumbnail hanya di-generate jika episode **belum punya** thumbnail.

**Prasyarat:**
- `ffprobe` dan `ffmpeg` harus tersedia di sistem (atau set env `FFPROBE_PATH` dan `FFMPEG_PATH` ke path binary).
- URL video (`source_quality`) harus accessible dari server.

**Prioritas:**
1. Manual dari admin (file `image` / URL `thumbnail_episode` / `durasi_episode`) → digunakan apa adanya
2. Auto-detect/generate dari video → jika manual tidak dikirim
3. `null` → jika keduanya tidak tersedia

## Error Umum
- 400: ID tidak valid atau field wajib kosong
- 401/403: token tidak ada atau role tidak diizinkan
- 500: error tak terduga

## Lokasi Kode
- Route: `src/routes/admin.routes.js`
  - Anime: GET `/admin/anime`, GET `/admin/anime/stats`, GET `/admin/anime/search`, GET `/admin/anime/aliases`, POST `/admin/anime`, GET/PUT/DELETE `/admin/anime/:id`
  - Episodes: GET `/admin/anime/:animeId/episodes`, POST `/admin/anime/:animeId/episodes`, POST `/admin/anime/:animeId/episodes/batch`, GET/PUT/DELETE `/admin/episodes/:id`, POST `/admin/episodes/:id/video`, GET `/admin/episodes/:id/quality-check`
  - Subtitles: POST/GET `/admin/episodes/:id/subtitles`, PATCH `/admin/episodes/:id/subtitles/:subtitleId/default`, DELETE `/admin/episodes/:id/subtitles/:subtitleId`
- Controller: `src/controllers/adminAnime.controller.js` (fungsi `listAnimeAdmin`, `getAnimeStatsAdmin`, `searchAnimeAdmin`, `listAnimeAliasesAdmin`, `createAnimeAdmin`, `getAnimeAdminById`, `updateAnimeAdmin`, `deleteAnimeAdmin`, `listEpisodesAdmin`, `createEpisodeAdmin`, `batchCreateEpisodesAdmin`, `getEpisodeAdminById`, `updateEpisodeAdmin`, `deleteEpisodeAdmin`, `setEpisodeVideoAdmin`, `checkEpisodeQualityStatus`, `uploadEpisodeSubtitleAdmin`, `listEpisodeSubtitlesAdmin`, `deleteEpisodeSubtitleAdmin`, `setDefaultEpisodeSubtitleAdmin`)

---

<!-- Bagian Anime Relations (Admin) dihapus karena fitur relasi ditiadakan -->
