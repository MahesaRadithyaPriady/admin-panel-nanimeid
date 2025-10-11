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

Catatan: UI Admin Panel menggunakan mode upload file (multipart) secara default. Field `image_url` bersifat opsional bila file `image` diunggah.

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
  "per_user_limit": 1
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
  - `is_active` (boolean) — default `true`. Jika `false`, tidak muncul di katalog publik.
  - `starts_at`, `ends_at` (ISO datetime|null) — periode penjualan (opsional). Jika terisi, pembelian hanya bisa di dalam periode.
  - `is_limited` (boolean) — jika `true`, batasi stok.
  - `total_supply` (integer|null) — stok total (jika limited). `null` berarti tanpa stok tertentu.
  - `per_user_limit` (integer) — batas pembelian per user. Default `1` (satu kepemilikan).

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
  "items": [ { "id": 10, "code": "ELAINA_WHITE", "title": "Elaina White", "image_url": "https://...", "coin_price": 500, "is_active": true, "starts_at": null, "ends_at": null, "is_limited": false, "total_supply": null, "per_user_limit": 1, "sold_count": 0 } ],
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

- Body menerima subset field dari create (lihat bagian create). Field yang tidak dikirim tidak diubah.

### Contoh
```
PUT /1.0.10/admin/avatar-borders/10
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{ "title": "Elaina White (Updated)", "is_active": false }
```

Response 200: `{ status: 200, message: "Avatar border diupdate", data: { ... } }`

Error 409 jika `code` baru bentrok (unique).

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
  form: { code: string; title: string; coin_price?: number | null; is_active?: boolean; file: File };
}) {
  const fd = new FormData();
  fd.set("code", form.code);
  fd.set("title", form.title);
  if (typeof form.coin_price !== "undefined" && form.coin_price !== null) fd.set("coin_price", String(form.coin_price));
  if (typeof form.is_active !== "undefined") fd.set("is_active", String(!!form.is_active));
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
