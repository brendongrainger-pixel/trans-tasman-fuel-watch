import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const snapshotFile = path.join(dataDir, "snapshots.json");
const port = Number(process.env.PORT || 8788);
const SNAPSHOT_LIMIT = 240;

const CACHE_TTL_MS = 5 * 60 * 1000;
const dashboardCache = {
  expiresAt: 0,
  payload: null,
};

const SOURCE_URLS = {
  dcceew:
    "https://www.dcceew.gov.au/energy/security/australias-fuel-security/minimum-stockholding-obligation/statistics",
  aipLanding: "https://www.aip.com.au/pricing/weekly-prices-reports",
  nzOfficial: "https://www.mbie.govt.nz/about/news/fuel-stocks-update/",
  brentChart:
    "https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?range=1mo&interval=1d",
  audUsdChart:
    "https://query1.finance.yahoo.com/v8/finance/chart=AUDUSD=X?range=1mo&interval=1d",
};

const FALLBACK_DATA = {
  au: {
    countryCode: "AU",
    countryName: "Australia",
    official: {
      sourceName: "DCCEEW",
      sourceUrl: SOURCE_URLS.dcceew,
      statsAsOf: "December quarter 2025",
      note: "Quarterly fallback from DCCEEW page copy.",
      powerBiUrl:
        "https://app.powerbi.com/view?r=eyJrIjoiMzcyZmE4ZjgtOGRjNy00NGM3LWExYTktMTk2NzU2NWEzNzkzIiwidCI6IjhjM2M4MWJjLTJiM2MtNDRhZi1iM2Y3LTZmNjIwYjM5MTBlZSJ9",
      fuels: [
        { key: "petrol", label: "Petrol", days: 38, volumeMl: 1631, surplusPct: 53 },
        { key: "jet", label: "Jet Fuel", days: 29, volumeMl: 790, surplusPct: 19 },
        { key: "diesel", label: "Diesel", days: 32, volumeMl: 2905, surplusPct: 6 },
      ],
    },
    reports: {
      landingUrl: SOURCE_URLS.aipLanding,
      reports: [
        {
          key: "petrol",
          label: "Weekly Petrol Report",
          title: "Weekly Petrol Prices Report",
          url: "https://www.aip.com.au/pricing/weekly-petrol-prices-report-week-ending-22-March-2026",
          imageUrl: "",
          weekEnding: "22 March 2026",
        },
        {
          key: "diesel",
          label: "Weekly Diesel Report",
          title: "Weekly Diesel Prices Report",
          url: "https://www.aip.com.au/pricing/weekly-diesel-prices-report-week-ending-22-march-2026",
          imageUrl: "",
          weekEnding: "22 March 2026",
        },
      ],
    },
  },
  nz: {
    countryCode: "NZ",
    countryName: "New Zealand",
    official: {
      sourceName: "MBIE",
      sourceUrl: SOURCE_URLS.nzOfficial,
      statsAsOf: "22 March 2026",
      note: "Manual fallback based on latest published MBIE update context.",
      powerBiUrl: "",
      fuels: [
        { key: "petrol", label: "Petrol", days: 49.9, volumeMl: null, surplusPct: null },
        { key: "jet", label: "Jet Fuel", days: 53.4, volumeMl: null, surplusPct: null },
        { key: "diesel", label: "Diesel", days: 45.5, volumeMl: null, surplusPct: null },
      ],
    },
    reports: {
      landingUrl: "https://gaspy.nz/",
      reports: [
        {
          key: "retail",
          label: "Gaspy",
          title: "NZ live retail fuel price tracker",
          url: "https://gaspy.nz/",
          imageUrl: "",
          weekEnding: "Live prices",
        },
        {
          key: "official",
          label: "MBIE update",
          title: "MBIE fuel stocks update",
          url: SOURCE_URLS.nzOfficial,
          imageUrl: "",
          weekEnding: "Latest official update",
        },
      ],
    },
  },
  reports: {
    landingUrl: SOURCE_URLS.aipLanding,
    reports: [
      {
        key: "petrol",
        label: "Weekly Petrol Report",
        title: "Weekly Petrol Prices Report",
        url: "https://www.aip.com.au/pricing/weekly-petrol-prices-report-week-ending-22-March-2026",
        imageUrl: "",
        weekEnding: "22 March 2026",
      },
      {
        key: "diesel",
        label: "Weekly Diesel Report",
        title: "Weekly Diesel Prices Report",
        url: "https://www.aip.com.au/pricing/weekly-diesel-prices-report-week-ending-22-march-2026",
        imageUrl: "",
        weekEnding: "22 March 2026",
      },
    ],
  },
};

