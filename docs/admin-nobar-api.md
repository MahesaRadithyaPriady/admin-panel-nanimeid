# Admin Nobar Room API

Manage Watch Party (Nobar) rooms from admin panel. Covers both V2 (current) and V1 (legacy) rooms.

## Authentication

All endpoints require admin JWT token:
```
Authorization: Bearer <admin_token>
```

## Permission

Requires permission: `nobar-admin`. Role `SUPERADMIN` has access to all permissions.

Base path: `/v1/admin`

---

## Endpoint Summary

### V2 (Current)

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/admin/nobar/stats` | Statistik nobar rooms |
| GET | `/admin/nobar` | List semua nobar room V2 |
| GET | `/admin/nobar/:id` | Detail nobar room V2 |
| POST | `/admin/nobar/:id/end` | Force end room (set status ENDED) |
| DELETE | `/admin/nobar/:id` | Hapus room V2 (hard delete) |
| GET | `/admin/nobar/cleanup-stale` | Hapus room aktif > 10 jam (V2) |

### V1 (Legacy)

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/admin/nobar/v1` | List semua nobar room V1 |
| DELETE | `/admin/nobar/v1/:id` | Hapus room V1 |
| DELETE | `/admin/nobar/v1/cleanup-stale` | Hapus room V1 aktif > 10 jam |

---

## GET `/admin/nobar/stats`

Statistik nobar rooms.

**Response:**
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "total_active": 15,
    "total_ended": 142,
    "total_rooms": 157,
    "total_participants": 89,
    "total_messages": 1203,
    "stale_rooms_count": 3,
    "stale_hours_threshold": 10,
    "created_last_24h": 12
  }
}
```

---

## GET `/admin/nobar`

List semua nobar room V2 dengan filter & pagination.

**Query Parameters:**

| Param | Type | Default | Deskripsi |
|---|---|---|---|
| `page` | number | 1 | Halaman |
| `limit` | number | 20 | Item per halaman (max 100) |
| `status` | string | - | `ACTIVE` atau `ENDED` |
| `access_mode` | string | - | `PUBLIC`, `PRIVATE`, `FOLLOWERS`, `FRIENDS` |
| `q` | string | - | Search: code, anime title, host username |
| `host_id` | number | - | Filter by host user ID |
| `sort` | string | createdAt | Sort field: `createdAt`, `updatedAt`, `code`, `status` |
| `order` | string | desc | `asc` atau `desc` |

**Response:**
```json
{
  "status": 200,
  "message": "OK",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 157,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "items": [
    {
      "id": 1,
      "code": "ABC123",
      "status": "ACTIVE",
      "access_mode": "PUBLIC",
      "is_locked": false,
      "quality": "720p",
      "current_time": 1200,
      "is_paused": false,
      "created_at": "2025-07-10T10:00:00.000Z",
      "updated_at": "2025-07-10T11:30:00.000Z",
      "expires_at": null,
      "host": {
        "id": 42,
        "username": "animefan",
        "avatar_url": "https://...",
        "full_name": "Anime Fan"
      },
      "anime": {
        "id": 5,
        "nama_anime": "Kanojo Okarishimasu Season 4",
        "title_en": "Rent-a-Girlfriend Season 4",
        "title_jp": "Kanojo Okarishimasu Season 4",
        "gambar_anime": "https://..."
      },
      "episode": {
        "id": 100,
        "nomor_episode": 1,
        "judul_episode": "Episode 1"
      },
      "participants_count": 5,
      "messages_count": 42
    }
  ]
}
```

---

## GET `/admin/nobar/:id`

Detail nobar room V2 termasuk participants dan recent messages.

**Response:**
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "id": 1,
    "code": "ABC123",
    "status": "ACTIVE",
    "access_mode": "PUBLIC",
    "is_locked": false,
    "quality": "720p",
    "current_time": 1200,
    "is_paused": false,
    "created_at": "2025-07-10T10:00:00.000Z",
    "updated_at": "2025-07-10T11:30:00.000Z",
    "host": { "id": 42, "username": "animefan", "avatar_url": "...", "full_name": "Anime Fan" },
    "anime": { "id": 5, "nama_anime": "...", "title_en": "...", "title_jp": "...", "gambar_anime": "..." },
    "episode": { "id": 100, "nomor_episode": 1, "judul_episode": "Episode 1" },
    "participants_count": 5,
    "messages_count": 42,
    "participants": [
      {
        "id": 1,
        "user_id": 42,
        "role": "host",
        "username": "animefan",
        "avatar_url": "https://...",
        "joined_at": "2025-07-10T10:00:00.000Z",
        "last_seen": "2025-07-10T11:30:00.000Z",
        "is_ready": true
      }
    ],
    "recent_messages": [
      {
        "id": 1,
        "user_id": 42,
        "username": "animefan",
        "message": "Halo semua!",
        "kind": "TEXT",
        "image_url": null,
        "created_at": "2025-07-10T10:05:00.000Z"
      }
    ]
  }
}
```

