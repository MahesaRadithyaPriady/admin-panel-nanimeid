# Admin Clan Management API

Semua path di bawah menggunakan prefix: `/v1/admin`.

**Auth**: Wajib menggunakan Admin Bearer Token (`Authorization: Bearer <admin_token>`).

**Permission**: Memerlukan permission `clan-admin` (atau role `SUPERADMIN`).

## Ringkasan Endpoint

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/v1/admin/clans/stats` | Statistik clan (total, banned, active, public, private, total members) |
| GET | `/v1/admin/clans` | Daftar semua clan dengan filter & pagination |
| GET | `/v1/admin/clans/:id` | Detail clan beserta anggota |
| PUT | `/v1/admin/clans/:id/ban` | Ban clan dengan alasan |
| PUT | `/v1/admin/clans/:id/unban` | Unban clan |
| DELETE | `/v1/admin/clans/:id` | Hapus clan secara permanen |

---

## GET `/v1/admin/clans/stats`

Mengambil statistik ringkas tentang clan.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_clans": 50,
    "banned_clans": 3,
    "active_clans": 47,
    "public_clans": 40,
    "private_clans": 10,
    "total_members": 1200
  }
}
```

---

## GET `/v1/admin/clans`

Mengambil daftar semua clan dengan filter dan pagination.

**Query Parameters:**

| Param | Type | Default | Deskripsi |
|---|---|---|---|
| `search` | string | - | Cari berdasarkan name, tag, atau description |
| `page` | number | 1 | Halaman |
| `limit` | number | 20 | Jumlah item per halaman (max 100) |
| `is_banned` | "true"/"false" | - | Filter berdasarkan status ban |
| `is_public` | "true"/"false" | - | Filter berdasarkan visibility |
| `sort` | string | "createdAt" | Field sort: `createdAt`, `name`, `tag`, `updatedAt` |
| `order` | "asc"/"desc" | "desc" | Urutan sort |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Anime Lovers",
      "tag": "ANL",
      "tag_color": "#FF0000",
      "tag_font": "default",
      "description": "Clan untuk pecinta anime",
      "logo_url": null,
      "banner_url": null,
      "max_members": 30,
      "is_public": true,
      "is_banned": false,
      "banned_at": null,
      "ban_reason": null,
      "leader_id": 10,
      "leader_username": "user123",
      "member_count": 25,
      "total_xp": 50000,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-10T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "total_pages": 3
  }
}
```

---

## GET `/v1/admin/clans/:id`

Mengambil detail clan beserta daftar anggota.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Anime Lovers",
    "tag": "ANL",
    "tag_color": "#FF0000",
    "tag_font": "default",
    "description": "Clan untuk pecinta anime",
    "logo_url": null,
    "banner_url": null,
    "max_members": 30,
    "is_public": true,
    "is_banned": false,
    "banned_at": null,
    "ban_reason": null,
    "leader_id": 10,
    "leader_username": "user123",
    "member_count": 25,
    "total_xp": 50000,
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-10T00:00:00.000Z",
    "leader": {
      "id": 10,
      "username": "user123",
      "full_name": "John Doe",
      "avatar_url": "https://cdn.../avatar.jpg"
    },
    "members": [
      {
        "id": 10,
        "username": "user123",
        "full_name": "John Doe",
        "avatar_url": "https://cdn.../avatar.jpg",
        "role": "leader",
        "level": 21,
        "xp": 15000,
        "joined_at": "2025-01-01T00:00:00.000Z"
      },
      {
        "id": 11,
        "username": "user456",
        "full_name": "Jane Doe",
        "avatar_url": "https://cdn.../avatar2.jpg",
        "role": "officer",
        "level": 15,
        "xp": 10000,
        "joined_at": "2025-01-02T00:00:00.000Z"
      }
    ]
  }
}
```

**Error:**
- `404` — Clan tidak ditemukan

---

## PUT `/v1/admin/clans/:id/ban`

Membanned clan dengan alasan. Clan yang dibanned:
- Tidak muncul di daftar clan publik
- Tidak bisa di-join oleh user baru
- Anggota yang sudah join tetap bisa melihat clan

**Body:**
```json
{
  "ban_reason": "Clan melanggar pedoman komunitas"
}
```

| Field | Type | Wajib | Deskripsi |
|---|---|---|---|
| `ban_reason` | string | Ya | Alasan ban (max 500 karakter) |

**Response:**
```json
{
  "success": true,
  "message": "Clan berhasil dibanned",
  "data": {
    "id": 1,
    "name": "Anime Lovers",
    "tag": "ANL",
    "is_banned": true,
    "banned_at": "2025-07-10T09:00:00.000Z",
    "ban_reason": "Clan melanggar pedoman komunitas",
    "..."
  }
}
```

**Error:**
- `400` — ban_reason wajib diisi
- `404` — Clan tidak ditemukan
- `409` — Clan sudah dibanned

---

## PUT `/v1/admin/clans/:id/unban`

Membuka ban clan. Menghapus status banned, `banned_at`, dan `ban_reason`.

**Response:**
```json
{
  "success": true,
  "message": "Clan berhasil di-unban",
  "data": {
    "id": 1,
    "name": "Anime Lovers",
    "tag": "ANL",
    "is_banned": false,
    "banned_at": null,
    "ban_reason": null,
    "..."
  }
}
```

**Error:**
- `404` — Clan tidak ditemukan
- `409` — Clan tidak sedang dibanned

---

## DELETE `/v1/admin/clans/:id`

Menghapus clan secara permanen. Semua data terkait (ClanMember) akan terhapus karena cascade delete.

**Response:**
```json
{
  "success": true,
  "message": "Clan berhasil dihapus"
}
```

**Error:**
- `404` — Clan tidak ditemukan

---

## Catatan

- **Permission**: Endpoint ini memerlukan permission `clan-admin`. Role `SUPERADMIN` memiliki akses ke semua permission.
- **Ban vs Delete**: Ban bersifat reversible (dapat di-unban), sedangkan delete bersifat permanen dan tidak dapat dikembalikan.
- **Banned clan behavior**: Clan yang dibanned tetap ada di database, namun:
  - Tidak muncul di `GET /v1/clans` (public listing)
  - Tidak bisa di-join via `POST /v1/clans/:id/join`
  - Anggota yang sudah join tetap dapat melihat dan menggunakan clan
- **Audit**: Disarankan untuk selalu mengisi `ban_reason` dengan jelas untuk keperluan audit.
