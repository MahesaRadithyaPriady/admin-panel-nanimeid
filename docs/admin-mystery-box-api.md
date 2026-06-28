# Admin Mystery Box API

Endpoint admin untuk mengelola Mystery Box dan Tier (CRUD). Admin bisa membuat box baru, atur hadiah per tier, dan auto-generate URL FE dengan `?code=`.

## Base URL

```
{API_PREFIX}/admin/mystery-box
```

Contoh: `http://localhost:3000/2.1.0/admin/mystery-box`

## Auth

Semua endpoint membutuhkan **Admin Bearer Token**:

```
Authorization: Bearer <admin_token>
```

Token admin didapat dari `POST /admin/auth/login`.

---

## Konsep Utama

### Struktur: Box → Tiers → Reward

```
MysteryBox (box code, cost_coins)
  └─ MysteryBoxTier (bisa banyak tier per box)
       ├─ tier_type   → rarity: COMMON, RARE, EPIC, LEGENDARY, MYTHIC
       ├─ weight      → probabilitas (semakin tinggi = semakin sering)
       └─ reward_type → hadiah: COIN, SUPER_BADGE, VIP, AVATAR_BORDER
```

**Tiap box** punya banyak **tier**. **Tiap tier** punya **1 jenis hadiah** yang bisa dipilih dari 4 opsi:

### Reward Types (Pilihan Hadiah)

| `reward_type`   | Hadiah           | Field yang Wajib Diisi              | Field Opsional |
|-----------------|------------------|--------------------------------------|----------------|
| `COIN`          | Koin (random)    | `coin_min`, `coin_max`               | -              |
| `SUPER_BADGE`   | Super Badge      | `badge_id`                           | -              |
| `VIP`           | Membership VIP   | `vip_plan_id` (wajib) + optional `vip_days_min`+`vip_days_max` untuk random range | - |
| `AVATAR_BORDER` | Avatar Border    | `border_id`                          | -              |

> **VIP Reward:** Admin **wajib** pilih `vip_plan_id` dari VIP plan eksisting (lihat `/reward-options` → `vip_plans`). Plan menentukan nama, color, dan benefits VIP.
>
> **Durasi VIP:**
> - **Default:** pakai `duration_days` dari plan (mis. Gold = 30 hari)
> - **Random range:** admin set `vip_days_min` + `vip_days_max` (mis. 1-5), maka saat pull user dapat random 1-5 hari. Plan tetap sama (mis. Gold), tapi durasinya random.
>
> **Item Tidak Aktif:** Admin bisa memilih badge, border, atau VIP plan yang `is_active: false` sebagai hadiah Mystery Box.

### Tier Types (Rarity)

| `tier_type`  | Deskripsi           | Saran Weight |
|--------------|---------------------|--------------|
| `COMMON`     | Paling sering       | 60-80        |
| `RARE`       | Jarang              | 15-25        |
| `EPIC`       | Lebih jarang        | 5-10         |
| `LEGENDARY`  | Sangat jarang       | 1-3          |
| `MYTHIC`     | Paling langka       | 0.5-1        |

> **Catatan:** `weight` menentukan probabilitas. Tier dengan weight 70 dari total 100 = 70% kemungkinan.

---

## Env Variable

```
MYSTERY_BOX_FE_URL=http://localhost:3001/mystery-box
```

Saat admin membuat/ubah box, response include `fe_url` otomatis:
```
{MYSTERY_BOX_FE_URL}?code={box_code}
```

Contoh: `http://localhost:3001/mystery-box?code=BASIC_BOX`

---

## Endpoints

### 1. List All Mystery Boxes

```
GET /admin/mystery-box
```

**Auth:** Admin

