# MyRyedo launch notes

## Production changes
- Home is the default entry point; login/register is required only for protected actions.
- Demo Booker/Demo Owner shortcuts and hard-coded demo credentials are removed.
- MongoDB is the only persistent database. Configure `MONGODB_URI` and optionally `MONGODB_DB_NAME`.
- `JWT_SECRET` is required; the server refuses to start without it.
- Optional admin creation requires both `ADMIN_EMAIL` and `ADMIN_PASSWORD`; no default admin password is shipped.
- Vehicle image upload/editing is not implemented. Existing vehicle images are display-only.
- Booking cancellation uses a server-authoritative preview + confirmation endpoint and returns the cancellation/refund record to the UI.
- Cancellation policy includes a 1-hour free grace period, progressive post-booking fees, and additional time-before-pickup tiers.
- Booking cancellation releases the vehicle slot and can notify the next eligible waiting-list user.
- Legacy JSON persistence files are removed.

## Required environment
See `.env.example`. At minimum: `MONGODB_URI` and `JWT_SECRET`.

## Run
```bash
npm install
npm run dev
```

For production:
```bash
npm install
npm run build
NODE_ENV=production npm start
```

## Latest UI fixes
- Notification bell now opens a dedicated full Notifications page instead of a drawer.
- Notifications page shows all server notifications with unread filtering, mark-as-read, mark-all-as-read, and destination navigation.
- Vehicle cards no longer render vehicle image components; they show vehicle name and details only.
- Removed inspection photo capture/sample-photo UI so there is no vehicle/inspection photo upload workflow.
- Homepage search now validates pickup/return dates, prevents invalid date combinations, and safely searches MongoDB vehicle fields without crashing on missing values.
- Search date inputs now enforce sensible minimum dates.
