# Admin Settings API

Manajemen konfigurasi global aplikasi. Endpoint ini hanya untuk SUPERADMIN dan dilindungi JWT admin.

- Auth: `authenticateAdmin`
- Role: `authorizeAdminRoles("SUPERADMIN")`
- Sumber kode:
  - Routes: `src/routes/admin.routes.js` (path: `/admin/settings`)
  - Controller: `src/controllers/adminSettings.controller.js`
  - Schema: `prisma/schema.prisma` (model `AppSetting`)

Catatan:
- Model `AppSetting` bersifat singleton (id = 1). Seeder tersedia di `src/seeders/appSettingsSeeder.js`.
- Jika tabel belum ada, jalankan `npx prisma db push` lalu `npx prisma generate`.
- Default values: `maintenance_enabled=false`, `downloads_enabled=true`, `paid_qualities=[]`, `force_update_enabled=false`.
- Nilai `watch_lite_coin_per_minute` dipakai untuk menentukan jumlah lite coin yang didapat user per menit pada fitur watch-lite.
- Field `feature_*` dikontrol oleh admin di sini dan dapat dibaca user via `GET /settings` (tanpa auth).
- Field `sha1_signature` **tidak** dikirim ke endpoint publik `GET /settings`.

---

## Ambil Settings

GET /admin/settings

Headers:
- Authorization: Bearer <token>

Response 200:
```json
{
  "message": "OK",
  "settings": {
    "id": 1,
    "maintenance_enabled": false,
    "maintenance_message": null,
    "downloads_enabled": true,
    "paid_qualities": [],
    "force_update_enabled": false,
    "force_update_version": null,
    "watch_lite_coin_per_minute": 1,
    "sha1_signature": [],
    "feature_nobar_enabled": true,
    "feature_nobar_message": null,
    "feature_read_mode_enabled": true,
    "feature_read_mode_message": null,
    "feature_download_episode_enabled": true,
    "feature_download_episode_message": null,
    "feature_download_batch_enabled": true,
    "feature_download_batch_message": null,
    "createdAt": "2025-08-31T12:00:00.000Z",
    "updatedAt": "2025-08-31T12:00:00.000Z"
  }
}
```

Error:
- 401 UNAUTHORIZED, 403 FORBIDDEN
- 500 ERROR

---

## Update Settings

PUT /admin/settings

Headers:
- Content-Type: application/json
- Authorization: Bearer <token>

Body (semua field opsional, kirim yang ingin diubah):
```json
{
  "maintenance_enabled": true,
  "maintenance_message": "Sedang maintenance 00:00-01:00",
  "downloads_enabled": false,
  "paid_qualities": ["720p","1080p"],
  "force_update_enabled": true,
  "force_update_version": "2.5.0",
  "watch_lite_coin_per_minute": 2,
  "feature_nobar_enabled": false,
  "feature_nobar_message": "Fitur nobar sedang dalam perbaikan",
  "feature_read_mode_enabled": true,
  "feature_read_mode_message": null,
  "feature_download_episode_enabled": true,
  "feature_download_episode_message": null,
  "feature_download_batch_enabled": false,
  "feature_download_batch_message": "Download batch hanya tersedia untuk VIP"
}
```

Aturan validasi:
- `maintenance_enabled`, `downloads_enabled`, `force_update_enabled`: boolean (menerima `true`/`false` literal atau string "true"/"false").
- `maintenance_message`, `force_update_version`: string atau `null`.
- `paid_qualities`: array string atau string koma, contoh: `"720p,1080p"`.
- `watch_lite_coin_per_minute`: integer `>= 0`.
- `feature_*_enabled`: boolean — aktif/nonaktif fitur untuk seluruh user.
- `feature_*_message`: string atau `null` — pesan info/alasan untuk fitur tersebut.

Response 200:
```json
{
  "message": "Settings updated",
  "settings": {
    "id": 1,
    "maintenance_enabled": true,
    "maintenance_message": "Sedang maintenance 00:00-01:00",
    "downloads_enabled": false,
    "paid_qualities": ["720p","1080p"],
    "force_update_enabled": true,
    "force_update_version": "2.5.0",
    "watch_lite_coin_per_minute": 2,
    "sha1_signature": [],
    "feature_nobar_enabled": false,
    "feature_nobar_message": "Fitur nobar sedang dalam perbaikan",
    "feature_read_mode_enabled": true,
    "feature_read_mode_message": null,
    "feature_download_episode_enabled": true,
    "feature_download_episode_message": null,
    "feature_download_batch_enabled": false,
    "feature_download_batch_message": "Download batch hanya tersedia untuk VIP",
    "createdAt": "2025-08-31T12:00:00.000Z",
    "updatedAt": "2025-08-31T12:05:00.000Z"
  }
}
```

Error:
- 400 BAD_REQUEST: format field tidak valid
- 401 UNAUTHORIZED, 403 FORBIDDEN
- 500 ERROR

---

## Update Watch Lite Coin per Minute

PATCH /admin/settings/watch-lite-coin-per-minute

Headers:
- Content-Type: application/json
- Authorization: Bearer <token>

Body:
```json
{
  "watch_lite_coin_per_minute": 3
}
```

Aturan validasi:
- `watch_lite_coin_per_minute` wajib dikirim.
- Nilai harus integer `>= 0`.

Response 200:
```json
{
  "message": "watch_lite_coin_per_minute updated",
  "settings": {
    "id": 1,
    "maintenance_enabled": false,
    "maintenance_message": null,
    "downloads_enabled": true,
    "paid_qualities": [],
    "force_update_enabled": false,
    "force_update_version": null,
    "watch_lite_coin_per_minute": 3,
    "createdAt": "2025-08-31T12:00:00.000Z",
    "updatedAt": "2025-08-31T12:10:00.000Z"
  }
}
```

