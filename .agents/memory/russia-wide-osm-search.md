---
name: Russia-wide OSM search
description: Constraint and strategy for country-wide lead discovery through public OpenStreetMap services.
---

For a Russia-wide search without a city, query several major cities and combine a small result set from each. Keep requests sequential and cache identical searches.

**Why:** Nominatim does not provide reliable category results for a whole country, while geocoding Russia and applying an Overpass radius only searches around the geographic center. Public Nominatim usage also requires a low request rate.

**How to apply:** Use explicit city searches for speed. Use multi-city sampling only when the city is empty, keep the cadence near one request per second, and avoid presenting it as exhaustive national coverage.