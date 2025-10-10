# Admin Wallet API

Dokumentasi endpoint SUPERADMIN untuk mengelola koin user (kredit dan debit).

Prefix versi mengikuti konfigurasi aplikasi (contoh: `/1.0.10`). Endpoint ini berada di bawah prefix admin yang sudah di-mount di `app.js`:

- `app.use(`${API_PREFIX}/admin`, adminRoutes);`

Sehingga path final menjadi: `/<VERSION>/admin/...`

---

## Authorization & Role
- Wajib token admin (`Authorization: Bearer <ADMIN_TOKEN>`)
- Role minimal: `SUPERADMIN`

---

## POST /admin/wallet/credit
Kreditkan koin ke wallet user dan otomatis mencatat riwayat transaksi.

- Method: `POST`
- Auth: Admin token + role SUPERADMIN
- Body JSON:
```json
{
  "userId": 123,
  "amount": 500,
  "note": "opsional, maksimum 80 karakter"
}
```
- Validasi:
  - `userId` wajib, user harus ada
  - `amount` harus integer > 0
- Efek:
  - Menambah saldo koin user melalui `WalletService.earn()`
  - Mencatat riwayat di tabel `coinTransaction` dengan `type = "EARN"` dan `ref` berformat:
    - `ADMIN_CREDIT:<adminId>[:<note_terpotong_80>]`

### Contoh Request
```
POST /1.0.10/admin/wallet/credit
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "userId": 123,
  "amount": 500,
  "note": "bonus event"
}
```

### Contoh Response (200)
```json
{
  "message": "Koin dikreditkan",
  "wallet_balance": 2500,
  "transaction": {
    "id": 4567,
    "user_id": 123,
    "type": "EARN",
    "amount": 500,
    "ref": "ADMIN_CREDIT:1:bonus event",
    "createdAt": "2025-10-08T05:45:00.000Z"
  }
}
```

### Error Umum
- 400 `userId wajib`
- 400 `amount harus integer > 0`
- 404 `User tidak ditemukan`
- 401/403 jika token invalid atau role bukan SUPERADMIN

---

## Catatan Implementasi
- Controller: `src/controllers/adminWallet.controller.js` → `creditUserCoins()`
- Route: `src/routes/admin.routes.js` → `POST /wallet/credit` (guard `authenticateAdmin` + `authorizeAdminRoles("SUPERADMIN")`)
- Riwayat transaksi otomatis dibuat oleh `WalletService.earn()` di `src/services/wallet.service.js`.

---

## POST /admin/wallet/debit
Kurangi koin dari wallet user dan otomatis mencatat riwayat transaksi.

- Method: `POST`
- Auth: Admin token + role SUPERADMIN
- Body JSON:
```json
{
  "userId": 123,
  "amount": 200,
  "note": "opsional, maksimum 80 karakter"
}
```
- Validasi:
  - `userId` wajib, user harus ada
  - `amount` harus integer > 0
- Efek:
  - Mengurangi saldo koin user melalui `WalletService.spend()`
  - Mencatat riwayat di tabel `coinTransaction` dengan `type = "SPEND"` dan `ref` berformat:
    - `ADMIN_DEBIT:<adminId>[:<note_terpotong_80>]`

### Contoh Request
```
POST /1.0.10/admin/wallet/debit
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "userId": 123,
  "amount": 200,
  "note": "penyesuaian saldo"
}
```

### Contoh Response (200)
```json
{
  "message": "Koin dikurangi",
  "wallet_balance": 2300,
  "transaction": {
    "id": 7890,
    "user_id": 123,
    "type": "SPEND",
    "amount": 200,
    "ref": "ADMIN_DEBIT:1:penyesuaian saldo",
    "createdAt": "2025-10-08T05:50:00.000Z"
  }
}
```

### Error Umum
- 400 `userId wajib`
- 400 `amount harus integer > 0`
- 404 `User tidak ditemukan`
- 400 `Saldo koin tidak cukup` (bila saldo user kurang untuk didebit)
- 401/403 jika token invalid atau role bukan SUPERADMIN

---

## Catatan Implementasi
- Controller:
  - `src/controllers/adminWallet.controller.js` → `creditUserCoins()`, `debitUserCoins()`
- Route:
  - `src/routes/admin.routes.js` → `POST /wallet/credit`, `POST /wallet/debit` (guard `authenticateAdmin` + `authorizeAdminRoles("SUPERADMIN")`)
- Riwayat transaksi otomatis dibuat oleh `WalletService.earn()`/`WalletService.spend()` di `src/services/wallet.service.js`.

---

## User-level Wallet Endpoints (with user info)

Semua endpoint di bawah ini mengembalikan objek `user` (id, username, email, `profile.full_name`, `profile.avatar_url`).

### GET /admin/wallet/users/:userId
- Ambil saldo wallet user dan info user.
- Contoh Response:
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "user": {
      "id": 123,
      "username": "john",
      "email": "john@example.com",
      "profile": { "full_name": "John Doe", "avatar_url": "/v1/static/avatars/u123.png" }
    },
    "wallet": { "user_id": 123, "balance_coins": 2500 }
  }
}
```

### GET /admin/wallet/users/:userId/transactions?page=&limit=
- Ambil riwayat transaksi koin user (paginate) beserta info user.
- Contoh Response:
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "user": { "id": 123, "username": "john", "email": "john@example.com", "profile": { "full_name": "John Doe", "avatar_url": "/v1/static/avatars/u123.png" } },
    "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 },
    "items": [
      { "id": 9001, "type": "EARN", "amount": 500, "ref": "ADMIN_CREDIT:1:bonus", "createdAt": "2025-10-08T05:45:00.000Z" },
      { "id": 9002, "type": "SPEND", "amount": 200, "ref": "ADMIN_DEBIT:1:penyesuaian", "createdAt": "2025-10-08T05:50:00.000Z" }
    ]
  }
}
```

### POST /admin/wallet/users/:userId/credit
- Kredit koin ke user tertentu (varian path). Mengembalikan info user + wallet + transaksi terbaru.
- Body:
```json
{ "amount": 500, "note": "bonus event" }
```
- Contoh Response:
```json
{
  "status": 200,
  "message": "Koin dikreditkan",
  "data": {
    "user": { "id": 123, "username": "john", "email": "john@example.com", "profile": { "full_name": "John Doe", "avatar_url": "/v1/static/avatars/u123.png" } },
    "wallet": { "user_id": 123, "balance_coins": 3000 },
    "transaction": { "id": 9010, "user_id": 123, "type": "EARN", "amount": 500, "ref": "ADMIN_CREDIT:1:bonus event" }
  }
}
```

### POST /admin/wallet/users/:userId/debit
- Debit koin dari user tertentu (varian path). Mengembalikan info user + wallet + transaksi terbaru.
- Body:
```json
{ "amount": 200, "note": "penyesuaian saldo" }
```
- Contoh Response:
```json
{
  "status": 200,
  "message": "Koin dikurangi",
  "data": {
    "user": { "id": 123, "username": "john", "email": "john@example.com", "profile": { "full_name": "John Doe", "avatar_url": "/v1/static/avatars/u123.png" } },
    "wallet": { "user_id": 123, "balance_coins": 2800 },
    "transaction": { "id": 9011, "user_id": 123, "type": "SPEND", "amount": 200, "ref": "ADMIN_DEBIT:1:penyesuaian saldo" }
  }
}
```
