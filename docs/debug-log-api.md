# Debug Log API (Request Profiler)

Dokumentasi endpoint untuk membaca log rekap request — termasuk `userId`, durasi, RAM usage, CPU%, status HTTP, dan route yang berat — untuk kebutuhan debug dan optimasi.

Base URL: `/v1/debug-log`

> **Auth**: Semua endpoint wajib **Admin JWT** (`Authorization: Bearer <admin_token>`).  
> Tidak ada endpoint publik di sini.

---

## Entry Schema

Setiap log entry (baik dari `/live`, `/errors`, `/user/:id`, maupun file) memiliki shape berikut:

```json
{
  "ts": "2026-04-13T00:32:11.043Z",
  "method": "GET",
  "route": "/v1/anime/:animeId",
  "routeKey": "GET /v1/anime/:animeId",
  "path": "/v1/anime/123",
  "status": 200,
  "durationMs": 312,
  "userId": "88",
  "isAuth": true,
  "ip": "103.10.5.21",
  "heapUsedMB": 145.32,
  "heapTotalMB": 200.0,
  "rssMB": 280.14,
  "cpuPct": 4.2,
  "normalizedCpuPct": 2.1,
  "concurrentRequests": 2,
  "cpuHeavyScore": 13,
  "isHeavyRoute": false,
  "cpuOverload": false,
  "contentLength": 5120,
  "userAgent": "Mozilla/5.0 ..."
}
```

| Field | Tipe | Keterangan |
|---|---|---|
| `ts` | string (ISO) | Waktu response selesai dikirim |
| `method` | string | HTTP method (`GET`, `POST`, dll.) |
| `route` | string | Route pattern Express yang di-match (`/v1/anime/:animeId`), bukan URL asli |
| `routeKey` | string | Gabungan method + route, mis. `GET /v1/anime/:animeId` |
| `path` | string | URL path aktual tanpa query string |
| `status` | number | HTTP status code |
| `durationMs` | number | Waktu proses request dalam ms (dari masuk middleware → response finish) |
| `userId` | string \| null | ID user dari token, `null` jika tidak auth |
| `isAuth` | boolean | `true` jika request punya valid auth token |
| `ip` | string | IP client (support `X-Forwarded-For`) |
| `heapUsedMB` | number | Heap V8 yang terpakai saat response selesai (MB) |
| `heapTotalMB` | number | Total heap V8 yang dialokasikan (MB) |
| `rssMB` | number | RSS (Resident Set Size) proses Node.js (MB) |
| `cpuPct` | number | Estimasi CPU usage % untuk request ini (berdasarkan delta CPU process selama lifetime request) |
| `normalizedCpuPct` | number | `cpuPct` yang dinormalisasi dengan jumlah request aktif, lebih cocok untuk membandingkan route saat traffic paralel |
| `concurrentRequests` | number | Jumlah request aktif saat entry dicatat |
| `cpuHeavyScore` | number | Skor indikatif beban route (`durationMs * cpuPct / 100`) untuk bantu ranking endpoint berat |
| `isHeavyRoute` | boolean | `true` jika request lambat atau CPU tinggi |
| `cpuOverload` | boolean | `true` jika sample CPU request ini melewati threshold overload |
| `contentLength` | number | `Content-Length` response dalam bytes (0 jika tidak diset) |
| `userAgent` | string | User-Agent client, maks 120 karakter |

### Cara baca field baru

- **`routeKey`**
  - Dipakai untuk identifikasi cepat endpoint persis berdasarkan method + route pattern.
  - Berguna saat route path sama tapi method berbeda punya dampak CPU berbeda.

- **`cpuHeavyScore`**
  - Semakin tinggi, semakin besar kemungkinan route itu jadi sumber spike CPU.
  - Cocok dipakai untuk sorting internal saat membandingkan route yang durasinya tinggi sekaligus CPU tinggi.
  - Perhitungan saat ini memakai `normalizedCpuPct` agar tidak terlalu bias saat banyak request paralel.

- **`normalizedCpuPct`**
  - Dipakai untuk diagnosis route saat server sibuk menangani banyak request bersamaan.
  - Ini adalah angka CPU yang lebih stabil untuk summary route dibanding `cpuPct` mentah.

- **`isHeavyRoute`**
  - Akan `true` jika request memenuhi salah satu threshold:
    - durasi request tinggi
    - CPU sample tinggi