Error:
- 400 BAD_REQUEST: field tidak ada atau format nilai tidak valid
- 401 UNAUTHORIZED, 403 FORBIDDEN
- 500 ERROR

---

---

## App Feature Toggles

Field `feature_*` dikontrol oleh admin melalui `PUT /admin/settings`. Perubahan langsung terlihat ke user melalui `GET /settings` (publik).

| Field | Default | Keterangan |
|-------|---------|------------|
| `feature_nobar_enabled` | `true` | Aktif/nonaktif fitur Nonton Bareng (nobar) |
| `feature_nobar_message` | `null` | Pesan info atau alasan dinonaktifkan |
| `feature_read_mode_enabled` | `true` | Aktif/nonaktif fitur Mode Baca |
| `feature_read_mode_message` | `null` | Pesan info atau alasan dinonaktifkan |
| `feature_download_episode_enabled` | `true` | Aktif/nonaktif fitur Download Episode |
| `feature_download_episode_message` | `null` | Pesan info atau alasan dinonaktifkan |
| `feature_download_batch_enabled` | `true` | Aktif/nonaktif fitur Download Batch |
| `feature_download_batch_message` | `null` | Pesan info atau alasan dinonaktifkan |

---

## Endpoint Publik (User) — GET only

User **hanya bisa GET**. Tidak ada endpoint update untuk user di `/settings`. Field `sha1_signature` dan `id` tidak dikembalikan.

---

### GET /settings

Ambil semua pengaturan global aplikasi.

```
GET /settings
```

Response 200:
```json
{
  "message": "OK",
  "settings": {
    "maintenance_enabled": false,
    "maintenance_message": null,
    "downloads_enabled": true,
    "paid_qualities": [],
    "force_update_enabled": false,
    "force_update_version": null,
    "watch_lite_coin_per_minute": 1,
    "feature_nobar_enabled": true,
    "feature_nobar_message": null,
    "feature_read_mode_enabled": true,
    "feature_read_mode_message": null,
    "feature_download_episode_enabled": true,
    "feature_download_episode_message": null,
    "feature_download_batch_enabled": true,
    "feature_download_batch_message": null,
    "createdAt": "2025-08-31T12:00:00.000Z",
    "updatedAt": "2025-08-31T12:00:00.000Z"
  }
}
```

---

### GET /settings/features

Ambil status semua fitur sekaligus dalam format list.

```
GET /settings/features
```

Response 200:
```json
{
  "message": "OK",
  "features": [
    { "feature": "nobar",             "label": "Nonton Bareng",    "available": true,  "message": null },
    { "feature": "read-mode",         "label": "Mode Baca",        "available": true,  "message": null },
    { "feature": "download-episode",  "label": "Download Episode", "available": true,  "message": null },
    { "feature": "download-batch",    "label": "Download Batch",   "available": false, "message": "Download batch hanya tersedia untuk VIP" }
  ]
}
```

---

### GET /settings/features/:feature

Cek status satu fitur spesifik. Gunakan untuk gate-check sebelum memperlihatkan tombol/fitur di UI.

| `:feature` | Label |
|------------|-------|
| `nobar` | Nonton Bareng |
| `read-mode` | Mode Baca |
| `download-episode` | Download Episode |
| `download-batch` | Download Batch |

```
GET /settings/features/nobar
GET /settings/features/download-episode
GET /settings/features/download-batch
GET /settings/features/read-mode
```

Response 200 (fitur aktif):
```json
{
  "message": "OK",
  "feature": "nobar",
  "label": "Nonton Bareng",
  "available": true,
  "message_text": null
}
```

Response 200 (fitur nonaktif):
```json
{
  "message": "OK",
  "feature": "download-batch",
  "label": "Download Batch",
  "available": false,
  "message_text": "Download batch hanya tersedia untuk VIP"
}
```

Response 404 (fitur tidak dikenal):
```json
{
  "success": false,
  "message": "Fitur 'unknown-feature' tidak ditemukan",
  "available_features": ["nobar", "read-mode", "download-episode", "download-batch"]
}
```

---

## Seeder & Operasional
- Seeder: jalankan `node src/seeders/appSettingsSeeder.js` atau `npm run seed` (sudah terintegrasi di `src/seeders/index.js`).
- Jika belum generate Prisma Client setelah menambah model: `npx prisma db push` kemudian `npx prisma generate`.
- Endpoint hanya untuk SUPERADMIN; pastikan account SUPERADMIN tersedia (lihat `src/seeders/adminSeeder.js` atau endpoint bootstrap superadmin `/admin/auth/bootstrap-superadmin`).

---

## Use Cases Umum
- Menampilkan banner maintenance di aplikasi: set `maintenance_enabled=true` dan isi `maintenance_message`.
- Menonaktifkan fitur download global: set `downloads_enabled=false`.
- Menentukan kualitas video yang berbayar: isi `paid_qualities` dengan daftar quality (mis. `720p`, `1080p`).
- Memaksa pengguna update versi app: set `force_update_enabled=true` dan `force_update_version` ke versi minimum yang diwajibkan.
- Mengatur reward watch-lite: ubah `watch_lite_coin_per_minute` sesuai jumlah lite coin yang ingin diberikan per menit tontonan.
- Menonaktifkan fitur nobar sementara: set `feature_nobar_enabled=false` dan isi `feature_nobar_message` dengan alasan.
- Membatasi download batch untuk non-VIP: set `feature_download_batch_enabled=false` dan isi pesan sesuai kebijakan.
