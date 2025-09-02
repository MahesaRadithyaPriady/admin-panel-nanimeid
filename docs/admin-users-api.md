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
- Body JSON (salah satu atau keduanya):
  - `username` (string)
  - `email` (string)
- Response 200:
```json
{
  "message": "User updated",
  "item": {
    "id": 10,
    "userID": "USR-00010",
    "username": "johnny",
    "email": "johnny@example.com",
    "updatedAt": "2025-08-31T12:00:00.000Z"
  }
}
```
- Error:
  - 400 `BAD_REQUEST` jika `id` tidak valid atau tidak ada field untuk diupdate
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

## Keamanan
- Semua endpoint mewajibkan header `Authorization: Bearer <ADMIN_JWT>`.
- Saat ini akses dibuka untuk semua admin terautentikasi. Jika ingin khusus SUPERADMIN, tambahkan middleware `authorizeAdminRoles("SUPERADMIN")` pada route di `src/routes/admin.routes.js`.

## Lokasi Kode Terkait
- Controller: `src/controllers/adminUsers.controller.js` (`listUsersAdmin`, `updateUserAdmin`, `deleteUserAdmin`)
- Routes: `src/routes/admin.routes.js` (`/admin/users`, `/admin/users/:id`)
