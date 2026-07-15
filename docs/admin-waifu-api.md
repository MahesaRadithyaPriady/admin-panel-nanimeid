# Admin Waifu Vote Management API

Semua path di bawah menggunakan prefix: `/v1/waifu` (public/user) dan `/v1/waifu` (admin).

**Auth Admin**: Wajib menggunakan Admin Bearer Token (`Authorization: Bearer <admin_token>`).

**Permission Admin**: Memerlukan permission `waifu-vote` (atau role `SUPERADMIN`).

## Sistem Voting Grup

Waifu voting sekarang menggunakan sistem **grup**. Setiap waifu dapat ditempatkan dalam grup tertentu. User dapat **vote 1x per grup dalam 24 jam**, sehingga user bisa vote untuk waifu di beberapa grup berbeda secara bersamaan.

---

## Ringkasan Endpoint

### Public / User

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/v1/waifu/groups` | Daftar grup waifu aktif |
| GET | `/v1/waifu/groups/:id` | Detail grup + daftar waifu di grup tersebut |
| GET | `/v1/waifu/vote/terms` | Syarat & ketentuan vote |
| GET | `/v1/waifu/vote/cooldown` | Cek cooldown vote user per grup (butuh `group_id` & `fingerprint_hash`) |
| GET | `/v1/waifu/vote/cooldown/all-groups` | Cek cooldown vote user untuk semua grup sekaligus |
| GET | `/v1/waifu` | Daftar waifu (support filter `group_id`, `q`) |
| GET | `/v1/waifu/:id` | Detail waifu |
| POST | `/v1/waifu/:id/vote` | Vote waifu (butuh `fingerprint_hash`, opsional `group_id`) |

### Admin

| Method | Path | Deskripsi |
|---|---|---|
| POST | `/v1/waifu/groups` | Buat grup waifu baru |
| PUT | `/v1/waifu/groups/:id` | Update grup waifu |
| DELETE | `/v1/waifu/groups/:id` | Hapus grup waifu (waifu & vote group_id di-set null) |
| POST | `/v1/waifu` | Tambah waifu (support `group_id`) |
| PUT | `/v1/waifu/:id` | Update waifu (support `group_id`) |
| DELETE | `/v1/waifu/:id` | Hapus waifu |
| POST | `/v1/waifu/reset` | Reset vote (semua atau per `group_id`) |

---

## GET `/v1/waifu/groups`

Daftar grup waifu yang aktif.

**Query Parameters:**

| Param | Type | Default | Deskripsi |
|---|---|---|---|
| `include_inactive` | "true"/"false" | "false" | Sertakan grup non-aktif (admin only) |

**Response:**
```json
{
  "status": 200,
  "message": "OK",
  "data": [
    {
      "id": 1,
      "name": "Waifu Anime Spring 2025",
      "description": "Vote waifu terbaik musim semi 2025",
      "sort_order": 0,
      "is_active": true,
      "waifus_count": 10,
      "total_votes": 5000,
      "created_at": "2025-07-01T00:00:00.000Z",
      "updated_at": "2025-07-10T00:00:00.000Z"
    }
  ]
}
```

---

## GET `/v1/waifu/groups/:id`

Detail grup beserta daftar waifu di dalamnya (urut by total_votes desc).

**Response:**
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "id": 1,
    "name": "Waifu Anime Spring 2025",
    "description": "Vote waifu terbaik musim semi 2025",
    "sort_order": 0,
    "is_active": true,
    "total_votes": 5000,
    "waifus": [
      {
        "id": 5,
        "name": "Zero Two",
        "anime_title": "Darling in the Franxx",
        "image_url": "https://cdn.../zero-two.jpg",
        "total_votes": 1500,
        "total_votes_fmt": "1.5rb"
      }
    ]
  }
}
```

**Error:**
- `404` — Grup tidak ditemukan

---

## GET `/v1/waifu/vote/cooldown/all-groups`

Cek status cooldown vote user untuk **semua grup** sekaligus. Membutuhkan login dan `fingerprint_hash`.

**Query Parameters:**

| Param | Type | Deskripsi |
|---|---|---|
| `fingerprint_hash` | string | Wajib. Hash fingerprint device |

