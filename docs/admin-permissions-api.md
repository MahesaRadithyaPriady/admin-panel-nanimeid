# Admin Permissions API Documentation

## Overview

Sistem permission-based access control untuk admin panel yang memungkinkan kontrol granular atas menu yang dapat diakses oleh setiap admin.

**Base URL:** `/admin` (tanpa prefix version)

## Menu Permissions List

### 1. Overview
- **Permission:** `overview`
- **Routes:** 
  - `GET /admin/overview` (dashboard stats)
- **Default Roles:** `superadmin`, `keuangan`, `uploader`

### 2. Kelola Dropdown

#### Kelola User
- **Permission:** `kelola-user`
- **Routes:**
  - `POST /admin/users` - Create user
  - `GET /admin/users` - List users
  - `PUT /admin/users/:id` - Update user
  - `DELETE /admin/users/:id` - Delete user
- **Default Roles:** `superadmin`

#### Kelola Admin
- **Permission:** `kelola-admin`
- **Routes:**
  - `GET /admin/` - List admins
  - `GET /admin/:id` - Get admin by ID
  - `POST /admin/` - Create admin
  - `PUT /admin/:id` - Update admin
  - `DELETE /admin/:id` - Delete admin
- **Default Roles:** `superadmin`

### 3. Keuangan Dropdown

#### Keuangan
- **Permission:** `keuangan`
- **Routes:**
  - `GET /admin/keuangan` - Keuangan dashboard
  - `GET /admin/topup-bonus` - List topup bonus
  - `GET /admin/topup-bonus/:id` - Get topup bonus
  - `POST /admin/topup-bonus` - Create topup bonus
  - `PUT /admin/topup-bonus/:id` - Update topup bonus
- **Default Roles:** `superadmin`, `keuangan`

#### Topup Manual
- **Permission:** `topup-manual`
- **Routes:**
  - `GET /admin/topup/requests` - List topup requests
  - `GET /admin/topup/requests/:id` - Get topup request
  - `PATCH /admin/topup/requests/:id/status` - Update topup status
- **Default Roles:** `superadmin`

### 4. Store Dropdown

#### Store Admin
- **Permission:** `store-admin`
- **Routes:** (belum diimplementasi)
- **Default Roles:** `superadmin`

#### Prime Store
- **Permission:** `prime-store`
- **Routes:**
  - `GET /admin/prime-store/items` - List items
  - `GET /admin/prime-store/items/:id` - Get item
  - `POST /admin/prime-store/items` - Create item
  - `PUT /admin/prime-store/items/:id` - Update item
  - `DELETE /admin/prime-store/items/:id` - Delete item
  - `GET /admin/prime-store/daily-discounts` - List discounts
  - `PUT /admin/prime-store/items/:itemId/daily-discount` - Update discount
  - `DELETE /admin/prime-store/daily-discounts/:id` - Delete discount
- **Default Roles:** `superadmin`

#### Sponsor Admin
- **Permission:** `sponsor-admin`
- **Routes:**
  - `GET /admin/sponsors` - List sponsors
  - `GET /admin/sponsors/:id` - Get sponsor
  - `POST /admin/sponsors` - Create sponsor
  - `PUT /admin/sponsors/:id` - Update sponsor
  - `DELETE /admin/sponsors/:id` - Delete sponsor
- **Default Roles:** `superadmin`

### 5. VIP & Items Dropdown

#### VIP Plans
- **Permission:** `vip-plans`
- **Routes:**
  - `GET /admin/vip-plans` - List VIP plans
  - `GET /admin/vip-plans/:id` - Get VIP plan
  - `POST /admin/vip-plans` - Create VIP plan
  - `PUT /admin/vip-plans/:id` - Update VIP plan
  - `PATCH /admin/vip-plans/:id/toggle` - Toggle VIP plan
  - `DELETE /admin/vip-plans/:id` - Delete VIP plan
- **Default Roles:** `superadmin`

