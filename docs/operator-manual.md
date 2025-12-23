# Aqua Monitor Operator Manual

## Purpose
Aqua Monitor tracks water production, storage, and usage across multiple sites. Operators manage
sites, register wells/tanks/flowmeters, and capture readings with timestamps, operators, and
comments.

## Roles and access

### Admin
* **Create and manage sites.**
* **Add assets** (wells, tanks, flowmeters) to a site.
* **Record measurements and readings** for all assets.
* **Delete history entries** for any asset.
* **Download history CSVs** and view history charts.

### Analyst
* **View-only access** to sites, assets, latest readings, and history.
* **Filter and download history** (table, chart, CSV).
* **No ability to create sites, add assets, or record/delete readings.**

### Field Operator
* **Record measurements and readings** for assigned sites.
* **Delete history entries** they created (their operator name matches).
* **Cannot create sites or add assets.**

> Note: A Superadmin role exists for user administration, but it is outside the scope of this
> manual.

## Core navigation

### Login & session
1. Sign in with your Auth0 account.
2. After login, your role is shown in the top-right session panel.
3. Use **Log out** to end the session.

### Settings & localization
* Set **Language** (English / Swahili).
* Set **Time zone** (used for timestamps and history filters).

### Sites panel
* The left panel lists **Sites**.
* Select a site to view its details.
* Admins can create a site with name and location.

### Site detail view
* The main view shows **Wells**, **Tanks**, and **Flowmeters** as cards.
* Use feature filters to show/hide categories.
* Each card displays the latest reading/measurement.
* Use the history action to open the **History** modal for that asset.

## Feature guide

### Sites
**What it is:** A physical location where assets (wells, tanks, flowmeters) are grouped.

**What you can do**
* **Admin:** Create new sites (name + location) and select sites to manage assets.
* **Analyst/Field Operator:** View sites and select them to review assets and readings.

**Typical workflow**
1. Create a site (admin).
2. Add wells, tanks, and flowmeters under the site.
3. Operators record readings on assets.
4. Analysts review history and export data.

### Wells
**What it is:** A water source that tracks depth-to-water measurements and pump state.

**What you can do**
* **Admin:** Add a well (name + location), record measurements, delete any entry.
* **Field Operator:** Record measurements; delete entries they created.
* **Analyst:** View latest measurement, history, charts, and download CSV.

**Measurement fields**
* **Depth to water (m)** (required)
* **Pump state** (on/off)
* **Recorded at** (date/time)
* **Operator name**
* **Comment**

**Bulk entry (wells only)**
* Bulk import CSV with columns: **Date, Time, Depth to water (m), Comments**.
* Admins can select an operator for bulk entries; field operators use their own name.
* The bulk grid validates missing or out-of-order timestamps before saving.

### Tanks
**What it is:** A storage asset that tracks water level readings.

**What you can do**
* **Admin:** Add a tank (name + capacity), record readings, delete any entry.
* **Field Operator:** Record readings; delete entries they created.
* **Analyst:** View latest reading, history, charts, and download CSV.

**Reading fields**
* **Level (L)** (required)
* **Recorded at** (date/time)
* **Operator name**
* **Comment**

### Flowmeters
**What it is:** A monitoring device that tracks flow over time.

**What you can do**
* **Admin:** Add a flowmeter (name + location), record readings, delete any entry.
* **Field Operator:** Record readings; delete entries they created.
* **Analyst:** View latest reading, history, charts, and download CSV.

**Reading fields**
* **Instantaneous flow (L/min)** (required)
* **Totalized volume (L)** (required)
* **Recorded at** (date/time)
* **Operator name**
* **Comment**

## History, filtering, and exports

### History modal
Each asset card opens a **History** modal with:
* **Table view:** paginated history, operator filter, date range filters, and delete actions
  (if permitted).
* **Chart view:** visual history with date-range controls (wells invert the Y-axis).

### Filters
* **Operator filter** to narrow to specific operators.
* **Date range** filters in the site time zone.

### CSV download
* Download history data for the currently filtered range.

## Screenshots
Screenshots are not available in this environment because the app requires Auth0 and a live
backend to render the UI. If you can run the client locally, capture:
* Sites panel and site detail view.
* Each asset card type (well, tank, flowmeter).
* History modal (table + chart) and bulk well import.
