# Admin NSFW Quarantine API

API untuk admin melihat **antrian upload gambar NSFW** yang otomatis ditolak untuk user, namun file tetap disimpan di storage (prefix quarantine) supaya admin bisa verifikasi manual.

Base URL: `/v1/admin`

## Auth
Semua endpoint di bawah wajib Admin JWT:

Header:
- `Authorization: Bearer <ADMIN_TOKEN>`

Permission:
- `MENU_PERMISSIONS.MODERATION` (value: `moderation`)

---

## 1) List Quarantine Uploads
GET `/v1/admin/nsfw-quarantine/uploads?page=1&limit=20&status=PENDING_REVIEW&verdict=REJECTED&action=PROFILE_AVATAR&user_id=123`

Query params (opsional):
- `page` (default 1)
- `limit` (default 20, max 100)
- `status`: `PENDING_REVIEW` | `REVIEWED` | `DELETED`
- `verdict`: `APPROVED` | `REJECTED`
- `action`: `PROFILE_AVATAR` | `PROFILE_BANNER` | `PROFILE_COMMENT_BACKGROUND` | `GLOBAL_CHAT_IMAGE`
- `user_id`

Response 200:
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1,
    "items": [
      {
        "id": 10,
        "user_id": 123,
        "action": "PROFILE_AVATAR",
        "source": "profile_avatar",
        "storage_key": "moderation/quarantine/profile_avatar/123/....jpg",
        "url": "https://...",
        "mimetype": "image/jpeg",
        "size_bytes": 12345,
        "vision_result": {
          "context": "profile_avatar",
          "safeSearch": { "adult": "LIKELY", "violence": "VERY_UNLIKELY", "racy": "POSSIBLE" }
        },
        "status": "PENDING_REVIEW",
        "verdict": null,
        "reviewed_at": null,
        "reviewed_by_admin_id": null,
        "notes": null,
        "createdAt": "2026-03-20T00:00:00.000Z",
        "updatedAt": "2026-03-20T00:00:00.000Z",
        "user": {
          "id": 123,
          "username": "foo",
          "account_status": "WARNED",
          "account_status_reason": "UPLOAD_NSFw_IMAGE",
          "profile": { "avatar_url": "https://..." }
        }
      }
    ]
  }
}
```

---

## 2) Get Quarantine Upload Detail
GET `/v1/admin/nsfw-quarantine/uploads/:id`

Response 200:
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 10,
    "user_id": 123,
    "action": "PROFILE_AVATAR",
    "source": "profile_avatar",
    "storage_key": "moderation/quarantine/...",
    "url": "https://...",
    "vision_result": { "context": "profile_avatar", "safeSearch": { "adult": "LIKELY" } },
    "status": "PENDING_REVIEW",
    "verdict": null,
    "reviewed_at": null,
    "reviewed_by_admin_id": null,
    "notes": null,
    "createdAt": "...",
    "updatedAt": "...",
    "user": { "id": 123, "username": "foo", "account_status": "WARNED", "profile": { "avatar_url": "..." } }
  }
}
```

---

## 3) Review (Approve/Reject)
PUT `/v1/admin/nsfw-quarantine/uploads/:id/review`

Body JSON:
```json
{
  "verdict": "REJECTED",
  "notes": "contoh: pornografi"
}
```

- `verdict`: `APPROVED` | `REJECTED` (wajib)
- `notes`: string opsional

Response 200:
```json
{ "success": true, "message": "OK", "data": { "id": 10, "status": "REVIEWED", "verdict": "REJECTED" } }
```

---

## 4) Delete Quarantine Upload (hapus file + tandai record)
DELETE `/v1/admin/nsfw-quarantine/uploads/:id`

Response 200:
```json
{ "success": true, "message": "Deleted" }
```

Catatan:
- Server akan mencoba menghapus file dari storage menggunakan `storage_key`.
- DB record ditandai `status=DELETED`.

---

## 5) Ban User (berdasarkan quarantine upload)
POST `/v1/admin/nsfw-quarantine/uploads/:id/ban`

Body JSON (opsional):
```json
{ "days": 365, "permanent": false }
```

- `days`: default 365
- `permanent`: jika true maka ban permanen

Response 200:
```json
{ "success": true, "message": "OK" }
```

---

## 6) Suspend User (berdasarkan quarantine upload)
POST `/v1/admin/nsfw-quarantine/uploads/:id/suspend`

Body JSON (opsional):
```json
{ "days": 30 }
```

Response 200:
```json
{ "success": true, "message": "OK" }
```

---

## 7) Clear WARNED (set user kembali ACTIVE)
POST `/v1/admin/nsfw-quarantine/uploads/:id/clear-warned`

Response 200:
```json
{ "success": true, "message": "OK" }
```

Catatan:
- Hanya mengubah `account_status` dari `WARNED` ke `ACTIVE`.
- Tidak mengubah SUSPENDED/BANNED.
