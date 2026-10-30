# Orthocare Physiotherapy Clinic

A React and Vite website deployed to Cloudflare Workers with static assets and D1.
The Express API and `data/clinic_data.json` remain available for local Node.js
development.

## Requirements

- Node.js 20.19 or newer
- npm

## Development

For a fresh database, copy `.env.example` to `.env` and set
`ADMIN_INITIAL_PASSWORD` to a unique password with at least 15 characters.
Existing `data/clinic_data.json` files retain their current admin password.

```sh
npm install
npm run dev
```

The site and API are served together at `http://localhost:3000`. The API health
endpoint is available at `/api/health`. Set `PORT` to use a different port.
Responsive WebP derivatives for the static clinic photos are stored in
`public/images/responsive/`; the original images remain unchanged. After
replacing or adding a source photo, regenerate derivatives with
`npm run images:optimize`.

## Cloudflare Workers deployment

The Cloudflare deployment uses native Workers bindings—no Cloudflare
API token or account ID is embedded in source code. `wrangler.toml` is
configured for the Worker and existing D1 database:

- Worker: `orthocareclinic`
- D1 binding: `DB`
- Database: `orthocareclinic`
- Database ID: `bb1485a9-0b59-41b4-abf2-d4a7ca1e8f2d`

### One-time Cloudflare setup

1. Authenticate Wrangler with the Cloudflare account that owns the existing
   D1 database.
2. Before the first API request against an empty D1 database, set the Worker
   secret `ADMIN_INITIAL_PASSWORD` in the Cloudflare dashboard. Alternatively,
   run `npx wrangler secret put ADMIN_INITIAL_PASSWORD --name orthocareclinic`
   and enter the value at the prompt. Use a unique password of 15-128
   characters. It is only used to seed a new empty D1 state; it does not reset
   an existing administrator password. Do not send the password in chat or
   commit it to the repository.
3. Apply pending D1 migrations after authenticating Wrangler with the correct
   Cloudflare account: `npx wrangler login`, then `npm run cf:d1:remote`.
4. Configure a separate test D1 database for non-production deployments to
   avoid changing production data.

Admin sessions use an `HttpOnly`, `Secure`, `SameSite=Strict` cookie and are
never accepted from URL parameters or authorization headers. Login attempts
are rate-limited to five failures per IP within a 15-minute window using the
hashed-IP records in D1. Changing the password revokes all active sessions and
requires signing in again. Passwords are currently stored with the legacy
PBKDF2-HMAC-SHA-512 format at 10,000 iterations. The work factor was
intentionally left unchanged while evaluating a secure design compatible
with the selected Workers Free CPU budget; production CPU compatibility has
not been measured. This is a weak work factor and remains a known offline
password-cracking risk. The stronger KDF upgrade is deferred until a secure
design is confirmed against the account's actual Workers CPU budget. Use a
unique, high-entropy password, and do not treat the current hash as equivalent
to a modern high-work-factor password hash.

The Worker exposes the existing `/api/*` endpoints, persists clinic
content, enquiries, and hashed admin sessions in D1. Image upload is
intentionally deferred; the compatible `/api/upload` endpoint returns HTTP 503
with instructions instead of storing an image or pretending the upload
succeeded. Use existing static image paths such as `/images/clinic_treatment_room_1793268957681.jpg`
for gallery and service metadata. Image binaries remain in `public/`, not D1.
API writes enforce per-resource field allowlists and maximum field lengths.
Image metadata accepts only local raster-image paths under `/images/`; remote
URLs, data URLs, and traversal paths are rejected. Public enquiry forms include
a honeypot, validate contact and date fields, and are limited to five accepted
submissions per IP in a 15-minute window. D1 stores only a SHA-256 hash of the
client IP for that rate limit; migration `0004_enquiry_rate_limits.sql` creates
the rate-limit table. JSON request bodies are capped at 512 KiB.
Mutation requests require a same-origin `Origin` header. API responses use
`Cache-Control: no-store`; static asset responses include a restrictive
Content Security Policy and security headers. Administrator enquiry lists
are loaded using indexed, cursor-based pages of 50 records (maximum 100).
D1 is initialized lazily on the first API request after the migration and
secret are configured. Existing D1 state is never overwritten. The local
`data/clinic_data.json` database and `public/uploads/` files are not copied
automatically; migrate them separately only when explicitly intended.

### D1 data model and migration

Migration `0003_normalized_clinic_data.sql` copies the existing clinic state
without dropping or rewriting `orthocare_clinic_state`. Settings and page
content are stored as separate documents; categories, services, gallery items,
and FAQs are stored as individual records. Enquiries are stored in typed
columns with indexes for status/date and phone/date lookups. Administrator
credentials remain in a dedicated singleton table. Existing rows are retained
in the legacy state table as a frozen pre-migration reference snapshot; after
the application starts writing normalized rows, that legacy copy is not a
current rollback of subsequent changes.

