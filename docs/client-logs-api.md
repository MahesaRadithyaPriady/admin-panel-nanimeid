# Client Logs API (Universal Logger)

Dokumentasi lengkap endpoint untuk mengirim log dari client (Flutter/Web) ke backend, dan mengelola log tersebut via Admin Panel dengan permission-based access.

## Base URLs
- Public: `/v1/client-logs`
- Admin: `/v1/admin/client-logs`

## Permission Required
- **Permission**: `client-logs` (ditambahkan ke `MENU_PERMISSIONS`)
- **Default Access**: SUPERADMIN memiliki akses otomatis
- **Custom Role**: Admin dengan permission `client-logs` dapat mengakses

---

## Public Endpoints

### 1. POST Log dari Client
**POST** `/v1/client-logs`

Menerima log dari client application. Authentication opsional.

#### Headers (Opsional)
| Header | Description |
|--------|-------------|
| `Authorization` | `Bearer <access_token>` - untuk mengisi user_id |
| `User-Agent` | User agent string |

#### Request Body
```json
{
  "source": "flutter",
  "level": "error",
  "title": "FlutterError",
  "message": "Invalid argument(s): string is not well-formed UTF-16",
  "stack": "Stack trace here...",
  "data": {
    "route": "/global-chat/simple",
    "extra": "any additional data"
  },
  "app_version": "1.2.3",
  "platform": "android",
  "device_model": "Pixel 7",
  "os_version": "14",
  "locale": "id_ID"
}
```

#### Fields Description
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | string | No | Sumber log (flutter, web, ios, android) |
| `level` | string | No | Level log (error, warn, info, debug) |
| `title` | string | No | Judul error singkat |
| `message` | string | No | Pesan error detail |
| `stack` | string | No | Stack trace |
| `data` | object | No | Data tambahan (JSON) |
| `app_version` | string | No | Versi aplikasi |
| `platform` | string | No | Platform (android, ios, web) |
| `device_model` | string | No | Model device |
| `os_version` | string | No | Versi OS |
| `locale` | string | No | Locale device |

#### Response Success (201)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 123
  }
}
```

---

## Admin Endpoints (Require `client-logs` Permission)

### 2. List All Client Logs
**GET** `/v1/admin/client-logs`

Mengambil daftar log dengan filter dan pagination.

#### Query Parameters
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `skip` | number | 0 | Offset untuk pagination |
| `take` | number | 50 | Limit hasil (max 200) |
| `status` | string | - | Filter status (NEW, REVIEWED, RESOLVED, IGNORED) |
| `userId` / `user_id` | number | - | Filter by user ID |
| `level` | string | - | Filter by level (error, warn, info, debug) |
| `source` | string | - | Filter by source |
| `q` | string | - | Search di title, message, stack |

#### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "id": 123,
        "user_id": 10,
        "source": "flutter",
        "level": "error",
        "title": "FlutterError",
        "message": "...",
        "stack": "...",
        "data": {},
        "app_version": "1.2.3",
        "platform": "android",
        "device_model": "Pixel 7",
        "os_version": "14",
        "locale": "id_ID",
        "ip": "...",
        "user_agent": "...",
        "status": "NEW",
        "admin_notes": null,
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z",
        "user": {
          "id": 10,
          "username": "johndoe",
          "profile": {
            "full_name": "John Doe"
          }
        }
      }
    ],
    "total": 150,
    "skip": 0,
    "take": 50
  }
}
```

---

### 3. Get Log Statistics
**GET** `/v1/admin/client-logs/stats/aggregate`

Mengambil statistik dan aggregasi log untuk dashboard.

#### Query Parameters
| Param | Type | Description |
|-------|------|-------------|
| `startDate` | string (ISO) | Filter dari tanggal |
| `endDate` | string (ISO) | Filter sampai tanggal |
| `userId` / `user_id` | number | Filter by user |
| `level` | string | Filter by level |
| `source` | string | Filter by source |

#### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "total": 1250,
    "byStatus": [
      { "status": "NEW", "count": 450 },
      { "status": "REVIEWED", "count": 300 },
      { "status": "RESOLVED", "count": 400 },
      { "status": "IGNORED", "count": 100 }
    ],
    "byLevel": [
      { "level": "error", "count": 800 },
      { "level": "warn", "count": 300 },
      { "level": "info", "count": 150 }
    ],
    "bySource": [
      { "source": "flutter", "count": 900 },
      { "source": "web", "count": 350 }
    ],
    "byPlatform": [
      { "platform": "android", "count": 700 },
      { "platform": "ios", "count": 550 }
    ],
    "byAppVersion": [
      { "version": "1.2.3", "count": 500 },
      { "version": "1.2.2", "count": 400 }
    ],
    "recentDaily": [
      { "date": "2025-01-15T00:00:00.000Z", "count": 45 },
      { "date": "2025-01-14T00:00:00.000Z", "count": 52 }
    ]
  }
}
```

---

### 4. Get Metadata (Filters)
**GET** `/v1/admin/client-logs/metadata`

Mengambil daftar distinct sources dan levels untuk filter dropdown.

#### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "sources": [
      { "source": "flutter", "count": 900 },
      { "source": "web", "count": 350 }
    ],
    "levels": [
      { "level": "error", "count": 800 },
      { "level": "warn", "count": 300 },
      { "level": "info", "count": 150 }
    ]
  }
}
```

---

### 5. Get Single Log Detail
**GET** `/v1/admin/client-logs/:id`

