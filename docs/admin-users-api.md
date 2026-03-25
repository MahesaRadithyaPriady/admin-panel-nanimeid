# Admin Users API

Kelola data users oleh admin. Semua endpoint di bawah path `\u002Fadmin` dan dilindungi `authenticateAdmin` (wajib Admin JWT).

- Base URL: `/admin`
- Auth: `Authorization: Bearer <ADMIN_JWT>`

## Daftar Users
- Method: GET
- Path: `/users`
- Query params:
  - `page` (number, default 1)
  - `limit` (number, default 20)
  - `q` (string, opsional; cari `username` atau `email`, case-insensitive)
- Response 200:
```json
{
  "page": 1,
  "limit": 20,
  "total": 123,
  "items": [
    {
      "id": 10,
      "userID": "USR-00010",
      "username": "john",
      "email": "john@example.com",
      "account_status": "ACTIVE",
      "account_status_reason": null,
      "createdAt": "2025-08-31T11:00:00.000Z",
      "profile": { "full_name": "John Doe", "avatar_url": "https://..." },
      "vip": { "status": true, "vip_level": 2, "end_at": "2025-12-31T00:00:00.000Z" }
    }
  ]
}
```
- Contoh curl:
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://api.example.com/admin/users?page=1&limit=20&q=john"
```

---

## Daftar Collection Points Semua User

Mengambil ringkasan `total_poin_collection` per user beserta breakdown (avatar borders, super badges, stickers).

- Method: GET
- Path: `/users/collection-points`
- Query params:
  - `page` (number, default 1)
  - `limit` (number, default 20)
  - `q` (string, opsional; cari `username` atau `email`, case-insensitive)

Response 200:
```json
{
  "status": 200,
  "message": "OK",
  "page": 1,
  "limit": 20,
  "total": 123,
  "items": [
    {
      "user": {
        "id": 10,
        "userID": "USR-00010",
        "username": "john",
        "email": "john@example.com",
        "createdAt": "2025-08-31T11:00:00.000Z"
      },
      "profile": {
        "id": 99,
        "user_id": 10,
        "full_name": "John Doe",
        "avatar_url": "https://...",
        "banner_url": null,
        "bio": null,
        "birthdate": null,
        "gender": null,
        "is_online": false,
        "createdAt": "2025-08-31T11:00:00.000Z",
        "updatedAt": "2025-08-31T11:00:00.000Z"
      },
      "total_poin_collection": 650,
      "breakdown": {
        "avatar_borders": { "count": 1, "points": 100 },
        "super_badges": { "count": 1, "points": 500 },
        "stickers": { "count": 1, "points": 50 }
      }
    }
  ]
}
```

Contoh curl:
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://api.example.com/admin/users/collection-points?page=1&limit=20&q=john"
```

## Edit User (Update)
- Method: PUT
- Path: `/users/:id`
- Body JSON (salah satu atau beberapa):
  - `username` (string)
  - `email` (string)
  - `account_status` (string; salah satu dari: `ACTIVE`, `SUSPENDED`, `WARNED`, `BANNED`)
  - `account_status_reason` (string; opsional, alasan moderasi. Maks 500 karakter)
- Response 200:
```json
{
  "message": "User updated",
  "item": {
    "id": 10,
    "userID": "USR-00010",
    "username": "johnny",
    "email": "johnny@example.com",
    "account_status": "SUSPENDED",
    "account_status_reason": "Spam content posting",
    "updatedAt": "2025-08-31T12:00:00.000Z"
  }
}
```
- Error:
  - 400 `BAD_REQUEST` jika `id` tidak valid atau tidak ada field untuk diupdate
  - 400 `BAD_REQUEST` jika `account_status` bukan salah satu dari `ACTIVE|SUSPENDED|WARNED|BANNED`
  - 404 `NOT_FOUND` jika user tidak ditemukan
- Contoh curl:
```bash
curl -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"username":"johnny","email":"johnny@example.com"}' \
  "https://api.example.com/admin/users/10"
```