**Response:**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": 1,
      "code": "BASIC_BOX",
      "name": "Basic Mystery Box",
      "description": "A basic mystery box",
      "image_url": "https://...",
      "is_active": true,
      "cost_coins": 100,
      "createdAt": "2026-06-26T14:00:00.000Z",
      "updatedAt": "2026-06-26T14:00:00.000Z",
      "fe_url": "http://localhost:3001/mystery-box?code=BASIC_BOX",
      "tiers": [
        {
          "id": 1,
          "tier_type": "COMMON",
          "label": "Common Coins",
          "weight": 70,
          "reward_type": "COIN",
          "coin_min": 10,
          "coin_max": 50,
          "badge_id": null,
          "border_id": null,
          "vip_days": null,
          "is_active": true
        },
        {
          "id": 2,
          "tier_type": "EPIC",
          "label": "Epic Border",
          "weight": 8,
          "reward_type": "AVATAR_BORDER",
          "coin_min": 0,
          "coin_max": 0,
          "badge_id": null,
          "border_id": 5,
          "vip_days": null,
          "is_active": true
        },
        {
          "id": 3,
          "tier_type": "LEGENDARY",
          "label": "Legendary Badge",
          "weight": 2,
          "reward_type": "SUPER_BADGE",
          "coin_min": 0,
          "coin_max": 0,
          "badge_id": 3,
          "border_id": null,
          "vip_days": null,
          "is_active": true
        },
        {
          "id": 4,
          "tier_type": "MYTHIC",
          "label": "Mythic VIP",
          "weight": 1,
          "reward_type": "VIP",
          "coin_min": 0,
          "coin_max": 0,
          "badge_id": null,
          "border_id": null,
          "vip_days": 7,
          "is_active": true
        }
      ],
      "_count": { "pulls": 1234 }
    }
  ]
}
```

---

### 2. Get Mystery Box by ID

```
GET /admin/mystery-box/:id
```

**Auth:** Admin

**Response:** Single box dengan tiers (include badge & border detail).

---

### 3. Create Mystery Box

```
POST /admin/mystery-box
```

**Auth:** Admin

**Body:**

```json
{
  "code": "PREMIUM_BOX",
  "name": "Premium Mystery Box",
  "description": "Box premium dengan hadiah langka",
  "image_url": "https://...",
  "is_active": true,
  "cost_coins": 500
}
```

| Field        | Type    | Required | Default | Description                    |
|--------------|---------|----------|---------|--------------------------------|
| code         | String  | Yes      | -       | Unique code (e.g. PREMIUM_BOX) |
| name         | String  | Yes      | -       | Display name                   |
| description  | String? | No       | null    | Description                    |
| image_url    | String? | No       | null    | Box image URL                  |
| is_active    | Boolean | No       | true    | Active status                  |
| cost_coins   | Int     | No       | 0       | Coin cost per pull             |

**Response (201):**

```json
{
  "success": true,
  "message": "Mystery Box berhasil dibuat",
  "data": {
    "id": 2,
    "code": "PREMIUM_BOX",
    "name": "Premium Mystery Box",
    "description": "Box premium dengan hadiah langka",
    "image_url": "https://...",
    "is_active": true,
    "cost_coins": 500,
    "createdAt": "2026-06-27T09:00:00.000Z",
    "updatedAt": "2026-06-27T09:00:00.000Z",
    "fe_url": "http://localhost:3001/mystery-box?code=PREMIUM_BOX"
  }
}
```

**Errors:**

| Status | Message                |
|--------|------------------------|
| 400    | code dan name wajib    |
| 409    | Code sudah digunakan   |

---

### 4. Update Mystery Box

```
PATCH /admin/mystery-box/:id
```

**Auth:** Admin

**Body (semua field optional):**

```json
{
  "code": "PREMIUM_BOX_V2",
  "name": "Premium Mystery Box V2",
  "description": "Updated description",
  "image_url": "https://...",
  "is_active": false,
  "cost_coins": 750
}
```

**Response:** Updated box + `fe_url`.

---

### 5. Delete Mystery Box

```
DELETE /admin/mystery-box/:id
```

**Auth:** Admin

**Response:**

```json
{
  "success": true,
  "message": "Mystery Box berhasil dihapus"
}
```

**Catatan:** Menghapus box akan cascade hapus semua tiers dan pull records.

---

### 6. List All Tiers

```
GET /admin/mystery-box/tiers?box_id=1
```

**Auth:** Admin

| Query    | Type | Required | Description              |
|----------|------|----------|--------------------------|
| box_id   | Int  | No       | Filter by MysteryBox ID  |

**Response:**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": 1,
      "box_id": 1,
      "tier_type": "COMMON",
      "label": "Common Coins",
      "weight": 70,
      "reward_type": "COIN",
      "coin_min": 10,
      "coin_max": 50,
      "badge_id": null,
      "border_id": null,
      "vip_days": null,
      "image_url": null,
      "is_active": true,
      "badge": null,
      "border": null,
      "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box" }
    },
    {
      "id": 2,
      "box_id": 1,
      "tier_type": "EPIC",
      "label": "Epic Border",
      "weight": 8,
      "reward_type": "AVATAR_BORDER",
      "coin_min": 0,
      "coin_max": 0,
      "badge_id": null,
      "border_id": 5,
      "vip_days": null,
      "image_url": null,
      "is_active": true,
      "badge": null,
      "border": { "id": 5, "code": "GOLD_FRAME", "title": "Gold Frame", "image_url": "https://..." },
      "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box" }
    }
  ]
}
```

