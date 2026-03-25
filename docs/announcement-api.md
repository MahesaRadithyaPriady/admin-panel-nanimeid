# Announcement API (Public)

Endpoint public untuk mengambil pengumuman (in-app announcement) di sisi client.

- Base path: `/${VERSION}` (default: `/v1`)
- Resource path: `/announcement`
- Full endpoint: `GET /v1/announcement/get`
- Authentication: Tidak perlu (public)
- Rate limit: Mengikuti konfigurasi global server (jika ada)

## Deskripsi
Pengumuman bersifat singleton dan disimpan pada model `InAppAnnouncement` (baris tunggal, `id=1`). Endpoint ini hanya READ-ONLY untuk client.

## Endpoint
### GET /announcement/get
Mengambil pengumuman saat ini.

Response sukses:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "message": "Pengumuman: Aplikasi NaniMeID rilis di Play Store tanggal 30 September 2025. Status: Beta Open. Selamat mencoba!",
    "createdAt": "2025-09-20T12:34:56.789Z",
    "updatedAt": "2025-09-20T12:34:56.789Z"
  }
}
```

Jika belum ada pengumuman:
```json
{
  "success": true,
  "data": null
}
```

## Contoh Penggunaan (Client)

### 1) Browser fetch API (JavaScript)
```javascript
const API_BASE = "https://api.nanimeid.dev/v1"; // ganti sesuai base API kamu

async function fetchAnnouncement() {
  try {
    const res = await fetch(`${API_BASE}/announcement/get`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // json.success === true; json.data bisa null
    return json.data; // { id, message, createdAt, updatedAt } | null
  } catch (e) {
    console.error("Gagal mengambil pengumuman:", e.message);
    return null;
  }
}

// Contoh render
fetchAnnouncement().then((data) => {
  const el = document.getElementById("announcement");
  if (!el) return;
  el.textContent = data?.message ?? ""; // tampilkan jika ada
});
```

### 2) Axios (JavaScript/TypeScript)
```typescript
import axios from "axios";

const client = axios.create({ baseURL: "https://api.nanimeid.dev/v1" });

export async function getAnnouncement() {
  const { data } = await client.get("/announcement/get");
  // data.success === true; data.data bisa null
  return data.data as null | {
    id: number;
    message: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

### 3) cURL
```bash
curl -s https://api.nanimeid.dev/v1/announcement/get | jq .
```

## Status & Error Handling
- 200 OK: `success=true` dan `data` berisi objek pengumuman atau `null`.
- 500: `success=false` jika terjadi error internal server.

Contoh error (500):
```json
{
  "success": false,
  "code": "ERROR",
  "message": "Unexpected error"
}
```

## Catatan Implementasi
- Endpoint ini public, tidak membutuhkan token.
- Pengumuman diupdate oleh admin via endpoint admin: `PUT /v1/admin/in-app-announcement`.
- Tersedia juga endpoint admin yang lebih spesifik untuk edit pesan pengumuman: `PATCH /v1/admin/in-app-announcement/message` dengan body JSON `{ "message": "..." }`.
- Data bersifat singleton (id=1). Client cukup melakukan GET untuk menampilkan pesan di UI.
- Disarankan implementasi caching di sisi client (mis. cache 30–60 detik) untuk mengurangi beban request berulang.

## Endpoint Admin (Edit Announcement)

### PATCH /admin/in-app-announcement/message
- Auth: wajib token admin valid.
- Permission: `settings`.
- Body:
```json
{
  "message": "Pengumuman terbaru untuk ditampilkan di aplikasi"
}
```

Response sukses:
```json
{
  "success": true,
  "message": "Announcement updated",
  "data": {
    "id": 1,
    "message": "Pengumuman terbaru untuk ditampilkan di aplikasi",
    "createdAt": "2025-09-20T12:34:56.789Z",
    "updatedAt": "2025-09-21T08:00:00.000Z"
  }
}
```