## Moderasi User (Warn / Suspend / Ban / Unban)
- Method: PUT
- Path: `/users/:id/moderation`
- Tujuan: endpoint khusus moderasi user, termasuk **jenis ban** dan opsi **sekalian ban IP atau tidak**.
- Resolusi IP otomatis:
  - jika `ban_ip=true`, backend akan otomatis mengambil **IP terakhir user** dari tabel `UserDevice` berdasarkan `user_id`
  - admin **tidak perlu** mengirim field `ip` di body request
  - jika user belum punya IP yang tersimpan pada `UserDevice`, request akan ditolak dengan `400 BAD_REQUEST`
  - jika `action="UNBAN"`, backend juga akan mencoba mengambil **IP terakhir user** dari `UserDevice` untuk menghapus record terkait di tabel `BannedIp`
- Body JSON:
  - `action` (string, wajib): `WARN` | `SUSPEND` | `BAN` | `UNBAN`
  - `reason` (string, opsional, maks 500 karakter)
  - `ban_type` (string, opsional): `TEMPORARY` | `PERMANENT`
    - dipakai terutama saat `action="BAN"`
    - default untuk `BAN` adalah `PERMANENT`
    - untuk `SUSPEND`, sistem menganggapnya `TEMPORARY`
  - `suspended_until` (datetime ISO, opsional)
    - dipakai saat `action="SUSPEND"`
    - default: 30 hari dari sekarang jika tidak dikirim
  - `banned_until` (datetime ISO, opsional)
    - dipakai saat `action="BAN"` + `ban_type="TEMPORARY"`
    - default: 365 hari dari sekarang jika tidak dikirim
  - `ban_ip` (boolean, opsional)
    - `true` untuk membuat / memperbarui ban IP pada tabel `BannedIp`
    - `false` atau tidak dikirim untuk hanya moderasi akun user tanpa ban IP
  - `ip_reason` (string, opsional, maks 500 karakter)
  - `ip_banned_until` (datetime ISO, opsional)
    - jika `action="SUSPEND"`, default mengikuti `suspended_until`
    - jika `action="BAN"` dan `ban_type="TEMPORARY"`, default mengikuti `banned_until`
    - jika `action="BAN"` dan `ban_type="PERMANENT"`, IP ban akan permanen (`banned_until=null`)

Contoh request ban permanen + ban IP:
```bash
curl -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "action": "BAN",
    "reason": "Pelanggaran berat berulang",
    "ban_type": "PERMANENT",
    "ban_ip": true,
    "ip_reason": "Pelanggaran berat berulang"
  }' \
  "https://api.example.com/admin/users/10/moderation"
```

Contoh request unban user:
```bash
curl -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "action": "UNBAN",
    "reason": "Masa ban selesai"
  }' \
  "https://api.example.com/admin/users/10/moderation"
```

Contoh request suspend sementara tanpa ban IP:
```bash
curl -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "action": "SUSPEND",
    "reason": "Spam komentar",
    "suspended_until": "2026-04-30T17:00:00.000Z",
    "ban_ip": false
  }' \
  "https://api.example.com/admin/users/10/moderation"
```

- Response 200:
```json
{
  "message": "User moderation updated",
  "item": {
    "id": 10,
    "userID": "USR-00010",
    "username": "johnny",
    "email": "johnny@example.com",
    "account_status": "BANNED",
    "account_status_reason": "Pelanggaran berat berulang",
    "createdAt": "2025-08-31T11:00:00.000Z",
    "moderation_action": "BAN",
    "ban_type": "PERMANENT",
    "moderation": {
      "warned_notice_date": null,
      "suspended_until": null,
      "banned_until": null,
      "banned_is_permanent": true,
      "createdAt": "2026-03-23T10:00:00.000Z",
      "updatedAt": "2026-03-23T10:00:00.000Z"
    },
    "ip_ban": {
      "id": 5,
      "ip": "103.12.34.56",
      "reason": "Pelanggaran berat berulang",
      "banned_until": null,
      "is_permanent": true,
      "createdAt": "2026-03-23T10:00:00.000Z",
      "updatedAt": "2026-03-23T10:00:00.000Z"
    }
  }
}
```

- Error:
  - 400 `BAD_REQUEST` jika `action` tidak valid
  - 400 `BAD_REQUEST` jika `ban_type` bukan `TEMPORARY|PERMANENT`
  - 400 `BAD_REQUEST` jika `ban_ip=true` tetapi IP user tidak ditemukan dari `UserDevice`
  - 400 `BAD_REQUEST` jika `suspended_until`, `banned_until`, atau `ip_banned_until` tidak valid
  - 404 `NOT_FOUND` jika user tidak ditemukan

