# Redeem API

Dokumentasi untuk fitur kode redeem yang dapat memberikan hadiah berupa koin (wallet), VIP (perpanjang masa aktif), badge, voucher diskon, atau avatar border. Termasuk endpoint User dan Admin, contoh request/response, serta catatan skema Prisma dan migrasi.

## Ringkasan Fitur
- Memberikan reward lewat kode: COIN, VIP, BADGE, VOUCHER, BORDER (avatar border).
- Validasi masa berlaku (start/end), status aktif, kuota global, dan limit per user.
- Pencatatan riwayat redeem per user (`RedeemHistory`).
- Untuk COIN, koin masuk ke `UserWallet` dan audit di `CoinTransaction`.
- Untuk VIP, memperpanjang `UserVIP.end_at` (stacking) dan mengaktifkan status.
- Untuk BADGE, memberikan entri `UserBadge` (tidak otomatis aktif).

## Prisma Models (Ringkas)
File: `prisma/schema.prisma`

```prisma
enum RedeemType {
  COIN
  VIP
  BADGE
  VOUCHER
  BORDER // Avatar border (AvatarBorder)
}

model RedeemCode {
  id            Int        @id @default(autoincrement())
  code          String     @unique
  type          RedeemType
  coins_amount  Int?
  vip_days      Int?
  vip_level     String?
  badge_name    String?
  badge_icon    String?
  title_color   String?
  border_id     Int?       // optional: AvatarBorder.id jika type = BORDER
  voucher_discount_percent Int?
  voucher_discount_amount  Int?
  voucher_valid_days       Int?
  is_active     Boolean    @default(true)
  max_uses      Int?
  used_count    Int        @default(0)
  per_user_limit Int?
  starts_at     DateTime?
  expires_at    DateTime?
  metadata      Json?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  histories RedeemHistory[]
}

model RedeemHistory {
  id                 Int        @id @default(autoincrement())
  user_id            Int
  code_id            Int
  granted_type       RedeemType
  granted_coins      Int?
  granted_vip_days   Int?
  granted_badge_name String?
  granted_voucher_code String?
  granted_border_id  Int?
  createdAt          DateTime   @default(now())

  user  User       @relation(fields: [user_id], references: [id], onDelete: Cascade)
  code  RedeemCode @relation(fields: [code_id], references: [id], onDelete: Cascade)
}

model UserBadge {
  id           Int      @id @default(autoincrement())
  user_id      Int
  badge_name   String
  badge_icon   String?
  title_color  String?
  is_active    Boolean  @default(false)
  obtained_at  DateTime @default(now())

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, badge_name], name: "user_id_badge_name")
}
```

Catatan: jika Anda menambahkan field relasi pada `User` seperti `redeem_histories RedeemHistory[]`, pastikan tidak menabrak nama relasi otomatis. Anda dapat menghapus anotasi `@relation(...)` di sisi `User` atau menyamakan nama relasinya.

## Migrasi
Jalankan perintah berikut setelah mengubah schema:

```bash
npx prisma validate
npx prisma migrate dev --name add_redeem_codes
npx prisma generate
```

## Service Utama
File: `src/services/redeem.service.js`
- `applyCode({ userId, code })`: validasi dan menerapkan hadiah + catat riwayat.
- `listMyHistory({ userId, page, limit })`: paginasi riwayat redeem user.
- Admin helpers: `createCode`, `updateCode`, `listCodes`, `getCodeById`, `deleteCode`.

## Endpoint User
Base path: `/${VERSION}/redeem` (butuh Authorization Bearer)

- POST `/apply`
  - Body:
    ```json
    {
      "code": "STRING"
    }
    ```
  - Response success:
    ```json
    {
      "success": true,
      "data": {
        "code": "WELCOMEVIP",
        "type": "VIP",
        "coins": null,
        "vipDays": 7,
        "badgeName": null,
        "voucherCode": null,
        "borderId": null
      }
    }
    ```
  - Response error (contoh):
    ```json
    { "success": false, "error": "Kode sudah kedaluwarsa" }
    ```

- GET `/history`
  - Query: `page`, `limit`
  - Response:
    ```json
    {
      "success": true,
      "items": [
        {
          "id": 1,
          "code": "COIN100",
          "type": "COIN",
          "grantedCoins": 100,
          "grantedVipDays": null,
          "grantedBadgeName": null,
          "grantedVoucherCode": null,
          "grantedBorderId": null,
          "createdAt": "2025-09-17T14:00:00.000Z"
        }
      ],
      "page": 1,
      "limit": 20,
      "total": 1
    }
    ```

## Endpoint Admin
Base path: `/${VERSION}/admin` (SUPERADMIN)

