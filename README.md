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

3. Start the development server:

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
   (`http://localhost:4000/api`):

   ```bash
   echo "VITE_API_URL=http://localhost:4000/api" > .env
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

   Open the provided URL (typically `http://localhost:5173`) to use the application. Operators enter
   their name to start logging readings.

## Mock authentication

Authentication is mocked by capturing the operator name and role on login. The selected role is
sent to the API on every request and enforces the following permissions:

- **Admin** – full access to create sites, register assets and manage all measurements.
- **Field operator** – can record new measurements and delete ones they created, but cannot add
  new sites or assets.
- **Analyst** – read-only access to site details, reports and measurement history.

Replace this logic with a proper auth provider when needed.

## Production build

To produce a production build of the client, run `npm run build` in the `client` directory. The API
is stateless and can be deployed on any Node-compatible host. Ensure `MONGODB_URI` points to a
reachable MongoDB instance in production.
