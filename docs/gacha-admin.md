# Admin Gacha API & Schema Notes

Dokumen ini merangkum tabel Prisma yang berkaitan dengan event gacha dan endpoint admin untuk mengatur konfigurasinya.

## 1. Tabel Prisma Terkait Gacha

### `GachaConfig`

Konfigurasi per **jenis gacha** (logic & pool hadiah). Satu jenis gacha bisa dipakai banyak campaign / special event.

Field penting:
- `event_code` (String, unique): kode event gacha, contoh: `GACHA_BORDER_SSS_PLUS`.
- `title` / `description`: judul dan deskripsi event.
- `is_active` (Boolean): apakah jenis gacha ini aktif.
- `cost_per_spin` (Int): biaya 1x spin dalam coins.
- `cost_per_10` (Int?, opsional): biaya 10x spin jika berbeda.
- `border_min_spins` (Int): minimal total spin sebelum border bisa drop.
- `border_spent_threshold` (Int): total coins spent untuk mengatur probabilitas border.
- `border_prob_high_spent` / `border_prob_low_spent` (Float): peluang drop border saat spent tinggi/rendah.
- `special_events` (relasi): daftar `SpecialEvent` yang memakai jenis gacha ini.

### `SpecialEvent`

Metadata untuk campaign/event spesial di homepage atau banner. Satu jenis gacha (`GachaConfig`) bisa dipakai oleh banyak `SpecialEvent`.

Field penting:
- `code` (String, unique): kode campaign, contoh: `SPIN_XMAS_25`.
- `title` / `description`: judul dan deskripsi event spesial.
- `is_active` (Boolean): apakah event spesial aktif.
- `web_url` (String): URL halaman web event. Biasanya mengarah ke spin wheel:
  - contoh: `/v1/events/spin-wheel?event_code=GACHA_BORDER_SSS_PLUS&campaign=SPIN_XMAS_25`
- `image_url` (String?): gambar/banner event.
- `starts_at` / `ends_at` (DateTime?): window aktif event.
- `gacha_event_code` (String?): mengacu ke `GachaConfig.event_code` yang dipakai di web gacha.

### `GachaPrize`

Daftar hadiah (pool) untuk sebuah event.

Field penting:
- `event_code` (String): mengacu ke event di `GachaConfig`.
- `type` (Enum `GachaPrizeType`): `COIN`, `TOKEN`, `BORDER`, `ZONK`, `STICKER`, `AVATAR`, `BADGE`, `SUPER_BADGE`.
- `label` (String): nama hadiah untuk ditampilkan.
- `amount` (Int?): jumlah coins / tokens (jika tipe coin/token).
- `tier` (Enum `AvatarBorderTier`?): tier untuk border.
- `code` (String?): kode katalog, misal `AVATAR_BORDER_SSS_PLUS`.
- `image_url` (String?): URL gambar hadiah.
- `weight` (Int): bobot probabilitas, default 1.
- `is_pity_main` (Boolean): boleh dipakai sebagai hadiah utama pity.
- `sort_order` (Int): urutan tampilan.
- `is_active` (Boolean): aktif atau tidak.

### `GachaShopItem`

Item toko untuk menukar Sharp Token.

Field penting:
- `code` (String, unique): kode item toko.
- `type` (GachaPrizeType): tipe hadiah.
- `title` (String): nama item.
- `image_url` (String?): gambar.
- `sharp_cost` (Int): harga dalam Sharp Token.
- `border_code` (String?): jika type `BORDER`, referensi ke `AvatarBorder`.
- `event_code` (String?, opsional): jika diisi, item ini hanya muncul untuk gacha dengan `event_code` tersebut. Jika `null`, item dianggap **global** dan muncul di semua event.

Dengan kombinasi `event_code` ini, kamu bisa membuat katalog Sharp Token shop yang **fleksibel per event**:

- Event A (`event_code = GACHA_BORDER_SSS_PLUS`) bisa punya item khusus border & super badge.
- Event B (`event_code = GACHA_XMAS_2025`) bisa punya kombinasi border lain, sticker, VIP, dsb.
- Item global (tanpa `event_code`) akan ikut tampil di semua event.

### `UserSharpToken` dan `UserSharpTokenHistory`

- `UserSharpToken`: menyimpan saldo Sharp Token per user.
- `UserSharpTokenHistory`: log perubahan token per spin (via `log_id` ke `GachaSpinLog`).

### `GachaSpinLog`

Log hasil spin untuk audit.

Field penting:
- `user_id` (Int): pemilik spin.
- `event_code` (String).
- `prize_type` (GachaPrizeType).
- `prize_id` (Int?).
- `prize_label` (String).
- `coins_spent` (Int): jumlah coins yang dipotong di spin pertama dalam batch.
- `payload` (Json?): payload hadiah (dipakai untuk FE & sharp token job).

## 2. Autentikasi Admin & Permission Gacha

Semua route admin gacha menggunakan middleware:

- `authenticateAdmin` dari `src/middlewares/auth.js`.
- Controller melakukan cek tambahan permission dengan helper `ensureGachaPermission`:

```js
function ensureGachaPermission(req) {
  const role = String(req.admin?.role || "").toLowerCase();
  if (!role) return false;
  if (role === "super_admin" || role === "superadmin") return true;
  if (role.includes("gacha")) return true; // contoh: "gacha_admin"
  return false;
}
```

> **Catatan:** Sesuaikan aturan ini dengan struktur tabel `Admin` yang kamu miliki (misal role khusus atau tabel permission).

## 3. Route Admin Gacha

File route: `src/routes/adminGacha.routes.js`

Semua endpoint diawali dengan prefix `/admin/gacha` dan sudah otomatis ter-protect `authenticateAdmin`.

### 3.1. GachaConfig

#### GET `/admin/gacha/configs`

- **Deskripsi**: List semua konfigurasi gacha.
- **Auth**: admin + permission gacha.
- **Response**:

```json
{
  "success": true,
  "configs": [ { ...GachaConfig }, ... ]
}
```

#### GET `/admin/gacha/configs/:event_code`

- **Deskripsi**: Ambil satu config berdasarkan `event_code`.
- **Params**:
  - `event_code` (path): kode event.

#### POST `/admin/gacha/configs`

- **Deskripsi**: Membuat atau meng‑upsert satu **jenis gacha**.
- **Behavior**: jika `event_code` sudah ada → `update`, jika belum → `create`.

Body minimal (tanpa special event):

```json
{
  "event_code": "GACHA_BORDER_SSS_PLUS",
  "title": "Event Gacha Avatar Border",
  "description": "Coba peruntunganmu!",
  "is_active": true,
  "cost_per_spin": 250,
  "cost_per_10": 2400,
  "border_min_spins": 50,
  "border_spent_threshold": 10000,
  "border_prob_high_spent": 0.0002,
  "border_prob_low_spent": 0.001
}
```

##### Auto-generate / update `SpecialEvent`

Saat **membuat jenis gacha baru** (config belum ada sebelumnya), backend akan **selalu membuat 1 `SpecialEvent` default** untuk `event_code` tersebut, meskipun field `special_*` tidak dikirim (default code: `SPIN_<event_code>` dan `web_url` ke spin-wheel).

Saat **update config** yang sudah ada, backend akan:
- Meng‑upsert `SpecialEvent` jika ada field `special_*` atau `auto_special_event=true`.
- Selalu mengembalikan `specialEvent` di response jika ada `SpecialEvent` yang sudah terhubung ke `gacha_event_code` itu (misal campaign sebelumnya).

Field tambahan opsional di body:

- `auto_special_event` (Boolean):
  - Jika `true`, pasti akan membuat/mengupdate 1 `SpecialEvent` untuk `event_code` ini.
