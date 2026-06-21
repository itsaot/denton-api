# KhanaConnect integration (Denton Vision Art)

Denton API uses **KhanaConnect** as the platform layer for email delivery, newsletter subscribers, and site analytics. Marketplace data (mines, minerals, offers, users) stays in Denton's own MongoDB.

## Setup

### 1. Create a KhanaConnect client for Denton

In KhanaConnect (admin dashboard or API):

```http
POST https://khanaconnect.onrender.com/api/v1/client
Content-Type: application/json

{
  "clientID": "dentonVision",
  "companyName": "Denton Vision Art",
  "password": "...",
  "businessEmail": "info@dentonvisionmining.co.za",
  "businessEmailPassword": "...",
  "return_url": "https://dentonvisionmining.co.za",
  "merchant_id": "...",
  "merchant_key": "...",
  "passphrase": "..."
}
```

Save the returned **token** (1-year API JWT).

Configure SMTP/IMAP on the client record so KhanaConnect can send mail and sync the Email Center inbox.

Optional: set `ga4PropertyId` on the client for GA4 analytics in the KhanaConnect dashboard.

### 2. Configure Denton API (Render / `.env`)

```env
KHANA_CONNECT_API_URL=https://khanaconnect.onrender.com/api/v1
KHANA_CONNECT_CLIENT_ID=dentonVision
KHANA_CONNECT_TOKEN=<token from step 1>
```

When these are set:

- Registration / password-reset / admin notification emails go through KhanaConnect (`POST /email`)
- Local SMTP env vars are only used as fallback

### 3. Frontend → Denton API (BFF)

The browser should **not** hold the KhanaConnect token. Call Denton platform routes instead:

| Denton API | Purpose |
|------------|---------|
| `POST /api/platform/contact` | Contact form |
| `POST /api/platform/newsletter/subscribe` | Newsletter signup |
| `POST /api/platform/newsletter/unsubscribe` | Unsubscribe |
| `POST /api/platform/events/batch` | Page views, leads, custom events |
| `GET /api/platform/health` | Integration health check |

Admin routes (Denton JWT + `role: admin`):

| Denton API | KhanaConnect upstream |
|------------|----------------------|
| `GET /api/platform/analytics/overview` | GA4 overview + event stats + subscriber stats |
| `GET /api/platform/newsletter/stats` | Campaign + subscriber stats |
| `POST /api/platform/newsletter/send` | Send newsletter to subscribers |

### 4. Manage email & analytics in KhanaConnect

Log into the **Khana Technologies dashboard** with the Denton client account to use:

- **Email Center** — inbox, replies, signatures
- **Newsletter** — builder, drafts, sends, open tracking
- **Analytics** — GA4 overview, traffic sources
- **Revenue Command Center** — if you add e-commerce later

Site activity from `POST /api/platform/events/batch` appears under KhanaConnect tracking / admin site analytics.

## Event tracking example

```javascript
await fetch('https://denton-api.onrender.com/api/platform/events/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-ID': sessionId,
    'X-Anonymous-ID': anonymousId,
  },
  body: JSON.stringify({
    events: [{
      eventType: 'PAGE_VIEW',
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
    }],
  }),
});
```

## Newsletter subscribe example

```javascript
await fetch('https://denton-api.onrender.com/api/platform/newsletter/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', name: 'Jane' }),
});
```