---

### 7. Create Tier

```
POST /admin/mystery-box/tiers
```

**Auth:** Admin

**Body:**

| Field        | Type                  | Required          | Default | Description                              |
|--------------|-----------------------|-------------------|---------|------------------------------------------|
| box_id       | Int                   | Yes               | -       | FK to MysteryBox                         |
| tier_type    | MysteryBoxTierType    | Yes               | -       | COMMON, RARE, EPIC, LEGENDARY, MYTHIC    |
| label        | String                | Yes               | -       | Display label                            |
| weight       | Int                   | No                | 1       | Probability weight (higher = more likely)|
| reward_type  | MysteryBoxRewardType  | No                | COIN    | COIN, XP, SUPER_BADGE, VIP, AVATAR_BORDER, STICKER |
| coin_min     | Int                   | If COIN           | 0       | Min coins reward                         |
| coin_max     | Int                   | If COIN           | 0       | Max coins reward                         |
| xp_min       | Int                   | If XP             | 0       | Min XP reward                            |
| xp_max       | Int                   | If XP             | 0       | Max XP reward                            |
| badge_id     | Int?                  | If SUPER_BADGE    | null    | ID Badge dari `/reward-options`          |
| border_id    | Int?                  | If AVATAR_BORDER  | null    | ID Border dari `/reward-options`         |
| sticker_id   | Int?                  | If STICKER        | null    | ID Sticker dari `/reward-options`        |
| vip_days     | Int?                  | No                 | null    | Auto-filled dari plan duration_days (jangan isi manual) |
| vip_days_min | Int?                  | No                 | null    | Min hari VIP untuk random range (mis. 1). Set bersama vip_days_max |
| vip_days_max | Int?                  | No                 | null    | Max hari VIP untuk random range (mis. 5). Set bersama vip_days_min |
| vip_plan_id  | Int?                  | **Yes if VIP**     | null    | ID VipPlan dari `/reward-options` (wajib untuk VIP) |
| image_url    | String?               | No                | null    | Tier image URL                           |
| is_active    | Boolean               | No                | true    | Active status                            |

#### Contoh per Reward Type

**1. COIN** — hadiah koin random dalam range:

```json
{
  "box_id": 1,
  "tier_type": "COMMON",
  "label": "Common Coins",
  "weight": 70,
  "reward_type": "COIN",
  "coin_min": 10,
  "coin_max": 50
}
```

