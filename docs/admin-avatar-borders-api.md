# Admin Avatar Borders API

Dokumentasi endpoint SUPERADMIN untuk membuat avatar border baru.

Prefix versi mengikuti konfigurasi aplikasi (contoh: `/1.0.10`). Endpoint dimount di bawah prefix admin di `app.js`:

- `app.use(`${API_PREFIX}/admin`, adminRoutes);`

Sehingga path final menjadi: `/<VERSION>/admin/...`

---

## Authorization & Role
- Wajib token admin (`Authorization: Bearer <ADMIN_TOKEN>`)
- Role minimal: `SUPERADMIN`

---

## POST /admin/avatar-borders
Buat avatar border baru untuk katalog.

- Method: `POST`
- Auth: Admin token + role SUPERADMIN
- Format request didukung:
  - JSON (mengirim `image_url`)
  - multipart/form-data (mengunggah file gambar pada field `image`)

Catatan image source:
- Jika `image_url` berupa URL `http(s)` yang bukan URL storage/CDN, server akan download lalu upload ulang ke storage/B2.
- Jika `image_url` berupa path static lokal (mis. `/static/...`) atau URL localhost/static server (mis. `http://localhost:3001/static/...`), server akan membaca file sumber lalu upload ulang ke storage/B2.
- Jika `image_url` sudah berupa URL storage/CDN (prefix `CDN_BASE_URL_STORAGE`), server menyimpan nilainya apa adanya.

### Opsi 1: Body JSON (gunakan image_url)
```json
{
  "code": "ELAINA_WHITE",
  "title": "Elaina White",
  "image_url": "https://host/static/borders/elaina-white.png",
  "coin_price": 500,
  "is_active": true,
  "starts_at": "2025-10-01T00:00:00.000Z",
  "ends_at": null,
  "is_limited": false,
  "total_supply": null,
  "per_user_limit": 1,
  "tier": "S_PLUS"
}

### Tata Cara Penggunaan (Ringkas)

1) List Avatar Borders (admin)

```
GET /1.0.10/admin/avatar-borders?page=1&limit=20&q=ELAINA&active=true
Authorization: Bearer <ADMIN_TOKEN>
```

2) Update Avatar Border (admin)

```
PUT /1.0.10/admin/avatar-borders/<ID>
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{ "title": "Nama Baru", "is_active": false }
```

3) Delete Avatar Border (admin)

```
DELETE /1.0.10/admin/avatar-borders/<ID>
Authorization: Bearer <ADMIN_TOKEN>
```
```
- Keterangan field:
  - `code` (string, unik) — wajib. Digunakan sebagai identifier & ref transaksi ketika dibeli (`BUY_BORDER_<code>`)
  - `title` (string) — wajib.
  - `image_url` (string URL) — wajib. URL publik gambar border.
  - `coin_price` (integer|null) — harga koin. `null` berarti tidak dijual (hadiah/event saja).
  - `poin_collection` (integer) — poin collection untuk border. Jika tidak dikirim, server mengisi otomatis berdasarkan `tier`.
  - `is_active` (boolean) — default `true`. Jika `false`, tidak muncul di katalog publik.
  - `starts_at`, `ends_at` (ISO datetime|null) — periode penjualan (opsional). Jika terisi, pembelian hanya bisa di dalam periode.
  - `is_limited` (boolean) — jika `true`, batasi stok.
  - `total_supply` (integer|null) — stok total (jika limited). `null` berarti tanpa stok tertentu.
  - `per_user_limit` (integer) — batas pembelian per user. Default `1` (satu kepemilikan).
  - `tier` (string enum) — salah satu dari: `C`, `B`, `A`, `S`, `S_PLUS`, `SS_PLUS`, `SSS_PLUS`. Default `C`.

Default `poin_collection` berdasarkan tier:

- `SSS_PLUS`: `5000`
- `SS_PLUS`: `3000`
- `S_PLUS`: `2000`
- `S`: `1000`
- `A`: `500`
- `B`: `250`
- `C`: `100`

### Contoh Request (JSON)
```
POST /1.0.10/admin/avatar-borders
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "code": "ELAINA_WHITE",
  "title": "Elaina White",
  "image_url": "https://host/static/borders/elaina-white.png",
  "coin_price": 500,
  "is_active": true,
  "starts_at": "2025-10-01T00:00:00.000Z",
  "ends_at": null,
  "is_limited": false,
  "total_supply": null,
  "per_user_limit": 1
}
```