For production, take an export outside the repository first, then use a brief
maintenance window to prevent old application versions from writing only to
the legacy state while cutover is in progress:

In PowerShell, create the backup outside the repository and keep it in a
protected location:

```powershell
$backupDirectory = Join-Path $env:USERPROFILE "secure-backups"
New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
$backupPath = Join-Path $backupDirectory "orthocareclinic-before-normalization.sql"
npx wrangler d1 export orthocareclinic --remote --output $backupPath
npm run cf:d1:remote
npm run cf:deploy
```

The export contains clinic and patient data; store it securely and never commit
it. Wrangler also captures a backup before applying migrations. Verify that
the row counts in normalized tables match the arrays in the legacy JSON before
reopening writes. The SQL uses `INSERT OR IGNORE`; it does not clear
destination rows, replace existing credentials, or drop the legacy table. If a
legacy row exists but normalized admin credentials are missing, the
application fails closed rather than seeding over existing data. Keep the
legacy snapshot and backup until post-deployment checks pass. Do not roll back
to the old application after normalized writes begin unless those writes have
also been exported or reverse-migrated.

After migration, the Worker writes clinic records through revision-checked
D1 batches and store enquiries directly as indexed rows. Enquiry lists use
cursor pagination instead of returning the full enquiry history. Apply all
pending migrations, including `0004_enquiry_rate_limits.sql`,
`0005_confirmed_business_hours.sql`, and `0006_enquiry_and_session_indexes.sql`,
before deploying. Migration 0005 corrects the hours only when the stored settings
still contain the exact previous seed hours and have no custom weekly schedule;
it also updates the address only when it exactly matches the previous seed
address. Other customized D1 settings are preserved.

The health endpoint verifies that the complete D1 schema is present and returns
HTTP 503 when required migrations are missing. The Worker integration test starts from a synthetic legacy `0001` database,
applies every migration, checks that legacy content and enquiries remain
readable, and exercises cookie authentication, password rotation and session
revocation, rate limits, and cursor pagination. It also checks first-admin
initialization against a separate fresh local database. Both databases are
temporary and synthetic.

### Local Cloudflare runtime

Copy `.dev.vars.example` to `.dev.vars` and set a disposable local password.
Then run:

```sh
npm run cf:d1:local
npm run cf:dev
```

This builds the prerendered site and starts the Worker locally.
Local Wrangler data is stored in `.wrangler/` and is ignored by Git. The regular
`npm run dev` command continues to use the Express server.

### Deploy from the command line

After confirming the Cloudflare account, existing D1 database binding, and
initial admin secret:

```sh
npm run cf:check
npm run cf:d1:remote
npm run cf:deploy
```

The deployment uses Workers Static Assets from `dist/`. No custom domain or
route is configured by this repository; keep existing production routing
unchanged unless a separate cutover is approved.

## Validation and production

```sh
npm run lint
npm run build
npm run test:worker
npm run test:backup-restore
```

### CI, staging validation, monitoring, and recovery

GitHub Actions runs the type-check, production build/prerender validation, a
local Workers runtime + isolated D1 integration smoke test, and a synthetic
D1 backup/restore drill on pull requests and pushes to `main`. These checks
use local temporary D1 databases only; they do not apply migrations to
Cloudflare or read production data.

Set the repository Actions variables `STAGING_BASE_URL` and
`PRODUCTION_BASE_URL` to the HTTPS deployment origins. The post-deployment
workflow checks the seven public routes, health endpoint, public D1-backed API
reads, and a responsive WebP asset after successful GitHub deployments whose
environment names include `staging` or `production`. It can also be started
manually from **Actions → Post-deployment smoke tests**, selecting the target
environment; the configured URL is used unless a URL override is supplied.
This supports Git-connected deployments without changing the production domain.
If deployment statuses are not connected to GitHub, run the staging workflow
manually after each staging deployment.

The production availability workflow runs the same read-only smoke checks every
15 minutes and can also be run manually. A failed check is visible as a failed
GitHub Actions run; enable repository/workflow failure notifications for the
operators responsible for the site. These synthetic checks do not replace
Cloudflare's platform analytics, D1 metrics, or alerting; review those in the
Cloudflare dashboard as well.

Create encrypted, access-controlled backups outside the repository and retain
them according to the clinic's data-retention policy. The script refuses to
write under the repository:

```powershell
npm run backup:d1 -- -BackupDirectory "D:\ClinicBackups\Orthocare"
```