Mengambil detail log by ID.

#### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 123,
    "user_id": 10,
    "source": "flutter",
    "level": "error",
    "title": "FlutterError",
    "message": "...",
    "stack": "...",
    "data": {},
    "app_version": "1.2.3",
    "platform": "android",
    "device_model": "Pixel 7",
    "os_version": "14",
    "locale": "id_ID",
    "ip": "...",
    "user_agent": "...",
    "status": "NEW",
    "admin_notes": null,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "user": {
      "id": 10,
      "username": "johndoe",
      "profile": { "full_name": "John Doe" }
    }
  }
}
```

#### Response Not Found (404)
```json
{
  "success": false,
  "message": "Not found"
}
```

---

### 6. Get Logs by User
**GET** `/v1/admin/client-logs/user/:userId`

Mengambil semua log dari user tertentu.

#### Query Parameters
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `skip` | number | 0 | Offset |
| `take` | number | 50 | Limit (max 200) |

#### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [...],
    "total": 25,
    "skip": 0,
    "take": 50
  }
}
```

---

### 7. Update Log Status
**PUT** `/v1/admin/client-logs/:id`

Update status dan admin notes untuk log.

#### Request Body
```json
{
  "status": "REVIEWED",
  "admin_notes": "Sudah dicek, terjadi saat render marquee"
}
```

#### Status Enum
- `NEW` - Log baru belum ditinjau
- `REVIEWED` - Sudah ditinjau
- `RESOLVED` - Masalah sudah diperbaiki
- `IGNORED` - Diabaikan / false positive

#### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 123,
    "status": "REVIEWED",
    "admin_notes": "Sudah dicek, terjadi saat render marquee",
    "updatedAt": "2025-01-15T12:00:00.000Z"
  }
}
```

---

### 8. Bulk Update Status
**PATCH** `/v1/admin/client-logs/bulk/status`

Update status untuk multiple log sekaligus.

#### Request Body
```json
{
  "ids": [123, 124, 125],
  "status": "RESOLVED",
  "admin_notes": "Fixed in version 1.2.4"
}
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "success": true,
    "updated": 3
  }
}
```

---

### 9. Delete Single Log
**DELETE** `/v1/admin/client-logs/:id`

Menghapus single log.

#### Response Success (200)
```json
{
  "success": true,
  "message": "OK"
}
```

---

### 10. Bulk Delete Logs
**POST** `/v1/admin/client-logs/bulk/delete`

Menghapus multiple log sekaligus.

#### Request Body
```json
{
  "ids": [123, 124, 125]
}
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "success": true,
    "deleted": 3
  }
}
```

---

### 11. Export Logs
**GET** `/v1/admin/client-logs/export`

Export logs sebagai JSON file (download).

#### Query Parameters
| Param | Type | Description |
|-------|------|-------------|
| `startDate` | string (ISO) | Filter dari tanggal |
| `endDate` | string (ISO) | Filter sampai tanggal |
| `status` | string | Filter status |
| `level` | string | Filter level |
| `source` | string | Filter source |
| `userId` / `user_id` | number | Filter by user |

#### Response
- Content-Type: `application/json`
- Content-Disposition: `attachment; filename="client-logs-export.json"`

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": 123,
      "user_id": 10,
      "source": "flutter",
      "level": "error",
      ...
    }
  ]
}
```

---

### 12. Cleanup Old Logs (SUPERADMIN Only)
**POST** `/v1/admin/client-logs/cleanup/old`

Menghapus log lama yang sudah melewati threshold hari. **Hanya SUPERADMIN**.

#### Request Body
```json
{
  "days": 30
}
```
- Default: 30 hari
- Menghapus semua log dengan `createdAt < now - days`

#### Response Success (200)
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "success": true,
    "deleted": 500,
    "cutoff": "2024-12-16T10:30:00.000Z"
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
  "message": "ids array required"
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

## Database Schema (Prisma)

```prisma
model ClientLog {
  id           Int       @id @default(autoincrement())
  user_id      Int?
  source       String?
  level        String?
  title        String?
  message      String?
  stack        String?
  data         Json?
  app_version  String?
  platform     String?
  device_model String?
  os_version   String?
  locale       String?
  ip           String?
  user_agent   String?
  status       ClientLogStatus @default(NEW)
  admin_notes  String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  user User? @relation(fields: [user_id], references: [id], onDelete: SetNull)

  @@index([user_id])
  @@index([status])
  @@index([createdAt])
}

enum ClientLogStatus {
  NEW
  REVIEWED
  RESOLVED
  IGNORED
}
```

---

## Usage Examples

### cURL - Kirim Log dari Client
```bash
curl -X POST https://api.example.com/v1/client-logs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "source": "flutter",
    "level": "error",
    "title": "NullPointerException",
    "message": "Attempt to invoke...",
    "app_version": "1.2.3",
    "platform": "android"
  }'
```

### cURL - List Logs (Admin)
```bash
curl -X GET "https://api.example.com/v1/admin/client-logs?status=NEW&take=50" \
  -H "Authorization: Bearer <admin_token>"
```

### cURL - Bulk Update Status
```bash
curl -X PATCH https://api.example.com/v1/admin/client-logs/bulk/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [1, 2, 3],
    "status": "RESOLVED",
    "admin_notes": "Fixed in hotfix"
  }'
```

### cURL - Export Logs
```bash
curl -X GET "https://api.example.com/v1/admin/client-logs/export?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer <admin_token>" \
  -o client-logs-export.json
```
