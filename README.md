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

The watch list is always rendered as one vertical column on every screen size so reverse chronological order is visually unambiguous.

## Text Import

Use **Importera textfil** to replace the current list with a plain text file containing one watched title per row.

Import behavior:

- Empty lines are skipped.
- Row order is preserved exactly.
- Imported rows default to type `Serie`.
- The first detected rating token splits the row into title, rating, and notes.
- Text before the rating becomes the title.
- Text after the rating becomes notes.
- Trailing season markers such as `2`, `S2`, `Season 2`, and `Säsong 2` are moved into the detail field as `Säsong 2`.
- Four-digit years such as `2002` are not treated as seasons.
- Rows without ratings are imported with `rating: null`.
- Imported data is saved to `localStorage` and replaces the sample list.

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
| `*****-` | 4.5 |
| `*****` | 5.0 |
| `4-` | 3.5 |
| `4+` | 4.5 |

Open `index.html` directly in a browser, or serve the folder with any static file server.
