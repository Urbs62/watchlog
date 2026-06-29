const STORAGE_KEY = "watchlog.titles.v1";
const MODE_KEY = "watchlog.mode.v1";
const MODE_DEMO = "demo";
const MODE_IMPORTED = "imported";
const MODE_CLEARED = "cleared";
const STATUS_SEEN = "Sett";
const STATUS_TIPS = "Tips";
const STATUS_WATCHLIST = "Vill se";
const STATUSES = [STATUS_SEEN, STATUS_TIPS, STATUS_WATCHLIST];

const sampleTitles = [
  createTitleRecord({ title: "The Wire", type: "Serie", season: "2002\u20132008", rating: 5, status: STATUS_SEEN }, 0, "demo-1"),
  createTitleRecord({ title: "Breaking Bad", type: "Serie", season: "2008\u20132013", rating: 5, status: STATUS_SEEN }, 1, "demo-2"),
  createTitleRecord({ title: "True Detective", type: "Serie", season: "S\u00e4song 4", rating: 2.5, status: STATUS_SEEN }, 2, "demo-3"),
  createTitleRecord({ title: "Band of Brothers", type: "Miniserie", season: "2001", rating: 5, status: STATUS_SEEN }, 3, "demo-4"),
  createTitleRecord({ title: "Dune: Part Two", type: "Film", season: "2024", rating: 4, status: STATUS_SEEN }, 4, "demo-5"),
];

const state = {
  filter: "Alla",
  query: "",
  editingId: null,
  collapsed: {
    [STATUS_SEEN]: false,
    [STATUS_TIPS]: true,
    [STATUS_WATCHLIST]: true,
  },
  ...loadInitialState(),
};

const sectionsEl = document.querySelector("#sections");
const emptyEl = document.querySelector("#empty-state");
const totalCountEl = document.querySelector("#total-count");
const searchInput = document.querySelector("#search-input");
const fileInput = document.querySelector("#file-input");
const clearButton = document.querySelector("#clear-button");
const addButton = document.querySelector("#add-button");
const modalEl = document.querySelector("#title-modal");
const formEl = document.querySelector("#title-form");
const modalTitleEl = document.querySelector("#modal-title");
const deleteButton = document.querySelector("#delete-button");
const filterButtons = document.querySelectorAll(".filter-button");

const fields = {
  title: document.querySelector("#title-field"),
  type: document.querySelector("#type-field"),
  season: document.querySelector("#season-field"),
  rating: document.querySelector("#rating-field"),
  comment: document.querySelector("#comment-field"),
  status: document.querySelector("#status-field"),
  recommendedBy: document.querySelector("#recommended-field"),
};

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
    const titles = Array.isArray(parsed) ? parsed.map(normalizeTitleRecord) : [];
    saveTitles(titles, MODE_IMPORTED);
    return { titles, mode: MODE_IMPORTED };
  } catch {
    return { titles: [], mode: MODE_CLEARED };
  }
}

function saveTitles(titles, mode = MODE_IMPORTED) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(titles));
  localStorage.setItem(MODE_KEY, mode);
}

function createTitleRecord(data, manualOrder = 0, id = createId()) {
  const now = new Date().toISOString();
  const title = String(data.title || "").trim();
  const season = normalizeSeasonInput(data.season ?? data.detail ?? "");
  const rating = normalizeRatingValue(data.rating);
  const status = STATUSES.includes(data.status) ? data.status : STATUS_SEEN;

  return {
    id,
    title,
    type: data.type || "Serie",
    season,
    rating,
    status,
    recommendedBy: String(data.recommendedBy || "").trim(),
    comment: String(data.comment ?? data.notes ?? "").trim(),
    imdbUrl: buildInfoLink(title),
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    manualOrder: Number.isFinite(Number(data.manualOrder)) ? Number(data.manualOrder) : manualOrder,
  };
}

