# Orthocare Physiotherapy Clinic

A React and Vite website backed by an Express API. Clinic content, services,
gallery items, FAQs, and appointment enquiries are stored in
`data/clinic_data.json`.

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

## Validation and production

```sh
npm run lint
npm run build
```

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
