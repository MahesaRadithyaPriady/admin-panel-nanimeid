# Admin VIP Management API

Base path: `/<VERSION>/admin`

All endpoints require admin auth and SUPERADMIN role.

## Endpoints

### 1) Get User VIP Status
- Method: GET
- Path: `/vip/users/:userId`
- Response:
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "user": {
      "id": 123,
      "username": "john",
      "email": "john@example.com",
      "profile": {
        "full_name": "John Doe",
        "avatar_url": "/v1/static/avatars/u123.png"
      }
    },
    "vip": {
      "user_id": 123,
      "vip_level": "Diamond",
      "status": "ACTIVE",
      "start_at": "2025-10-01T00:00:00.000Z",
      "end_at": "2025-11-01T00:00:00.000Z",
      "auto_renew": true,
      "payment_method": "CREDIT_CARD",
      "last_payment_at": "2025-10-01T00:00:00.000Z",
      "notes": null
    }
  }
}
```

### 2) Get User VIP Payment History
- Method: GET
- Path: `/vip/users/:userId/history`
- Query: `page` (default 1), `pageSize` (default 20)
- Response (example):
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "page": 1,
    "pageSize": 20,
    "total": 3,
    "totalPages": 1,
    "items": [
      { "action": "ACTIVATE", "duration_days": 30, "createdAt": "2025-10-01T00:00:00.000Z" },
      { "action": "RENEW", "duration_days": 30, "createdAt": "2025-10-15T00:00:00.000Z" },
      { "action": "CANCEL", "duration_days": null, "createdAt": "2025-10-20T00:00:00.000Z" }
    ]
  }
}
```

### 3) Activate User VIP
- Method: POST
- Path: `/vip/users/:userId/activate`
- Body:
```json
{
  "vip_level": "Diamond",
  "durationDays": 30,
  "auto_renew": false,
  "payment_method": "GOPAY",
  "notes": "manual activate"
}
```
- Response: `201 Created`

### 4) Renew User VIP
- Method: POST
- Path: `/vip/users/:userId/renew`
- Body:
```json
{
  "durationDays": 30,
  "payment_method": "OVO",
  "notes": "manual renew"
}
```
- Response: `200 OK`

### 5) Cancel User VIP
- Method: POST
- Path: `/vip/users/:userId/cancel`
- Body (optional):
```json
{ "notes": "fraud suspected" }
```
- Response: `200 OK`

### 6) Set User VIP Auto Renew
- Method: PATCH
- Path: `/vip/users/:userId/auto-renew`
- Body:
```json
{ "auto_renew": true }
```
- Response: `200 OK`

## Notes
- All operations persist to `userVIP` and append records to `vipPaymentHistory` when applicable.
- Valid `payment_method`: `CREDIT_CARD`, `DEBIT_CARD`, `PAYPAL`, `BANK_TRANSFER`, `GOPAY`, `OVO`.
- `durationDays` default is 30 when omitted.
docs 