Catatan:
- Endpoint ini **tidak menggantikan** endpoint `PUT /users/:id`, tetapi dikhususkan untuk moderasi akun.
- Saat `action="UNBAN"`, backend akan mengubah status user menjadi `ACTIVE` dan **menghapus ban IP** yang cocok di tabel `BannedIp` berdasarkan IP terakhir yang tersimpan di `UserDevice` jika tersedia.
- Jika ingin menghapus / mengubah ban IP secara terpisah, tetap bisa memakai endpoint admin moderation IP ban di `admin-moderation-api.md`.

## Hapus User (Delete)
- Method: DELETE
- Path: `/users/:id`
- Response 200:
```json
{ "message": "User deleted" }
```
- Error:
  - 400 `BAD_REQUEST` jika `id` tidak valid
  - 404 `NOT_FOUND` jika user tidak ditemukan
- Contoh curl:
```bash
curl -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://api.example.com/admin/users/10"
```

## Statistik Registrasi User
- Method: GET
- Path: `/users/stats/registrations`
- Deskripsi: Mengembalikan jumlah user yang terdaftar pada beberapa rentang waktu:
  - `today` (hari ini, sejak awal hari ini)
  - `yesterday` (kemarin, dari awal hari kemarin sampai sebelum awal hari ini)
  - `thisMonth` (sejak awal bulan ini)
  - `lastMonth` (bulan lalu, dari awal bulan lalu sampai sebelum awal bulan ini)
  - `thisYear` (sejak awal tahun ini)
  - `lastYear` (tahun lalu, dari awal tahun lalu sampai sebelum awal tahun ini)
- Response 200:
```json
{
  "today": 5,
  "yesterday": 12,
  "thisMonth": 120,
  "lastMonth": 340,
  "thisYear": 1500,
  "lastYear": 4200
}
```
- Contoh curl:
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://api.example.com/admin/users/stats/registrations"
```

## Daftar User Online Sekarang
- Method: GET
- Path: `/users/online`
- Deskripsi: Mengembalikan daftar user yang saat ini berstatus online (`UserProfile.is_online = true`). Cocok untuk tampilan Overview atau monitoring.
- Query params:
  - `page` (number, default 1)
  - `limit` (number, default 20)
- Response 200:
```json
{
  "page": 1,
  "limit": 20,
  "total": 3,
  "items": [
    {
      "id": 10,
      "userID": "USR-00010",
      "username": "john",
      "email": "john@example.com",
      "createdAt": "2025-08-31T11:00:00.000Z",
      "profile": {
        "full_name": "John Doe",
        "avatar_url": "/v1/static/avatars/u10.png",
        "is_online": true
      }
    }
  ]
}
```
- Contoh curl:
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://api.example.com/admin/users/online?page=1&limit=20"
```

## Keamanan
- Semua endpoint mewajibkan header `Authorization: Bearer <ADMIN_JWT>`.
- Saat ini akses dibuka untuk semua admin terautentikasi. Jika ingin khusus SUPERADMIN, tambahkan middleware `authorizeAdminRoles("SUPERADMIN")` pada route di `src/routes/admin.routes.js`.

## Lokasi Kode Terkait
- Controller: `src/controllers/adminUsers.controller.js` (`listUsersAdmin`, `updateUserAdmin`, `moderateUserAdmin`, `deleteUserAdmin`, `createUserAdmin`, `getUserRegistrationStatsAdmin`, `listOnlineUsersAdmin`)
- Routes: `src/routes/admin.routes.js` (`/admin/users`, `/admin/users/:id`, `/admin/users/:id/moderation`, `/admin/users/stats/registrations`, `/admin/users/online`)

## Status Akun (Account Status)
- Nilai yang didukung:
  - `ACTIVE`: akun aktif normal.
  - `SUSPENDED`: akun ditangguhkan sementara (akses tertentu bisa dibatasi di FE/BE bila diimplementasikan).
  - `WARNED`: akun diberi peringatan keras (untuk keperluan moderasi).
  - `BANNED`: akun diblokir permanen (kebijakan implementasi bergantung layanan lain di BE/FE).
- Field skema:
  - `User.account_status` (enum), default `ACTIVE`.
  - `User.account_status_reason` (String?, opsional) untuk menyimpan alasan singkat; disarankan maksimal 500 karakter.
