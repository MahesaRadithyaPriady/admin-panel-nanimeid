# Live Chat User ↔ Admin (Secure Relay via Join ACL)

Semua path di bawah menggunakan prefix versi: `/${VERSION}`.

## Konsep

- Backend hanya menyimpan message sebagai ciphertext/metadata (kolom DB bernama `ciphertext` untuk kompatibilitas skema).
- Security via ACL:
  - User hanya bisa mengakses ticket miliknya.
  - Admin hanya bisa mengakses ticket/pesan bila sudah `join` ticket tersebut.

## Prasyarat Admin (Device ID + Public Key)

1) Admin login **wajib** mengirim `device_id`.

2) Admin wajib register public key untuk `device_id` tersebut:
- `POST /${VERSION}/admin/me/public-keys`

Jika public key belum didaftarkan, endpoint join akan mengembalikan error:
- `ADMIN_PUBLIC_KEY_NOT_FOUND`

## User API

### 1) Buat Ticket (Antrian)
POST `/${VERSION}/livechat/tickets`

Body:
```json
{ "issue_text": "Kendala singkat..." }
```

Response 201:
```json
{ "success": true, "data": { "id": 1, "status": "QUEUED", "issue_text": "..." } }
```

### 1b) Riwayat Laporan (List Ticket User)
GET `/${VERSION}/livechat/tickets?status=<STATUS>&take=50&skip=0`

Tujuan:
- Menampilkan daftar riwayat ticket/laporan milik user (tidak perlu standby di chat).

Query:
- `status` (opsional): `QUEUED|ACTIVE|CLOSED|CANCELED`
- `take` (opsional, default 50, max 100)
- `skip` (opsional, default 0)

Response 200:
```json
{
  "success": true,
  "items": [
    {
      "id": 1,
      "status": "CLOSED",
      "issue_text": "...",
      "assigned_admin_id": 10,
      "assigned_admin": { "id": 10, "username": "Elaina", "full_name": "Elaina" },
      "attachments": []
    }
  ],
  "skip": 0,
  "take": 50
}
```

### 2) Upload Attachment Ticket
POST `/${VERSION}/livechat/tickets/:id/attachments`

- Multipart field: `file`
- Bisa dipakai **sebelum** membuat ticket (jika ticket sudah dibuat) atau **selama** chat berlangsung.
- FE dapat mengirim message dengan `attachment_id` yang berasal dari response endpoint ini.

Response 201:
```json
{ "success": true, "data": { "id": 1, "kind": "IMAGE", "url": "..." } }
```

### 3) (Deprecated) Session Key untuk Admin yang Join
POST `/${VERSION}/livechat/tickets/:id/session-key`

Catatan:
- Pada mode E2E, endpoint ini dipakai untuk mengirim `encrypted_session_key` untuk participant admin yang sudah join.
- Backend hanya menyimpan ciphertext (tidak pernah menyimpan plaintext key).

### 4) Kirim Message
POST `/${VERSION}/livechat/tickets/:id/messages`

Body:
```json
{
  "type": "TEXT",
  "content": "Kendala saya ...",
  "attachment_id": null
}
```

Catatan:
- Jika mengirim file/foto, upload dulu via endpoint attachment, lalu kirim message dengan `attachment_id`.
- `content` boleh kosong jika `attachment_id` ada.
- `type` bisa `TEXT|IMAGE|FILE`. Jika `attachment_id` ada dan `type` tidak di-set (atau `TEXT`), backend akan mencoba menyesuaikan `type` mengikuti `attachment.kind`.

### 5) List Messages
GET `/${VERSION}/livechat/tickets/:id/messages?take=50&cursor=<id>`

Catatan:
- Response `items` dikembalikan dengan urutan **paling lama -> paling baru** (chronological).
- Default pagination adalah untuk ambil pesan **lebih lama** (sebelum `cursor`).
- Response sekarang juga mengembalikan `latestCursor`:
  - `nextCursor`: dipakai untuk pagination **older** (scroll ke atas / ambil history lebih lama)
  - `latestCursor`: id pesan **paling baru** dari page yang kamu terima (dipakai untuk polling pesan baru)
- Untuk kompatibilitas FE (Flutter), setiap item message mengandung:
  - `createdAt` (camelCase)
  - `created_at` (snake_case alias)
- Jika message memiliki `attachment_id`, maka field `attachment` akan terisi (berisi `url`, `kind`, dsb.) sehingga admin panel bisa langsung render foto/file.