- `special_event_code` (String):
  - Default: `SPIN_<event_code>`.
- `special_title` (String):
  - Default: `title` dari gacha atau `event_code`.
- `special_description` (String):
  - Default: `description` dari gacha.
- `special_web_url` (String):
  - Default (jika kosong):
    - Jika `URL_BASE` di env terisi (contoh: `http://localhost:3000/1.0.10`):
      - `"<URL_BASE>/events/spin-wheel?event_code=<event_code>&campaign=<special_event_code>"`
    - Jika `URL_BASE` kosong → fallback ke path versi API:
      - `"<API_PREFIX>/events/spin-wheel?event_code=<event_code>&campaign=<special_event_code>"`
    - `<API_PREFIX>` mengikuti `process.env.VERSION`, misal `/v1` atau `/1.0.10`.
- `special_image_url` (String): URL banner event.
- `special_deep_link` (String): deep link ke dalam app (opsional).
- `special_starts_at` / `special_ends_at` (String, ISO datetime): window aktif event.
- `special_is_active` (Boolean):
  - Default: ikut `is_active` (kalau dikirim), kalau tidak → `true`.

Contoh payload lengkap (membuat jenis gacha + 1 special event kampanye Natal):

```json
{
  "event_code": "GACHA_BORDER_SSS_PLUS",
  "title": "Gacha Border Xmas",
  "description": "Event natal 2025",
  "is_active": true,
  "cost_per_spin": 250,

  "auto_special_event": true,
  "special_event_code": "SPIN_XMAS_25",
  "special_title": "Xmas Spin 2025",
  "special_description": "Campaign Natal 2025",
  "special_image_url": "https://cdn.example.com/xmas-banner.png",
  "special_starts_at": "2025-12-20T00:00:00Z",
  "special_ends_at": "2026-01-05T00:00:00Z",
  "special_is_active": true
}
```

Response akan mengembalikan kedua objek:

```json
{
  "success": true,
  "config": { "event_code": "GACHA_BORDER_SSS_PLUS", ... },
  "specialEvent": {
    "code": "SPIN_XMAS_25",
    "gacha_event_code": "GACHA_BORDER_SSS_PLUS",
    "web_url": "/v1/events/spin-wheel?event_code=GACHA_BORDER_SSS_PLUS&campaign=SPIN_XMAS_25",
    ...
  }
}
```

**Penting:** Saat membuat jenis gacha baru, response akan selalu mengembalikan `specialEvent` default yang dibuat oleh backend, bahkan jika tidak ada field `special_*` di payload.

#### PATCH `/admin/gacha/configs/:event_code`

- **Deskripsi**: Update sebagian field config.
- **Body**: sama seperti POST tapi semua field opsional.

### 3.2. GachaPrize

#### GET `/admin/gacha/prizes?event_code=GACHA_BORDER_SSS_PLUS`

- **Deskripsi**: List semua hadiah untuk sebuah event.
- **Query**:
  - `event_code` (opsional): kalau kosong, ambil semua prizes.

#### POST `/admin/gacha/prizes`

- **Deskripsi**: Tambah hadiah baru ke suatu event.
- **Body contoh**:

```json
{
  "event_code": "GACHA_BORDER_SSS_PLUS",
  "type": "COIN",
  "label": "+100 Coins",
  "amount": 100,
  "tier": null,
  "code": "COIN_100",
  "image_url": null,
  "weight": 10,
  "is_pity_main": false,
  "sort_order": 2,
  "is_active": true
}
```

#### PATCH `/admin/gacha/prizes/:id`

- **Deskripsi**: Update hadiah berdasarkan `id`.
- **Params**:
  - `id` (path): ID integer dari `GachaPrize`.
- **Body**: field yang ingin diubah (semua opsional), contoh:

```json
{
  "label": "+300 Coins",
  "amount": 300,
  "weight": 5,
  "is_active": true
}
```

