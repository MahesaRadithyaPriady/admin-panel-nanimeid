# Admin Leaderboard API Documentation

Dokumentasi lengkap endpoint Admin Leaderboard untuk menampilkan data leaderboard, koleksi user, coin leaderboard, dan sharp token leaderboard di Admin Panel.

## Base URL
- Admin: `/v1/admin/leaderboard`

## Permission Required
- **Permission**: `overview` (ditambahkan ke `MENU_PERMISSIONS`)
- **Default Access**: SUPERADMIN dan admin dengan permission `overview`

---

## 1. Leaderboard Stats Overview

**GET** `/v1/admin/leaderboard/stats`

Mengambil statistik keseluruhan leaderboard, coins, dan sharp tokens.

### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "overview": {
      "totalUsers": 5000,
      "totalWallets": 4500,
      "totalSharpTokenHolders": 1200,
      "totalCoinTransactions": 25000
    },
    "coins": {
      "totalCoinsInCirculation": 1500000,
      "topHolder": {
        "userId": 123,
        "username": "naruto",
        "balance": 50000
      }
    },
    "sharpTokens": {
      "totalTokensInCirculation": 3500,
      "topHolder": {
        "userId": 456,
        "username": "sasuke",
        "tokens": 150
      }
    },
    "leaderboard": {
      "daily": {
        "periodStart": "2025-01-15T00:00:00.000Z",
        "participants": 850,
        "topUser": {
          "userId": 789,
          "username": "sakura",
          "xp": 2400
        }
      },
      "weekly": {
        "periodStart": "2025-01-13T00:00:00.000Z",
        "participants": 1200
      },
      "monthly": {
        "periodStart": "2025-01-01T00:00:00.000Z",
        "participants": 2000
      }
    }
  }
}
```

---

## 2. Available Leaderboard Months

**GET** `/v1/admin/leaderboard/monthly-summary/available-months`

Mengambil daftar bulan yang tersedia untuk monthly summary.

### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": [
    { "year": 2025, "month": 1, "label": "2025-01" },
    { "year": 2025, "month": 2, "label": "2025-02" },
    { "year": 2024, "month": 12, "label": "2024-12" }
  ]
}
```

---

## 3. Monthly Summary Leaderboard

**GET** `/v1/admin/leaderboard/monthly-summary`

Mengambil leaderboard bulanan dengan data lengkap user.

### Query Parameters
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `year` | number | Current UTC year | Tahun |
| `month` | number | Current UTC month | Bulan (1-12) |
| `page` | number | 1 | Halaman |
| `limit` | number | 10 | Jumlah per halaman (max 100) |

### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "year": 2025,
    "month": 1,
    "page": 1,
    "limit": 10,
    "total": 500,
    "totalPages": 50,
    "entries": [
      {
        "rank": 1,
        "user": {
          "id": 123,
          "userID": "USR-001",
          "username": "naruto",
          "email": "naruto@example.com",
          "fullName": "Naruto Uzumaki",
          "avatarUrl": "https://example.com/avatar.jpg",
          "vip": { "status": "ACTIVE", "endAt": "2025-12-31T00:00:00.000Z", "level": "GOLD" },
          "activeAvatarBorder": {
            "id": 10,
            "code": "AVATAR_BORDER_SSS_PLUS",
            "title": "SSS+ Border",
            "imageUrl": "https://example.com/border.png",
            "tier": "SSS_PLUS"
          },
          "wallet": { "balanceCoins": 50000 },
          "sharpToken": { "tokens": 150 }
        },
        "total_xp": 15000,
        "events_count": 350,
        "last_event_at": "2025-01-15T10:30:00.000Z",
        "collection": {
          "borders": { "count": 5, "points": 2500, "items": [...] },
          "badges": { "count": 10, "points": 5000, "items": [...] },
          "stickers": { "count": 20, "points": 1000, "items": [...] },
          "totalPoints": 8500
        }
      }
    ]
  }
}
```

---

## 4. Leaderboard by Period (Basic)

**GET** `/v1/admin/leaderboard/:period`

Mengambil leaderboard berdasarkan periode (daily, weekly, monthly) dengan data user yang mencakup ringkasan koleksi.

### Path Parameters
| Param | Type | Description |
|-------|------|-------------|
| `period` | string | `daily`, `weekly`, atau `monthly` |

### Query Parameters
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Halaman |
| `limit` | number | 50 | Jumlah per halaman (max 100) |

### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "period": "daily",
    "period_start": "2025-01-15T00:00:00.000Z",
    "period_end": "2025-01-16T00:00:00.000Z",
    "reset_seconds": 86400,
    "page": 1,
    "limit": 50,
    "total": 1000,
    "totalPages": 20,
    "entries": [
      {
        "rank": 1,
        "user": {
          "id": 123,
          "userID": "USR-001",
          "username": "naruto",
          "email": "naruto@example.com",
          "fullName": "Naruto Uzumaki",
          "avatarUrl": "https://example.com/avatar.jpg",
          "vip": { "status": "ACTIVE", "endAt": "2025-12-31T00:00:00.000Z", "level": "GOLD" },
          "activeAvatarBorder": { ... },
          "wallet": { "balanceCoins": 50000 },
          "sharpToken": { "tokens": 150 },
          "collectionSummary": {
            "bordersCount": 5,
            "badgesCount": 10,
            "stickersCount": 20,
            "totalPoints": 8500
          }
        },
        "total_xp": 2400,
        "events_count": 120,
        "last_event_at": "2025-01-15T23:59:00.000Z",
        "collection": {
          "borders": { "count": 5, "points": 2500, "items": [...] },
          "badges": { "count": 10, "points": 5000, "items": [...] },
          "stickers": { "count": 20, "points": 1000, "items": [...] },
          "totalPoints": 8500
        }
      }
    ]
  }
}
```

---

## 5. Leaderboard by Period with Full Collections

**GET** `/v1/admin/leaderboard/:period/collections`

Mengambil leaderboard dengan data koleksi lengkap (borders, badges, stickers) untuk setiap user.

### Path Parameters
| Param | Type | Description |
|-------|------|-------------|
| `period` | string | `daily`, `weekly`, atau `monthly` |

### Query Parameters
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Halaman |
| `limit` | number | 20 | Jumlah per halaman (max 50) |

### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "period": "daily",
    "period_start": "2025-01-15T00:00:00.000Z",
    "period_end": "2025-01-16T00:00:00.000Z",
    "reset_seconds": 86400,
    "page": 1,
    "limit": 20,
    "total": 1000,
    "totalPages": 50,
    "entries": [
      {
        "rank": 1,
        "user": {
          "id": 123,
          "userID": "USR-001",
          "username": "naruto",
          "email": "naruto@example.com",
          "fullName": "Naruto Uzumaki",
          "avatarUrl": "https://example.com/avatar.jpg",
          "vip": { "status": "ACTIVE", "endAt": "2025-12-31T00:00:00.000Z", "level": "GOLD" },
          "activeAvatarBorder": { ... },
          "wallet": { "balanceCoins": 50000 },
          "sharpToken": { "tokens": 150 }
        },
        "total_xp": 2400,
        "events_count": 120,
        "last_event_at": "2025-01-15T23:59:00.000Z",
        "collection": {
          "borders": {
            "count": 5,
            "points": 2500,
            "items": [
              {
                "id": 1,
                "code": "BORDER_GOLD",
                "title": "Gold Border",
                "imageUrl": "https://example.com/border1.png",
                "tier": "GOLD",
                "points": 500,
                "obtainedAt": "2025-01-10T10:00:00.000Z"
              }
            ]
          },
          "badges": {
            "count": 10,
            "points": 5000,
            "items": [
              {
                "id": 1,
                "name": "Super Badge",
                "icon": "https://example.com/badge1.png",
                "points": 500,
                "obtainedAt": "2025-01-08T15:00:00.000Z"
              }
            ]
          },
          "stickers": {
            "count": 20,
            "points": 1000,
            "items": [
              {
                "id": 1,
                "code": "STICKER_001",
                "name": "Cute Sticker",
                "imageUrl": "https://example.com/sticker1.png",
                "points": 50,
                "obtainedAt": "2025-01-05T09:00:00.000Z"
              }
            ]
          },
          "totalPoints": 8500
        }
      }
    ]
  }
}
```

---

## 6. User Leaderboard History

**GET** `/v1/admin/leaderboard/users/:userId/history`

Mengambil riwayat leaderboard untuk user tertentu.

### Path Parameters
| Param | Type | Description |
|-------|------|-------------|
| `userId` | number | ID user |

### Query Parameters
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `periods` | number | 3 | Jumlah periode yang diambil (max 12) |

### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "userId": 123,
    "daily": [
      { "date": "2025-01-15T00:00:00.000Z", "xp": 2400, "events": 120 },
      { "date": "2025-01-14T00:00:00.000Z", "xp": 1800, "events": 90 },
      { "date": "2025-01-13T00:00:00.000Z", "xp": 2000, "events": 100 }
    ],
    "weekly": [
      { "startDate": "2025-01-13T00:00:00.000Z", "xp": 6200, "events": 310 },
      { "startDate": "2025-01-06T00:00:00.000Z", "xp": 5800, "events": 290 }
    ],
    "monthly": [
      { "year": 2025, "month": 1, "xp": 15000, "events": 750 },
      { "year": 2024, "month": 12, "xp": 12000, "events": 600 }
    ]
  }
}
```

---

## 7. Coin Leaderboard

**GET** `/v1/admin/leaderboard/coins`

Mengambil daftar user dengan coin terbanyak. Dapat difilter berdasarkan range coin dan search.

### Query Parameters
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Halaman |
| `limit` | number | 50 | Jumlah per halaman (max 100) |
| `minCoins` | number | 0 | Minimum coin |
| `maxCoins` | number | null | Maximum coin (opsional) |
| `search` / `q` | string | null | Search username, email, atau full name |

### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "page": 1,
    "limit": 50,
    "total": 4500,
    "totalPages": 90,
    "filters": {
      "minCoins": 0,
      "maxCoins": null,
      "search": null
    },
    "entries": [
      {
        "rank": 1,
        "user": {
          "id": 123,
          "userID": "USR-001",
          "username": "naruto",
          "email": "naruto@example.com",
          "fullName": "Naruto Uzumaki",
          "avatarUrl": "https://example.com/avatar.jpg",
          "vip": { "status": "ACTIVE", "endAt": "2025-12-31T00:00:00.000Z", "level": "GOLD" },
          "activeAvatarBorder": { ... }
        },
        "coins": 50000,
        "collectionSummary": {
          "bordersCount": 5,
          "badgesCount": 10,
          "stickersCount": 20
        },
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

## 8. Sharp Token Leaderboard

**GET** `/v1/admin/leaderboard/sharp-tokens`

Mengambil daftar user dengan sharp token terbanyak. Dapat difilter berdasarkan range token dan search.

### Query Parameters
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Halaman |
| `limit` | number | 50 | Jumlah per halaman (max 100) |
| `minTokens` | number | 0 | Minimum token |
| `maxTokens` | number | null | Maximum token (opsional) |
| `search` / `q` | string | null | Search username, email, atau full name |

### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "page": 1,
    "limit": 50,
    "total": 1200,
    "totalPages": 24,
    "filters": {
      "minTokens": 0,
      "maxTokens": null,
      "search": null
    },
    "entries": [
      {
        "rank": 1,
        "user": {
          "id": 456,
          "userID": "USR-002",
          "username": "sasuke",
          "email": "sasuke@example.com",
          "fullName": "Sasuke Uchiha",
          "avatarUrl": "https://example.com/avatar2.jpg",
          "vip": { "status": "ACTIVE", "endAt": "2025-12-31T00:00:00.000Z", "level": "MASTER" },
          "activeAvatarBorder": { ... },
          "wallet": { "balanceCoins": 35000 }
        },
        "tokens": 150,
        "collectionSummary": {
          "bordersCount": 8,
          "badgesCount": 15,
          "stickersCount": 30
        },
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

## Error Responses

### Permission Denied (403)
```json
{
  "success": false,
  "message": "Forbidden: insufficient permissions"
}
```

### Validation Error (400)
```json
{
  "success": false,
  "message": "period invalid"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Usage Examples

### cURL - Get Leaderboard Stats
```bash
curl -X GET "https://api.example.com/v1/admin/leaderboard/stats" \
  -H "Authorization: Bearer <admin_token>"
```

### cURL - Get Daily Leaderboard
```bash
curl -X GET "https://api.example.com/v1/admin/leaderboard/daily?page=1&limit=50" \
  -H "Authorization: Bearer <admin_token>"
```

### cURL - Get Daily Leaderboard with Collections
```bash
curl -X GET "https://api.example.com/v1/admin/leaderboard/daily/collections?page=1&limit=20" \
  -H "Authorization: Bearer <admin_token>"
```

### cURL - Get Coin Leaderboard with Filter
```bash
curl -X GET "https://api.example.com/v1/admin/leaderboard/coins?minCoins=1000&maxCoins=50000&search=naruto" \
  -H "Authorization: Bearer <admin_token>"
```

### cURL - Get Sharp Token Leaderboard
```bash
curl -X GET "https://api.example.com/v1/admin/leaderboard/sharp-tokens?page=1&limit=50" \
  -H "Authorization: Bearer <admin_token>"
```

### cURL - Get User Leaderboard History
```bash
curl -X GET "https://api.example.com/v1/admin/leaderboard/users/123/history?periods=6" \
  -H "Authorization: Bearer <admin_token>"
```

### cURL - Get Monthly Summary
```bash
curl -X GET "https://api.example.com/v1/admin/leaderboard/monthly-summary?year=2025&month=1&page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>"
```

---

## Database Schema (Prisma)

### Models terkait Leaderboard

```prisma
model XpDailySummary {
  id            Int      @id @default(autoincrement())
  user_id       Int
  day_date      DateTime @db.Date
  total_xp      Int      @default(0)
  events_count  Int      @default(0)
  last_event_at DateTime?
  user          User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, day_date])
  @@index([day_date, total_xp])
}

model XpWeeklySummary {
  id            Int      @id @default(autoincrement())
  user_id       Int
  week_start    DateTime
  total_xp      Int      @default(0)
  events_count  Int      @default(0)
  last_event_at DateTime?
  user          User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, week_start])
  @@index([week_start, total_xp])
}

model XpMonthlySummary {
  id            Int      @id @default(autoincrement())
  user_id       Int
  year          Int
  month         Int
  total_xp      Int      @default(0)
  events_count  Int      @default(0)
  last_event_at DateTime?
  user          User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, year, month])
  @@index([year, month, total_xp])
}

model UserWallet {
  id            Int      @id @default(autoincrement())
  user_id       Int      @unique
  balance_coins Int      @default(0)
  updatedAt     DateTime @updatedAt
  user          User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
}

model UserSharpToken {
  id        Int      @id @default(autoincrement())
  user_id   Int      @unique
  tokens    Int      @default(0)
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

---

## Files Location

- **Service**: `src/services/adminLeaderboard.service.js`
- **Controller**: `src/controllers/adminLeaderboard.controller.js`
- **Routes**: `src/routes/admin.routes.js`