#### Admin VIP
- **Permission:** `admin-vip`
- **Routes:**
  - `GET /admin/vip/users/:userId` - Get user VIP status
  - `GET /admin/vip/users/:userId/history` - Get user VIP history
  - `POST /admin/vip/users/:userId/activate` - Activate user VIP
  - `POST /admin/vip/users/:userId/renew` - Renew user VIP
  - `POST /admin/vip/users/:userId/cancel` - Cancel user VIP
  - `PATCH /admin/vip/users/:userId/auto-renew` - Set auto renew
- **Default Roles:** `superadmin`

#### Admin Wallet
- **Permission:** `admin-wallet`
- **Routes:**
  - `POST /admin/wallet/credit` - Credit coins
  - `POST /admin/wallet/debit` - Debit coins
  - `GET /admin/wallet/users/:userId` - Get user wallet
  - `GET /admin/wallet/users/:userId/transactions` - Get user transactions
  - `POST /admin/wallet/users/:userId/credit` - Credit user coins
  - `POST /admin/wallet/users/:userId/debit` - Debit user coins
- **Default Roles:** `superadmin`

#### Kode Redeem
- **Permission:** `redeem-codes`
- **Routes:**
  - `GET /admin/redeem-codes` - List redeem codes
  - `POST /admin/redeem-codes` - Create redeem code
  - `GET /admin/redeem-codes/:id` - Get redeem code
  - `PUT /admin/redeem-codes/:id` - Update redeem code
  - `DELETE /admin/redeem-codes/:id` - Delete redeem code
- **Default Roles:** `superadmin`

#### Avatar Borders
- **Permission:** `avatar-borders`
- **Routes:**
  - `GET /admin/avatar-borders` - List borders
  - `GET /admin/avatar-borders/:id` - Get border
  - `POST /admin/avatar-borders` - Create border
  - `PUT /admin/avatar-borders/:id` - Update border
  - `DELETE /admin/avatar-borders/:id` - Delete border
  - `GET /admin/avatar-borders/:id/owners` - List border owners
  - `POST /admin/avatar-borders/:id/owners` - Add border owner
  - `PATCH /admin/avatar-borders/:id/owners/:userId` - Update border owner
  - `DELETE /admin/avatar-borders/:id/owners/:userId` - Delete border owner
- **Default Roles:** `superadmin`

#### Badges
- **Permission:** `badges`
- **Routes:**
  - `GET /admin/badges` - List badges
  - `GET /admin/badges/:id` - Get badge
  - `POST /admin/badges` - Create badge
  - `PUT /admin/badges/:id` - Update badge
  - `DELETE /admin/badges/:id` - Delete badge
  - `GET /admin/badges/:badgeId/owners` - List badge owners
  - `POST /admin/badges/:badgeId/owners` - Add badge owner
  - `PATCH /admin/badges/:badgeId/owners/:ownerId` - Update badge owner
  - `DELETE /admin/badges/:badgeId/owners/:ownerId` - Delete badge owner
- **Default Roles:** `superadmin`

#### Stickers
- **Permission:** `stickers`
- **Routes:**
  - `GET /admin/stickers` - List stickers
  - `GET /admin/stickers/:id` - Get sticker
  - `POST /admin/stickers` - Create sticker
  - `PUT /admin/stickers/:id` - Update sticker
  - `DELETE /admin/stickers/:id` - Delete sticker
  - `GET /admin/stickers/:id/users` - List sticker owners
  - `POST /admin/stickers/:id/users` - Add sticker owner
  - `DELETE /admin/stickers/:id/users/:userId` - Delete sticker owner
- **Default Roles:** `superadmin`

### 6. Konten Dropdown

#### Daftar Konten
- **Permission:** `daftar-konten`
- **Routes:**
  - `GET /admin/anime` - List anime
  - `GET /admin/anime/search` - Search anime
  - `POST /admin/anime` - Create anime
  - `GET /admin/anime/:id` - Get anime
  - `PUT /admin/anime/:id` - Update anime
  - `DELETE /admin/anime/:id` - Delete anime
  - `GET /admin/uploads` - List uploads
  - `POST /admin/uploads` - Create upload
  - `PUT /admin/uploads/:id/status` - Update upload status
  - `GET /admin/uploads/stats/me` - Get upload stats
- **Default Roles:** `superadmin`, `uploader`