const BRAND = {
  name: "Trans-Tasman Fuel Watch",
  channelName: "Trans-Tasman Fuel Watch",
  tagline: "Australia and New Zealand fuel countdown live",
  accent: "#12e6c8",
  supportText:
    "Live coverage of fuel pressure across Australia and New Zealand. If you want to support the project, you can help keep the stream running here.",
  supportUrl: "https://buymeacoffee.com/transtasmanfuelwatch?new=1",
  disclaimer:
    "Public-interest dashboard using live source links and scenario modelling. It is commentary, not official emergency guidance or financial advice.",
};

const SCENARIOS = [
  {
    key: "base",
    label: "Base Case",
    multiplier: 1,
    description: "Official baseline cover with no extra conservation assumptions.",
  },
  {
    key: "demand-cut",
    label: "Demand Cut",
    multiplier: 1.12,
    description: "Assumes softer usage from price shock and voluntary cutbacks.",
  },
  {
    key: "priority",
    label: "Priority Use",
    multiplier: 1.24,
    description: "Assumes freight and essential services are prioritised first.",
  },
  {
    key: "rationing",
    label: "Emergency Rationing",
    multiplier: 1.42,
    description: "Assumes heavy restrictions stretching available stock further.",
  },
];

const INTEL_TRACKERS = {
  au: {
    title: "Australia tanker and port intel",
    description:
      "Manual support page for checking likely tanker arrivals, berth activity, and offload context alongside the official stock baseline.",
    trackers: [
      {
        label: "Queensland shipping movements (QSHIPS)",
        url: "https://www.tmr.qld.gov.au/msqinternet/shipping/shipping-movements",
        note: "Best public Queensland vessel-movement source for Brisbane-area tanker checks.",
      },
      {
        label: "Port Botany daily vessel movements",
        url: "https://www.portauthoritynsw.com.au/port-operations/port-botany/port-botany-daily-vessel-movements",
        note: "Useful for product and chemical tanker arrivals into one of Australia's main liquid-fuel gateways.",
      },
      {
        label: "Brisbane port procedures",
        url: "https://www.tmr.qld.gov.au/msqinternet/shipping/port-procedures/port-procedures-brisbane",
        note: "Background reference for Brisbane liquid terminals and vessel-movement context.",
      },
    ],
  },
  nz: {
    title: "New Zealand tanker and port intel",
    description:
      "Manual support page for tracking port arrivals and in-port status before any official stock update changes appear.",
    trackers: [
      {
        label: "Port of Auckland expected arrivals",
        url: "https://www.poal.co.nz/operations/schedules/arrivals",
        note: "Public arrival schedule with timestamps, previous port, and CSV export.",
      },
      {
        label: "Port of Auckland vessels in port",
        url: "https://www.poal.co.nz/operations/schedules/vessels-in-port",
        note: "Good for checking whether a likely tanker has actually berthed and remains in port.",
      },
      {
        label: "MBIE fuel stocks update",
        url: "https://www.mbie.govt.nz/about/news/fuel-stocks-update/",
        note: "Official NZ baseline used by the stream when public updates are published.",
      },
    ],
  },
  checklist: [
    "Look for vessel types like oil tanker, chemical/products tanker, bunker vessel, or known fuel ships.",
    "Treat an arrival as shipping intel only, not an automatic stock increase in the countdown.",
    "Expect the stream countdown to change only after the underlying public stock source updates.",
    "Use this page for manual operational context and keep the on-air page focused on the official baseline.",
  ],
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, type = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, { "Content-Type": type });
  res.end(text);
}