#### DELETE `/admin/gacha/prizes/:id`

- **Deskripsi**: Hapus hadiah dari pool event.

### 3.3. GachaShopItem (Sharp Token Shop)

Endpoint untuk mengatur katalog item penukaran Sharp Token, fleksibel per `event_code`.

#### GET `/admin/gacha/shop/items`

- **Deskripsi**: List item shop Sharp Token.
- **Query**:
  - `event_code` (opsional):
    - Jika diisi → kembalikan item **global** (`event_code = null`) + item khusus event tersebut.
    - Jika kosong → kembalikan semua item.
- **Response**:

```json
{
  "success": true,
  "items": [ { /* GachaShopItem */ }, ... ]
}
```

#### POST `/admin/gacha/shop/items`

- **Deskripsi**: Membuat item shop baru.
- **Body contoh**:

```json
{
  "code": "XMAS_BORDER_2025",
  "type": "BORDER",
  "title": "Border Xmas 2025",
  "image_url": "https://cdn.example.com/xmas-border.png",
  "sharp_cost": 5,
  "border_code": "AVATAR_BORDER_XMAS_2025",
  "event_code": "GACHA_XMAS_2025",
  "is_active": true,
  "sort_order": 10
}
```

- **Validasi utama**:
  - `code` (String) wajib dan unik.
  - `type` (GachaPrizeType) wajib.
  - `title` wajib.
  - `sharp_cost` wajib dan `>= 0`.
  - `event_code` opsional:
    - `null` → item global (muncul di semua event).
    - String → hanya untuk gacha dengan `event_code` tersebut.

#### PATCH `/admin/gacha/shop/items/:id`

- **Deskripsi**: Update sebagian field item shop.
- **Body contoh**:

```json
{
  "title": "Border Xmas 2025 (Limited)",
  "sharp_cost": 7,
  "is_active": false,
  "event_code": null
}
```

#### DELETE `/admin/gacha/shop/items/:id`

- **Deskripsi**: Hapus satu item shop.

> **Catatan:** Tipe hadiah yang lebih kompleks seperti `SUPER_BADGE`, `STICKER`, atau VIP dapat dikonfigurasi di `GachaShopItem` dengan `type` yang sesuai. Logic pemberian kepemilikan untuk tipe-tipe ini dapat di-handle di controller user-side (`exchangeShopItem`) mengikuti pola di `spinGacha`.

## 4. Integrasi Route

File `adminGacha.routes.js` men‑export router Express. Untuk mengaktifkan di server utama, tambahkan kira‑kira seperti ini di file entry (misal `src/index.js` atau sejenisnya):

```js
import adminGachaRoutes from "./routes/adminGacha.routes.js";

app.use("/1.0.10", adminGachaRoutes); // atau prefix base lain sesuai versi API kamu
```

Pastikan juga environment dan tabel `Admin` sudah siap sehingga `authenticateAdmin` dapat bekerja dengan benar.

### 4.1. Catatan penting untuk FE (multi-event gacha)

- **Satu file web**: halaman spin wheel berada di route web:
  - `GET <API_PREFIX>/events/spin-wheel`
- **Parameter `event_code` wajib** untuk memilih jenis gacha:
  - FE harus memanggil URL dengan query `event_code`, contoh:
    - `/v1/events/spin-wheel?event_code=GACHA_BORDER_SSS_PLUS&campaign=SPIN_XMAS_25`
- Semua API gacha di bawahnya **menggunakan `event_code` yang sama** dari query:
  - `POST <API_PREFIX>/events/gacha/spin?event_code=...`
  - `GET  <API_PREFIX>/events/gacha/state?event_code=...`
- Dengan pola ini:
  - Satu jenis gacha (`GachaConfig` + `GachaPrize`) bisa dipakai banyak `SpecialEvent`.
  - FE cukup ambil `web_url` dari `SpecialEvent` (atau config di admin) dan redirect user ke URL itu.