- **`cpuOverload`**
  - Menandai request yang terdeteksi berada pada kondisi overload CPU.
  - Ini berguna saat kamu lihat kasus seperti CPU proses naik ke `200%`.
  - Nilai ini sekarang dihitung dari konsumsi CPU selama request tersebut berjalan, jadi lebih representatif.

---

## 1) System Stats Snapshot

`GET /v1/debug-log/stats`

Informasi real-time kondisi server dan status profiler.

### Response

```json
{
  "ok": true,
  "data": {
    "enabled": true,
    "buffered": 843,
    "maxMemory": 2000,
    "flushIntervalMs": 5000,
    "logDir": "/app/.tmp/request_logs",
    "maxFileLines": 50000,
    "currentMemory": {
      "heapUsedMB": 148.21,
      "heapTotalMB": 200.0,
      "rssMB": 285.6,
      "externalMB": 3.11
    },
    "currentCpuPct": 2.4,
    "uptime_s": 86421,
    "pid": 1234,
    "node": "v22.3.0",
    "env": "production"
  }
}
```

| Field | Keterangan |
|---|---|
| `buffered` | Jumlah entry yang saat ini ada di ring buffer memori |
| `maxMemory` | Kapasitas max ring buffer (env `REQUEST_PROFILER_MAX_MEMORY`) |
| `logDir` | Path direktori file NDJSON di disk |
| `currentMemory` | Snapshot RAM proses Node.js saat ini |
| `currentCpuPct` | CPU% snapshot saat request ini diterima |
| `uptime_s` | Uptime server dalam detik |

---

## 2) Live Request Log (Memory Buffer)

`GET /v1/debug-log/live`

Mengambil request log terbaru dari memory ring buffer. Data paling baru di paling atas.

### Query Params (semua opsional)

| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `limit` | number | 100 | Maks entry yang dikembalikan (maks 2000) |
| `route` | string | — | Filter partial match pada `route` atau `path` (case-insensitive) |
| `method` | string | — | Filter HTTP method, e.g. `GET`, `POST` |
| `userId` | string | — | Filter exact match user ID |
| `minDurationMs` | number | — | Hanya entry dengan `durationMs >= nilai ini` |
| `status` | number | — | Filter exact HTTP status, e.g. `500` |
| `from` | string (ISO) | — | Filter `ts >= from` |
| `to` | string (ISO) | — | Filter `ts <= to` |

### Response

```json
{
  "ok": true,
  "count": 3,
  "data": [
    { "ts": "...", "method": "POST", "route": "/v1/comments/:animeId", "durationMs": 812, ... },
    { "ts": "...", "method": "GET",  "route": "/v1/anime/:animeId",    "durationMs": 210, ... }
  ]
}
```

### Contoh fetch

```js
const res = await fetch('/v1/debug-log/live?limit=50&minDurationMs=300', {
  headers: { Authorization: `Bearer ${adminToken}` }
});
const { data } = await res.json();
```

---

## 3) Route Summary (Rekap per Endpoint)

`GET /v1/debug-log/summary`

Agregasi statistik per route dari memory buffer. Berguna untuk melihat **endpoint mana yang paling sering dipanggil dan paling lambat**.

### Query Params (semua opsional)

| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `limit` | number | 100 | Maks baris yang dikembalikan |
| `minDurationMs` | number | 0 | Filter route yang avg_ms-nya >= nilai ini |
| `from` | string (ISO) | — | Hanya hitung entry dari waktu ini |
| `to` | string (ISO) | — | Hanya hitung entry sampai waktu ini |

### Response

```json
{
  "ok": true,
  "count": 12,
  "data": [
    {
      "method": "GET",
      "route": "/v1/anime/:animeId",
      "count": 540,
      "avg_ms": 284,
      "max_ms": 1823,
      "min_ms": 45,
      "err4xx": 3,
      "err5xx": 0,
      "avgHeapMB": 146.3,
      "avgCpuPct": 3.1,
      "avgRawCpuPct": 6.2,
      "avgConcurrentRequests": 2.0
    }
  ]
}
```