**Response:**
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "groups": [
      {
        "group_id": 1,
        "group_name": "Waifu Anime Spring 2025",
        "can_vote": false,
        "nextAllowedAt": "2025-07-11T10:00:00.000Z",
        "last_waifu_id": 5
      },
      {
        "group_id": 2,
        "group_name": "Waifu Anime Summer 2025",
        "can_vote": true,
        "nextAllowedAt": null,
        "last_waifu_id": null
      }
    ]
  }
}
```

---

## GET `/v1/waifu/vote/cooldown`

Cek cooldown vote untuk **grup tertentu**.

**Query Parameters:**

| Param | Type | Deskripsi |
|---|---|---|
| `fingerprint_hash` | string | Wajib. Hash fingerprint device |
| `group_id` | number | Opsional. ID grup untuk cek per grup |

**Response:**
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "can_vote": false,
    "group_id": 1,
    "nextAllowedAt": "2025-07-11T10:00:00.000Z",
    "user": {
      "can_vote": false,
      "nextAllowedAt": "2025-07-11T10:00:00.000Z",
      "last_waifu_id": 5
    },
    "device": {
      "can_vote": false,
      "nextAllowedAt": "2025-07-11T10:00:00.000Z",
      "last_waifu_id": 5,
      "last_user_id": 10
    }
  }
}
```

---

## POST `/v1/waifu/:id/vote`

Vote untuk waifu tertentu. Cooldown 24 jam **per grup** (user & device).

**Auth**: Wajib login (`Authorization: Bearer <user_token>`)

**Body:**

| Field | Type | Deskripsi |
|---|---|---|
| `fingerprint_hash` | string | Wajib. Hash fingerprint device |
| `group_id` | number | Opsional. ID grup (jika tidak diisi, diambil dari waifu.group_id) |

**Response (sukses):**
```json
{
  "status": 200,
  "message": "Terima kasih sudah memilih!",
  "data": {
    "waifu_id": 5,
    "group_id": 1,
    "total_votes": 1501,
    "total_votes_fmt": "1.5rb"
  }
}
```

**Error:**
- `400` — `fingerprint_hash` wajib (code: `001`)
- `404` — Waifu tidak ditemukan
- `429` — VOTE_COOLDOWN / DEVICE_VOTE_COOLDOWN (sudah vote di grup ini dalam 24 jam)

---

## POST `/v1/waifu/groups` — Admin

Buat grup waifu baru.

**Body:**

| Field | Type | Default | Deskripsi |
|---|---|---|---|
| `name` | string | - | Wajib. Nama grup |
| `description` | string | null | Deskripsi grup |
| `sort_order` | number | 0 | Urutan tampil |
| `is_active` | boolean | true | Status aktif |

**Response:**
```json
{
  "status": 201,
  "message": "Created",
  "data": {
    "id": 3,
    "name": "Waifu Anime Fall 2025",
    "description": "Vote waifu terbaik musim gugur 2025",
    "sort_order": 2,
    "is_active": true,
    "createdAt": "2025-07-10T00:00:00.000Z",
    "updatedAt": "2025-07-10T00:00:00.000Z"
  }
}
```

---

## PUT `/v1/waifu/groups/:id` — Admin

Update grup waifu.

**Body:** (semua opsional)

| Field | Type | Deskripsi |
|---|---|---|
| `name` | string | Nama grup |
| `description` | string | Deskripsi grup |
| `sort_order` | number | Urutan tampil |
| `is_active` | boolean | Status aktif |

**Response:**
```json
{
  "status": 200,
  "message": "Updated",
  "data": { ... }
}
```

**Error:**
- `404` — Grup tidak ditemukan

---

## DELETE `/v1/waifu/groups/:id` — Admin

Hapus grup waifu. `group_id` pada waifu dan vote akan di-set `null` (onDelete: SetNull).

**Response:**
```json
{
  "status": 200,
  "message": "Deleted",
  "data": { "deleted": true }
}
```

**Error:**
- `404` — Grup tidak ditemukan

---

## POST `/v1/waifu` — Admin

Tambah waifu baru. Support `group_id` untuk menempatkan waifu dalam grup.

**Body:**

