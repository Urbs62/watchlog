const STORAGE_KEY = "watchlog.titles.v1";
const MODE_KEY = "watchlog.mode.v1";
const MODE_DEMO = "demo";
const MODE_IMPORTED = "imported";
const MODE_CLEARED = "cleared";

const sampleTitles = [
  { title: "The Wire", type: "Serie", detail: "2002\u20132008", rating: 5, notes: "", order: 0 },
  { title: "Breaking Bad", type: "Serie", detail: "2008\u20132013", rating: 5, notes: "", order: 1 },
  { title: "True Detective s\u00e4song 4", type: "Serie", detail: "2024", rating: 2.5, notes: "", order: 2 },
  { title: "Band of Brothers", type: "Miniserie", detail: "2001", rating: 5, notes: "", order: 3 },
  { title: "Dune: Part Two", type: "Film", detail: "2024", rating: 4, notes: "", order: 4 },
];

const state = {
  filter: "Alla",
  query: "",
  ...loadInitialState(),
};

const listEl = document.querySelector("#watch-list");
const emptyEl = document.querySelector("#empty-state");
const totalCountEl = document.querySelector("#total-count");
const searchInput = document.querySelector("#search-input");
const fileInput = document.querySelector("#file-input");
const clearButton = document.querySelector("#clear-button");
const filterButtons = document.querySelectorAll(".filter-button");

function loadInitialState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const mode = localStorage.getItem(MODE_KEY);

  if (!saved) {
    if (mode === MODE_IMPORTED || mode === MODE_CLEARED) {
      return { titles: [], mode: MODE_CLEARED };
    }

    return { titles: sampleTitles, mode: MODE_DEMO };
  }

  try {
    const parsed = JSON.parse(saved);
    const titles = Array.isArray(parsed) ? parsed : [];
    const normalized = normalizeOrder(titles);
    saveTitles(normalized, MODE_IMPORTED);
    return { titles: normalized, mode: MODE_IMPORTED };
  } catch {
    return { titles: [], mode: MODE_CLEARED };
  }
}

function saveTitles(titles, mode = MODE_IMPORTED) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(titles));
  localStorage.setItem(MODE_KEY, mode);
}

// Preserves imported/insertion order. Missing legacy order values are assigned
// from the current array position, so the first source row remains first.
function normalizeOrder(titles) {
  return titles
    .map((item, index) => ({
      ...item,
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
      originalIndex: index,
    }))
    .sort((a, b) => a.order - b.order || a.originalIndex - b.originalIndex)
    .map(({ originalIndex, ...item }) => item);
}

function addTitle(titleData) {
  const firstOrder = state.titles.reduce((lowest, item) => {
    return Math.min(lowest, Number(item.order));
  }, 0);

  const title = {
    type: "Serie",
    notes: "",
    ...titleData,
    order: firstOrder - 1,
  };

  state.titles = [title, ...state.titles];
  state.mode = MODE_IMPORTED;
  saveTitles(state.titles);
  renderList();
}

function importTextFile(text) {
  const importedTitles = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseImportLine)
    .map((item, index) => ({ ...item, order: index }));

  state.titles = importedTitles;
  state.mode = MODE_IMPORTED;
  state.filter = "Alla";
  state.query = "";
  searchInput.value = "";

  filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === "Alla");
  });

  saveTitles(state.titles);
  renderList();
}

function clearWatchList() {
  const confirmed = window.confirm("Vill du rensa hela listan? Detta tar bort alla importerade titlar fr\u00e5n appen.");

  if (!confirmed) {
    return;
  }

  state.titles = [];
  state.mode = MODE_CLEARED;
  state.filter = "Alla";
  state.query = "";
  searchInput.value = "";

  filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === "Alla");
  });

  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(MODE_KEY, MODE_CLEARED);
  renderList();
}

// Splits one source row into title, season/detail, rating, and notes. The first
// valid rating token wins; text before it is title-ish, text after it is notes.
function parseImportLine(line) {
  const ratingMatch = findRatingMatch(line);
  const titleSource = ratingMatch ? line.slice(0, ratingMatch.index).trim() : line.trim();
  const notesSource = ratingMatch ? line.slice(ratingMatch.index + ratingMatch.text.length).trim() : "";
  const titleParts = parseTitleParts(titleSource, notesSource);

  return {
    title: titleParts.title,
    type: "Serie",
    detail: titleParts.detail,
    rating: ratingMatch ? ratingMatch.value : null,
    notes: titleParts.notes,
  };
}

