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
{ "username": "admin1", "password": "secret", "device_id": "admin-web-1" }
```
- Response 200:
```json
{ "message": "Login admin success", "token": "<JWT>", "admin": { "id": 1, "username": "admin1", "email": null, "role": "UPLOADER", "createdAt": "..." } }
```

Catatan:
- `device_id` **wajib** dan akan ikut tersimpan di payload JWT admin (untuk kebutuhan fitur seperti Live Chat E2E dan registrasi public key per-device).

Contoh `device_id`:
- `admin-web-3fgs6p`
- `admin-android-<random>`

Aturan:
- Satu admin bisa punya banyak `device_id`.
- Public key E2E didaftarkan **per** `device_id`.

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

### Lihat Daftar Permission Admin
- Method: GET
- Path: `/permissions`
- Header: `Authorization: Bearer <ADMIN_JWT>`
- Deskripsi: Mengembalikan daftar permission admin yang tersedia di sistem untuk kebutuhan menu, assignment permission, atau validasi frontend.
- Response 200:
```json
{
  "permissions": [
    {
      "key": "overview",
      "label": "Overview",
      "description": "Dashboard overview access"
    },
    {
      "key": "kelola-user",
      "label": "Kelola User",
      "description": "User management access"
    },
    {
      "key": "kelola-admin",
      "label": "Kelola Admin",
      "description": "Admin management access"
    },
    {
      "key": "moderation",
      "label": "Moderation",
      "description": "moderation access"
    },
    {
      "key": "keuangan",
      "label": "Keuangan",
      "description": "Financial dashboard access"
    },
    {
      "key": "topup-manual",
      "label": "Topup Manual",
      "description": "Manual topup approval access"
    },
    {
      "key": "store-admin",
      "label": "Store Admin",
      "description": "Store management access"
    },
    {
      "key": "prime-store",
      "label": "Prime Store",
      "description": "Prime store management access"
    },
    {
      "key": "sponsor-admin",
      "label": "Sponsor Admin",
      "description": "Sponsor management access"
    },
    {
      "key": "vip-plans",
      "label": "VIP Plans",
      "description": "VIP plan management access"
    },
    {
      "key": "vip-tiers",
      "label": "VIP Tiers",
      "description": "VIP tier (Bronze/Silver/Gold) management access"
    },
    {
      "key": "vip-feature-requirements",
      "label": "VIP Feature Requirements",
      "description": "VIP feature requirement (minimum tier per feature) management access"
    },
    {
      "key": "admin-vip",
      "label": "Admin VIP",
      "description": "VIP user management access"
    },
    {
      "key": "admin-wallet",
      "label": "Admin Wallet",
      "description": "Wallet management access"
    },
    {
      "key": "redeem-codes",
      "label": "Kode Redeem",
      "description": "Redeem code management access"
    },
    {
      "key": "avatar-borders",
      "label": "Avatar Borders",
      "description": "Avatar border management access"
    },
    {
      "key": "badges",
      "label": "Badges",
      "description": "Badge management access"
    },
    {
      "key": "stickers",
      "label": "Stickers",
      "description": "Sticker management access"
    },
    {
      "key": "daftar-konten",
      "label": "Daftar Konten",
      "description": "Content management access"
    },
    {
      "key": "manga-admin",
      "label": "Manga Admin",
      "description": "Manga/episode management access"
    },
    {
      "key": "list-grab",
      "label": "List Grab",
      "description": "Manga grab list and grab job access"
    },
    {
      "key": "episode-video-issues",
      "label": "Episode Video Issues",
      "description": "Episode video issue reasons and reports management access"
    },
    {
      "key": "waifu-vote",
      "label": "Waifu Vote",
      "description": "Waifu vote management access"
    },
    {
      "key": "settings",
      "label": "Pengaturan",
      "description": "Settings management access"
    },
    {
      "key": "signin-event-configs",
      "label": "Sign-In Event Configs",
      "description": "Sign-in (daily check-in) event configuration management access"
    },
    {
      "key": "watch-event-configs",
      "label": "Watch Event Configs",
      "description": "Watch event (minutes/episodes thresholds) configuration management access"
    },
    {
      "key": "livechat",
      "label": "Live Chat",
      "description": "Live chat access"
    }
  ]
}
```
- Error:
  - 401 jika token admin tidak dikirim atau tidak valid
  - 500 jika gagal mengambil daftar permission
- Contoh curl:
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://api.example.com/admin/permissions"
```

Catatan:
- Endpoint ini memakai `authenticateAdmin`, jadi cukup login sebagai admin.
- Response menampilkan **permission yang tersedia di sistem**, bukan filter permission milik admin yang sedang login.
- Daftar permission bersumber dari `src/utils/adminPermissions.js` (`MENU_PERMISSIONS`).
- Untuk area konten yang sudah memakai permission menu, key yang dipakai saat ini adalah:
  - `daftar-konten`
  - `manga-admin`
  - `list-grab`

### Register / Update Public Key (E2E)
- Method: POST
- Path: `/me/public-keys`
- Body:
```json
{ "device_id": "admin-web-1", "alg": "x25519", "public_key": "<base64_or_pem>" }
```
- Response 200:
```json
{ "message": "OK", "data": { "id": 1, "admin_id": 1, "device_id": "admin-web-1", "alg": "x25519", "public_key": "..." } }
```

Catatan:
- `device_id` pada body bersifat opsional. Jika tidak dikirim, backend memakai `device_id` dari **Admin JWT**.
- Endpoint ini wajib dipanggil minimal 1x untuk setiap device sebelum memakai fitur yang butuh public key (contoh: Live Chat join).

### List My Public Keys
- Method: GET
- Path: `/me/public-keys`
- Response 200:
```json
{ "message": "OK", "items": [ { "id": 1, "device_id": "admin-web-1", "alg": "x25519", "public_key": "..." } ] }
```

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
- Controller: `src/controllers/admin.controller.js`, `src/controllers/adminPermissions.controller.js`
- Service (hashing, query, dll): `src/services/admin.service.js`
- Permission config: `src/utils/adminPermissions.js`