| Field | Type | Deskripsi |
|---|---|---|
| `name` | string | Wajib. Nama waifu |
| `anime_title` | string | Wajib. Judul anime |
| `image_url` | string | URL gambar (opsional jika upload file) |
| `description` | string | Deskripsi waifu |
| `group_id` | number | ID grup untuk menempatkan waifu |

**Response:**
```json
{
  "status": 201,
  "message": "Created",
  "data": {
    "id": 10,
    "group_id": 1,
    "name": "Miku Nakano",
    "anime_title": "Gotoubun no Hanayome",
    "image_url": "https://cdn.../miku.jpg",
    "description": "One of the quintessential quintuplets",
    "total_votes": 0,
    "createdAt": "2025-07-10T00:00:00.000Z",
    "updatedAt": "2025-07-10T00:00:00.000Z"
  }
}
```

---

## PUT `/v1/waifu/:id` — Admin

Update waifu. Support perubahan `group_id` (set ke `null` untuk menghapus dari grup).

**Body:** (semua opsional, sama dengan create)

**Response:**
```json
{
  "status": 200,
  "message": "Updated",
  "data": { ... }
}
```

---

## DELETE `/v1/waifu/:id` — Admin

Hapus waifu beserta semua vote-nya (cascade delete).

**Response:**
```json
{
  "status": 200,
  "message": "Deleted",
  "data": { ... }
}
```

---

## POST `/v1/waifu/reset` — Admin

Reset vote. Bisa reset semua atau per grup.

**Body:**

| Field | Type | Deskripsi |
|---|---|---|
| `group_id` | number | Opsional. Jika diisi, hanya reset vote untuk grup tersebut |

**Response:**
```json
{
  "status": 200,
  "message": "Vote grup berhasil direset",
  "data": {
    "reset": true,
    "group_id": 1
  }
}
```

---

## Catatan

- **Sistem Grup**: Waifu dapat dikelompokkan ke dalam grup. User dapat vote 1x per grup dalam 24 jam, sehingga bisa vote untuk waifu di beberapa grup berbeda.
- **Cooldown**: 24 jam per grup, berlaku untuk user ID dan device fingerprint. Jika waifu tidak punya grup, cooldown bersifat global.
- **Auto group_id**: Saat vote, jika `group_id` tidak dikirim di body, sistem akan mengambil `group_id` dari waifu yang di-vote.
- **Delete Grup**: Menghapus grup tidak menghapus waifu atau vote. `group_id` pada waifu dan vote di-set `null` (onDelete: SetNull).
- **Reset Vote**: Reset per grup hanya menghapus vote dan reset `total_votes` waifu dalam grup tersebut. Waifu di luar grup tidak terpengaruh.
- **Permission**: Admin endpoint memerlukan permission `waifu-vote`. Role `SUPERADMIN` memiliki akses ke semua permission.
- **Migration**: Setelah update schema, jalankan `npx prisma db push` untuk apply schema changes.

---

# Tournament & Knockout Bracket System

Sistem tournament waifu dengan **group stage → knockout bracket** seperti turnamen sepak bola.

## Alur Tournament

1. **Group Stage**: User vote waifu per grup (sistem grup yang sudah ada). Cooldown 24 jam per grup.
2. **Generate Bracket**: Admin trigger generate bracket → top N waifu per grup (by total_votes) masuk ke knockout.
3. **Knockout**: 1v1 match bracket. User vote pilih salah satu waifu. Jika seri → random 50/50.
4. **Round Advancement**: Admin close round → pemenang auto-advance ke round berikutnya. Bracket next round auto-generated.
5. **Champion**: Round terakhir → 1 pemenang = champion.

## Ringkasan Endpoint Tournament