**2. XP** — hadiah XP untuk naik level:

```json
{
  "box_id": 1,
  "tier_type": "COMMON",
  "label": "Common XP",
  "weight": 50,
  "reward_type": "XP",
  "xp_min": 10,
  "xp_max": 100
}
```

> Server akan memberikan XP random antara `xp_min` - `xp_max`, menambahkannya ke `UserXP`, dan otomatis update level jika threshold tercapai.

**3. SUPER_BADGE** — hadiah super badge (pilih badge_id dari `/reward-options`):

```json
{
  "box_id": 1,
  "tier_type": "LEGENDARY",
  "label": "Legendary Badge",
  "weight": 2,
  "reward_type": "SUPER_BADGE",
  "badge_id": 3
}
```

**5. AVATAR_BORDER** — hadiah avatar border (pilih border_id dari `/reward-options`):

```json
{
  "box_id": 1,
  "tier_type": "EPIC",
  "label": "Epic Border",
  "weight": 8,
  "reward_type": "AVATAR_BORDER",
  "border_id": 5
}
```

**6. STICKER** — hadiah stiker (pilih sticker_id dari `/reward-options`):

```json
{
  "box_id": 1,
  "tier_type": "RARE",
  "label": "Rare Sticker",
  "weight": 10,
  "reward_type": "STICKER",
  "sticker_id": 12
}
```

> Server akan grant stiker ke user via `UserSticker`. Jika user sudah punya stiker tersebut, response `already_owned: true`.

**7a. VIP — dari VipPlan, durasi default dari plan** (mis. Gold = 30 hari):

```json
{
  "box_id": 1,
  "tier_type": "MYTHIC",
  "label": "Mythic VIP Gold",
  "weight": 1,
  "reward_type": "VIP",
  "vip_plan_id": 2
}
```

> Server auto-fill `vip_days` = 30 (dari VipPlan Gold `duration_days`). Response include `vip_plan: { id: 2, name: "Gold", duration_days: 30, color: "#FFD700" }`.

**7b. VIP — dari VipPlan + random range** (mis. Gold plan tapi durasi random 1-5 hari):

```json
{
  "box_id": 1,
  "tier_type": "RARE",
  "label": "Rare VIP Gold 1-5 Days",
  "weight": 15,
  "reward_type": "VIP",
  "vip_plan_id": 2,
  "vip_days_min": 1,
  "vip_days_max": 5
}
```

> User dapat VIP Gold (nama, color, benefits dari plan), tapi durasinya random 1-5 hari. Cocok untuk tier yang sering muncul agar tidak selalu dapat 30 hari.

**Response (201):**

```json
{
  "success": true,
  "message": "Tier berhasil dibuat",
  "data": {
    "id": 5,
    "box_id": 1,
    "tier_type": "LEGENDARY",
    "label": "Legendary Badge",
    "weight": 2,
    "reward_type": "SUPER_BADGE",
    "coin_min": 0,
    "coin_max": 0,
    "xp_min": 0,
    "xp_max": 0,
    "badge_id": 3,
    "border_id": null,
    "sticker_id": null,
    "vip_days": null,
    "image_url": null,
    "is_active": true,
    "badge": { "id": 3, "code": "SSS_BADGE", "name": "SSS Badge", "badge_url": "https://..." },
    "border": null
  }
}
```

**Errors:**

| Status | Message                                              |
|--------|------------------------------------------------------|
| 400    | box_id, tier_type, label wajib                       |
| 404    | Mystery Box tidak ditemukan                          |
| 400    | badge_id wajib untuk reward_type SUPER_BADGE         |
| 400    | border_id wajib untuk reward_type AVATAR_BORDER      |
| 400    | sticker_id wajib untuk reward_type STICKER           |
| 400    | xp_min dan xp_max wajib untuk reward_type XP         |
| 400    | vip_plan_id wajib untuk reward_type VIP            |