function toAbsoluteUrl(base, href) {
  if (!href) return "";
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

function stripTags(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseFuelKey(key) {
  if (key === "jet") return "Jet Fuel";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(date);
}

async function readSnapshotHistory() {
  try {
    const raw = await readFile(snapshotFile, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveSnapshot(snapshot) {
  const history = await readSnapshotHistory();
  history.push(snapshot);
  const trimmed = history.slice(-SNAPSHOT_LIMIT);
  await mkdir(dataDir, { recursive: true });
  await writeFile(snapshotFile, JSON.stringify(trimmed, null, 2));
  return trimmed;
}

function isoDateAfterDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + Math.round(days));
  return date.toISOString();
}

function safeNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Fuel-Watch-Live/0.1",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Fuel-Watch-Live/0.1",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return response.json();
}

function parseOfficialStats(html) {
  const statsAsOfMatch = html.match(/In ([0-9]{4}[–-][0-9]{2}), the total stocks held by industry under the MSO averaged:/i);
  const statsAsOf = statsAsOfMatch ? statsAsOfMatch[1].replace("-", "–") : FALLBACK_DATA.au.official.statsAsOf;

  const powerBiMatch = html.match(/<iframe[^>]+src="([^"]*app\.powerbi\.com\/view\?r=[^"]+)"/i);
  const powerBiUrl = powerBiMatch?.[1] || FALLBACK_DATA.au.official.powerBiUrl;

  const fuelPatterns = [
    { key: "petrol", label: "Petrol", volumeRegex: /<li>([\d,]+)\s*ML for gasoline \(petrol\)<\/li>/i, daysRegex: /<li>([\d,]+)\s*days for gasoline \(petrol\)<\/li>/i, surplusRegex: /gasoline stocks were ([\d,]+)% above the MSO/i },
    { key: "jet", label: "Jet Fuel", volumeRegex: /<li>([\d,]+)\s*ML for kerosene \(jet fuel\)<\/li>/i, daysRegex: /<li>([\d,]+)\s*days for kerosene \(jet fuel\)<\/li>/i, surplusRegex: /kerosene stocks were ([\d,]+)% above the MSO/i },
    { key: "diesel", label: "Diesel", volumeRegex: /<li>([\d,]+)\s*ML for diesel<\/li>/i, daysRegex: /<li>([\d,]+)\s*days for diesel<\/li>/i, surplusRegex: /diesel stocks were ([\d,]+)% above the MSO/i },
  ];

  const fallbackByKey = Object.fromEntries(
    FALLBACK_DATA.au.official.fuels.map((fuel) => [fuel.key, fuel]),
  );

  const fuels = fuelPatterns.map((pattern) => {
    const fallback = fallbackByKey[pattern.key];
    return {
      key: pattern.key,
      label: pattern.label,
      volumeMl: safeNumber(html.match(pattern.volumeRegex)?.[1]?.replace(/,/g, ""), fallback.volumeMl),
      days: safeNumber(html.match(pattern.daysRegex)?.[1]?.replace(/,/g, ""), fallback.days),
      surplusPct: safeNumber(html.match(pattern.surplusRegex)?.[1]?.replace(/,/g, ""), fallback.surplusPct),
    };
  });

  return {
    sourceName: "DCCEEW",
    sourceUrl: SOURCE_URLS.dcceew,
    statsAsOf,
    note: "Parsed from the official DCCEEW MSO statistics page.",
    powerBiUrl,
    fuels,
  };
}

function parseNzOfficialStats(html) {
  const text = stripTags(html);
  const statsAsOfMatch = text.match(/As at\s+11:59PM on\s+(?:[A-Za-z]+\s+)?(\d{1,2}\s+[A-Za-z]+)[,]?\s+the industry confirmed/i);
  const publishedMatch = text.match(/Published:\s*([0-9]{1,2}\s+[A-Za-z]+\s+20[0-9]{2})/i);
  const statsAsOf = statsAsOfMatch?.[1] || publishedMatch?.[1] || FALLBACK_DATA.nz.official.statsAsOf;

  const rowMatch = text.match(
    /Total NZ stock(?:\s*\(days cover\))?\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)(?:\s+[0-9]+(?:\.[0-9]+)?)?/i,
  );

  if (!rowMatch) {
    throw new Error("Unable to parse MBIE total stock table");
  }

  return {
    sourceName: "MBIE",
    sourceUrl: SOURCE_URLS.nzOfficial,
    statsAsOf,
    note: "Parsed from the official MBIE fuel stocks update.",
    powerBiUrl: "",
    fuels: [
      { key: "petrol", label: "Petrol", days: safeNumber(rowMatch[1], FALLBACK_DATA.nz.official.fuels[0].days), volumeMl: null, surplusPct: null },
      { key: "diesel", label: "Diesel", days: safeNumber(rowMatch[2], FALLBACK_DATA.nz.official.fuels[2].days), volumeMl: null, surplusPct: null },
      { key: "jet", label: "Jet Fuel", days: safeNumber(rowMatch[3], FALLBACK_DATA.nz.official.fuels[1].days), volumeMl: null, surplusPct: null },
    ],
  };
}

function findReportHref(html, fuel) {
  const regex =
    fuel === "petrol"
      ? /href="(https:\/\/www\.aip\.com\.au\/pricing\/weekly-petrol-prices-report-week-ending-[^"]+)"/i
      : /href="(https:\/\/www\.aip\.com\.au\/pricing\/weekly-diesel-prices-report-week-ending-[^"]+)"/i;

  return html.match(regex)?.[1] || "";
}