The export uses Wrangler against the existing remote D1 database and writes a
SHA-256 sidecar. Never commit, attach to CI artifacts, or share these SQL files:
they contain clinic and patient records. Validate an actual backup by restoring
it to an isolated local D1 database (the drill does not contact or change the
remote database):

```powershell
npm run d1:restore-drill -- "D:\ClinicBackups\Orthocare\orthocareclinic-<timestamp>.sql"
```

The drill checks that the SQL imports into a newly created temporary D1
database and restores tables; it removes its temporary database when complete.
CI separately tests a full synthetic export/import round trip and verifies the
fixture row. This is a local recovery drill, not a production restore. For
production recovery, first pause writes and assess Cloudflare D1 Time Travel
(`npx wrangler d1 time-travel info orthocareclinic --timestamp <RFC3339>`).
Restoring a Time Travel point changes the live database; require explicit
operator approval, record the recovery point, and take/export a fresh backup
before using `npx wrangler d1 time-travel restore orthocareclinic --timestamp
<RFC3339>`. If Time Travel cannot recover the desired point, use a separately
created recovery database and a reviewed, verified export; validate it before
changing the Worker D1 binding. Never import over the current production DB as
a routine restore drill. Re-run the staging smoke test and verify clinic
settings, services, gallery, FAQs, enquiry access, and administrator login
before resuming writes.

The production build prerenders the public pages as clean static HTML routes at
`/`, `/treatments`, `/about`, `/gallery`, `/contact`, `/faqs`, and
`/privacy-policy`.
Each route has route-specific title, description, canonical, and social metadata.
The app hydrates the prerendered content and continues to refresh clinic data
from the API. Prerendered page content is sourced from `public/site-data.json`;
update that public fallback data when content changes so crawler-visible HTML
stays current. The `/admin` route is generated as a client-rendered,
`noindex` shell and is excluded from the sitemap.

After building, start the production server with `NODE_ENV=production` and
`npm start`. In PowerShell, use:

```powershell
$env:NODE_ENV = "production"
npm start
```

The clinic hours and contact details in `public/site-data.json` are the
confirmed public values: Monday–Friday 9:00 AM–8:00 PM, Saturday 9:00 AM–2:00
PM, and Sunday closed. The build generates JSON-LD from this same settings
object, so structured opening hours, phone, email, and address stay aligned
with prerendered visible content. Every build runs
`npm run validate:prerender` to check route metadata, canonicals, sitemap
coverage, rendered clinic hours, and LocalBusiness schema.

`public/site-data.json` is used only to generate crawler-visible prerendered
HTML. Runtime API failures are surfaced to the user and are never replaced with
seed data. The admin route can load independently of public-page data; session
verification and admin data requests must succeed before the dashboard is
shown. An API error or expired session is displayed explicitly with a retry or
sign-in action.

The production server serves the generated `dist/` site and the API.

## Data and uploads

The server creates `data/clinic_data.json` from the default clinic data when
needed. Uploaded images are stored under `public/uploads/`. Keep both data and
uploads persistent when deploying the server. These runtime files are excluded
from Git because they may contain admin credentials, patient enquiries, or
uploaded patient images.

## Optional D1 REST storage for the local Express server

The local Express server can optionally use the Cloudflare D1 REST API. This is
separate from the native D1 binding used by Cloudflare Workers.
Set these server-side environment variables (never expose them as `VITE_*`
variables):

- `STORAGE_BACKEND=cloudflare_d1`
- `CLOUDFLARE_ACCOUNT_ID` to your Cloudflare account ID
- `CLOUDFLARE_D1_DATABASE_ID` to the D1 database ID
- `CLOUDFLARE_API_TOKEN` to a token with D1 Read and D1 Write permissions
- `ADMIN_INITIAL_PASSWORD` to a unique password of at least 15 characters if
  the D1 clinic state has not been initialized yet

`CLOUDFLARE_D1_DATABASE_NAME` is optional and is used only in startup logs.
The server creates its `orthocare_clinic_state` and
`orthocare_clinic_sessions` tables idempotently. It seeds the default clinic
state only when `orthocare_clinic_state` is empty; existing D1 rows are not
overwritten. Local `data/clinic_data.json` is not imported automatically, so
patient enquiries or administrator credentials are never copied to D1 without
an explicit migration.

When D1 is enabled, the server reads and writes clinic data through the
Cloudflare D1 API. Keep the Cloudflare token in the hosting provider's secret
manager. The local Express server's image uploader still uses `public/uploads/`; this
is separate from Cloudflare Workers, where image uploads are deferred and
existing public static assets remain available.
