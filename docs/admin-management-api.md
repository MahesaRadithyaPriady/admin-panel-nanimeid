# Admin Management API

Kelola akun admin. Endpoint berada di bawah path `/admin`. Sebagian besar aksi manajemen admin dibatasi untuk role SUPERADMIN.

- Base URL: `/admin`
- Auth: `Authorization: Bearer <ADMIN_JWT>`
- Proteksi:
  - Semua endpoint (kecuali login & bootstrap) memerlukan `authenticateAdmin`.
  - Manajemen admin (list/detail/buat/update/hapus) memerlukan `authorizeAdminRoles("SUPERADMIN")`.

## Auth

### Login Admin
- Method: POST
- Path: `/auth/login`
- Body:
```json
{ "username": "admin1", "password": "secret" }
```
- Response 200:
```json
{ "message": "Login admin success", "token": "<JWT>", "admin": { "id": 1, "username": "admin1", "email": null, "role": "UPLOADER", "createdAt": "..." } }
```

### Bootstrap SUPERADMIN (sekali saat belum ada admin)
- Method: POST
- Path: `/auth/bootstrap-superadmin`
- Body:
```json
{ "username": "superadmin", "email": "super@domain.com", "password": "StrongP@ssw0rd" }
```
- Response 201: `{"message":"SUPERADMIN created", "admin": { ... }}`

### Get Profil Admin (me)
- Method: GET
- Path: `/me`
- Header: `Authorization: Bearer <ADMIN_JWT>`
- Response 200: detail admin yang sedang login

### Ganti Password Sendiri
- Method: POST
- Path: `/change-password`
- Body:
```json
{ "oldPassword": "old", "newPassword": "newStrongP@ss" }
```
- Response 200: `{ "message": "Password updated" }`

## Manajemen Admin (SUPERADMIN only)

### List Admins
- Method: GET
- Path: `/`
- Query (opsional): `page`, `limit`, `q`
- Response 200: daftar admin + pagination

### Detail Admin
- Method: GET
- Path: `/:id`
- Response 200: detail admin
- Error 404 jika tidak ditemukan

### Buat Admin
- Method: POST
- Path: `/`
- Body:
```json
{ "username": "admin2", "email": "admin2@domain.com", "password": "StrongP@ssw0rd", "role": "UPLOADER" }
```
- Response 201: `{ "message": "Admin created", "admin": { ... } }`
- Error 409 jika username/email sudah ada

### Update Admin
- Method: PUT
- Path: `/:id`
- Body (opsional): `username`, `email`, `password`, `role`
- Response 200: `{ "message": "Admin updated", "admin": { ... } }`

### Hapus Admin
- Method: DELETE
- Path: `/:id`
- Response 200: `{ "message": "Admin deleted" }`

## Catatan Keamanan
- Simpan token JWT secara aman.
- Gunakan HTTPS di lingkungan produksi.
- Role SUPERADMIN memiliki hak penuh atas manajemen admin.

## Lokasi Kode
- Routes: `src/routes/admin.routes.js`
- Controller: `src/controllers/admin.controller.js`
- Service (hashing, query, dll): `src/services/admin.service.js`