function parseReportPage(html, url, fuel) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const imageMatch = html.match(/<img[^>]+src="([^"]+\/(?:petrol|diesel)_cover[^"]+\.(?:png|jpg|jpeg))"/i);
  const weekMatch = stripTags(html).match(/Week(?:ly)?(?: [A-Za-z]+)? Prices Report(?:\s*-\s*|\s*Week Ending\s*)([0-9]{1,2} [A-Za-z]+ 20[0-9]{2})/i);

  return {
    key: fuel,
    label: fuel === "petrol" ? "Weekly Petrol Report" : "Weekly Diesel Report",
    title: titleMatch ? stripTags(titleMatch[1]) : `${titleCaseFuelKey(fuel)} Report`,
    url,
    imageUrl: toAbsoluteUrl(url, imageMatch?.[1] || ""),
    weekEnding: weekMatch?.[1] || FALLBACK_DATA.au.reports.reports.find((item) => item.key === fuel)?.weekEnding || "",
  };
}

async function fetchReports() {
  const landingHtml = await fetchText(SOURCE_URLS.aipLanding);
  const petrolUrl =
    findReportHref(landingHtml, "petrol") || FALLBACK_DATA.au.reports.reports.find((item) => item.key === "petrol").url;
  const dieselUrl =
    findReportHref(landingHtml, "diesel") || FALLBACK_DATA.au.reports.reports.find((item) => item.key === "diesel").url;

  const [petrolHtml, dieselHtml] = await Promise.all([
    fetchText(petrolUrl),
    fetchText(dieselUrl),
  ]);

  return {
    landingUrl: SOURCE_URLS.aipLanding,
    reports: [
      parseReportPage(petrolHtml, petrolUrl, "petrol"),
      parseReportPage(dieselHtml, dieselUrl, "diesel"),
    ],
  };
}

function parseYahooSeries(json, label) {
  const result = json?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];

  const points = timestamps
    .map((ts, index) => ({
      timestamp: ts * 1000,
      value: closes[index],
    }))
    .filter((point) => Number.isFinite(point.value));

  const latest = points.at(-1)?.value ?? null;
  const previous = points.at(-2)?.value ?? latest;
  const change = latest !== null && previous !== null ? latest - previous : null;

  return {
    label,
    current: latest,
    previous,
    change,
    direction: change === null ? "flat" : change > 0 ? "up" : change < 0 ? "down" : "flat",
    points: points.slice(-14).map((point) => ({
      date: new Date(point.timestamp).toISOString(),
      value: point.value,
    })),
  };
}

async function fetchMarketData() {
  const [brentJson, audUsdJson] = await Promise.all([
    fetchJson(SOURCE_URLS.brentChart),
    fetchJson(SOURCE_URLS.audUsdChart),
  ]);

  return {
    brent: parseYahooSeries(brentJson, "Brent Crude"),
    audUsd: parseYahooSeries(audUsdJson, "AUD/USD"),
    sourceName: "Yahoo Finance chart endpoint",
  };
}

function buildScenarios(official) {
  return SCENARIOS.map((scenario) => ({
    ...scenario,
    fuels: official.fuels.map((fuel) => {
      const days = Math.round(fuel.days * scenario.multiplier);
      return {
        key: fuel.key,
        label: fuel.label,
        days,
        depletionDate: isoDateAfterDays(days),
      };
    }),
  }));
}

