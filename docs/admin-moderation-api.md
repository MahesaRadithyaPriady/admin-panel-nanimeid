# Admin Moderation API

Dokumentasi endpoint admin untuk **moderasi** (soft-delete/masking) komentar & global chat.

Base URL: `/v1/admin`

## Auth
Semua endpoint di bawah **wajib** token admin:

Header:
- `Authorization: Bearer <ADMIN_TOKEN>`

Permission yang dibutuhkan:
- `MENU_PERMISSIONS.MODERATION` (value: `moderation`)

---

## 0) List Comments (Admin)
GET `/v1/admin/moderation/comments?page=1&limit=20&q=...&is_deleted=false&anime_id=...&episode_id=...&user_id=...`

- Query (opsional):
  - `page` (default 1)
  - `limit` (default 20, max 100)
  - `q` (search di `content`, `username`, `full_name`)
  - `is_deleted` (`true` | `false`)
  - `anime_id`
  - `episode_id`
  - `user_id`

Response 200:
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "page": 1,
    "limit": 20,
    "total": 123,
    "totalPages": 7,
    "items": [
      {
        "id": 10,
        "user_id": 99,
        "anime_id": 1,
        "episode_id": null,
        "content": "...",
        "kind": "TEXT",
        "is_deleted": false,
        "deleted_at": null,
        "createdAt": "...",
        "user": { "id": 99, "username": "u", "profile": { "full_name": "...", "avatar_url": "..." } },
        "_count": { "likes": 0, "replies": 0 }
      }
    ]
  }
}
```

Catatan:
- Jika `kind` = `STICKER`, field `sticker` akan terisi dan include `image_url`.

---

## 0b) List Global Chat (Admin)
GET `/v1/admin/moderation/global-chat?page=1&limit=20&q=...&is_deleted=false&parent_id=...&user_id=...&kind=TEXT`

- Query (opsional):
  - `page` (default 1)
  - `limit` (default 20, max 100)
  - `q` (search di `content`, `username`, `full_name`)
  - `is_deleted` (`true` | `false`)
  - `parent_id` (filter message root/reply. jika ingin root-only set `parent_id=null` tidak didukung; gunakan list tanpa parameter lalu filter di UI)
  - `user_id`
  - `kind` (`TEXT` | `IMAGE` | `STICKER`)

Response 200:
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "page": 1,
    "limit": 20,
    "total": 999,
    "totalPages": 50,
    "items": [
      {
        "id": 1202,
        "user_id": 10,
        "content": "...",
        "kind": "TEXT",
        "parent_id": null,
        "is_deleted": false,
        "deleted_at": null,
        "createdAt": "...",
        "user": { "id": 10, "username": "...", "profile": { "full_name": "...", "avatar_url": "..." } },
        "parent": null,
        "_count": { "replies": 1 }
      }
    ]
  }
}
```

Catatan:
- Jika `kind` = `STICKER`, field `sticker` akan terisi dan include `image_url`.
- Jika item adalah reply (`parent_id` terisi), maka field `parent` juga akan include `sticker` (jika parent `STICKER`).

---

## 0c) List Comment Replies (Admin)
GET `/v1/admin/moderation/comments/:id/replies?page=1&limit=50&q=...&is_deleted=false`

- Path param:
  - `id`: ID comment
- Query (opsional):
  - `page` (default 1)
  - `limit` (default 50, max 100)
  - `q`
  - `is_deleted` (`true` | `false`)

Response 200:
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "comment_id": 10,
    "page": 1,
    "limit": 50,
    "total": 3,
    "totalPages": 1,
    "items": [
      {
        "id": 101,
        "comment_id": 10,
        "content": "...",
        "kind": "TEXT",
        "sticker": null,
        "is_deleted": false,
        "createdAt": "...",
        "user": { "id": 99, "username": "...", "profile": { "full_name": "...", "avatar_url": "..." } }
      }
    ]
  }
}
```

---

## 0d) List Global Chat Replies (Admin)
GET `/v1/admin/moderation/global-chat/:messageId/replies?page=1&limit=50&q=...&is_deleted=false`

- Path param:
  - `messageId`: ID global chat message (root)
- Query (opsional):
  - `page` (default 1)
  - `limit` (default 50, max 100)
  - `q`
  - `is_deleted` (`true` | `false`)

Response 200:
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "parent": { "id": 12, "kind": "TEXT", "content": "...", "sticker": null },
    "page": 1,
    "limit": 50,
    "total": 5,
    "totalPages": 1,
    "items": [
      {
        "id": 13,
        "parent_id": 12,
        "content": "...",
        "kind": "TEXT",
        "sticker": null,
        "is_deleted": false,
        "createdAt": "...",
        "user": { "id": 2, "username": "...", "profile": { "full_name": "...", "avatar_url": "..." } }
      }
    ]
  }
}
```

---

## 1) Soft Delete Comment (Admin)
DELETE `/v1/admin/moderation/comments/:id`

- Path param:
  - `id`: ID komentar

Response 200:
```json
{ "success": true, "message": "Deleted" }
```

Catatan:
- Ini **soft-delete** (set `is_deleted=true`, `deleted_at`, dan konten dimasking ke pesan pelanggaran).

---

## 2) Soft Delete Comment Reply (Admin)
DELETE `/v1/admin/moderation/comment-replies/:replyId`

- Path param:
  - `replyId`: ID reply komentar

Response 200:
```json
{ "success": true, "message": "Deleted" }
```

---

## 3) Soft Delete Global Chat Message/Reply (Admin)
DELETE `/v1/admin/moderation/global-chat/:messageId`

- Path param:
  - `messageId`: ID global chat message (bisa message root atau reply)

Response 200:
```json
{ "success": true, "message": "Deleted" }
```

Catatan:
- Setelah di-soft-delete, semua endpoint public (REST & SSE) akan mengembalikan `content` sebagai:
  - `Komentar Melanggar Ketentuan Dan Sekarang Komentar DI Hapus`