---

## POST `/admin/nobar/:id/end`

Force end room — set status ke `ENDED`. Room record tetap ada (tidak dihapus). Socket `ROOM_ENDED` di-emit ke semua participant.

**Response:**
```json
{
  "status": 200,
  "message": "Room berhasil diakhiri",
  "data": {
    "id": 1,
    "code": "ABC123",
    "status": "ENDED"
  }
}
```

---

## DELETE `/admin/nobar/:id`

Hard delete room V2. Menghapus room + semua participants + messages (cascade). Socket `ROOM_ENDED` di-emit sebelum hapus.

**Response:**
```json
{
  "status": 200,
  "message": "Room berhasil dihapus",
  "data": {
    "id": 1,
    "code": "ABC123",
    "deleted": true
  }
}
```

---

## GET `/admin/nobar/cleanup-stale`

Hapus semua room V2 yang aktif lebih dari 10 jam (default). Socket `ROOM_ENDED` di-emit untuk setiap room sebelum dihapus.

**Query Parameters:**

| Param | Type | Default | Deskripsi |
|---|---|---|---|
| `hours` | number | 10 | Threshold jam untuk anggap stale |

**Response:**
```json
{
  "status": 200,
  "message": "3 room stale (aktif > 10 jam) berhasil dihapus",
  "data": {
    "deleted_count": 3,
    "hours": 10,
    "deleted_rooms": [
      { "id": 5, "code": "XYZ789", "created_at": "2025-07-09T20:00:00.000Z" },
      { "id": 8, "code": "DEF456", "created_at": "2025-07-09T18:30:00.000Z" },
      { "id": 12, "code": "GHI012", "created_at": "2025-07-09T15:00:00.000Z" }
    ]
  }
}
```

---

## GET `/admin/nobar/v1`

List nobar room V1 (legacy). Filter & pagination sama seperti V2 (tanpa `access_mode`).

---

## DELETE `/admin/nobar/v1/:id`

Hard delete room V1. Cascade participants + messages.

---

## DELETE `/admin/nobar/v1/cleanup-stale`

Hapus room V1 yang aktif lebih dari 10 jam.

**Query Parameters:**

| Param | Type | Default | Deskripsi |
|---|---|---|---|
| `hours` | number | 10 | Threshold jam |

---

## Catatan

- **Stale Room Threshold**: Default 10 jam. Room yang masih `ACTIVE` setelah 10 jam dianggap stale dan bisa di-bulk delete via `cleanup-stale`.
- **Hard Delete**: `DELETE /nobar/:id` menghapus room secara permanen (cascade participants + messages). Tidak bisa di-restore.
- **Force End**: `POST /nobar/:id/end` hanya set status ke `ENDED` tanpa hapus. Room record tetap ada untuk audit.
- **Socket Notification**: Saat delete atau end, event `ROOM_ENDED` di-emit ke semua participant yang terhubung via socket.
- **V1 vs V2**: V2 adalah sistem watch party saat ini (dengan anime/episode optional, access mode, dll). V1 adalah legacy (episode wajib, simpler).
- **Permission**: Semua endpoint memerlukan permission `nobar-admin`. Role `SUPERADMIN` memiliki akses ke semua permission.
