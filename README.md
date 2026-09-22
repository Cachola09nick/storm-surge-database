# Historical Storm Surge Database Occurrences in the Philippines from 1897 - 2023

This package is a complete browser-based interface built from the supplied historical storm-surge CSV.

## Features
- Province → Municipality/City → Barangay cascading filters
- Typhoon and TC category filters
- Minimum/maximum observed surge-height filters
- Keyword search
- Interactive Leaflet map with color-coded point markers
- Popup details for each observation
- Search-results table with pagination
- Click a table row to zoom to the observation
- Export the current filtered result set as CSV
- Responsive layout for desktop/tablet

## Run
1. Extract the ZIP.
2. Open `index.html` in Chrome, Edge, or Firefox.
3. Internet access is required for the Leaflet library and OpenStreetMap basemap tiles.
4. The storm-surge records themselves are stored locally in `js/data.js`, so no database server is required for this version.

For a web server, upload the entire folder without changing the directory structure.

## Main files
- `index.html` — application page
- `css/style.css` — layout and styling
- `js/app.js` — filtering, mapping, table, and CSV-export logic
- `js/data.js` — local data generated from the supplied CSV
- `data/historical_storm_surge.csv` — cleaned source CSV

## Updating the data
This version embeds the dataset in `js/data.js` so it also works when `index.html` is opened directly from a local folder. If the CSV changes, regenerate `data.js` from the updated CSV or modify the application to load data from an API/database.

## Production upgrade
For a true multi-user database deployment, the next step is to connect the interface to PostgreSQL/PostGIS or MySQL through a backend API. The current package is ideal as a working prototype/static deployment.

## Fixed version
- Removed the marker-color-by-observed-height legend.
- All storm-surge observation markers now use one uniform blue color.
- Removed CDN integrity attributes that could cause Leaflet CSS/JavaScript to be blocked.
- Switched to the canonical OpenStreetMap tile endpoint.
- Changed the map warning so it does not block interaction with the map.

## Map access fix
The basemap was changed from direct OpenStreetMap volunteer tile servers to the CARTO light basemap.
The previous direct OSM tile requests returned HTTP 403 / Access blocked when the app was opened locally.
The observation markers remain uniform blue and the observed-height color legend is removed.

## Keyless basemap update
The CARTO basemap was replaced with OpenTopoMap tiles. This removes the CARTO API-key-required watermark while retaining the Leaflet map and uniform blue storm-surge observation markers. Required map attribution remains visible.


## Administrator data management

This version includes an administrator mode for adding, editing, deleting, and saving storm-surge records.

Default demo credentials:
- Username: `admin`
- Password: `SurgeM2026!`

Administrator changes are saved in the browser's localStorage and remain available on that browser/computer. The "Save Database CSV" button exports the complete updated database to a CSV file.

IMPORTANT SECURITY NOTE:
This package is still a static browser application. The login prevents normal interface access to editing, but credentials stored in browser JavaScript are not secure against a knowledgeable user who can inspect the source code. For a real public/office multi-user deployment, use a backend server (PHP/Node/Python/.NET) with hashed passwords, server-side sessions, role permissions, HTTPS, and a database such as PostgreSQL/PostGIS or MySQL.

## Storm surge height marker legend
Map observation points are now classified by observed storm-surge height:
- Yellow: up to 2.0 m
- Orange: 2.1 to 3.0 m
- Red: 3.1 m and above
- Gray: missing or non-numeric observed height

The user's requested ranges leave exactly 2.0 m between 'below 2' and '2.1–3.0'; this build assigns exactly 2.0 m to yellow so every numeric height is classified.
