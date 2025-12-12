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
- Controller: `src/controllers/adminUsers.controller.js` (`listUsersAdmin`, `updateUserAdmin`, `deleteUserAdmin`, `getUserRegistrationStatsAdmin`, `listOnlineUsersAdmin`)
- Routes: `src/routes/admin.routes.js` (`/admin/users`, `/admin/users/:id`, `/admin/users/stats/registrations`, `/admin/users/online`)

## Status Akun (Account Status)
- Nilai yang didukung:
  - `ACTIVE`: akun aktif normal.
  - `SUSPENDED`: akun ditangguhkan sementara (akses tertentu bisa dibatasi di FE/BE bila diimplementasikan).
  - `WARNED`: akun diberi peringatan keras (untuk keperluan moderasi).
  - `BANNED`: akun diblokir permanen (kebijakan implementasi bergantung layanan lain di BE/FE).
- Field skema:
  - `User.account_status` (enum), default `ACTIVE`.
  - `User.account_status_reason` (String?, opsional) untuk menyimpan alasan singkat; disarankan maksimal 500 karakter.
