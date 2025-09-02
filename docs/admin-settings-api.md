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
  "force_update_version": "2.5.0"
}
```

Aturan validasi:
- `maintenance_enabled`, `downloads_enabled`, `force_update_enabled`: boolean (menerima `true`/`false` literal atau string "true"/"false").
- `maintenance_message`, `force_update_version`: string atau `null`.
- `paid_qualities`: array string atau string koma, contoh: `"720p,1080p"`.

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
