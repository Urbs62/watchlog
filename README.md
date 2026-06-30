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
- Parenthetical text before the rating is moved into notes.
- Trailing season markers such as `2`, `S2`, `Season 2`, and `Säsong 2` are moved into the detail field as `Säsong 2`.
- Four-digit years such as `2002` are not treated as seasons.
- Rows without ratings are imported with `rating: null`.
- Imported data is saved to `localStorage` and replaces the sample list.

Use **Rensa lista** to remove the current WatchLog data from the app before importing a cleaned source file. Clearing removes the saved title list from `localStorage`, sets the count to `0`, and keeps the app empty on reload instead of restoring demo data.

## Manual Management

Use the floating `+` button to add titles directly in the app. Cards can be tapped/clicked to edit the same fields:

- title
- type
- season
- rating
- comment
- status
- recommended by
- custom info URL

Titles are grouped into collapsible sections: `Sett`, `Tips`, and `Vill se`. Each section keeps its own manual order and never sorts alphabetically. New manual entries are placed at the top of their selected section, and changing a title's status moves it to the top of the new section.

Collapsed section state is saved in `localStorage`, so `Sett`, `Tips`, and `Vill se` keep their expanded/collapsed state across reloads.

Each saved title uses the future-proof model:

`id`, `title`, `type`, `season`, `rating`, `status`, `recommendedBy`, `comment`, `imdbUrl`, `customInfoUrl`, `createdAt`, `updatedAt`, `manualOrder`.

## JSON Backup

Use **Exportera JSON** to download a full WatchLog backup named `WatchLog-YYYY-MM-DD-HH-mm.json`. The backup includes all sections and every title field in the current data model.

Use **Importera JSON** to restore a WatchLog backup on this or another device. JSON restore asks for confirmation, replaces the current local list, saves to `localStorage`, and does not restore demo data afterward.

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
| `1-` | 0.5 |
| `1` | 1.0 |
| `1+` | 1.5 |
| `2-` | 1.5 |
| `2` | 2.0 |
| `2+` | 2.5 |
| `3-` | 2.5 |
| `3` | 3.0 |
| `3+` | 3.5 |
| `4-` | 3.5 |
| `4` | 4.0 |
| `4+` | 4.5 |
| `5-` | 4.5 |
| `5` | 5.0 |
| `5+` | 5.0 |

Half ratings are stored numerically but rendered compactly with only filled and empty gold stars, for example `3.5` renders as `★★★☆`.

Open `index.html` directly in a browser, or serve the folder with any static file server.
