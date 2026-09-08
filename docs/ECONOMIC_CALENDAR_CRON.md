# Economic Calendar Import

The JBlanked Forex Factory calendar import is server-side only:

```text
POST /api/cron/fetch-economic-calendar
Authorization: Bearer $CRON_SECRET
```

Required environment variables:

```text
JBLANKED_API_KEY=
JBLANKED_CALENDAR_SOURCE=forex-factory
CRON_SECRET=
```

Suggested Vercel Cron schedule: run once per day at 03:00 UTC and call the import endpoint. Local development does not depend on cron; the same POST route can be tested manually from Postman.