Poll pesan baru:
- Gunakan `direction=newer&cursor=<last_message_id>` untuk mengambil pesan **lebih baru** (setelah `cursor`).
- Rekomendasi:
  - Setelah load pertama, simpan `latestCursor`.
  - Untuk polling, panggil: `?direction=newer&cursor=<latestCursor>`.
  - Kalau response polling mengembalikan `latestCursor` baru, update cursor polling kamu dengan nilai itu.
  - Jika response polling `items` kosong, jangan mengosongkan list UI dan jangan mengubah cursor.

### 6) Resume Room (ambil info join admin)
GET `/${VERSION}/livechat/tickets/:id/room`

Catatan: endpoint ini butuh auth user (`req.user.id` diambil dari middleware `authenticate`).

Response:
```json
{
  "success": true,
  "data": {
    "ticket": { "id": 1, "status": "ACTIVE", "issue_text": "...", "assigned_admin_id": 10 },
    "admin_participants": [
      { "id": 10, "admin_id": 2, "device_id": "admin-web-1" }
    ],
    "attachments": [/* LiveChatTicketAttachment */]
  }
}
```

### 7) Status Ticket (cek sudah ada admin atau belum)
GET `/${VERSION}/livechat/tickets/:id/status`

Tujuan:
- Untuk Flutter/user app polling: apakah ticket sudah di-handle admin.
- Kalau sudah ada admin, response akan mengembalikan `admin_display`.

Response 200:
```json
{
  "success": true,
  "data": {
    "ticket": { "id": 1, "status": "ACTIVE", "assigned_admin_id": 10 },
    "has_admin": true,
    "admin_display": {
      "id": 10,
      "username": "Elaina",
      "full_name": "Elaina",
      "avatar_url": null,
      "avatar_border_active": null,
      "pictures": []
    }
  }
}
```

## Admin API

Catatan permission: semua endpoint admin live chat butuh permission `livechat` (lihat `GET /${VERSION}/admin/permissions`).

### 1) List Queue
GET `/${VERSION}/admin/livechat/queue?status=QUEUED&take=50&skip=0`

### 1a) List Admin (untuk dropdown transfer)
GET `/${VERSION}/admin/livechat/admins?q=<keyword>&take=50&skip=0`

Tujuan:
- FE admin panel bisa menampilkan daftar admin untuk dipilih saat transfer ticket (tanpa input ID manual).

Query:
- `q` (opsional): cari berdasarkan `username`
- `take` (opsional, default 50, max 100)
- `skip` (opsional, default 0)

Response 200:
```json
{
  "success": true,
  "items": [
    {
      "id": 1,
      "username": "Elaina",
      "full_name": "Elaina",
      "avatar_url": null,
      "avatar_border_active": null,
      "pictures": []
    }
  ],
  "total": 1,
  "skip": 0,
  "take": 50
}
```

### 1c) Livechat Stats (angka bubble)
GET `/${VERSION}/admin/livechat/stats`

Tujuan:
- Mengembalikan jumlah ticket per status untuk badge/bubble di admin panel.

Response 200:
```json
{
  "success": true,
  "queued": 12,
  "active": 3,
  "closed": 90
}
```

### 1b) Riwayat Laporan User (Admin View)
GET `/${VERSION}/admin/livechat/users/:userId/tickets?status=<STATUS>&take=50&skip=0`

Tujuan:
- Admin panel dapat melihat laporan livechat user sebelumnya (histori) berdasarkan `userId`.

Query:
- `status` (opsional): `QUEUED|ACTIVE|CLOSED|CANCELED`
- `take` (opsional, default 50, max 100)
- `skip` (opsional, default 0)

Response 200:
```json
{
  "success": true,
  "items": [
    {
      "id": 123,
      "status": "CLOSED",
      "issue_text": "...",
      "user_display": { "id": 1702, "username": "whyy" },
      "assigned_admin": { "id": 1, "username": "Elaina", "full_name": "Elaina" },
      "attachments": []
    }
  ],
  "total": 1,
  "skip": 0,
  "take": 50
}
```

### 2) Join Ticket
POST `/${VERSION}/admin/livechat/tickets/:id/join`

Body:
```json
{ "device_id": "admin-web-1" }
```

Catatan:
- Jika `device_id` tidak dikirim, backend akan memakai `device_id` dari **Admin JWT**.
- Admin wajib sudah register public key untuk `device_id` tsb via `POST /${VERSION}/admin/me/public-keys`.

Efek join:
- Ticket akan di-set `assigned_admin_id = <admin_id>` (admin penanggung jawab).
- Jika ticket masih `QUEUED`, backend akan otomatis ubah status menjadi `ACTIVE`.
- Saat join pertama kali mengaktifkan ticket, backend juga akan mengirim push notification ke user bahwa admin sudah siap membantu.