function buildHostNotes(official, reports, market) {
  const sortedByDays = [...official.fuels].sort((a, b) => a.days - b.days);
  const tightest = sortedByDays[0];
  const strongest = sortedByDays[sortedByDays.length - 1];
  const brentDirection =
    market?.brent?.change === null
      ? "Market feed is offline, so lead with the official stock baseline and the latest AIP reports."
      : market.brent.change > 0
        ? `Brent is rising, which gives you a clean macro hook before you move into local stock cover.`
        : market.brent.change < 0
          ? `Brent is easing, which lets you contrast softer prices with still-tight stock cover.`
          : "Brent is flat, so the story is more about reserves and policy than a fresh oil move.";

  return [
    `Open with ${tightest.label}: it is the tightest official cover at ${tightest.days} days.`,
    `${strongest.label} is the loosest of the three official buckets at ${strongest.days} days, so use it as the contrast point.`,
    `Reference the latest AIP petrol and diesel reports to shift from reserves into consumer pain at the bowser.`,
    brentDirection,
  ];
}

function buildCountryHostNotes(country) {
  const sortedByDays = [...country.official.fuels].sort((a, b) => a.days - b.days);
  const tightest = sortedByDays[0];
  const strongest = sortedByDays[sortedByDays.length - 1];

  return [
    `${country.countryCode}: lead with ${tightest.label} at ${tightest.days} days because it is the tightest lane.`,
    `${country.countryCode}: use ${strongest.label} at ${strongest.days} days as the contrast point in your read.`,
    `${country.countryCode}: cite ${country.official.sourceName} for official framing and ${country.reports.reports[0].label} for consumer-facing context.`,
  ];
}

function buildQuickNotes(official, reports, market) {
  const diesel = official.fuels.find((fuel) => fuel.key === "diesel");
  const petrol = official.fuels.find((fuel) => fuel.key === "petrol");
  const brent = market?.brent?.current;
  const brentChange = market?.brent?.change;

  return [
    `${official.sourceName} baseline: ${petrol?.days ?? "?"} days petrol / ${diesel?.days ?? "?"} days diesel.`,
    `Latest AIP weekly reports are linked live for petrol and diesel context.`,
    brent !== null && brent !== undefined
      ? `Brent is ${brent.toFixed(2)} USD/bbl (${brentChange >= 0 ? "+" : ""}${brentChange?.toFixed?.(2) ?? "0.00"} vs prior session).`
      : "Brent market feed unavailable, using source fallback messaging.",
  ];
}

function buildSourceStatus(official, reports, market, warnings) {
  return [
    {
      label: "Official reserves",
      status: warnings.some((item) => item.includes("fallback official stats")) ? "Fallback" : "Live",
      detail: `${official.sourceName} ${official.statsAsOf}`,
    },
    {
      label: "Weekly pricing reports",
      status: warnings.some((item) => item.includes("AIP")) ? "Fallback" : "Live",
      detail: `${reports.reports.length} linked reports`,
    },
    {
      label: "Market feed",
      status: warnings.some((item) => item.includes("Market")) ? "Offline" : "Live",
      detail: market.sourceName,
    },
  ];
}

function buildCountrySummary(country) {
  const tightest = [...country.official.fuels].sort((a, b) => a.days - b.days)[0];
  const averageDays =
    country.official.fuels.reduce((sum, fuel) => sum + Number(fuel.days || 0), 0) / country.official.fuels.length;
  const depletionAt = isoDateAfterDays(tightest.days);

  return {
    tightestFuel: tightest.label,
    tightestDays: tightest.days,
    depletionAt,
    averageDays: Number(averageDays.toFixed(1)),
    statsAsOf: country.official.statsAsOf,
  };
}

