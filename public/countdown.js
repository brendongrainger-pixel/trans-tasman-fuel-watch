const elements = {
  countdownGrid: document.getElementById("countdownGrid"),
  countdownHero: document.getElementById("countdownHero"),
  countdownUpdated: document.getElementById("countdownUpdated"),
  footerStripText: document.getElementById("footerStripText"),
  footerUpdated: document.getElementById("footerUpdated"),
};

const COUNTDOWN_STORAGE_KEY = "ttfw-countdown-targets-v1";

function formatDateTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(date);
}

function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function readStoredTargets() {
  try {
    return JSON.parse(localStorage.getItem(COUNTDOWN_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeStoredTargets(payload) {
  try {
    localStorage.setItem(COUNTDOWN_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures so the countdown still renders.
  }
}

function isoFromDaysAndRefresh(days, refreshedAt) {
  const refreshMs = new Date(refreshedAt).getTime();
  if (!Number.isFinite(refreshMs)) return "";
  return new Date(refreshMs + Number(days) * 24 * 60 * 60 * 1000).toISOString();
}

function resolveStableTarget(key, targetIso, fallbackDays, refreshedAt, fingerprint) {
  const fallbackIso = isoFromDaysAndRefresh(fallbackDays, refreshedAt);
  const candidateIso = targetIso || fallbackIso;
  const candidateMs = new Date(candidateIso).getTime();

  if (!Number.isFinite(candidateMs)) {
    return "";
  }

  const stored = readStoredTargets();
  const existing = stored[key];

  if (
    existing &&
    existing.fingerprint === fingerprint &&
    Number.isFinite(new Date(existing.targetIso).getTime())
  ) {
    return existing.targetIso;
  }

  stored[key] = {
    fingerprint,
    targetIso: new Date(candidateMs).toISOString(),
  };
  writeStoredTargets(stored);
  return stored[key].targetIso;
}

function getCountdownParts(targetIso, fallbackDays = null, refreshedAt = null) {
  let targetMs = new Date(targetIso).getTime();

  if (!Number.isFinite(targetMs) && fallbackDays !== null && refreshedAt) {
    const refreshMs = new Date(refreshedAt).getTime();
    if (Number.isFinite(refreshMs)) {
      targetMs = refreshMs + Number(fallbackDays) * 24 * 60 * 60 * 1000;
    }
  }

  if (!Number.isFinite(targetMs)) {
    return "Countdown unavailable";
  }

  const diffMs = targetMs - Date.now();
  const clamped = Math.max(0, diffMs);
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function miniCountdownHtml(country, fuel, refreshedAt) {
  const depletionAt = resolveStableTarget(
    `${country.countryCode}:${fuel.key}`,
    "",
    fuel.days,
    refreshedAt,
    `${country.official.statsAsOf}|${country.summary.basisAt || refreshedAt}|${fuel.key}|${fuel.days}`,
  );
  return `
    <div class="mini-countdown-card">
      <div class="mini-countdown-label">${fuel.label}</div>
      <div
        class="mini-countdown-value"
        data-countdown-target="${depletionAt || ""}"
        data-countdown-days="${fuel.days}"
        data-countdown-refresh="${refreshedAt}"
      >
        ${getCountdownParts(depletionAt, fuel.days, refreshedAt)}
      </div>
      <div class="mini-countdown-meta">${formatNumber(fuel.days, 1)} days cover</div>
    </div>
  `;
}

function render(data) {
  const countries = Object.values(data.countries);
  elements.countdownHero.textContent = "Australia and New Zealand lowest-stock clocks";
  elements.countdownUpdated.textContent = `Updated ${formatDateTime(data.refreshedAt)}`;
  elements.footerUpdated.textContent = formatDateTime(data.refreshedAt);
  elements.footerStripText.textContent =
    data.notes?.slice(0, 2).join("   •   ") ||
    "Countdown based on current official baseline cover and refreshed source data.";

  elements.countdownGrid.innerHTML = countries
    .map((country) => {
      const cardClass = country.countryCode === "AU" ? "primary-au" : "primary-nz";
      const primaryTarget = resolveStableTarget(
        `${country.countryCode}:tightest`,
        country.summary.depletionAt,
        country.summary.tightestDays,
        data.refreshedAt,
        `${country.summary.statsAsOf}|${country.summary.basisAt || data.refreshedAt}|tightest|${country.summary.tightestFuel}|${country.summary.tightestDays}`,
      );
      return `
        <article class="countdown-card ${cardClass}">
          <div class="countdown-topline">
            <div>
              <p class="eyebrow">${country.countryCode}</p>
              <h3 class="countdown-country">${country.countryName}</h3>
              <div class="countdown-fuel">Lowest stock: ${country.summary.tightestFuel}</div>
            </div>
            <span class="status-badge">${country.official.sourceName}</span>
          </div>
          <div
            class="countdown-timer"
            data-countdown-target="${primaryTarget || ""}"
            data-countdown-days="${country.summary.tightestDays}"
            data-countdown-refresh="${data.refreshedAt}"
          >
            ${getCountdownParts(primaryTarget, country.summary.tightestDays, data.refreshedAt)}
          </div>
          <div class="countdown-subtext">
            ${formatNumber(country.summary.tightestDays, 1)} days of cover remaining from the tightest official fuel lane.
          </div>
          <div class="mini-countdown-grid">
            ${country.official.fuels.map((fuel) => miniCountdownHtml(country, fuel, data.refreshedAt)).join("")}
          </div>
          <div class="countdown-filler">
            <div class="countdown-filler-text">
              Live countdown board for ${country.countryName}. Primary clock tracks the tightest official fuel lane.
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function tick() {
  document.querySelectorAll("[data-countdown-target]").forEach((node) => {
    node.textContent = getCountdownParts(
      node.getAttribute("data-countdown-target"),
      node.getAttribute("data-countdown-days"),
      node.getAttribute("data-countdown-refresh"),
    );
  });
}

async function load() {
  const response = await fetch("/api/dashboard");
  if (!response.ok) {
    throw new Error(`Dashboard request failed with ${response.status}`);
  }

  const data = await response.json();
  render(data);
  tick();
}

load().catch((error) => {
  elements.countdownHero.textContent = "Countdown unavailable";
  elements.countdownUpdated.textContent = error.message;
});

setInterval(tick, 1000);
setInterval(() => {
  load().catch((error) => console.error(error));
}, 60000);