---

### 8. Update Tier

```
PATCH /admin/mystery-box/tiers/:id
```

**Auth:** Admin

**Body (semua field optional):**

```json
{
  "label": "Updated Label",
  "weight": 5,
  "reward_type": "COIN",
  "coin_min": 100,
  "coin_max": 500,
  "is_active": false
}
```

Bisa juga ganti reward_type:

```json
{
  "reward_type": "SUPER_BADGE",
  "badge_id": 7,
  "coin_min": 0,
  "coin_max": 0
}
```

**Response:** Updated tier (include badge & border detail).

---

### 9. Delete Tier

```
DELETE /admin/mystery-box/tiers/:id
```

**Auth:** Admin

**Response:**

```json
{
  "success": true,
  "message": "Tier berhasil dihapus"
}
```

---

### 10. List Reward Options (Helper)

```
GET /admin/mystery-box/reward-options
```

**Auth:** Admin

Endpoint helper untuk mendapatkan daftar badge, border, dan VIP plan yang available (termasuk yang **tidak aktif**). **Pakai endpoint ini sebelum create tier** untuk tahu `badge_id` / `border_id` / `vip_plan_id` yang valid.

> **Catatan:** Semua item ditampilkan termasuk yang `is_active: false`. Admin bisa memilih item tidak aktif sebagai hadiah Mystery Box. Field `is_active` ada di response untuk membantu admin memilih.