function normalizeTitleRecord(item, index = 0) {
  return createTitleRecord(
    {
      ...item,
      season: item.season ?? item.detail ?? "",
      comment: item.comment ?? item.notes ?? "",
      manualOrder: item.manualOrder ?? item.order ?? index,
    },
    index,
    item.id || createId()
  );
}

function createId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `title-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function importTextFile(text) {
  const importedTitles = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseImportLine)
    .map((item, index) => createTitleRecord({ ...item, status: STATUS_SEEN }, index));

  state.titles = importedTitles;
  state.mode = MODE_IMPORTED;
  resetControls();
  saveTitles(state.titles);
  renderList();
}

function clearWatchList() {
  const confirmed = window.confirm("Vill du rensa hela listan? Detta tar bort alla importerade titlar fr\u00e5n appen.");

  if (!confirmed) return;

  state.titles = [];
  state.mode = MODE_CLEARED;
  resetControls();
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(MODE_KEY, MODE_CLEARED);
  renderList();
}

function resetControls() {
  state.filter = "Alla";
  state.query = "";
  searchInput.value = "";

  filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === "Alla");
  });
}

function addTitle(titleData) {
  const status = titleData.status || STATUS_SEEN;
  const title = createTitleRecord(titleData, getNextTopOrder(status));
  state.titles = [title, ...state.titles];
  state.mode = MODE_IMPORTED;
  saveTitles(state.titles);
  renderList();
}

function updateTitle(id, titleData) {
  const index = state.titles.findIndex((item) => item.id === id);
  if (index === -1) return;

  const current = state.titles[index];
  const statusChanged = current.status !== titleData.status;
  const updated = {
    ...current,
    title: titleData.title,
    type: titleData.type,
    season: normalizeSeasonInput(titleData.season),
    rating: normalizeRatingValue(titleData.rating),
    status: titleData.status,
    recommendedBy: titleData.recommendedBy,
    comment: titleData.comment,
    imdbUrl: buildInfoLink(titleData.title),
    updatedAt: new Date().toISOString(),
    manualOrder: statusChanged ? getNextTopOrder(titleData.status) : current.manualOrder,
  };

  state.titles[index] = updated;
  saveTitles(state.titles);
  renderList();
}

function deleteTitle(id) {
  const confirmed = window.confirm("Vill du ta bort titeln?");
  if (!confirmed) return;

  state.titles = state.titles.filter((item) => item.id !== id);
  saveTitles(state.titles);
  closeModal();
  renderList();
}

function getNextTopOrder(status) {
  const orders = state.titles
    .filter((item) => item.status === status)
    .map((item) => Number(item.manualOrder))
    .filter(Number.isFinite);

  return orders.length ? Math.min(...orders) - 1 : 0;
}

function parseImportLine(line) {
  const ratingMatch = findRatingMatch(line);
  const titleSource = ratingMatch ? line.slice(0, ratingMatch.index).trim() : line.trim();
  const commentSource = ratingMatch ? line.slice(ratingMatch.index + ratingMatch.text.length).trim() : "";
  const titleParts = parseTitleParts(titleSource, commentSource);

  return {
    title: titleParts.title,
    type: "Serie",
    season: titleParts.season,
    rating: ratingMatch ? ratingMatch.value : null,
    comment: titleParts.comment,
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

      return { text: token, value, index: tokenIndex };
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
    candidates.push({ text: match[2], index: match.index + match[1].length });
    match = tokenPattern.exec(line);
  }

  match = starPattern.exec(line);
  while (match) {
    candidates.push({ text: match[0], index: match.index });
    match = starPattern.exec(line);
  }

  match = signedNumberPattern.exec(line);
  while (match) {
    candidates.push({ text: match[2], index: match.index + match[1].length });
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
  if (!/^[1-9]\d*$/.test(token) || isLikelyYear(token)) return false;

  const possibleTitle = line.slice(0, tokenIndex + token.length).trim();
  const remainingText = line.slice(tokenIndex + token.length);
  const parsedTitle = parseTitleSeason(possibleTitle);

  return parsedTitle.season !== "" && /(^|\s)(\*{1,5}[+-]?|[1-5][+-]?)(?=\s|$)/.test(remainingText);
}

function parseTitleParts(rawTitle, rawComment = "") {
  const parentheticalNotes = [];
  const titleWithoutParentheses = rawTitle.replace(/\(([^)]*)\)/g, (match, note) => {
    const cleanedNote = note.trim();
    if (cleanedNote) parentheticalNotes.push(cleanedNote);
    return " ";
  });
  const titleParts = parseTitleSeason(titleWithoutParentheses);
  const comment = formatNotes([...parentheticalNotes, rawComment]);

  return {
    title: titleParts.title,
    season: titleParts.season,
    comment,
  };
}

function parseTitleSeason(rawTitle) {
  const title = rawTitle.trim().replace(/\s+/g, " ");
  const seasonMatch =
    title.match(/\s+(?:s|season|s\u00e4song)\s*([1-9]\d*)$/i) ||
    title.match(/\s+([1-9]\d*)$/);

  if (!seasonMatch) return { title, season: "" };

  const seasonNumber = seasonMatch[1];
  if (isLikelyYear(seasonNumber)) return { title, season: "" };

  return {
    title: title.slice(0, seasonMatch.index).trim(),
    season: `S\u00e4song ${seasonNumber}`,
  };
}

function normalizeSeasonInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^[1-9]\d*$/.test(raw) && !isLikelyYear(raw)) return `S\u00e4song ${raw}`;

  const parsed = parseTitleSeason(`T ${raw}`);
  return parsed.season && parsed.title === "T" ? parsed.season : raw;
}

function formatNotes(notes) {
  return notes
    .map((note) => String(note || "").trim())
    .filter(Boolean)
    .map(formatNoteSentence)
    .join(" ");
}

function formatNoteSentence(note) {
  const trimmed = note.trim().replace(/^\((.*)\)$/, "$1").trim();
  if (!trimmed) return "";

  const capitalized = trimmed.charAt(0).toLocaleUpperCase("sv-SE") + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function isLikelyYear(value) {
  const year = Number(value);
  return /^\d{4}$/.test(String(value)) && year >= 1900 && year <= 2099;
}

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

function normalizeRatingValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : parseRating(value);
}

function renderStars(value) {
  if (value === null || value === undefined || value === "") return "";

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
    const searchText = `${item.title} ${item.type} ${item.season || ""} ${item.comment || ""} ${item.recommendedBy || ""}`.toLowerCase();
    return matchesFilter && (!query || searchText.includes(query));
  });
}

function getTitlesForStatus(status, titles = getVisibleTitles()) {
  return titles
    .filter((item) => item.status === status)
    .sort((a, b) => Number(a.manualOrder) - Number(b.manualOrder));
}

function renderList() {
  const visibleTitles = getVisibleTitles();
  totalCountEl.textContent = state.titles.length;
  emptyEl.hidden = visibleTitles.length > 0;
  emptyEl.textContent =
    state.titles.length === 0
      ? "Listan \u00e4r tom. Importera en textfil f\u00f6r att b\u00f6rja."
      : "Inga titlar matchar filtret.";

  sectionsEl.innerHTML = STATUSES.map((status) => renderSection(status, visibleTitles)).join("");
}

function renderSection(status, visibleTitles) {
  const titles = getTitlesForStatus(status, visibleTitles);
  const total = state.titles.filter((item) => item.status === status).length;
  const isCollapsed = state.collapsed[status];
  const listId = `section-${status.replace(/\s+/g, "-").toLowerCase()}`;

  return `
    <section class="section-block">
      <button class="section-toggle" type="button" data-section-toggle="${escapeHtml(status)}" aria-expanded="${!isCollapsed}" aria-controls="${listId}">
        <span>${escapeHtml(status)} (${total})</span>
        <span>${isCollapsed ? "\u25be" : "\u25b4"}</span>
      </button>
      <ul id="${listId}" class="watch-list" ${isCollapsed ? "hidden" : ""}>
        ${titles.map(renderCard).join("")}
      </ul>
    </section>
  `;
}

function renderCard(item) {
  const meta = [item.type, item.season].filter(Boolean).join(" \u2022 ");
  const rating = item.rating === null || item.rating === undefined ? null : Number(item.rating);
  const stripColor = getRatingColor(rating);
  const ratingLabel = rating === null ? "Inget betyg" : `Betyg ${rating} av 5`;

  return `
    <li>
      <article class="watch-card" data-card-id="${escapeHtml(item.id)}" tabindex="0" role="button" style="--strip-color: ${stripColor}">
        <div class="rating-strip" aria-hidden="true"></div>
        <div class="card-content">
          <div class="stars" aria-label="${ratingLabel}">${renderStars(rating)}</div>
          <h2 class="title">${escapeHtml(item.title)}</h2>
          <p class="meta">${escapeHtml(meta || item.status)}</p>
          ${item.comment ? `<p class="notes">${escapeHtml(item.comment)}</p>` : ""}
          ${item.recommendedBy ? `<p class="recommended">${escapeHtml(`Tips: ${item.recommendedBy}`)}</p>` : ""}
          <a class="info-link" href="${escapeHtml(item.imdbUrl || buildInfoLink(item.title))}" target="_blank" rel="noreferrer">IMDb \u2197</a>
        </div>
      </article>
    </li>
  `;
}

function openCreateModal() {
  state.editingId = null;
  modalTitleEl.textContent = "L\u00e4gg till titel";
  deleteButton.hidden = true;
  formEl.reset();
  fields.type.value = "Serie";
  fields.status.value = STATUS_SEEN;
  fields.rating.value = "";
  openModal();
}

function openEditModal(id) {
  const item = state.titles.find((title) => title.id === id);
  if (!item) return;

  state.editingId = id;
  modalTitleEl.textContent = "Redigera titel";
  deleteButton.hidden = false;
  fields.title.value = item.title;
  fields.type.value = item.type;
  fields.season.value = item.season || "";
  fields.rating.value = item.rating === null || item.rating === undefined ? "" : String(item.rating);
  fields.comment.value = item.comment || "";
  fields.status.value = item.status;
  fields.recommendedBy.value = item.recommendedBy || "";
  openModal();
}

function openModal() {
  modalEl.hidden = false;
  setTimeout(() => fields.title.focus(), 0);
}

function closeModal() {
  modalEl.hidden = true;
  state.editingId = null;
}

function getFormData() {
  return {
    title: fields.title.value.trim(),
    type: fields.type.value,
    season: fields.season.value.trim(),
    rating: fields.rating.value,
    comment: fields.comment.value.trim(),
    status: fields.status.value,
    recommendedBy: fields.recommendedBy.value.trim(),
  };
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
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => importTextFile(String(reader.result || "")));
  reader.readAsText(file);
  event.target.value = "";
});

clearButton.addEventListener("click", clearWatchList);
addButton.addEventListener("click", openCreateModal);
deleteButton.addEventListener("click", () => {
  if (state.editingId) deleteTitle(state.editingId);
});

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = getFormData();
  if (!data.title) return;

  if (state.editingId) {
    updateTitle(state.editingId, data);
  } else {
    addTitle(data);
  }

  closeModal();
});

modalEl.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-modal]")) {
    closeModal();
  }
});

sectionsEl.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (link) {
    event.stopPropagation();
    return;
  }

  const toggle = event.target.closest("[data-section-toggle]");
  if (toggle) {
    const status = toggle.dataset.sectionToggle;
    state.collapsed[status] = !state.collapsed[status];
    renderList();
    return;
  }

  const card = event.target.closest("[data-card-id]");
  if (card) {
    openEditModal(card.dataset.cardId);
  }
});

sectionsEl.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;

  const card = event.target.closest("[data-card-id]");
  if (!card) return;

  event.preventDefault();
  openEditModal(card.dataset.cardId);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalEl.hidden) {
    closeModal();
  }
});

renderList();
