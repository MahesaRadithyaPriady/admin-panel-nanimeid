# Admin Feed Management API

Semua path di bawah menggunakan prefix: `/v1/admin`.

**Auth**: Wajib menggunakan Admin Bearer Token (`Authorization: Bearer <admin_token>`).

**Permission**: Memerlukan permission `moderation` (atau role `SUPERADMIN`).

## Ringkasan Endpoint

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/v1/admin/feed/stats` | Statistik feed (total posts, deleted, likes, comments, views, reports) |
| GET | `/v1/admin/feed` | Daftar feed posts dengan filter & pagination |
| GET | `/v1/admin/feed/:id` | Detail feed post + laporan terkait |
| DELETE | `/v1/admin/feed/:id` | Soft delete post (mark as deleted) |
| PUT | `/v1/admin/feed/:id/restore` | Pulihkan post yang di-soft delete |
| DELETE | `/v1/admin/feed/:id/permanent` | Hapus post permanen (cascade delete) |
| GET | `/v1/admin/feed/comments` | Daftar komentar feed dengan filter & pagination |
| DELETE | `/v1/admin/feed/comments/:id` | Soft delete komentar |
| PUT | `/v1/admin/feed/comments/:id/restore` | Pulihkan komentar yang di-soft delete |
| DELETE | `/v1/admin/feed/comments/:id/permanent` | Hapus komentar permanen (cascade delete) |

---

## GET `/v1/admin/feed/stats`

Statistik ringkas tentang feed.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_posts": 500,
    "active_posts": 480,
    "deleted_posts": 20,
    "total_likes": 15000,
    "total_comments": 8000,
    "total_views": 500000,
    "total_reports": 45,
    "pending_reports": 12
  }
}
```

---

## GET `/v1/admin/feed`

Daftar feed posts dengan filter, search, dan pagination.

**Query Parameters:**

| Param | Type | Default | Deskripsi |
|---|---|---|---|
| `search` | string | - | Cari berdasarkan caption atau prefix |
| `page` | number | 1 | Halaman |
| `limit` | number | 20 | Jumlah item per halaman (max 100) |
| `is_deleted` | "true"/"false" | - | Filter berdasarkan status soft delete |
| `user_id` | number | - | Filter berdasarkan user ID |
| `has_reports` | "true"/"false" | - | Filter: hanya post yang punya laporan |
| `sort` | string | "createdAt" | Field sort: `createdAt`, `updatedAt`, `video_size_bytes`, `reports` |
| `order` | "asc"/"desc" | "desc" | Urutan sort |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 10,
      "username": "user123",
      "avatar_url": "https://cdn.../avatar.jpg",
      "caption": "Anime terbaik!",
      "prefix": "vid_abc123",
      "cover_url": "https://cdn.../cover.jpg",
      "master_url": "https://cdn.../master.m3u8",
      "video_size_bytes": 50000000,
      "is_deleted": false,
      "deleted_at": null,
      "likes_count": 150,
      "comments_count": 30,
      "views_count": 5000,
      "bookmarks_count": 20,
      "reports_count": 2,
      "created_at": "2025-07-01T00:00:00.000Z",
      "updated_at": "2025-07-10T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "total_pages": 25
  }
}
```

---

## GET `/v1/admin/feed/:id`

Detail feed post beserta tags, anime terkait, dan daftar laporan.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 10,
    "username": "user123",
    "full_name": "John Doe",
    "avatar_url": "https://cdn.../avatar.jpg",
    "caption": "Anime terbaik!",
    "prefix": "vid_abc123",
    "master_url": "https://cdn.../master.m3u8",
    "cover_url": "https://cdn.../cover.jpg",
    "video_size_bytes": 50000000,
    "video_width": 1080,
    "video_height": 1920,
    "aspect_ratio": "9:16",
    "is_deleted": false,
    "deleted_at": null,
    "tags": ["anime", "fyp"],
    "animes": [
      { "id": 5, "title": "One Piece", "cover_url": "https://cdn.../anime.jpg" }
    ],
    "likes_count": 150,
    "comments_count": 30,
    "views_count": 5000,
    "bookmarks_count": 20,
    "reports_count": 2,
    "reports": [
      {
        "id": 1,
        "reporter_id": 20,
        "reporter_username": "user456",
        "type_label": "Konten tidak pantas",
        "note": "Video mengandung konten sensitif",
        "status": "PENDING",
        "created_at": "2025-07-09T00:00:00.000Z"
      }
    ],
    "created_at": "2025-07-01T00:00:00.000Z",
    "updated_at": "2025-07-10T00:00:00.000Z"
  }
}
```

**Error:**
- `404` — Post tidak ditemukan

---

## DELETE `/v1/admin/feed/:id`

Soft delete post. Post tidak benar-benar dihapus dari database, hanya ditandai `is_deleted=true` dan `deleted_at` diisi. Post yang di-soft delete tidak akan tampil di feed user.