function findRatingMatch(line) {
  const candidates = findRatingCandidates(line);

  for (const candidate of candidates) {
    const token = candidate.text;
    const tokenIndex = candidate.index;
    const value = parseRating(token);

    if (value !== null) {
      if (isLikelyTrailingSeasonNumber(line, token, tokenIndex) || isLikelySeasonBeforeLaterRating(line, token, tokenIndex)) {
        continue;
      }

      return {
        text: token,
        value,
        index: tokenIndex,
      };
    }
  }

  return null;
}

function findRatingCandidates(line) {
  const candidates = [];
  const tokenPattern = /(^|[^A-Za-zÅÄÖåäö0-9*])(\*{1,5}[+-]?|[1-5][+-]?)(?=$|[^A-Za-zÅÄÖåäö0-9*])/g;
  const starPattern = /\*{1,5}[+-]?/g;
  const signedNumberPattern = /(^|[^A-Za-zÅÄÖåäö0-9])([1-5][+-])/g;
  let match = tokenPattern.exec(line);

  while (match) {
    candidates.push({
      text: match[2],
      index: match.index + match[1].length,
    });
    match = tokenPattern.exec(line);
  }

  match = starPattern.exec(line);

  while (match) {
    candidates.push({
      text: match[0],
      index: match.index,
    });
    match = starPattern.exec(line);
  }

  match = signedNumberPattern.exec(line);

  while (match) {
    candidates.push({
      text: match[2],
      index: match.index + match[1].length,
    });
    match = signedNumberPattern.exec(line);
  }

  return candidates
    .sort((a, b) => a.index - b.index || b.text.length - a.text.length)
    .filter((candidate, index, list) => {
      return !list.slice(0, index).some((item) => item.index === candidate.index && item.text === candidate.text);
    });
}

function isLikelyTrailingSeasonNumber(line, token, tokenIndex) {
  const isPlainNumber = /^[1-9]\d*$/.test(token);
  const isAtEnd = line.slice(tokenIndex + token.length).trim() === "";
  const hasTitleBefore = line.slice(0, tokenIndex).trim().length > 0;
  const hasParentheticalNoteBefore = /\([^)]*\)/.test(line.slice(0, tokenIndex));

  return isPlainNumber && isAtEnd && hasTitleBefore && !hasParentheticalNoteBefore && !isLikelyYear(token);
}

function isLikelySeasonBeforeLaterRating(line, token, tokenIndex) {
  if (!/^[1-9]\d*$/.test(token) || isLikelyYear(token)) {
    return false;
  }

  const possibleTitle = line.slice(0, tokenIndex + token.length).trim();
  const remainingText = line.slice(tokenIndex + token.length);
  const parsedTitle = parseTitleDetail(possibleTitle);

  return parsedTitle.detail !== "" && /(^|\s)(\*{1,5}[+-]?|[1-5][+-]?)(?=\s|$)/.test(remainingText);
}

function parseTitleParts(rawTitle, rawNotes = "") {
  const parentheticalNotes = [];
  const titleWithoutParentheses = rawTitle.replace(/\(([^)]*)\)/g, (match, note) => {
    const cleanedNote = note.trim();

    if (cleanedNote) {
      parentheticalNotes.push(cleanedNote);
    }

    return " ";
  });
  const titleParts = parseTitleDetail(titleWithoutParentheses);
  const notes = formatNotes([...parentheticalNotes, rawNotes]);

  return {
    title: titleParts.title,
    detail: titleParts.detail,
    notes,
  };
}

function parseTitleDetail(rawTitle) {
  const title = rawTitle.trim().replace(/\s+/g, " ");
  const seasonMatch =
    title.match(/\s+(?:s|season|s\u00e4song)\s*([1-9]\d*)$/i) ||
    title.match(/\s+([1-9]\d*)$/);

  if (!seasonMatch) {
    return { title, detail: "" };
  }

  const seasonNumber = seasonMatch[1];

  if (isLikelyYear(seasonNumber)) {
    return { title, detail: "" };
  }

  return {
    title: title.slice(0, seasonMatch.index).trim(),
    detail: `S\u00e4song ${seasonNumber}`,
  };
}