### Public / User

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/v1/waifu/tournaments/active` | Tournament aktif saat ini |
| GET | `/v1/waifu/tournaments` | Daftar semua tournament |
| GET | `/v1/waifu/tournaments/:id` | Detail tournament + full bracket (semua round) |
| GET | `/v1/waifu/tournaments/:id/matches` | Match di round saat ini |
| POST | `/v1/waifu/matches/:id/vote` | Vote pada match (butuh login + `waifu_id`) |

### Admin

| Method | Path | Deskripsi |
|---|---|---|
| POST | `/v1/waifu/tournaments` | Buat tournament baru |
| DELETE | `/v1/waifu/tournaments/:id` | Hapus tournament |
| POST | `/v1/waifu/tournaments/:id/generate-bracket` | Generate bracket dari hasil group stage |
| POST | `/v1/waifu/tournaments/:id/start-round` | Buka voting untuk round saat ini |
| POST | `/v1/waifu/tournaments/:id/close-round` | Tutup voting, tentukan pemenang, advance round |

---

## POST `/v1/waifu/tournaments` — Admin

Buat tournament baru.

**Body:**

| Field | Type | Default | Deskripsi |
|---|---|---|---|
| `name` | string | - | Wajib. Nama tournament |
| `description` | string | null | Deskripsi tournament |
| `advance_per_group` | number | 3 | Top N waifu per grup yang masuk knockout |

**Response:**
```json
{
  "status": 201,
  "message": "Created",
  "data": {
    "id": 1,
    "name": "Waifu Tournament 2025",
    "description": "Turnamen waifu tahun 2025",
    "status": "GROUP_STAGE",
    "current_round": 0,
    "advance_per_group": 3,
    "total_rounds": 0,
    "is_active": true,
    "createdAt": "2025-07-10T00:00:00.000Z",
    "updatedAt": "2025-07-10T00:00:00.000Z"
  }
}
```

---

## POST `/v1/waifu/tournaments/:id/generate-bracket` — Admin

Generate knockout bracket dari hasil group stage. Ambil top N waifu per grup (by `total_votes`), seed ke bracket seperti turnamen sepak bola.

**Cara kerja:**
1. Ambil top `advance_per_group` waifu dari setiap grup aktif (urut by `total_votes` desc)
2. Hitung bracket size = next power of 2 (contoh: 42 waifu → bracket 64)
3. Seed: waifu dengan votes tertinggi = seed 1, dst. Bye diberikan ke top seeds.
4. Buat semua match untuk round 1 + placeholder untuk round berikutnya
5. Match dengan bye → auto CLOSED (waifu langsung advance)

**Response:**
```json
{
  "status": 200,
  "message": "Bracket berhasil dibuat",
  "data": {
    "tournament_id": 1,
    "bracket_size": 64,
    "qualified_count": 42,
    "bye_count": 22,
    "total_rounds": 6,
    "round1_matches": 32
  }
}
```

**Error:**
- `400` — Bracket sudah dibuat / kurang dari 2 waifu qualified

---

## POST `/v1/waifu/tournaments/:id/start-round` — Admin

Buka voting untuk round saat ini. Semua match PENDING di round ini → status OPEN.

**Body:**

| Field | Type | Deskripsi |
|---|---|---|
| `starts_at` | ISO datetime | Opsional. Waktu mulai (default: now) |
| `ends_at` | ISO datetime | Opsional. Waktu berakhir |

**Response:**
```json
{
  "status": 200,
  "message": "Round 1 dibuka untuk voting",
  "data": {
    "round": 1,
    "matches_opened": 20,
    "starts_at": "2025-07-10T10:00:00.000Z",
    "ends_at": "2025-07-11T10:00:00.000Z"
  }
}
```

---

## POST `/v1/waifu/tournaments/:id/close-round` — Admin

Tutup voting, tentukan pemenang setiap match, dan auto-generate round berikutnya.

**Cara kerja:**
1. Semua match OPEN → CLOSED
2. Pemenang: votes terbanyak menang. **Jika seri → random 50/50**
3. Jika round terakhir → tournament COMPLETED, champion ditentukan
4. Jika bukan round terakhir → pemenang auto-isi match di round berikutnya
5. Bye di round berikutnya (jika ganjil) → auto-advance

**Response (round selesai, lanjut):**
```json
{
  "status": 200,
  "message": "Round 1 selesai. Round 2 siap.",
  "data": {
    "round": 1,
    "resolved_count": 20,
    "random_tiebreak_count": 2,
    "tournament_completed": false,
    "next_round": 2,
    "next_round_matches": 16
  }
}
```

**Response (tournament selesai):**
```json
{
  "status": 200,
  "message": "Tournament selesai! Champion: waifu_id=89",
  "data": {
    "round": 6,
    "resolved_count": 1,
    "random_tiebreak_count": 0,
    "tournament_completed": true,
    "champion_id": 89
  }
}
```

---

## GET `/v1/waifu/tournaments/:id`

Detail tournament + full bracket (semua round, semua match).

**Response:**
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "id": 1,
    "name": "Waifu Tournament 2025",
    "status": "KNOCKOUT",
    "current_round": 2,
    "advance_per_group": 3,
    "total_rounds": 6,
    "is_active": true,
    "rounds": [
      {
        "round": 1,
        "matches": [
          {
            "id": 1,
            "round": 1,
            "match_number": 1,
            "waifu1": { "id": 5, "name": "Zero Two", "anime_title": "Darling in the Franxx", "image_url": "...", "total_votes": 1500 },
            "waifu2": { "id": 89, "name": "Taiga Aisaka", "anime_title": "Toradora!", "image_url": "...", "total_votes": 800 },
            "winner": { "id": 5, "name": "Zero Two" },
            "votes1": 120,
            "votes2": 85,
            "status": "CLOSED",
            "is_bye": false,
            "starts_at": "2025-07-10T10:00:00.000Z",
            "ends_at": "2025-07-11T10:00:00.000Z"
          }
        ]
      }
    ]
  }
}
```