**Response:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "badges": [
      { "id": 3, "code": "SSS_BADGE", "name": "SSS Badge", "badge_url": "https://...", "is_active": true },
      { "id": 5, "code": "GOLD_BADGE", "name": "Gold Badge", "badge_url": "https://...", "is_active": true },
      { "id": 7, "code": "OLD_BADGE", "name": "Old Badge", "badge_url": "https://...", "is_active": false }
    ],
    "borders": [
      { "id": 5, "code": "GOLD_FRAME", "title": "Gold Frame", "image_url": "https://...", "is_active": true },
      { "id": 8, "code": "NEON_FRAME", "title": "Neon Frame", "image_url": "https://...", "is_active": true },
      { "id": 12, "code": "OLD_FRAME", "title": "Old Frame", "image_url": "https://...", "is_active": false }
    ],
    "vip_plans": [
      { "id": 1, "name": "Silver", "description": "Silver VIP", "duration_days": 7, "price_coins": 500, "color": "#C0C0C0", "is_active": true },
      { "id": 2, "name": "Gold", "description": "Gold VIP", "duration_days": 30, "price_coins": 1500, "color": "#FFD700", "is_active": true },
      { "id": 3, "name": "Platinum", "description": "Platinum VIP", "duration_days": 90, "price_coins": 4000, "color": "#E5E4E2", "is_active": false }
    ],
    "vip_days_options": [1, 3, 7, 14, 30, 60, 90, 365]
  }
}
```

---

## Workflow Lengkap: Create Box + Atur Hadiah

### Step 1: Buat Box

```
POST /admin/mystery-box
```
```json
{
  "code": "EVENT_BOX_2026",
  "name": "Event Box 2026",
  "cost_coins": 200
}
```

Response include `fe_url`:
```
http://localhost:3001/mystery-box?code=EVENT_BOX_2026
```

### Step 2: Ambil Reward Options

```
GET /admin/mystery-box/reward-options
```

Catat `badge_id` dan `border_id` yang tersedia.

### Step 3: Tambah Tiers (1 per reward type)

**Tier 1 — COIN (Common, 70% chance):**
```
POST /admin/mystery-box/tiers
```
```json
{
  "box_id": 3,
  "tier_type": "COMMON",
  "label": "Common Coins",
  "weight": 70,
  "reward_type": "COIN",
  "coin_min": 20,
  "coin_max": 100
}
```

**Tier 2 — COIN (Rare, 20% chance):**
```
POST /admin/mystery-box/tiers
```
```json
{
  "box_id": 3,
  "tier_type": "RARE",
  "label": "Rare Coins",
  "weight": 20,
  "reward_type": "COIN",
  "coin_min": 100,
  "coin_max": 300
}
```

**Tier 3 — AVATAR_BORDER (Epic, 6% chance):**
```
POST /admin/mystery-box/tiers
```
```json
{
  "box_id": 3,
  "tier_type": "EPIC",
  "label": "Epic Gold Frame",
  "weight": 6,
  "reward_type": "AVATAR_BORDER",
  "border_id": 5
}
```

**Tier 4 — SUPER_BADGE (Legendary, 3% chance):**
```
POST /admin/mystery-box/tiers
```
```json
{
  "box_id": 3,
  "tier_type": "LEGENDARY",
  "label": "Legendary SSS Badge",
  "weight": 3,
  "reward_type": "SUPER_BADGE",
  "badge_id": 3
}
```

**Tier 5 — VIP Gold + random range 1-5 hari (Rare, 15% chance):**
```
POST /admin/mystery-box/tiers
```
```json
{
  "box_id": 3,
  "tier_type": "RARE",
  "label": "Rare VIP Gold 1-5 Days",
  "weight": 15,
  "reward_type": "VIP",
  "vip_plan_id": 2,
  "vip_days_min": 1,
  "vip_days_max": 5
}
```

> User dapat VIP Gold (plan name, color, benefits), tapi durasi random 1-5 hari.

**Tier 6 — VIP Gold default 30 hari (Mythic, 1% chance):**
```
POST /admin/mystery-box/tiers
```
```json
{
  "box_id": 3,
  "tier_type": "MYTHIC",
  "label": "Mythic VIP Gold 30 Days",
  "weight": 1,
  "reward_type": "VIP",
  "vip_plan_id": 2
}
```

> Server auto-fill `vip_days` = 30 (dari VipPlan Gold `duration_days`).

**Total weight: 70 + 15 + 15 + 6 + 3 + 1 = 110**
- COIN Common: 70/110 ≈ 64%
- VIP Gold 1-5 days: 15/110 ≈ 14%
- COIN Rare: 15/110 ≈ 14%
- Avatar Border: 6/110 ≈ 5%
- Super Badge: 3/110 ≈ 3%
- VIP Gold 30 days: 1/110 ≈ 1%

### Step 4: Share FE URL

Bagikan URL ke FE:
```
http://localhost:3001/mystery-box?code=EVENT_BOX_2026
```

---

## FE Integration Guide

### Cara FE Pakai

1. **Baca `?code=` dari URL** — FE dapat URL seperti `http://localhost:3001/mystery-box?code=EVENT_BOX_2026`
2. **Ambil detail box** — `GET /mystery-box/EVENT_BOX_2026` untuk dapat info box + tiers (termasuk reward_type per tier)
3. **Cek saldo user** — `GET /mystery-box/me/wallet` untuk tampilkan balance
4. **Spin/pull** — `POST /mystery-box/EVENT_BOX_2026/pull` dengan body `{ "count": 1 }`
5. **Tampilkan hasil** — response `pulls[].reward` berisi:
   - `{ "type": "COIN", "coins": 75 }` → tampilkan koin
   - `{ "type": "SUPER_BADGE", "id": 3, "name": "SSS Badge", "image_url": "...", "already_owned": false }` → tampilkan badge
   - `{ "type": "AVATAR_BORDER", "id": 5, "name": "Gold Frame", "image_url": "...", "already_owned": false }` → tampilkan border
   - `{ "type": "VIP", "vip_days": 30, "plan_name": "Gold", "plan_color": "#FFD700", "end_at": "2026-07-27T...", "already_owned": false }` → tampilkan VIP dengan plan info