function formatNotes(notes) {
  return notes
    .map((note) => note.trim())
    .filter(Boolean)
    .map(formatNoteSentence)
    .join(" ");
}

function formatNoteSentence(note) {
  const trimmed = note.trim().replace(/^\((.*)\)$/, "$1").trim();

  if (!trimmed) {
    return "";
  }

  const capitalized = trimmed.charAt(0).toLocaleUpperCase("sv-SE") + trimmed.slice(1);

  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function isLikelyYear(value) {
  const year = Number(value);
  return /^\d{4}$/.test(String(value)) && year >= 1900 && year <= 2099;
}

// Converts source shorthand such as "**+", "***-", or "4-" into a numeric rating.
function parseRating(ratingText) {
  const normalized = String(ratingText || "").trim();
  const ratingMap = {
    "*": 1,
    "*+": 1.5,
    "**": 2,
    "**+": 2.5,
    "***-": 2.5,
    "***": 3,
    "***+": 3.5,
    "****-": 3.5,
    "****": 4,
    "****+": 4.5,
    "*****-": 4.5,
    "*****": 5,
    "1": 1,
    "1-": 0.5,
    "1+": 1.5,
    "2-": 1.5,
    "2": 2,
    "2+": 2.5,
    "3-": 2.5,
    "3": 3,
    "3+": 3.5,
    "4-": 3.5,
    "4": 4,
    "4+": 4.5,
    "5-": 4.5,
    "5": 5,
    "5+": 5,
  };

  return ratingMap[normalized] ?? null;
}

// Renders whole stars only. Half ratings keep their numeric value internally
// and display as the previous full star plus one empty star.
function renderStars(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return `${"\u2605".repeat(fullStars)}${hasHalf ? "\u2606" : ""}`;
}

function buildInfoLink(title) {
  return `https://www.imdb.com/find/?q=${encodeURIComponent(title)}`;
}

function getRatingColor(value) {
  if (value >= 4.5) return "var(--gold)";
  if (value >= 3.5) return "var(--silver)";
  if (value >= 2.5) return "var(--bronze)";
  return "var(--dim)";
}

function getVisibleTitles() {
  const query = state.query.trim().toLowerCase();

  return state.titles.filter((item) => {
    const matchesFilter = state.filter === "Alla" || item.type === state.filter;
    const searchText = `${item.title} ${item.type} ${item.detail || ""} ${item.notes || ""}`.toLowerCase();
    return matchesFilter && (!query || searchText.includes(query));
  });
}

function renderList() {
  const visibleTitles = getVisibleTitles();
  totalCountEl.textContent = state.titles.length;
  emptyEl.hidden = visibleTitles.length > 0;
  emptyEl.textContent =
    state.titles.length === 0
      ? "Listan \u00e4r tom. Importera en textfil f\u00f6r att b\u00f6rja."
      : "Inga titlar matchar filtret.";

  listEl.innerHTML = visibleTitles.map(renderCard).join("");
}

function renderCard(item) {
  const meta = [item.type, item.detail].filter(Boolean).join(" \u2022 ");
  const rating = item.rating === null || item.rating === undefined ? null : Number(item.rating);
  const stripColor = getRatingColor(rating);
  const ratingLabel = rating === null ? "Inget betyg" : `Betyg ${rating} av 5`;

  return `
    <li class="watch-card" style="--strip-color: ${stripColor}">
      <div class="rating-strip" aria-hidden="true"></div>
      <article class="card-content">
        <div class="stars" aria-label="${ratingLabel}">${renderStars(rating)}</div>
        <h2 class="title">${escapeHtml(item.title)}</h2>
        <p class="meta">${escapeHtml(meta)}</p>
        ${item.notes ? `<p class="notes">${escapeHtml(item.notes)}</p>` : ""}
        <a class="info-link" href="${buildInfoLink(item.title)}" target="_blank" rel="noreferrer">IMDb \u2197</a>
      </article>
    </li>
  `;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[char];
  });
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;

    filterButtons.forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });

    renderList();
  });
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderList();
});

fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => importTextFile(String(reader.result || "")));
  reader.readAsText(file);
  event.target.value = "";
});

clearButton.addEventListener("click", clearWatchList);

renderList();
