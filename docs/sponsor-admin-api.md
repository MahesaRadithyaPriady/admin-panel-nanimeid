# Sponsor Admin API (SUPERADMIN)

Base path: `/${VERSION}/sponsor/admin`
Auth: `authenticateAdmin` + `authorizeAdminRoles("SUPERADMIN")`

## GET `/`
- Deskripsi: Daftar sponsor.
- Respon:
```json
{
  "status": 200,
  "message": "OK",
  "items": [
    {
      "id": 1,
      "name": "My Channel",
      "type": "youtube",
      "link_url": "https://youtube.com/@mychannel",
      "icon_url": "https://cdn.example.com/icons/youtube.png",
      "is_active": true,
      "sort_order": 0,
      "metadata": null,
      "createdAt": "2025-11-03T00:00:00.000Z",
      "updatedAt": "2025-11-03T00:00:00.000Z"
    }
  ]
}
```
- Contoh:
```bash
curl "$BASE/sponsor/admin" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## GET `/:id`
- Deskripsi: Detail sponsor.
- Respon: `{ status, message, item }` (404 bila tidak ditemukan)
- Contoh:
```bash
curl "$BASE/sponsor/admin/1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## POST `/`
- Deskripsi: Buat sponsor baru.
- Body:
```json
{
  "name": "My Channel",
  "type": "youtube", // atau tiktok | instagram | website | custom
  "link_url": "https://youtube.com/@mychannel",
  "icon_url": "https://cdn.example.com/icons/youtube.png",
  "is_active": true,
  "sort_order": 0,
  "metadata": { "note": "optional" }
}
```
- Respon: `{ status: 201, message: "Created", item }`
- Contoh:
```bash
curl -X POST "$BASE/sponsor/admin" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Partner A","type":"website","link_url":"https://partner.example.com","is_active":true
  }'
```

## PUT `/:id`
- Deskripsi: Update sponsor.
- Body: sama seperti POST (partial allowed)
- Respon: `{ status: 200, message: "Updated", item }`
- Contoh:
```bash
curl -X PUT "$BASE/sponsor/admin/1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sort_order":10,"is_active":false}'
```

## DELETE `/:id`
- Deskripsi: Hapus sponsor.
- Respon: `{ status: 200, message: "Deleted" }`
- Contoh:
```bash
curl -X DELETE "$BASE/sponsor/admin/1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Catatan
- Field `type` bebas string, gunakan nilai konsisten (misal: "youtube", "tiktok").
- Gunakan `sort_order` untuk urutan tampil.