### Contoh Request (multipart/form-data)
```
POST /1.0.10/admin/avatar-borders
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: multipart/form-data; boundary=----

Fields:
- code: ELAINA_WHITE
- title: Elaina White
- coin_price: 500
- is_active: true
- image: <FILE UPLOAD>  (PNG/JPG disarankan, max 10 MB)
- tier: S_PLUS
```

Contoh curl:
```
curl -X POST \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F code=ELAINA_WHITE \
  -F title="Elaina White" \
  -F coin_price=500 \
  -F is_active=true \
  -F image=@"./elaina-white.png" \
  https://<HOST>/1.0.10/admin/avatar-borders
```

### Contoh Response (201)
```json
{
  "status": 201,
  "message": "Avatar border dibuat",
  "data": {
    "id": 10,
    "code": "ELAINA_WHITE",
    "title": "Elaina White",
    "image_url": "https://host/static/borders/elaina-white.png",
    "coin_price": 500,
    "is_active": true,
    "starts_at": "2025-10-01T00:00:00.000Z",
    "ends_at": null,
    "is_limited": false,
    "total_supply": null,
    "per_user_limit": 1,
    "tier": "S_PLUS",
    "sold_count": 0,
    "createdAt": "2025-10-08T07:30:00.000Z"
  }
}
```

### Error Umum
- 400 `code, title, dan image (file atau image_url) wajib`
- 409 jika `code` duplikat (unique constraint)
- 401/403 jika token invalid atau bukan SUPERADMIN

---

## Catatan Implementasi
- Controller: `src/controllers/adminAvatarBorder.controller.js` → `createAvatarBorderAdmin()`
- Route: `src/routes/admin.routes.js` → `POST /avatar-borders` (guard `authenticateAdmin` + `authorizeAdminRoles("SUPERADMIN")`)
- Katalog publik: `GET /<VERSION>/avatar-borders/catalog`
- Beli border: `POST /<VERSION>/avatar-borders/purchase` dengan body `{ "border_id": number }`
- Aktifkan border: `POST /<VERSION>/avatar-borders/active` dengan body `{ "border_id": number }`

---

## GET /admin/avatar-borders
List avatar borders (admin view) dengan pagination & filter.

- Method: `GET`
- Query:
  - `page` (default 1), `limit` (default 20, max 100)
  - `q` (opsional, search pada `code`/`title`)
  - `active` (opsional: `true|false`)

### Contoh Request
```
GET /1.0.10/admin/avatar-borders?page=1&limit=20&q=ELAINA&active=true
Authorization: Bearer <ADMIN_TOKEN>
```

### Contoh Response (200)
```json
{
  "status": 200,
  "message": "OK",
  "items": [ { "id": 10, "code": "ELAINA_WHITE", "title": "Elaina White", "image_url": "https://...", "tier": "S_PLUS", "coin_price": 500, "is_active": true, "starts_at": null, "ends_at": null, "is_limited": false, "total_supply": null, "per_user_limit": 1, "sold_count": 0 } ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

---

## GET /admin/avatar-borders/:id
Ambil detail satu avatar border.

### Contoh
```
GET /1.0.10/admin/avatar-borders/10
Authorization: Bearer <ADMIN_TOKEN>
```

Response 200: `{ status: 200, message: "OK", data: { ... } }`

---

## PUT /admin/avatar-borders/:id
Update avatar border (parsial field diperbolehkan).

- Format request didukung:
  - JSON (mengirim subset field; `image_url` opsional)
  - multipart/form-data (unggah gambar baru pada field `image`)
- Field yang tidak dikirim tidak diubah.

Jika `image_url` dikirim saat update:
- URL `http(s)` non-storage akan di-download lalu di-upload ulang ke storage/B2.
- Path static lokal `/static/...` atau URL localhost/static akan dibaca dari file lokal lalu di-upload ulang ke storage/B2.
- URL storage/CDN yang sudah valid akan disimpan apa adanya.

### Contoh
```
PUT /1.0.10/admin/avatar-borders/10
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{ "title": "Elaina White (Updated)", "is_active": false }
```

### Contoh (multipart/form-data, ganti gambar)
```
PUT /1.0.10/admin/avatar-borders/10
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: multipart/form-data; boundary=----

