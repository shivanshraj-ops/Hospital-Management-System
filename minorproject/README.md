# MediCare HMS — Vercel Deployment

This version is migrated from the original PHP/XAMPP backend to Vercel Node.js serverless functions while keeping the existing HTML/CSS/JavaScript frontend.

## What changed

- `index.html` is the production entry page.
- `/api/*.js` contains Vercel serverless API endpoints.
- `lib/db.js` connects to a hosted MySQL database using `mysql2`.
- `lib/auth.js` uses a signed HttpOnly cookie (JWT) instead of PHP sessions.
- Existing PHP code is preserved under `legacy-php/` for reference only and is not used by Vercel.
- `script.js` now calls `/api/login`, `/api/signup`, etc. instead of `.php` URLs.

## 1. Create a hosted MySQL database

Use any standard external MySQL provider (Aiven, Railway, DigitalOcean Managed MySQL, etc.). Create an empty database, then import `database.sql` into it.

`database.sql` no longer drops/creates the database itself, so it is safer for managed MySQL. It creates missing tables and loads the included seed data.

Default seeded admin from the original project:

- username: `admin`
- email: `admin@medicare.in`
- password: `admin123`

Change the admin password after first login.

## 2. Environment variables

In Vercel: Project → Settings → Environment Variables.

Use either a single connection URL:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE
DB_SSL=true
AUTH_SECRET=replace-with-a-long-random-secret
```

or individual variables:

```env
DB_HOST=your-host
DB_PORT=3306
DB_NAME=medicare_hms
DB_USER=your-user
DB_PASSWORD=your-password
DB_SSL=true
AUTH_SECRET=replace-with-a-long-random-secret
```

`AUTH_SECRET` must be stable and secret. A good value is at least 32 random bytes. Do not commit real secrets to GitHub.

## 3. Deploy to Vercel

1. Push this folder to GitHub.
2. In Vercel choose **Add New → Project** and import that repository.
3. Framework/Application Preset: **Other**.
4. Root Directory: project root (`/`) unless this project lives inside a subfolder.
5. Build Command: leave empty/default.
6. Output Directory: leave empty/default.
7. Add the environment variables above.
8. Click **Deploy**.

After changing environment variables, redeploy from Vercel Deployments if needed.

## 4. Verify after deployment

Open the production URL in an Incognito/Private window and test:

1. Opening the URL shows the login page unless a valid auth cookie exists.
2. Admin login works.
3. Logout returns to login and refresh stays logged out.
4. Signup creates a new `patient` user in the production `users` table.
5. The new user can log in with their own credentials.
6. Wrong passwords fail.
7. Admin/staff dashboard loads.
8. Patient, doctor, appointment, invoice and staff CRUD works as intended.
9. Contact form saves to the production database.

## Local development (optional)

Copy `.env.example` to `.env`, fill in a reachable hosted MySQL database, then install dependencies:

```bash
npm install
```

For Vercel-compatible local execution, use the Vercel CLI (`vercel dev`) if installed.

## Security notes

- Authentication cookies are HttpOnly and SameSite=Lax; they are Secure on Vercel/production.
- Passwords are hashed with bcrypt.
- Existing PHP `$2y$` bcrypt hashes are normalized so the seeded admin can still log in after migration.
- SQL statements use parameterized queries.
- API auth/session responses are marked `no-store`.
- Production secrets belong only in Vercel environment variables, never in Git.