### Response Pull (semua reward types dalam 1 contoh)

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "box": { "id": 3, "code": "EVENT_BOX_2026", "name": "Event Box 2026" },
    "pulls": [
      {
        "pull_id": 100,
        "tier": { "id": 1, "tier_type": "COMMON", "label": "Common Coins", "image_url": null },
        "reward": { "type": "COIN", "coins": 45 }
      },
      {
        "pull_id": 101,
        "tier": { "id": 4, "tier_type": "LEGENDARY", "label": "Legendary SSS Badge", "image_url": null },
        "reward": { "type": "SUPER_BADGE", "id": 3, "name": "SSS Badge", "image_url": "https://...", "already_owned": false }
      }
    ],
    "total_coins_won": 45,
    "total_cost": 400,
    "net_coins": -355,
    "wallet_balance": 600
  }
}
```

### Field `already_owned`

- `false` → user baru dapat item ini
- `true` → user sudah punya item ini (untuk SUPER_BADGE & AVATAR_BORDER, tidak dobel grant)

---

## Pity System

Mystery Box punya **pity system** dengan progressive weight reduction untuk menjamin user tidak sial terus:

- **Spin 1-49:** LEGENDARY+ weight dikali 0.05 (dikurangi 95%) — sangat langka
- **Spin 50-89:** LEGENDARY+ weight dikali 0.50 (dikurangi 50%) — lebih sering
- **Spin 90:** user **dijamin** dapat tier **LEGENDARY** atau **MYTHIC** (pity triggered)
- Counter reset setelah pity triggered, atau jika user dapat LEGENDARY+ secara natural
- Pity counter **terpisah per box** (spin di BASIC_BOX tidak affect EVENT_BOX)
- Data tersimpan di `MysteryBoxPityLog` (unique per user_id + box_id)

### Pity Log Endpoint

```
GET /admin/mystery-box/pity-logs?page=1&limit=20&box_id=1
```

**Auth:** Admin

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page      | Int  | 1       | Page number |
| limit     | Int  | 20      | Items per page (max 100) |
| box_id    | Int  | -       | Filter by box ID (optional) |

**Response:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "items": [
      {
        "id": 1,
        "user": { "id": 1702, "username": "mahesa", "email": "mahesa@example.com", "avatar_url": "https://..." },
        "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box" },
        "spin_count": 87,
        "threshold": 90,
        "remaining": 3,
        "last_pity_at": "2026-06-20T14:00:00.000Z",
        "updatedAt": "2026-06-27T09:00:00.000Z"
      },
      {
        "id": 2,
        "user": { "id": 1703, "username": "user2", "email": "user2@example.com", "avatar_url": null },
        "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box" },
        "spin_count": 45,
        "threshold": 90,
        "remaining": 45,
        "last_pity_at": null,
        "updatedAt": "2026-06-27T08:00:00.000Z"
      }
    ]
  }
}
```

> **Gunakan untuk:** tracking user yang hampir dapat pity (remaining rendah), audit pity triggers, atau debug pity counter.

---

## Summary Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/admin/mystery-box` | List all boxes + tiers + fe_url |
| GET    | `/admin/mystery-box/:id` | Get box by ID (include badge/border detail) |
| POST   | `/admin/mystery-box` | Create box (auto-generate fe_url) |
| PATCH  | `/admin/mystery-box/:id` | Update box |
| DELETE | `/admin/mystery-box/:id` | Delete box (cascade) |
| GET    | `/admin/mystery-box/tiers` | List tiers (?box_id= filter) |
| POST   | `/admin/mystery-box/tiers` | Create tier (pilih reward_type) |
| PATCH  | `/admin/mystery-box/tiers/:id` | Update tier (bisa ganti reward_type) |
| DELETE | `/admin/mystery-box/tiers/:id` | Delete tier |
| GET    | `/admin/mystery-box/reward-options` | List badges & borders available |
| GET    | `/admin/mystery-box/pity-logs` | List pity logs (?box_id= filter, paginated) |
