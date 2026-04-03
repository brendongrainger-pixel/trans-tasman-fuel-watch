const state = {
  dashboard: null,
  activeScenario: {
    au: "base",
    nz: "base",
  },
  streamMode: new URLSearchParams(window.location.search).get("stream") === "1",
};

const elements = {
  refreshButton: document.getElementById("refreshButton"),
  streamButton: document.getElementById("streamButton"),
  heroTitle: document.getElementById("heroTitle"),
  heroSummary: document.getElementById("heroSummary"),
  headlineTicker: document.getElementById("headlineTicker"),
  lastRefreshLabel: document.getElementById("lastRefreshLabel"),
  sourceLayerLabel: document.getElementById("sourceLayerLabel"),
  channelLabel: document.getElementById("channelLabel"),
  supportTitle: document.getElementById("supportTitle"),
  supportText: document.getElementById("supportText"),
  disclaimerLabel: document.getElementById("disclaimerLabel"),
  supportLink: document.getElementById("supportLink"),
  countdownGrid: document.getElementById("countdownGrid"),
  marketCards: document.getElementById("marketCards"),
  marketSource: document.getElementById("marketSource"),
  historyList: document.getElementById("historyList"),
  auTitle: document.getElementById("auTitle"),
  auStatsAsOf: document.getElementById("auStatsAsOf"),
  auSummary: document.getElementById("auSummary"),
  auReserveGrid: document.getElementById("auReserveGrid"),
  auScenarioTabs: document.getElementById("auScenarioTabs"),
  auScenarioGrid: document.getElementById("auScenarioGrid"),
  auHostNotes: document.getElementById("auHostNotes"),
  auReportsLandingLink: document.getElementById("auReportsLandingLink"),
  auReportGrid: document.getElementById("auReportGrid"),
  auOfficialFrame: document.getElementById("auOfficialFrame"),
  nzTitle: document.getElementById("nzTitle"),
  nzStatsAsOf: document.getElementById("nzStatsAsOf"),
  nzSummary: document.getElementById("nzSummary"),
  nzReserveGrid: document.getElementById("nzReserveGrid"),
  nzScenarioTabs: document.getElementById("nzScenarioTabs"),
  nzScenarioGrid: document.getElementById("nzScenarioGrid"),
  nzHostNotes: document.getElementById("nzHostNotes"),
  nzReportsLandingLink: document.getElementById("nzReportsLandingLink"),
  nzReportGrid: document.getElementById("nzReportGrid"),
  nzOfficialLinks: document.getElementById("nzOfficialLinks"),
  sourceStatusGrid: document.getElementById("sourceStatusGrid"),
  warningPanel: document.getElementById("warningPanel"),
};

function formatDateTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(date);
}

function formatShortDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
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

function sparkline(points = [], stroke = "#12e6c8") {
  if (!points.length) {
    return `<svg class="sparkline" viewBox="0 0 240 68" preserveAspectRatio="none"></svg>`;
  }

  const width = 240;
  const height = 68;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const path = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point.value - min) / range) * (height - 8) - 4;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return `
    <svg class="sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fill-${stroke.replace(/[^a-z0-9]/gi, "")}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${stroke}" stop-opacity="0.34"></stop>
          <stop offset="100%" stop-color="${stroke}" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      <path d="${path} L ${width} ${height} L 0 ${height} Z" fill="url(#fill-${stroke.replace(/[^a-z0-9]/gi, "")})"></path>
      <path d="${path}" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round"></path>
    </svg>
  `;
}

function renderHero(data) {
  elements.heroTitle.textContent = `${data.brand.name}: Australia and New Zealand side by side`;
  elements.heroSummary.textContent =
    "A comparison layout built for live commentary. Australia and New Zealand share the same screen so you can narrate reserve pressure, source differences, and scenario spread without scene changes.";
  elements.lastRefreshLabel.textContent = formatDateTime(data.refreshedAt);
  elements.sourceLayerLabel.textContent = "AU official + NZ official baseline + market";
  elements.channelLabel.textContent = data.brand.channelName;

  elements.headlineTicker.innerHTML = data.notes
    .concat(data.notes)
    .map((note) => `<span class="ticker-chip">${note}</span>`)
    .join("");
}

