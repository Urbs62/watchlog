const STORAGE_KEY = "watchlog.titles.v1";

const sampleTitles = [
  { title: "The Wire", type: "Serie", detail: "2002\u20132008", rating: 5, order: 0 },
  { title: "Breaking Bad", type: "Serie", detail: "2008\u20132013", rating: 5, order: 1 },
  { title: "True Detective s\u00e4song 4", type: "Serie", detail: "2024", rating: 2.5, order: 2 },
  { title: "Band of Brothers", type: "Miniserie", detail: "2001", rating: 5, order: 3 },
  { title: "Dune: Part Two", type: "Film", detail: "2024", rating: 4, order: 4 },
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
const filterButtons = document.querySelectorAll(".filter-button");

function loadTitles() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    saveTitles(sampleTitles);
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
    ...titleData,
    order: firstOrder - 1,
  };

  state.titles = [title, ...state.titles];
  saveTitles(state.titles);
  renderList();
}

// Converts source shorthand such as "**+" or "***-" into a numeric 1-5 rating.
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
    "*****": 5,
  };

  return ratingMap[normalized] ?? null;
}

// Renders full, half, and empty stars while keeping a fixed five-position scale.
function renderStars(value) {
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
    const searchText = `${item.title} ${item.type} ${item.detail || ""}`.toLowerCase();
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
  const rating = Number(item.rating);
  const stripColor = getRatingColor(rating);

  return `
    <li class="watch-card" style="--strip-color: ${stripColor}">
      <div class="rating-strip" aria-hidden="true"></div>
      <article class="card-content">
        <div class="stars" aria-label="Betyg ${rating} av 5">${renderStars(rating)}</div>
        <h2 class="title">${escapeHtml(item.title)}</h2>
        <p class="meta">${escapeHtml(meta)}</p>
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

renderList();