| Field | Keterangan |
|---|---|
| `count` | Total request yang masuk ke route ini |
| `avg_ms` | Rata-rata durasi dalam ms |
| `max_ms` | Durasi terlama yang pernah tercatat |
| `min_ms` | Durasi tercepat |
| `err4xx` | Jumlah response 4xx dari route ini |
| `err5xx` | Jumlah response 5xx dari route ini |
| `avgHeapMB` | Rata-rata heap V8 saat response route ini selesai |
| `avgCpuPct` | Rata-rata `normalizedCpuPct` per route |
| `avgRawCpuPct` | Rata-rata `cpuPct` mentah per route |
| `avgConcurrentRequests` | Rata-rata jumlah request aktif saat route ini dieksekusi |

> Diurutkan: `count` desc, lalu `avg_ms` desc.

### Rekomendasi analisis CPU spike

- **Mulai dari `/heavy`**
  - Cari route dengan `avg_ms` dan `avgCpuPct` tinggi.

- **Cek `/live` atau `/errors`**
  - Fokus ke entry dengan `isHeavyRoute=true` atau `cpuOverload=true`.

- **Gunakan `routeKey`**
  - Jika ada beberapa endpoint mirip, `routeKey` membantu memastikan method mana yang bikin beban tinggi.

---

## 4) Heavy Endpoints (Paling Lambat)

`GET /v1/debug-log/heavy`

Shortcut: route diurutkan berdasarkan **avg_ms tertinggi** (bukan hit count). Langsung menunjukkan endpoint yang butuh optimasi.

### Query Params

| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `limit` | number | 20 | Maks baris |
| `minAvgMs` | number | 0 | Filter route dengan avg_ms >= nilai ini |

### Response

```json
{
  "ok": true,
  "count": 5,
  "data": [
    {
      "method": "GET",
      "route": "/v1/manga/:mangaId/chapters",
      "count": 88,
      "avg_ms": 1240,
      "max_ms": 4500,
      "min_ms": 320,
      "err4xx": 0,
      "err5xx": 2,
      "avgHeapMB": 190.4,
      "avgCpuPct": 8.2
    }
  ]
}
```

### Contoh fetch

```js
const res = await fetch('/v1/debug-log/heavy?limit=10&minAvgMs=500', {
  headers: { Authorization: `Bearer ${adminToken}` }
});
const { data } = await res.json();
```

---

## 5) Error Requests (4xx / 5xx)

`GET /v1/debug-log/errors`

Mengembalikan request yang menghasilkan status HTTP >= 400 dari memory buffer.

### Query Params

| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `limit` | number | 100 | Maks entry |
| `status` | number | — | Filter exact status (e.g. `500`). Jika tidak diisi, semua >= 400 |
| `from` | string (ISO) | — | Filter waktu mulai |
| `to` | string (ISO) | — | Filter waktu selesai |

### Response

```json
{
  "ok": true,
  "count": 2,
  "data": [
    {
      "ts": "2026-04-13T01:12:00.000Z",
      "method": "POST",
      "route": "/v1/payments",
      "status": 500,
      "durationMs": 2011,
      "userId": "42",
      ...
    }
  ]
}
```

---

## 6) Request Log per User

`GET /v1/debug-log/user/:userId`

Semua request dari user tertentu (dari memory buffer).

### Path Param

| Param | Keterangan |
|---|---|
| `userId` | ID user (string/number) |

### Query Params

| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `limit` | number | 100 | Maks entry |
| `from` | string (ISO) | — | Filter waktu mulai |
| `to` | string (ISO) | — | Filter waktu selesai |
| `minDurationMs` | number | — | Filter request lambat saja |

### Response

```json
{
  "ok": true,
  "count": 14,
  "userId": "88",
  "data": [
    { "ts": "...", "method": "GET", "route": "/v1/profile", "durationMs": 95, ... }
  ]
}
```

### Contoh fetch

```js
const res = await fetch(`/v1/debug-log/user/${userId}?limit=30`, {
  headers: { Authorization: `Bearer ${adminToken}` }
});
const { data, count } = await res.json();
```

---

## 7) Daftar File Log di Disk

`GET /v1/debug-log/files`

Mengembalikan daftar file NDJSON yang tersimpan di disk (per hari, auto-rotate jika > 50k baris).

### Response

```json
{
  "ok": true,
  "dir": "/app/.tmp/request_logs",
  "count": 3,
  "data": [
    { "file": "request_log_2026-04-13.ndjson", "sizeBytes": 2048340, "mtime": "2026-04-13T07:30:00.000Z" },
    { "file": "request_log_2026-04-12.ndjson", "sizeBytes": 8192000, "mtime": "2026-04-12T23:59:59.000Z" }
  ]
}
```

---

## 8) Baca File Log dari Disk

