# WatchLog

WatchLog is a small standalone, mobile-first PWA mockup for collecting watched TV series, films, and miniseries with simple ratings and IMDb search links.

## Files

- `index.html` - app shell and list markup
- `styles.css` - dark responsive UI
- `script.js` - sample data, localStorage, filtering, search, rating helpers
- `icons/` - minimal PWA metadata and icon

## List Order

WatchLog preserves personal watch-history order. The first row in imported source data appears first in the app, and newest watched titles belong at the top.

Titles are never sorted alphabetically unless explicitly requested. Each item stores an `order` field so the list order survives saves and reloads. The `addTitle(titleData)` helper inserts new manual entries at the top by assigning an order before the current first item.

## Rating Helpers

Implemented in `script.js`:

- `parseRating(ratingText)`
- `renderStars(value)`
- `buildInfoLink(title)`

Supported source rating shorthand:

| Text | Value |
| --- | ---: |
| `*` | 1.0 |
| `*+` | 1.5 |
| `**` | 2.0 |
| `**+` | 2.5 |
| `***-` | 2.5 |
| `***` | 3.0 |
| `***+` | 3.5 |
| `****-` | 3.5 |
| `****` | 4.0 |
| `****+` | 4.5 |
| `*****` | 5.0 |

Open `index.html` directly in a browser, or serve the folder with any static file server.