Response 200:
```json
{
  "success": true,
  "data": {
    "participant": { "id": 10, "role": "ADMIN", "device_id": "admin-web-1" },
    "public_key": "<base64>",
    "alg": "x25519",
    "access_token": "<server_token>",
    "read_only": false
  }
}
```

### 3) Admin Kirim Message
POST `/${VERSION}/admin/livechat/tickets/:id/messages`

Header wajib:
- `x-livechat-token: <access_token>` (didapat dari endpoint `join`)

Query:
- Default: ambil pesan **lebih lama** (sebelum `cursor`).
- Poll pesan baru: `direction=newer&cursor=<last_message_id>`.

Body:
```json
{
  "device_id": "admin-web-1",
  "type": "TEXT",
  "ciphertext": "<base64>",
  "nonce": "<base64>",
  "alg": "xchacha20poly1305"
}
```

### 4) Admin List Messages
GET `/${VERSION}/admin/livechat/tickets/:id/messages?take=50&cursor=<id>`

Header wajib:
- `x-livechat-token: <access_token>` (didapat dari endpoint `join`)

Catatan:
- Response `items` dikembalikan dengan urutan **paling lama -> paling baru** (chronological).
- Default pagination adalah untuk ambil pesan **lebih lama** (sebelum `cursor`).
- Response sekarang juga mengembalikan `latestCursor`:
  - `nextCursor`: dipakai untuk pagination **older**
  - `latestCursor`: id pesan **paling baru** dari page yang kamu terima (dipakai untuk polling pesan baru)
- Untuk kompatibilitas FE (Flutter), setiap item message mengandung:
  - `createdAt` (camelCase)
  - `created_at` (snake_case alias)
- Jika message memiliki `attachment_id`, maka field `attachment` akan terisi (berisi `url`, `kind`, dsb.) sehingga admin panel bisa render foto/file.

Poll pesan baru:
- Gunakan `direction=newer&cursor=<last_message_id>` untuk mengambil pesan **lebih baru** (setelah `cursor`).
- Rekomendasi:
  - Setelah load pertama, simpan `latestCursor`.
  - Untuk polling, panggil: `?direction=newer&cursor=<latestCursor>`.
  - Kalau response polling mengembalikan `latestCursor` baru, update cursor polling kamu dengan nilai itu.
  - Jika response polling `items` kosong, jangan mengosongkan list UI dan jangan mengubah cursor.

### 5) Post Admin Message
POST `/${VERSION}/admin/livechat/tickets/:id/messages`

Header:
- `x-livechat-token: <access_token>` (wajib)

Body:
```json
{
  "ciphertext": "...",
  "nonce": "...",
  "alg": "xchacha20poly1305",
  "type": "TEXT"
}
```

Catatan:
- Response `data` akan mengembalikan message yang sudah include `sender` dan `sender_display`.
- Rekomendasi FE: setelah `POST` sukses (`201`), langsung append `data` ke UI tanpa harus menunggu polling.

Response:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "ticket_id": 1,
    "sender_participant_id": 10,
    "type": "TEXT",
    "ciphertext": "...",
    "nonce": "...",
    "alg": "xchacha20poly1305",
    "attachment_id": null,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### 4) Kirim Reminder Notifikasi ke User
POST `/${VERSION}/admin/livechat/tickets/:id/remind`

Body (opsional, bisa custom title/body):
```json
{
  "title": "Admin Sedang Menunggu",
  "body": "Admin sudah siap membantu Anda di live chat. Silakan lanjutkan percakapan."
}
```

Catatan:
- Endpoint ini akan mengirim push notification Firebase ke user pemilik ticket.
- Hanya bisa dipakai untuk ticket yang belum `CLOSED` / `CANCELED`.
- Jika body tidak dikirim, backend akan memakai pesan default.

Response 200:
```json
{
  "success": true,
  "data": {
    "ticket_id": 123,
    "user_id": 1702,
    "assigned_admin_id": 1,
    "notification": {
      "title": "Admin Sedang Menunggu",
      "body": "Admin sudah siap membantu Anda di live chat. Silakan lanjutkan percakapan."
    },
    "push": {
      "sent": 1,
      "success": 1,
      "failure": 0,
      "invalidTokens": 0
    }
  }
}
```

### 5) Transfer Ticket
POST `/${VERSION}/admin/livechat/tickets/:id/transfer`

Body:
```json
{ "to_admin_id": 2, "reason": "handover" }
```

Catatan:
- Transfer hanya diizinkan jika status ticket saat ini adalah `ACTIVE`.
- Jika status bukan `ACTIVE`, backend akan return `400` dengan code `TICKET_NOT_ACTIVE`.

### 6) Close Ticket
POST `/${VERSION}/admin/livechat/tickets/:id/close`

