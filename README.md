# Orthocare Physiotherapy Clinic

A React and Vite website with Cloudflare Pages Functions and D1 for production.
The Express API and `data/clinic_data.json` remain available for local Node.js
development.

## Requirements

- Node.js 20.19 or newer
- npm

## Development

For a fresh database, copy `.env.example` to `.env` and set
`ADMIN_INITIAL_PASSWORD` to a unique password with at least 12 characters.
Existing `data/clinic_data.json` files retain their current admin password.

```sh
npm install
npm run dev
```

The site and API are served together at `http://localhost:3000`. The API health
endpoint is available at `/api/health`. Set `PORT` to use a different port.

## Cloudflare Pages deployment

The Cloudflare deployment uses native Pages Functions bindings—no Cloudflare
API token or account ID is embedded in source code. `wrangler.toml` is
configured for the Pages project and existing D1 database:

- D1 binding: `DB`
- Database: `orthocareclinic`
- Database ID: `bb1485a9-0b59-41b4-abf2-d4a7ca1e8f2d`

### One-time Cloudflare setup

1. The Pages project is named `orthocareclinic`, with `main` as its production
   branch. For Git-connected builds, set the build command to `npm run build`
   and the output directory to `dist`.
2. In Pages **Settings → Functions → D1 database bindings**, bind `DB` to the
   existing `orthocareclinic` database.
3. Before the first API request against an empty D1 database, set the Pages
   secret `ADMIN_INITIAL_PASSWORD` in the Cloudflare dashboard. Alternatively,
   run `npx wrangler pages secret put ADMIN_INITIAL_PASSWORD --project-name orthocareclinic`
   and enter the value at the prompt. Use a unique password of at least 12
   characters. It is only used to seed a new empty D1 state; it does not reset
   an existing administrator password. Do not send the password in chat or
   commit it to the repository.
4. Apply the D1 schema after authenticating Wrangler with the correct
   Cloudflare account: `npx wrangler login`, then `npm run cf:d1:remote`.
5. Configure the D1 binding and initial admin secret for **Production** and
   **Preview** as needed. Use a separate test D1 database for preview
   deployments to avoid changing production data.

The Pages Functions expose the existing `/api/*` endpoints, persist clinic
content, enquiries, and hashed admin sessions in D1. Image upload is
intentionally deferred; the compatible `/api/upload` endpoint returns HTTP 503
with instructions instead of storing an image or pretending the upload
succeeded. Use existing static image paths such as `/images/clinic_treatment_room_1793268957681.jpg`
for gallery and service metadata. Image binaries remain in `public/`, not D1.
D1 is initialized lazily on the first API request after the migration and
secret are configured. Existing D1 state is never overwritten. The local
`data/clinic_data.json` database and `public/uploads/` files are not copied
automatically; migrate them separately only when explicitly intended.

### Local Cloudflare runtime

Copy `.dev.vars.example` to `.dev.vars` and set a disposable local password.
Then run:

```sh
npm run cf:d1:local
npm run cf:dev
```

This builds the prerendered site and starts Cloudflare Pages Functions locally.
Local Wrangler data is stored in `.wrangler/` and is ignored by Git. The regular
`npm run dev` command continues to use the Express server.

### Deploy from the command line

After configuring the Pages project, D1 binding, and initial admin secret:

```sh
npm run cf:d1:remote
npm run cf:deploy
```

Git-connected Pages deployments can build automatically using the same build
command and output directory.

## Validation and production

```sh
npm run lint
npm run build
```

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

The production server serves the generated `dist/` site and the API.

## Data and uploads

The server creates `data/clinic_data.json` from the default clinic data when
needed. Uploaded images are stored under `public/uploads/`. Keep both data and
uploads persistent when deploying the server. These runtime files are excluded
from Git because they may contain admin credentials, patient enquiries, or
uploaded patient images.

## Optional D1 REST storage for the local Express server

The local Express server can optionally use the Cloudflare D1 REST API. This is
separate from the native D1 binding used by Cloudflare Pages.
Set these server-side environment variables (never expose them as `VITE_*`
variables):

- `STORAGE_BACKEND=cloudflare_d1`
- `CLOUDFLARE_ACCOUNT_ID` to your Cloudflare account ID
- `CLOUDFLARE_D1_DATABASE_ID` to the D1 database ID
- `CLOUDFLARE_API_TOKEN` to a token with D1 Read and D1 Write permissions
- `ADMIN_INITIAL_PASSWORD` to a unique password of at least 12 characters if
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
is separate from Cloudflare Pages, where image uploads are deferred and
existing public static assets remain available.