Fields:
- title: Elaina White v2
- image: <FILE UPLOAD>  (PNG/JPG/GIF sesuai izin, max 10 MB)
```

Contoh curl:
```
curl -X PUT \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F title="Elaina White v2" \
  -F image=@"./elaina-white-v2.png" \
  https://<HOST>/1.0.10/admin/avatar-borders/10
```

Response 200: `{ status: 200, message: "Avatar border diupdate", data: { ... } }`

Error 409 jika `code` baru bentrok (unique).

Catatan: Jika mengirim gambar baru (file) atau `image_url` baru, sistem akan mengganti `image_url` dan mencoba menghapus file lama jika file lama berada di path lokal `static/uploads/borders/`. URL eksternal tidak dihapus.

---

## DELETE /admin/avatar-borders/:id
Hapus avatar border.

Catatan: saat ini tidak mencegah penghapusan jika sudah ada yang memiliki. Jika ingin proteksi, tambahkan kebijakan di controller.

### Contoh
```
DELETE /1.0.10/admin/avatar-borders/10
Authorization: Bearer <ADMIN_TOKEN>
```

Response 200: `{ status: 200, message: "Avatar border dihapus" }`

---

## Ownership Management per Border (SUPERADMIN)

Kelola kepemilikan user terhadap sebuah avatar border.

- Format path dasar: `/admin/avatar-borders/:id/owners`

### 1) List Owners

```
GET /<VERSION>/admin/avatar-borders/:id/owners?page=1&limit=20&userId=1702
Authorization: Bearer <ADMIN_TOKEN>
```

Response 200:
```json
{
  "status": 200,
  "message": "OK",
  "items": [
    { "id": 123, "user_id": 1702, "border_id": 10, "is_active": false, "obtained_at": "2025-10-08T08:00:00.000Z" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### 2) Tambah Owner (grant ke user)

```
POST /<VERSION>/admin/avatar-borders/:id/owners
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{ "user_id": 1702, "is_active": false }
```

Response 201: `{ status: 201, message: "Ownership ditambahkan/diperbarui", data: { ... } }`

Catatan: operasi ini bersifat upsert. Jika user sudah punya, hanya update `is_active`.

### 3) Update Owner (ubah aktif/non-aktif)

```
PATCH /<VERSION>/admin/avatar-borders/:id/owners/:userId
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{ "is_active": true }
```

Response 200: `{ status: 200, message: "Ownership diupdate" }`

### 4) Hapus Owner

```
DELETE /<VERSION>/admin/avatar-borders/:id/owners/:userId
Authorization: Bearer <ADMIN_TOKEN>
```

Response 200: `{ status: 200, message: "Ownership dihapus" }`

---

## Contoh Fetch di Frontend
```ts
async function createAvatarBorder({ token, version = "1.0.10", payload }: {
  token: string;
  version?: string;
  payload: {
    code: string;
    title: string;
    image_url: string;
    coin_price?: number | null;
    is_active?: boolean;
    starts_at?: string | null;
    ends_at?: string | null;
    is_limited?: boolean;
    total_supply?: number | null;
    per_user_limit?: number;
    tier?: "C" | "B" | "A" | "S" | "S_PLUS" | "SS_PLUS" | "SSS_PLUS";
  };
}) {
  const res = await fetch(`/${version}/admin/avatar-borders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Gagal membuat avatar border");
  return data;
}
```

Contoh upload file di frontend (multipart):
```ts
async function createAvatarBorderWithFile({ token, version = "1.0.10", form }: {
  token: string;
  version?: string;
  form: { code: string; title: string; coin_price?: number | null; is_active?: boolean; tier?: "C" | "B" | "A" | "S" | "S_PLUS" | "SS_PLUS" | "SSS_PLUS"; file: File };
}) {
  const fd = new FormData();
  fd.set("code", form.code);
  fd.set("title", form.title);
  if (typeof form.coin_price !== "undefined" && form.coin_price !== null) fd.set("coin_price", String(form.coin_price));
  if (typeof form.is_active !== "undefined") fd.set("is_active", String(!!form.is_active));
  if (typeof form.tier !== "undefined") fd.set("tier", form.tier);
  fd.set("image", form.file); // field name: image

  const res = await fetch(`/${version}/admin/avatar-borders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Gagal membuat avatar border");
  return data;
}
```