- GET `/redeem-codes`
  - Query: `q`, `page`, `limit`
  - Response: daftar codes dengan paginasi.

- POST `/redeem-codes`
  - Body (contoh COIN):
    ```json
    {
      "code": "COIN100",
      "type": "COIN",
      "coins_amount": 100,
      "is_active": true,
      "max_uses": 1000,
      "per_user_limit": 1,
      "starts_at": "2025-01-01T00:00:00.000Z",
      "expires_at": "2026-01-01T00:00:00.000Z"
    }
    ```
  - Body (contoh VIP):
    ```json
    {
      "code": "WELCOMEVIP",
      "type": "VIP",
      "vip_days": 7,
      "vip_level": "Gold",
      "is_active": true
    }
    ```
  - Body (contoh BADGE):
    ```json
    {
      "code": "SUPPORTER2025",
      "type": "BADGE",
      "badge_name": "Supporter",
      "badge_icon": "https://cdn.example.com/badges/supporter.png",
      "title_color": "#FF8800",
      "is_active": true
    }
    ```
  - Body (contoh BORDER / Avatar Border):
    ```json
    {
      "code": "BORDER_XMAS_2025",
      "type": "BORDER",
      "border_id": 10,
      "is_active": true,
      "max_uses": 1000,
      "per_user_limit": 1,
      "starts_at": "2025-12-20T00:00:00.000Z",
      "expires_at": "2026-01-10T00:00:00.000Z"
    }
    ```

- GET `/redeem-codes/:id`
- PUT `/redeem-codes/:id`
- DELETE `/redeem-codes/:id`

Semua endpoint Admin diproteksi dengan `authenticateAdmin` dan `authorizeAdminRoles("SUPERADMIN")` sesuai `src/routes/admin.routes.js`.

## Endpoint SUPERADMIN (via redeem router)
Base path: `/${VERSION}/redeem` (SUPERADMIN)

- GET `/codes`
  - Deskripsi: Ambil daftar kode redeem (sama seperti `GET /admin/redeem-codes`).
  - Query: `q`, `page`, `limit`
  - Auth: `authenticateAdmin` + `authorizeAdminRoles("SUPERADMIN")`

- POST `/codes`
  - Deskripsi: Membuat kode redeem baru.
  - Auth: `authenticateAdmin` + `authorizeAdminRoles("SUPERADMIN")`
  - Body: sama seperti `POST /admin/redeem-codes` (lihat contoh COIN/VIP/BADGE di atas)

- DELETE `/codes/:id`
  - Deskripsi: Hapus kode redeem by id.
  - Auth: `authenticateAdmin` + `authorizeAdminRoles("SUPERADMIN")`

## Alur Validasi dan Pemberian Reward
1. Cek keberadaan kode, status aktif, rentang tanggal, kuota global, dan limit per user.
2. Transaksi database:
   - Increment `used_count` (jika ada `max_uses`).
   - Tipe COIN: buat/update `UserWallet`, tambah saldo, insert `CoinTransaction`.
   - Tipe VIP: extend `UserVIP.end_at` dari `max(now, end_at)`, set `status = ACTIVE`, apply `vip_level` jika diberikan.
   - Tipe BADGE: `upsert` `UserBadge` via unique `user_id_badge_name` (tidak auto-activate).
   - Tipe BORDER: buat atau gunakan entri `UserAvatarBorder` untuk `border_id` terkait (hadiah, tidak memotong koin, tidak auto-activate).
   - Tipe VOUCHER: generate satu `Voucher` baru per user-redeem dengan masa berlaku `voucher_valid_days`.
   - Insert `RedeemHistory`.

## Error Umum
- 400: `Kode tidak ditemukan`, `Kode tidak aktif`, `Kode sudah kedaluwarsa`, `Kuota kode sudah habis`, `Batas penggunaan per pengguna telah tercapai`, `Konfigurasi kode COIN/VIP/BADGE/BORDER/VOUCHER tidak valid`.
- 401: `unauthorized` jika token tidak valid.

## Catatan Integrasi
- Middleware auth: `src/middlewares/auth.js` diperlukan untuk user endpoints.
- Route mounting: lihat `src/app.js` untuk prefix `/${VERSION}/redeem`.
- Pastikan environment `DATABASE_URL` sudah benar sebelum migrate.

## Contoh Coba Cepat
1. Buat satu code via Admin (contoh VIP 7 hari).
2. Panggil `POST /v1/redeem/apply` dengan body `{ "code": "WELCOMEVIP" }` dan Bearer token.
3. Cek `GET /v1/redeem/history` untuk melihat riwayat redeem.
4. Untuk badge, aktifkan badge via endpoint Store badge activate bila dibutuhkan.
