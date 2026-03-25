# Admin Overview API

Endpoint untuk dashboard overview admin (server status, counts) dan statistik harian (snapshot) untuk kebutuhan FE.

- Base URL: `/admin`
- Auth: `Authorization: Bearer <ADMIN_JWT>`
- Middleware: `authenticateAdmin`

## 1) GET `/admin/overview`

Mengambil ringkasan counts dan status server.

### Response 200
```json
{
  "message": "Overview",
  "counts": {
    "users": 123,
    "anime": 456,
    "episodes": 789
  },
  "server": {
    "now": "2026-03-19T08:00:00.000Z",
    "uptimeSec": 12345,
    "platform": "win32",
    "node": "v20.x",
    "memory": {
      "total": 0,
      "used": 0,
      "free": 0,
      "usagePercent": 0,
      "unit": "bytes"
    },
    "cpu": {
      "cores": 8,
      "model": "...",
      "speedMHz": 0,
      "loadAvg": [0, 0, 0],
      "usagePercent": 0
    },
    "storage": {
      "total": 0,
      "used": 0,
      "free": 0,
      "unit": "bytes"
    }
  }
}
```

## 2) GET `/admin/overview/stats`

Mengambil statistik harian dari tabel snapshot `DailyOverviewStat`.

Snapshot disimpan otomatis via cron job pada **00:00 WIB (Asia/Jakarta)** dan data yang disimpan adalah statistik untuk **hari kemarin (WIB)**.

### Query
- `days` (opsional): jumlah hari terakhir yang ingin diambil.
  - Default: `7`
  - Min: `1`
  - Max: `90`

### Response 200
```json
{
  "message": "OK",
  "days": 7,
  "items": [
    {
      "stat_date": "2026-03-11T17:00:00.000Z",
      "registrations": 10,
      "active_users": 120,
      "topup_count": 4,
      "topup_amount_coins": "50000"
    }
  ]
}
```

Keterangan:
- `stat_date`: timestamp UTC yang merepresentasikan **00:00 WIB** untuk tanggal snapshot.
- `active_users`: dihitung dari jumlah `UserProfile.last_seen_at` yang berada pada window hari kemarin (WIB).
- `topup_count` dan `topup_amount_coins`: topup dengan status `APPROVED/PAID` pada window hari kemarin (WIB).

## 3) GET `/admin/http-logs`

Ambil log request terbaru dari buffer in-memory (untuk debug admin).

### Query
- `limit` (opsional): default `100`
- `level` (opsional): filter level log (tergantung implementasi buffer)

### Response 200
```json
{
  "message": "Recent HTTP logs",
  "level": null,
  "count": 2,
  "logs": []
}
```

## Lokasi Kode
- Routes: `src/routes/overview.routes.js`
- Controller: `src/controllers/overview.controller.js`
- Job (snapshot harian): `src/jobs/dailyOverviewStats.job.js`