**Response:**
```json
{
  "success": true,
  "message": "Post berhasil dihapus (soft delete)"
}
```

**Error:**
- `404` — Post tidak ditemukan
- `409` — Post sudah dihapus

---

## PUT `/v1/admin/feed/:id/restore`

Pulihkan post yang sebelumnya di-soft delete. Mengembalikan `is_deleted=false` dan `deleted_at=null`.

**Response:**
```json
{
  "success": true,
  "message": "Post berhasil dipulihkan"
}
```

**Error:**
- `404` — Post tidak ditemukan
- `409` — Post tidak sedang dihapus

---

## DELETE `/v1/admin/feed/:id/permanent`

Hapus post secara permanen. Semua data terkait akan terhapus via database cascade:
- `VideoPostLike`
- `VideoPostComment`
- `VideoPostTag`
- `VideoPostAnime`
- `VideoPostView`
- `VideoPostBookmark`
- `VideoPostUploadJob`
- `FeedReport`

**Response:**
```json
{
  "success": true,
  "message": "Post berhasil dihapus permanen"
}
```

**Error:**
- `404` — Post tidak ditemukan

---

## GET `/v1/admin/feed/comments`

Daftar komentar feed dengan filter, search, dan pagination.

**Query Parameters:**

| Param | Type | Default | Deskripsi |
|---|---|---|---|
| `post_id` | number | - | Filter berdasarkan post ID |
| `user_id` | number | - | Filter berdasarkan user ID |
| `search` | string | - | Cari berdasarkan isi komentar |
| `is_deleted` | "true"/"false" | - | Filter berdasarkan status soft delete |
| `page` | number | 1 | Halaman |
| `limit` | number | 20 | Jumlah item per halaman (max 100) |
| `sort` | string | "createdAt" | Field sort: `createdAt`, `updatedAt` |
| `order` | "asc"/"desc" | "desc" | Urutan sort |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "post_id": 100,
      "user_id": 10,
      "username": "user123",
      "avatar_url": "https://cdn.../avatar.jpg",
      "parent_comment_id": null,
      "reply_to_comment_id": null,
      "content": "Keren banget!",
      "is_edited": false,
      "is_deleted": false,
      "deleted_at": null,
      "loves_count": 5,
      "replies_count": 2,
      "created_at": "2025-07-01T00:00:00.000Z",
      "updated_at": "2025-07-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "total_pages": 25
  }
}
```

---

## DELETE `/v1/admin/feed/comments/:id`

Soft delete komentar. Komentar ditandai `is_deleted=true` dan `deleted_at` diisi. Komentar tidak tampil di feed user, tetapi masih ada di database.

**Response:**
```json
{
  "success": true,
  "message": "Komentar berhasil dihapus (soft delete)"
}
```

**Error:**
- `404` — Komentar tidak ditemukan
- `409` — Komentar sudah dihapus

---

## PUT `/v1/admin/feed/comments/:id/restore`

Pulihkan komentar yang sebelumnya di-soft delete.

**Response:**
```json
{
  "success": true,
  "message": "Komentar berhasil dipulihkan"
}
```

**Error:**
- `404` — Komentar tidak ditemukan
- `409` — Komentar tidak sedang dihapus

---

## DELETE `/v1/admin/feed/comments/:id/permanent`

Hapus komentar secara permanen. Semua data terkait akan terhapus via database cascade:
- `VideoPostCommentLove`
- `VideoPostComment` (replies — cascade delete)

**Response:**
```json
{
  "success": true,
  "message": "Komentar berhasil dihapus permanen"
}
```

**Error:**
- `404` — Komentar tidak ditemukan

---

## Catatan

- **Permission**: Endpoint ini memerlukan permission `moderation`. Role `SUPERADMIN` memiliki akses ke semua permission.
- **Soft Delete vs Permanent Delete**:
  - **Soft delete** (`DELETE /feed/:id` atau `DELETE /feed/comments/:id`): Data ditandai `is_deleted=true`, tidak tampil di feed, tetapi masih ada di database. Dapat dipulihkan.
  - **Permanent delete** (`DELETE /feed/:id/permanent` atau `DELETE /feed/comments/:id/permanent`): Data dihapus dari database beserta semua data terkait. Tidak dapat dikembalikan.
- **Feed Reports**: Post yang memiliki laporan dapat dilihat detailnya via `GET /feed/:id` yang menampilkan daftar laporan terkait. Untuk mengelola laporan secara terpisah, gunakan endpoint di `/v1/admin/feed-reports`.
- **Filtering**: Gunakan `is_deleted=true` untuk melihat post/komentar yang telah di-soft delete (untuk monitoring/audit).
- **Komentar Balasan**: Komentar memiliki struktur parent-child (`parent_comment_id` dan `reply_to_comment_id`). Permanent delete pada parent akan cascade delete semua replies.