Body:
```json
{ "note": "resolved" }
```

Catatan:
- Setelah `CLOSED`, ticket & messages tetap bisa dibuka untuk dilihat ulang (read-only).
- Setelah `CLOSED`, admin tidak bisa kirim message lagi.

### 7) Get My Active Ticket Status
GET `/${VERSION}/admin/livechat/me/active-status`

Catatan:
- Endpoint ini hanya untuk cek ticket ACTIVE yang ditugaskan ke admin.
- Untuk membaca/kirim message, admin tetap perlu memanggil endpoint `join` agar mendapatkan `access_token`.

Response 200:
```json
{
  "success": true,
  "data": {
    "has_active": true,
    "ticket": { "id": 1, "status": "ACTIVE", "user_display": { "id": 1702, "username": "whyy" } }
  }
}
```

## Tabel Route - Service - DB

| Endpoint | Controller | Service | Tabel/kolom DB yang dipakai |
|---|---|---|---|
| `POST /${VERSION}/livechat/tickets` | `createTicketHandler` | `livechat.service.js:createTicket` | `LiveChatTicket`, `LiveChatParticipant` (`role=USER`, `joined_at`) |
| `POST /${VERSION}/livechat/tickets/:id/attachments` | `uploadAttachmentHandler` | `livechat.service.js:uploadTicketAttachment` | `LiveChatTicketAttachment` (kolom `kind`, `storage_key`, `url`, metadata file) |
| `POST /${VERSION}/livechat/tickets/:id/messages` | `postMessageHandler` | `livechat.service.js:postMessage` | `LiveChatMessage` (plaintext `content` disimpan ke kolom `ciphertext`) |
| `GET /${VERSION}/livechat/tickets/:id/messages` | `listMessagesHandler` | `livechat.service.js:listMessages` | `LiveChatMessage` (+ `LiveChatTicketAttachment`, `sender` via `LiveChatParticipant`) |
| `GET /${VERSION}/admin/livechat/queue` | `adminListLivechatQueueHandler` | `adminLivechat.service.js:listQueue` | `LiveChatTicket` (+ `user`, `LiveChatTicketAttachment`) |
| `GET /${VERSION}/admin/livechat/admins` | `adminListLivechatAdminsHandler` | `adminLivechat.service.js:listLivechatAdmins` | `Admin` |
| `GET /${VERSION}/admin/livechat/stats` | `adminGetLivechatStatsHandler` | `adminLivechat.service.js:getLivechatTicketStats` | `LiveChatTicket` (count per `status`) |
| `POST /${VERSION}/admin/livechat/tickets/:id/join` | `adminJoinLivechatTicketHandler` | `adminLivechat.service.js:joinTicketAsAdmin` | `LiveChatParticipant` (`role=ADMIN`, `admin_id`, `device_id`) |
| `POST /${VERSION}/admin/livechat/tickets/:id/remind` | `adminRemindLivechatTicketHandler` | `adminLivechat.service.js:remindTicketUser` | `LiveChatTicket` + `FcmToken` |
| `GET /${VERSION}/admin/livechat/tickets/:id/messages` | `adminListLivechatMessagesHandler` | `adminLivechat.service.js:listTicketMessages` | `LiveChatMessage` (+ `LiveChatTicketAttachment`, `sender` via `LiveChatParticipant`) |
| `POST /${VERSION}/admin/livechat/tickets/:id/messages` | `adminPostLivechatMessageHandler` | `adminLivechat.service.js:postAdminMessage` | `LiveChatMessage` (wajib header `x-livechat-token`) |
| `POST /${VERSION}/admin/livechat/tickets/:id/transfer` | `adminTransferLivechatTicketHandler` | `adminLivechat.service.js:transferTicket` | `LiveChatTransferLog` + update `LiveChatTicket.assigned_admin_id` |
| `POST /${VERSION}/admin/livechat/tickets/:id/close` | `adminCloseLivechatTicketHandler` | `adminLivechat.service.js:closeTicket` | `LiveChatTicket` (`status=CLOSED`, `closed_at`, `close_note`) |

Catatan transfer:
- Saat `transfer`, backend hanya menyimpan/relay **ciphertext** (tidak menyimpan plaintext).
- E2E dilakukan di client:
  - User & Admin encrypt/decrypt.
  - Backend hanya ACL + storage ciphertext.

### Field Display (User/Admin)
Beberapa response akan menyertakan field tambahan untuk kemudahan UI:

- `user_display`: `{ id, username, full_name, avatar_url, avatar_border_active, pictures }`
- `assigned_admin`: `{ id, username, full_name, avatar_url, avatar_border_active, pictures }` (jika ada)
- `sender_display` di message: struktur sama
