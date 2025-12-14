# Aqua Monitor

Aqua Monitor keeps track of water production, storage and usage across multiple sites. Each site
manages wells, tanks and flowmeters, allowing operators to capture readings for tank levels,
flowmeter activity and well depth.

## Features

- **Site management** – create sites and record locations for quick navigation.
- **Asset tracking** – register wells, tanks and flowmeters for each site.
- **Data capture** – log tank levels, flowmeter readings and well measurements with timestamp,
  operator and comments.
- **Latest insights** – view the most recent reading for every asset to monitor status at a glance.
- **Low-bandwidth friendly** – lightweight UI built with React and concise API payloads.

## Project structure

```
workspace/
├── client/   # React front end served with Vite
└── server/   # Express + MongoDB API
```

## Getting started

### Requirements

- Node.js 18+
- npm 9+
- MongoDB 6+ (local instance or Atlas cluster)

### Backend API

1. Install dependencies:

   ```bash
   cd server
   npm install
   ```

2. Copy the environment template and update the Mongo connection string if needed:

   ```bash
   cp .env.example .env
   ```

3. Configure Auth0 credentials by updating `.env` (see `.env.example`) with your tenant domain
   and API audience.

4. Start the development server:

   ```bash
   npm run dev
   ```

   The API runs on `http://localhost:4000` by default and exposes the following routes:

   - `GET /api/sites` – list sites
   - `POST /api/sites` – create a new site
   - `GET /api/sites/:siteId` – retrieve a site with all assets and latest readings
   - `POST /api/sites/:siteId/wells|tanks|flowmeters` – register assets
   - `POST /api/wells/:wellId/measurements` – record depth to water
   - `POST /api/tanks/:tankId/readings` – record tank level
   - `POST /api/flowmeters/:flowmeterId/readings` – record flowmeter values

### Frontend client

1. Install dependencies:

   ```bash
   cd client
   npm install
   ```

2. Create a `.env` file to point the client at the API if you are not using the default URL
   (`http://localhost:4000/api`). Include your Auth0 details to enable login:

   ```bash
   cat <<'EOF' > .env
   VITE_API_URL=http://localhost:4000/api
   VITE_AUTH0_DOMAIN=YOUR_AUTH0_DOMAIN
   VITE_AUTH0_CLIENT_ID=YOUR_AUTH0_CLIENT_ID
   VITE_AUTH0_AUDIENCE=YOUR_AUTH0_API_AUDIENCE
   VITE_AUTH0_ROLE_CLAIM=https://aqua.example.com/roles
   EOF
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

   Open the provided URL (typically `http://localhost:5173`) to use the application. Operators
   authenticate through Auth0 before they can load site data.

## Authentication

Auth0 protects both the API and client:

- The SPA performs a PKCE flow against your Auth0 tenant and requests an access token for the API
  audience defined in `VITE_AUTH0_AUDIENCE`.
- The API validates bearer tokens against the issuer in `AUTH0_ISSUER_BASE_URL` using the
  tenant JWKS endpoint, looks up the user by email in MongoDB and enforces the role stored on the
  user record.
- New signups are created in the database with `enabled: false` and no role. Superadmins receive a
  mocked email notification prompting them to approve the account via the User management section
  (set `APP_BASE_URL` to control the link in this message). Enabled users must have a database role
  of `admin`, `field-operator` or `analyst` to gain access.

## Production build

To produce a production build of the client, run `npm run build` in the `client` directory. The API
is stateless and can be deployed on any Node-compatible host. Ensure `MONGODB_URI` points to a
reachable MongoDB instance in production.