#### Manga Admin
- **Permission:** `manga-admin`
- **Routes:**
  - `GET /admin/anime/:animeId/episodes` - List episodes
  - `POST /admin/anime/:animeId/episodes` - Create episode
  - `GET /admin/episodes/:id` - Get episode
  - `PUT /admin/episodes/:id` - Update episode
  - `DELETE /admin/episodes/:id` - Delete episode
- **Default Roles:** `superadmin`, `uploader`

### 7. Lainnya Dropdown

#### Waifu Vote
- **Permission:** `waifu-vote`
- **Routes:** (belum diimplementasi)
- **Default Roles:** `superadmin`

### 8. Settings

#### Pengaturan
- **Permission:** `settings`
- **Routes:**
  - `GET /admin/settings` - Get app settings
  - `PUT /admin/settings` - Update app settings
  - `GET /admin/in-app-announcement` - Get announcement
  - `PUT /admin/in-app-announcement` - Update announcement
  - `DELETE /admin/in-app-announcement` - Delete announcement
- **Default Roles:** `superadmin`

## Default Permissions by Role

### SUPERADMIN
- **Permissions:** Semua permissions
- **Access:** Full access to all menus and features

### KEUANGAN
- **Permissions:** `['overview', 'keuangan', 'topup-manual']`
- **Access:** Dashboard, Keuangan, Topup Manual

### UPLOADER
- **Permissions:** `['overview', 'daftar-konten', 'manga-admin']`
- **Access:** Dashboard, Daftar Konten, Manga Admin

## API Usage Examples

### Create Admin with Custom Permissions
```bash
POST /admin/
{
  "username": "admin_keuangan",
  "email": "keuangan@example.com",
  "password": "password123",
  "role": "KEUANGAN",
  "permissions": ["overview", "keuangan", "topup-manual"]
}
```

### Update Admin Permissions
```bash
PUT /admin/1
{
  "permissions": ["overview", "keuangan", "topup-manual", "admin-wallet"]
}
```

### Access Protected Route
```bash
GET /admin/keuangan
Authorization: Bearer <admin_token>
```

## Authentication Routes

### Admin Login
```bash
POST /admin/auth/login
{
  "username": "admin_username",
  "password": "admin_password"
}
```

### Get Admin Profile
```bash
GET /admin/me
Authorization: Bearer <admin_token>
```

### Get Available Permissions
```bash
GET /admin/permissions
Authorization: Bearer <admin_token>
```

**Response:**
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
      "key": "waifu-vote",
      "label": "Waifu Vote",
      "description": "Waifu vote management access"
    },
    {
      "key": "settings",
      "label": "Pengaturan",
      "description": "Settings management access"
    }
  ]
}
```

### Change Password
```bash
POST /admin/change-password
Authorization: Bearer <admin_token>
{
  "oldPassword": "old_password",
  "newPassword": "new_password"
}
```

### Bootstrap Superadmin (hanya jika belum ada admin)
```bash
POST /admin/auth/bootstrap-superadmin
{
  "username": "superadmin",
  "email": "superadmin@example.com",
  "password": "superadmin_password"
}
```

## Middleware Implementation

### requirePermission(permissions)
```javascript
// Single permission
requirePermission(MENU_PERMISSIONS.KEUANGAN)

// Multiple permissions (any of these)
requirePermission([MENU_PERMISSIONS.KEUANGAN, MENU_PERMISSIONS.ADMIN_WALLET])
```

### Error Responses
- **401:** Token tidak ditemukan/tidak valid
- **403:** Akses ditolak - permissions tidak cukup

## Frontend Integration

Frontend harus filter menu berdasarkan admin permissions:

```javascript
const filteredMenus = allMenus.filter(menu => 
  admin.permissions.includes(menu.key)
);
```

## Environment Variables

```env
VERSION=1.0.10  # Menentukan API prefix (jika diperlukan)
JWT_SECRET=your_jwt_secret_key
```

**Note:** Documentation ini menggunakan URL tanpa prefix version. Jika environment menggunakan VERSION, URL akan menjadi `/1.0.10/admin` secara otomatis.