`GET /v1/debug-log/file/:filename`

Membaca isi file NDJSON dari disk dengan filter. Berguna untuk debug historis (hari sebelumnya).

### Path Param

| Param | Keterangan |
|---|---|
| `filename` | Nama file `.ndjson` dari endpoint `/files`, e.g. `request_log_2026-04-12.ndjson` |

### Query Params

| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `tail` | number | 500 | Ambil N entry terakhir dari file (setelah filter) |
| `route` | string | — | Filter partial match route/path |
| `method` | string | — | Filter HTTP method |
| `userId` | string | — | Filter user ID |
| `minDurationMs` | number | — | Filter durasi minimum |
| `status` | number | — | Filter exact HTTP status |

### Response

```json
{
  "ok": true,
  "file": "request_log_2026-04-12.ndjson",
  "count": 47,
  "data": [
    { "ts": "...", "method": "GET", "route": "/v1/episode/:episodeId", "durationMs": 920, ... }
  ]
}
```

### Error

```json
{ "ok": false, "error": "File not found" }
```

### Contoh fetch

```js
const res = await fetch('/v1/debug-log/file/request_log_2026-04-12.ndjson?tail=100&minDurationMs=500', {
  headers: { Authorization: `Bearer ${adminToken}` }
});
const { data, count, file } = await res.json();
```

---

## 9) Export Memory Buffer (Download NDJSON)

`GET /v1/debug-log/export`

Download isi memory buffer saat ini sebagai file `.ndjson`. Response bukan JSON biasa — langsung file download.

### Query Params

| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `route` | string | — | Filter partial match |
| `method` | string | — | Filter HTTP method |
| `userId` | string | — | Filter user ID |
| `minDurationMs` | number | — | Filter durasi minimum |
| `from` | string (ISO) | — | Filter waktu mulai |
| `to` | string (ISO) | — | Filter waktu selesai |

### Response Headers

```
Content-Type: application/x-ndjson
Content-Disposition: attachment; filename="request_log_export_2026-04-13T00-32-11-043Z.ndjson"
```

### Body

Setiap baris adalah satu JSON entry (NDJSON format):

```
{"ts":"2026-04-13T00:30:00.000Z","method":"GET","route":"/v1/anime","durationMs":120,...}
{"ts":"2026-04-13T00:30:01.000Z","method":"POST","route":"/v1/comments/:animeId","durationMs":540,...}
```

### Contoh fetch (simpan ke file di Node.js)

```js
const res = await fetch('/v1/debug-log/export?minDurationMs=300', {
  headers: { Authorization: `Bearer ${adminToken}` }
});
const text = await res.text();
const entries = text.trim().split('\n').map(line => JSON.parse(line));
```

---

## Env Variables

| Env | Default | Keterangan |
|---|---|---|
| `REQUEST_PROFILER_ENABLED` | `true` | Set `false` untuk disable seluruh profiler |
| `REQUEST_PROFILER_MAX_MEMORY` | `2000` | Kapasitas ring buffer (jumlah entry) |
| `REQUEST_PROFILER_FLUSH_MS` | `5000` | Interval flush ke file NDJSON (ms) |
| `REQUEST_PROFILER_DIR` | `.tmp/request_logs` | Direktori output file log di disk |
| `REQUEST_PROFILER_MAX_FILE_LINES` | `50000` | Batas baris per file sebelum di-rotate |

---

## Catatan

- **Memory buffer** di-reset setiap restart server. Gunakan endpoint `/files` + `/file/:filename` untuk akses historis dari disk.
- **File NDJSON** ditulis per hari (`request_log_YYYY-MM-DD.ndjson`), auto-rotate jika melebihi `MAX_FILE_LINES`.
- **`route`** yang tampil adalah Express route pattern (e.g. `/v1/anime/:animeId`), bukan URL asli. Ini yang benar untuk aggregasi karena semua request ke `/v1/anime/123` dan `/v1/anime/456` tergabung dalam satu route.
- **`cpuPct`** adalah estimasi CPU per request, dihitung dari delta `process.cpuUsage()` antara request mulai dan selesai. Pada proses multi-core, nilainya bisa melewati `100%` bila satu request benar-benar menghabiskan lebih dari satu core secara efektif.
- **`normalizedCpuPct`** lebih cocok dipakai untuk membaca summary route pada server yang ramai, karena sudah mempertimbangkan jumlah request aktif.
