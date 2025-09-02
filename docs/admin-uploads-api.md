# Admin Uploads API

Riwayat upload (anime/episode) dan statistik per admin. Semua endpoint dilindungi JWT admin dan role SUPERADMIN/UPLOADER.

- Auth: `authenticateAdmin`
- Role: `authorizeAdminRoles("SUPERADMIN", "UPLOADER")`
- Sumber kode:
  - Routes: `src/routes/admin.routes.js`
  - Controller: `src/controllers/adminUpload.controller.js`
  - Schema: `prisma/schema.prisma` (model `UploadHistory`, enum `UploadTargetType`, `UploadStatus`)

Catatan:
- Pembuatan Anime/Episode otomatis akan menambahkan entri `UploadHistory` dengan status `PENDING` untuk admin yang melakukan aksi. Ini tidak mengubah visibility konten.
- Respons Uploads API menyertakan field `target` (preview target anime/episode) agar mudah di-render di UI.

---

## Buat Riwayat Upload

POST /admin/uploads

Headers:
- Content-Type: application/json

Body:
```json
{
  "target_type": "ANIME", // atau "EPISODE"
  "target_id": 123,
  "size_bytes": 104857600, // opsional
  "note": "Upload episode 1", // opsional
  "status": "PENDING" // opsional: PENDING | APPROVED | REJECTED (default PENDING)
}
```

Response 201:
```json
{
  "message": "Upload history created",
  "item": {
    "id": 1,
    "admin_id": 5,
    "target_type": "EPISODE",
    "target_id": 123,
    "status": "PENDING",
    "size_bytes": 104857600,
    "note": "Upload episode 1",
    "createdAt": "2025-08-31T12:00:00.000Z",
    "target": {
      "id": 123,
      "judul_episode": "Episode 1",
      "nomor_episode": 1,
      "anime": { "id": 9, "nama_anime": "Sample Anime" }
    }
  }
}
```

Error:
- 400 BAD_REQUEST: validasi gagal
- 401 UNAUTHORIZED, 403 FORBIDDEN
- 500 ERROR

---

## List Riwayat Upload (milik admin yang login)

GET /admin/uploads?page=1&limit=20&status=PENDING&target_type=EPISODE

Query params:
- page: number (default 1)
- limit: number (default 20, max 100)
- status: PENDING | APPROVED | REJECTED (opsional)
- target_type: ANIME | EPISODE (opsional)

Response 200:
```json
{
  "message": "OK",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "items": [
    {
      "id": 1,
      "admin_id": 5,
      "target_type": "EPISODE",
      "target_id": 123,
      "status": "PENDING",
      "size_bytes": 104857600,
      "note": "Upload episode 1",
      "createdAt": "2025-08-31T12:00:00.000Z",
      "target": {
        "id": 123,
        "judul_episode": "Episode 1",
        "nomor_episode": 1,
        "anime": { "id": 9, "nama_anime": "Sample Anime" }
      }
    }
  ]
}
```

Error:
- 401 UNAUTHORIZED, 403 FORBIDDEN
- 500 ERROR

---

## Update Status Riwayat Upload

PUT /admin/uploads/:id/status

Body:
```json
{ "status": "APPROVED" }
```

Catatan:
- SUPERADMIN: dapat update status record manapun.
- UPLOADER: hanya dapat update record miliknya sendiri.

Response 200:
```json
{
  "message": "Status updated",
  "item": {
    "id": 1,
    "status": "APPROVED",
    "target_type": "EPISODE",
    "target_id": 123,
    "target": {
      "id": 123,
      "judul_episode": "Episode 1",
      "nomor_episode": 1,
      "anime": { "id": 9, "nama_anime": "Sample Anime" }
    }
  }
}
```

Error:
- 400 BAD_REQUEST: id bukan angka / status invalid
- 401 UNAUTHORIZED, 403 FORBIDDEN
- 404 NOT_FOUND: record tidak ditemukan atau bukan milik Anda
- 500 ERROR

---

## Statistik Upload (admin yang login)

GET /admin/uploads/stats/me

Response 200:
```json
{
  "message": "OK",
  "stats": {
    "total_upload": 15,
    "pending": 2,
    "approved": 12,
    "rejected": 1,
    "storage": {
      "total_bytes": 500000000000,
      "used_bytes": 320000000000,
      "free_bytes": 180000000000,
      "total_human": "465.66 GB",
      "used_human": "298.02 GB",
      "free_human": "167.94 GB",
      "path": "C:/"
    }
  }
}
```

Catatan Storage:
- Menggunakan paket opsional `check-disk-space`. Jika paket tidak terpasang atau gagal, `storage` akan `null`.
- Anda dapat mengatur env `STATS_DISK_PATH` untuk menentukan drive/folder yang dicek.

---

## Integrasi Otomatis
- Sistem secara otomatis membuat entri `UploadHistory` berstatus `PENDING` saat berhasil membuat Anime/Episode (melalui `createAnimeAdmin` dan `createEpisodeAdmin`).
- Entri otomatis ini tidak mengubah visibility konten.
- Anda tetap dapat membuat/menyesuaikan entri upload secara manual via endpoint Uploads jika diperlukan.
- Sertakan `size_bytes` jika Anda memiliki ukuran file aktual saat upload.
