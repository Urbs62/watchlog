const STORAGE_KEY = "watchlog.titles.v1";

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
  titles: loadTitles(),
};

const listEl = document.querySelector("#watch-list");
const emptyEl = document.querySelector("#empty-state");
const totalCountEl = document.querySelector("#total-count");
const searchInput = document.querySelector("#search-input");
const fileInput = document.querySelector("#file-input");
const filterButtons = document.querySelectorAll(".filter-button");

function loadTitles() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return sampleTitles;
  }

  try {
    const parsed = JSON.parse(saved);
    const titles = Array.isArray(parsed) ? parsed : sampleTitles;
    const normalized = normalizeOrder(titles);
    saveTitles(normalized);
    return normalized;
  } catch {
    return sampleTitles;
  }
}

function saveTitles(titles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(titles));
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

  if (importedTitles.length === 0) {
    return;
  }

  state.titles = importedTitles;
  state.filter = "Alla";
  state.query = "";
  searchInput.value = "";

  filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === "Alla");
  });

  saveTitles(state.titles);
  renderList();
}

// Splits one source row into title, rating, and notes. The first valid rating
// token wins; text before it is title, text after it is notes.
function parseImportLine(line) {
  const ratingMatch = findRatingMatch(line);

  if (!ratingMatch) {
    return {
      title: line.trim(),
      type: "Serie",
      detail: "",
      rating: null,
      notes: "",
    };
  }

  return {
    title: line.slice(0, ratingMatch.index).trim(),
    type: "Serie",
    detail: "",
    rating: ratingMatch.value,
    notes: line.slice(ratingMatch.index + ratingMatch.text.length).trim(),
  };
}

function findRatingMatch(line) {
  const ratingPattern = /(^|\s)(\*{1,5}[+-]?|[1-5][+-]?)(?=\s|$)/g;
  let match = ratingPattern.exec(line);

  while (match) {
    const value = parseRating(match[2]);

    if (value !== null) {
      return {
        text: match[2],
        value,
        index: match.index + match[1].length,
      };
    }

    match = ratingPattern.exec(line);
  }

  return null;
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
  };

  return ratingMap[normalized] ?? null;
}

// Renders full, half, and empty stars while keeping a fixed five-position scale.
function renderStars(value) {
  if (value === null || value === undefined || value === "") {
    return "\u2606\u2606\u2606\u2606\u2606";
  }

  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return `${"\u2605".repeat(fullStars)}${hasHalf ? "\u00bd" : ""}${"\u2606".repeat(emptyStars)}`;
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

renderList();