export async function buildDashboardData(forceRefresh = false) {
  if (!forceRefresh && dashboardCache.payload && Date.now() < dashboardCache.expiresAt) {
    return dashboardCache.payload;
  }

  const warnings = [];
  let auOfficial = FALLBACK_DATA.au.official;
  let auReports = FALLBACK_DATA.au.reports;
  let nzOfficial = FALLBACK_DATA.nz.official;
  let market = null;

  try {
    const dcceewHtml = await fetchText(SOURCE_URLS.dcceew);
    auOfficial = parseOfficialStats(dcceewHtml);
  } catch (error) {
    warnings.push(`Using fallback official stats: ${error.message}`);
  }

  try {
    auReports = await fetchReports();
  } catch (error) {
    warnings.push(`Using fallback AIP reports: ${error.message}`);
  }

  try {
    const nzHtml = await fetchText(SOURCE_URLS.nzOfficial);
    nzOfficial = parseNzOfficialStats(nzHtml);
  } catch (error) {
    warnings.push(`Using fallback NZ official stats: ${error.message}`);
  }

  try {
    market = await fetchMarketData();
  } catch (error) {
    warnings.push(`Market feed unavailable: ${error.message}`);
    market = {
      brent: { label: "Brent Crude", current: null, change: null, direction: "flat", points: [] },
      audUsd: { label: "AUD/USD", current: null, change: null, direction: "flat", points: [] },
      sourceName: "Unavailable",
    };
  }

  const auCountry = {
    ...structuredClone(FALLBACK_DATA.au),
    official: auOfficial,
    reports: auReports,
  };
  const nzCountry = {
    ...structuredClone(FALLBACK_DATA.nz),
    official: nzOfficial,
  };

  const payload = {
    brand: BRAND,
    refreshedAt: new Date().toISOString(),
    market,
    countries: {
      au: {
        ...auCountry,
        scenarios: buildScenarios(auCountry.official),
        hostNotes: buildCountryHostNotes(auCountry),
        summary: buildCountrySummary(auCountry),
      },
      nz: {
        ...nzCountry,
        scenarios: buildScenarios(nzCountry.official),
        hostNotes: buildCountryHostNotes(nzCountry),
        summary: buildCountrySummary(nzCountry),
      },
    },
    notes: [
      ...buildQuickNotes(auCountry.official, auCountry.reports, market),
      `NZ MBIE baseline is shown alongside AU so the stream can compare both markets on one screen.`,
    ],
    hostNotes: buildHostNotes(auCountry.official, auCountry.reports, market),
    warnings,
    sourceStatus: [
      ...buildSourceStatus(auCountry.official, auCountry.reports, market, warnings),
      {
        label: "NZ official baseline",
        status: warnings.some((item) => item.includes("NZ official")) ? "Fallback" : "Live",
        detail: `${nzCountry.official.sourceName} ${nzCountry.official.statsAsOf}`,
      },
    ],
    sources: [
      { label: "DCCEEW MSO statistics", url: SOURCE_URLS.dcceew },
      { label: "AIP weekly prices landing page", url: SOURCE_URLS.aipLanding },
      { label: "MBIE fuel stocks update", url: SOURCE_URLS.nzOfficial },
      { label: "Brent market feed", url: "https://finance.yahoo.com/quote/BZ=F/" },
    ],
    intel: INTEL_TRACKERS,
  };

  const snapshot = {
    capturedAt: payload.refreshedAt,
    countries: {
      au: Object.fromEntries(payload.countries.au.official.fuels.map((fuel) => [fuel.key, fuel.days])),
      nz: Object.fromEntries(payload.countries.nz.official.fuels.map((fuel) => [fuel.key, fuel.days])),
    },
    brent: payload.market.brent.current,
    audUsd: payload.market.audUsd.current,
  };

  try {
    payload.history = await saveSnapshot(snapshot);
  } catch (error) {
    payload.history = [];
    payload.warnings = [...payload.warnings, `History save failed: ${error.message}`];
  }

  dashboardCache.payload = payload;
  dashboardCache.expiresAt = Date.now() + CACHE_TTL_MS;
  return payload;
}

async function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  createReadStream(filePath).pipe(res);
  return true;
}

export const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (url.pathname === "/api/dashboard") {
    try {
      const payload = await buildDashboardData(url.searchParams.get("refresh") === "1");
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, { error: error.message });
    }
  }

  if (url.pathname === "/api/health") {
    return sendJson(res, 200, {
      ok: true,
      now: new Date().toISOString(),
    });
  }

  if (url.pathname === "/api/history") {
    const history = await readSnapshotHistory();
    return sendJson(res, 200, history);
  }

  if (await serveStatic(req, res, url.pathname)) {
    return;
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    const html = await readFile(path.join(publicDir, "index.html"), "utf8");
    return sendText(res, 200, html, "text/html; charset=utf-8");
  }

  sendText(res, 404, "Not found");
});

if (process.argv[1] === __filename) {
  server.listen(port, () => {
    console.log(`Trans-Tasman Fuel Watch running on http://localhost:${port}`);
    console.log(`Last boot: ${formatDate(new Date())}`);
  });
}
