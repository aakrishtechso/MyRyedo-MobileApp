# MyRyedo Authentication Deployment Notes

The authentication implementation now uses the existing backend/database and does not use OTP for password recovery.

## Frontend (Vercel)

Set this environment variable for the production frontend:

```env
VITE_API_URL=https://my-ryedo.onrender.com
```

Then trigger a new frontend deployment so Vite embeds the value into the production build.

## Backend (Render)

Set these environment variables on the Render backend:

```env
APP_URL=https://my-ryedo.vercel.app
FRONTEND_URL=https://my-ryedo.vercel.app
CORS_ORIGINS=https://my-ryedo.vercel.app
JWT_SECRET=<your-existing-long-random-secret>
MONGODB_URI=<your-existing-mongodb-connection-string>
MONGODB_DB_NAME=<your-existing-database-name>
```

Use the actual deployed frontend/backend domains if they differ.

## Authentication flow

### Login
Frontend -> Render API -> MongoDB -> bcrypt password verification -> JWT session -> frontend session state.

The frontend also stores the returned JWT so authenticated API requests continue to work across the separately deployed frontend/backend.

### Forgot password

1. User enters registered email.
2. Server generates a random CAPTCHA challenge.
3. Server stores only a salted CAPTCHA hash.
4. User manually enters the CAPTCHA.
5. Server verifies email + CAPTCHA.
6. Server creates a short-lived, single-use password reset token.
7. User sets and confirms the new password.
8. Server hashes the password with bcrypt, updates MongoDB, invalidates previous sessions, and consumes the reset token.

No SMS/email OTP is used for password recovery.

## Important

Do not commit `.env` or expose MongoDB/JWT secrets in the frontend. Use the deployment platform's environment-variable settings.