---

## GET `/v1/waifu/tournaments/:id/matches`

Match di round saat ini saja (untuk halaman voting user).

**Response:**
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "tournament": {
      "id": 1,
      "name": "Waifu Tournament 2025",
      "status": "KNOCKOUT",
      "current_round": 2,
      "total_rounds": 6
    },
    "matches": [
      {
        "id": 21,
        "round": 2,
        "match_number": 1,
        "waifu1": { "id": 5, "name": "Zero Two", "anime_title": "Darling in the Franxx", "image_url": "...", "total_votes": 1500 },
        "waifu2": { "id": 12, "name": "Miku Nakano", "anime_title": "Gotoubun no Hanayome", "image_url": "...", "total_votes": 1200 },
        "winner": null,
        "votes1": 0,
        "votes2": 0,
        "status": "OPEN",
        "is_bye": false,
        "starts_at": "2025-07-12T10:00:00.000Z",
        "ends_at": "2025-07-13T10:00:00.000Z"
      }
    ]
  }
}
```

---

## POST `/v1/waifu/matches/:id/vote`

Vote untuk salah satu waifu di match. 1 user = 1 vote per match. Device fingerprint check untuk anti-multi-account.

**Auth**: Wajib login (`Authorization: Bearer <user_token>`)

**Body:**

| Field | Type | Deskripsi |
|---|---|---|
| `waifu_id` | number | Wajib. ID waifu yang dipilih (harus salah satu dari waifu1 atau waifu2 di match) |
| `fingerprint_hash` | string | Opsional tapi disarankan. Hash fingerprint device untuk anti-multi-account |

**Response (sukses):**
```json
{
  "status": 200,
  "message": "Vote berhasil!",
  "data": {
    "match_id": 21,
    "waifu_id": 5,
    "votes1": 121,
    "votes2": 85
  }
}
```

**Error:**
- `400` — Match tidak open / waifu tidak ada di match / match is bye
- `404` — Match tidak ditemukan
- `409` — User/device sudah vote di match ini

---

## Catatan Tournament

- **Bracket Seeding**: Waifu di-seed berdasarkan `total_votes` (votes tertinggi = seed 1). Bracket position mengikuti standard tournament seeding (seed 1 vs seed terakhir, dst.) seperti sepak bola.
- **Bye**: Jika jumlah qualified waifu bukan power of 2, top seeds dapat bye (auto-advance tanpa match).
- **Tiebreaker**: Jika votes seri saat round ditutup → **random 50/50** untuk menentukan pemenang.
- **Match Vote**: 1 user 1 vote per match. Device fingerprint check opsional tapi disarankan.
- **Auto-advance**: Saat close-round, pemenang otomatis mengisi match di round berikutnya. Jika ganjil → bye.
- **Champion**: Pemenang final = champion. Tournament status → `COMPLETED`.
- **Reset Tournament**: Hapus tournament lama dan buat baru untuk restart. Atau hapus match dan generate bracket ulang.