function renderSupportStrip(data) {
  elements.supportTitle.textContent = `${data.brand.channelName}: AU vs NZ fuel watch`;
  elements.supportText.textContent = data.brand.supportText;
  elements.disclaimerLabel.textContent = data.brand.disclaimer;

  if (data.brand.supportUrl) {
    elements.supportLink.href = data.brand.supportUrl;
    elements.supportLink.textContent = "Open support link";
  } else {
    elements.supportLink.removeAttribute("href");
    elements.supportLink.textContent = "Add your support URL in server.mjs";
  }
}

const COUNTDOWN_STORAGE_KEY = "ttfw-countdown-targets-v1";

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
    // Ignore storage failures so the dashboard still works.
  }
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
    return {
      expired: false,
      text: "Countdown unavailable",
    };
  }

  const diffMs = targetMs - Date.now();
  const clamped = Math.max(0, diffMs);
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    expired: diffMs <= 0,
    text: `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`,
  };
}

function isoFromDaysAndRefresh(days, refreshedAt) {
  const refreshMs = new Date(refreshedAt).getTime();
  if (!Number.isFinite(refreshMs)) return "";
  return new Date(refreshMs + Number(days) * 24 * 60 * 60 * 1000).toISOString();
}

function isoFromDaysAndBasis(days, basisAt, refreshedAt) {
  const basisMs = new Date(basisAt || refreshedAt).getTime();
  if (!Number.isFinite(basisMs)) return "";
  return new Date(basisMs + Number(days) * 24 * 60 * 60 * 1000).toISOString();
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

function miniCountdownHtml(country, fuel, refreshedAt) {
  const basisAt = country.summary.basisAt || refreshedAt;
  const depletionAt = resolveStableTarget(
    `${country.countryCode}:${fuel.key}`,
    isoFromDaysAndBasis(fuel.days, basisAt, refreshedAt),
    fuel.days,
    refreshedAt,
    `${country.official.statsAsOf}|${basisAt}|${fuel.key}|${fuel.days}`,
  );
  const countdown = getCountdownParts(depletionAt, fuel.days, refreshedAt);
  return `
    <div class="mini-countdown-card">
      <div class="mini-countdown-label">${fuel.label}</div>
      <div
        class="mini-countdown-value"
        data-countdown-target="${depletionAt || ""}"
        data-countdown-days="${fuel.days}"
        data-countdown-refresh="${refreshedAt}"
      >
        ${countdown.text}
      </div>
      <div class="mini-countdown-meta">${formatNumber(fuel.days, 1)} days reported cover</div>
    </div>
  `;
}

function renderCountdownBoard(data) {
  const countries = Object.values(data.countries);
  elements.countdownGrid.innerHTML = countries
    .map((country) => {
      const primaryTarget = resolveStableTarget(
        `${country.countryCode}:tightest`,
        country.summary.depletionAt,
        country.summary.tightestDays,
        data.refreshedAt,
        `${country.summary.statsAsOf}|${country.summary.basisAt || data.refreshedAt}|tightest|${country.summary.tightestFuel}|${country.summary.tightestDays}`,
      );
      const countdown = getCountdownParts(
        primaryTarget,
        country.summary.tightestDays,
        data.refreshedAt,
      );
      return `
        <article class="countdown-card">
          <div class="countdown-topline">
            <div>
              <p class="eyebrow">${country.countryCode}</p>
              <h3 class="report-title">${country.countryName}</h3>
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
            ${countdown.text}
          </div>
          <div class="countdown-subtext">
            Based on ${formatNumber(country.summary.tightestDays, 1)} days of reported official cover from ${country.summary.statsAsOf}. Countdown end point: ${formatDateTime(country.summary.depletionAt)}
          </div>
          <div class="mini-countdown-grid">
            ${country.official.fuels.map((fuel) => miniCountdownHtml(country, fuel, data.refreshedAt)).join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

function tickCountdowns() {
  document.querySelectorAll("[data-countdown-target]").forEach((node) => {
    const countdown = getCountdownParts(
      node.getAttribute("data-countdown-target"),
      node.getAttribute("data-countdown-days"),
      node.getAttribute("data-countdown-refresh"),
    );
    node.textContent = countdown.text;
  });
}

function renderCountrySummary(countryKey, country) {
  const title = countryKey === "au" ? elements.auTitle : elements.nzTitle;
  const statsAsOf = countryKey === "au" ? elements.auStatsAsOf : elements.nzStatsAsOf;
  const summary = countryKey === "au" ? elements.auSummary : elements.nzSummary;

  title.textContent = `${country.countryName} official baseline`;
  statsAsOf.textContent = country.summary.statsAsOf;
  summary.innerHTML = `
    <div class="metric-pill">Tightest: ${country.summary.tightestFuel} ${formatNumber(country.summary.tightestDays, 1)}d</div>
    <div class="metric-pill">Average cover: ${formatNumber(country.summary.averageDays, 1)}d</div>
    <div class="metric-pill">Source: ${country.official.sourceName}</div>
  `;
}

function reserveCardHtml(fuel, countryCode) {
  return `
    <article class="reserve-card">
      <div class="reserve-header">
        <div>
          <p class="eyebrow">${countryCode} Official Cover</p>
          <h3 class="reserve-title">${fuel.label}</h3>
        </div>
        <span class="status-badge">Source</span>
      </div>
      <div class="big-number">${formatNumber(fuel.days, 1)}<span class="micro-copy"> days</span></div>
      <div class="number-caption">Equivalent cover from the current official baseline.</div>
      <div class="reserve-metrics">
        <span class="metric-pill">${fuel.volumeMl === null ? "Volume n/a" : `${formatNumber(fuel.volumeMl)} ML`}</span>
        <span class="metric-pill">${fuel.surplusPct === null ? "Surplus n/a" : `${formatNumber(fuel.surplusPct)}% above floor`}</span>
      </div>
    </article>
  `;
}

function renderCountryReserves(countryKey, country) {
  const container = countryKey === "au" ? elements.auReserveGrid : elements.nzReserveGrid;
  container.innerHTML = country.official.fuels.map((fuel) => reserveCardHtml(fuel, country.countryCode)).join("");
}

function renderCountryScenarioTabs(countryKey, country) {
  const container = countryKey === "au" ? elements.auScenarioTabs : elements.nzScenarioTabs;
  container.innerHTML = country.scenarios
    .map(
      (scenario) => `
        <button
          type="button"
          class="tab-button ${state.activeScenario[countryKey] === scenario.key ? "active" : ""}"
          data-country="${countryKey}"
          data-scenario-key="${scenario.key}"
        >
          ${scenario.label}
        </button>
      `,
    )
    .join("");

  container.querySelectorAll("[data-scenario-key]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeScenario[countryKey] = button.dataset.scenarioKey;
      renderCountryScenarioTabs(countryKey, country);
      renderCountryScenarioGrid(countryKey, country);
    });
  });
}

function renderCountryScenarioGrid(countryKey, country) {
  const container = countryKey === "au" ? elements.auScenarioGrid : elements.nzScenarioGrid;
  const scenario = country.scenarios.find((item) => item.key === state.activeScenario[countryKey]) || country.scenarios[0];

  container.innerHTML = scenario.fuels
    .map(
      (fuel) => `
        <article class="scenario-card">
          <p class="eyebrow">${scenario.label}</p>
          <h3 class="report-title">${fuel.label}</h3>
          <div class="scenario-value">${formatNumber(fuel.days)} days</div>
          <div class="report-meta">Depletion date: ${formatShortDate(fuel.depletionDate)}</div>
          <p class="micro-copy">${scenario.description}</p>
        </article>
      `,
    )
    .join("");
}

function renderCountryHostNotes(countryKey, country) {
  const container = countryKey === "au" ? elements.auHostNotes : elements.nzHostNotes;
  container.innerHTML = country.hostNotes
    .map(
      (note, index) => `
        <div class="host-note">
          <span class="note-index">${index + 1}</span>
          <div>${note}</div>
        </div>
      `,
    )
    .join("");
}

function renderMarketCards(data) {
  const entries = [data.market.brent, data.market.audUsd];
  elements.marketSource.textContent = data.market.sourceName;

  elements.marketCards.innerHTML = entries
    .map((entry) => {
      const isFx = entry.label === "AUD/USD";
      const decimals = isFx ? 4 : 2;
      const changeClass =
        entry.direction === "up" ? "trend-up" : entry.direction === "down" ? "trend-down" : "";
      const stroke = entry.direction === "up" ? "#ff7f50" : "#12e6c8";

      return `
        <article class="market-card">
          <div class="market-header">
            <div>
              <p class="eyebrow">Market feed</p>
              <h3 class="market-title">${entry.label}</h3>
            </div>
          </div>
          <div class="big-number">${formatNumber(entry.current, decimals)}</div>
          <div class="number-caption ${changeClass}">
            ${entry.change === null ? "Unavailable" : `${entry.change >= 0 ? "+" : ""}${formatNumber(entry.change, decimals)} vs prior close`}
          </div>
          ${sparkline(entry.points || [], stroke)}
        </article>
      `;
    })
    .join("");
}

function renderReportCards(target, reports, eyebrow) {
  target.innerHTML = reports
    .map((report) => {
      const thumb = report.imageUrl
        ? `<img class="report-thumb" src="${report.imageUrl}" alt="${report.title}" />`
        : `<div class="report-thumb"></div>`;

      return `
        <article class="report-card">
          <div class="report-header">
            <div>
              <p class="eyebrow">${eyebrow}</p>
              <h3 class="report-title">${report.label}</h3>
            </div>
          </div>
          ${thumb}
          <p class="report-meta">${report.weekEnding || "Latest available"}</p>
          <p class="micro-copy">${report.title}</p>
          <p><a class="section-link" href="${report.url}" target="_blank" rel="noreferrer">Open source</a></p>
        </article>
      `;
    })
    .join("");
}

function renderSources(data) {
  const au = data.countries.au;
  const nz = data.countries.nz;

  elements.auReportsLandingLink.href = au.reports.landingUrl;
  renderReportCards(elements.auReportGrid, au.reports.reports, "AU");
  elements.auOfficialFrame.src = au.official.powerBiUrl;

  elements.nzReportsLandingLink.href = nz.reports.landingUrl;
  renderReportCards(elements.nzReportGrid, nz.reports.reports, "NZ");
  elements.nzOfficialLinks.innerHTML = `
    <div class="host-note">
      <span class="note-index">1</span>
      <div>
        <div class="meta-label">Official reference</div>
        <a class="section-link" href="${nz.official.sourceUrl}" target="_blank" rel="noreferrer">${nz.official.sourceName} fuel stocks update</a>
      </div>
    </div>
    <div class="host-note">
      <span class="note-index">2</span>
      <div>
        <div class="meta-label">Retail reference</div>
        <a class="section-link" href="${nz.reports.reports[0].url}" target="_blank" rel="noreferrer">${nz.reports.reports[0].title}</a>
      </div>
    </div>
  `;
}

function renderHistory(data) {
  const recent = [...(data.history || [])].slice(-8).reverse();
  elements.historyList.innerHTML = recent.length
    ? recent
        .map(
          (item) => {
            const summary = item.countries
              ? `AU ${item.countries.au.petrol}d / ${item.countries.au.diesel}d · NZ ${item.countries.nz.petrol}d / ${item.countries.nz.diesel}d`
              : `Legacy snapshot · Petrol ${item.official?.petrol ?? "—"}d / Diesel ${item.official?.diesel ?? "—"}d`;

            return `
              <div class="history-item">
                <div>
                  <div class="meta-label">${formatDateTime(item.capturedAt)}</div>
                  <strong>${summary}</strong>
                </div>
                <div class="micro-copy">Brent ${item.brent === null ? "—" : formatNumber(item.brent, 2)}</div>
              </div>
            `;
          },
        )
        .join("")
    : `<div class="history-item"><div class="micro-copy">Snapshots will appear here as the app refreshes.</div></div>`;
}

function renderSourceStatus(data) {
  elements.sourceStatusGrid.innerHTML = data.sourceStatus
    .map((item) => {
      const statusClass =
        item.status === "Live" ? "status-live" : item.status === "Fallback" ? "status-fallback" : "status-offline";

      return `
        <div class="source-status-card">
          <div class="${statusClass}">${item.status}</div>
          <strong>${item.label}</strong>
          <div class="micro-copy">${item.detail}</div>
        </div>
      `;
    })
    .join("");
}

function renderWarnings(data) {
  if (!data.warnings.length) {
    elements.warningPanel.innerHTML = "";
    return;
  }

  elements.warningPanel.innerHTML = data.warnings
    .map((warning) => `<div class="warning-card">${warning}</div>`)
    .join("");
}

function renderDashboard(data) {
  state.dashboard = data;
  renderHero(data);
  renderSupportStrip(data);
  renderCountdownBoard(data);
  renderCountrySummary("au", data.countries.au);
  renderCountrySummary("nz", data.countries.nz);
  renderCountryReserves("au", data.countries.au);
  renderCountryReserves("nz", data.countries.nz);
  renderCountryScenarioTabs("au", data.countries.au);
  renderCountryScenarioTabs("nz", data.countries.nz);
  renderCountryScenarioGrid("au", data.countries.au);
  renderCountryScenarioGrid("nz", data.countries.nz);
  renderCountryHostNotes("au", data.countries.au);
  renderCountryHostNotes("nz", data.countries.nz);
  renderMarketCards(data);
  renderHistory(data);
  renderSources(data);
  renderSourceStatus(data);
  renderWarnings(data);
}

async function loadDashboard(forceRefresh = false) {
  elements.heroTitle.textContent = forceRefresh ? "Refreshing comparison view..." : "Loading comparison view...";

  const response = await fetch(`/api/dashboard${forceRefresh ? "?refresh=1" : ""}`);
  if (!response.ok) {
    throw new Error(`Dashboard request failed with ${response.status}`);
  }

  const data = await response.json();
  renderDashboard(data);
}

function syncStreamMode() {
  document.body.classList.toggle("stream-mode", state.streamMode);
  elements.streamButton.textContent = state.streamMode ? "Exit Stream Mode" : "Stream Mode";
}

elements.refreshButton.addEventListener("click", () => {
  loadDashboard(true).catch((error) => {
    console.error(error);
    elements.heroTitle.textContent = "Refresh failed";
    elements.heroSummary.textContent = error.message;
  });
});

elements.streamButton.addEventListener("click", () => {
  state.streamMode = !state.streamMode;
  syncStreamMode();
});

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "f") {
    state.streamMode = !state.streamMode;
    syncStreamMode();
  }
});

syncStreamMode();
loadDashboard().catch((error) => {
  console.error(error);
  elements.heroTitle.textContent = "Unable to load dashboard";
  elements.heroSummary.textContent = error.message;
});

setInterval(() => {
  loadDashboard().catch((error) => console.error("Background refresh failed", error));
}, 60_000);

setInterval(() => {
  tickCountdowns();
}, 1000);
