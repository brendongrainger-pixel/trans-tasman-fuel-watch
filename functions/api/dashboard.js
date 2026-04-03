const SOURCE_URLS = {
  dcceew:
    "https://www.dcceew.gov.au/energy/security/australias-fuel-security/minimum-stockholding-obligation/statistics",
  aipLanding: "https://www.aip.com.au/pricing/weekly-prices-reports",
  nzOfficial: "https://www.mbie.govt.nz/about/news/fuel-stocks-update/",
  brentCsv: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DCOILBRENTEU",
  audUsdRange: "https://api.frankfurter.dev/v1/2026-03-01..?base=AUD&symbols=USD",
};

const FALLBACK_DATA = {
  brand: {
    name: "Trans-Tasman Fuel Watch",
    channelName: "Trans-Tasman Fuel Watch",
    tagline: "Australia and New Zealand fuel countdown live",
    accent: "#12e6c8",
    supportText:
      "Live coverage of fuel pressure across Australia and New Zealand. If you want to support the project, you can help keep the stream running here.",
    supportUrl: "https://buymeacoffee.com/transtasmanfuelwatch?new=1",
    disclaimer:
      "Public-interest dashboard using live source links and scenario modelling. It is commentary, not official emergency guidance or financial advice.",
  },
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

function isoDateAfterDays(days) {
  const date = new Date();
  date.setTime(date.getTime() + Number(days) * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

function safeNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseObservedAt(dateText, publishedText = "") {
  const publishedYearMatch = String(publishedText).match(/(20\d{2})/);
  const year = publishedYearMatch?.[1] || String(new Date().getFullYear());
  const match = String(dateText).match(/(\d{1,2})\s+([A-Za-z]+)/);
  if (!match) return "";
  const [, dayText, monthText] = match;
  const monthMap = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };
  const month = monthMap[monthText.toLowerCase()];
  const day = Number(dayText);
  if (!month || !Number.isFinite(day)) return "";
  const offset = month >= 9 || month <= 3 ? "+13:00" : "+12:00";
  const candidate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T23:59:00${offset}`;
  const ms = Date.parse(candidate);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : "";
}

function stripTags(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function toAbsoluteUrl(base, href) {
  if (!href) return "";
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Fuel-Watch-Live/0.1",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) throw new Error(`Request failed for ${url}: ${response.status}`);
  return response.text();
}

async function fetchJson(url, extraHeaders = {}) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Fuel-Watch-Live/0.1",
      Accept: "application/json",
      ...extraHeaders,
    },
  });

  if (!response.ok) throw new Error(`Request failed for ${url}: ${response.status}`);
  return response.json();
}

async function fetchCsv(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Fuel-Watch-Live/0.1",
      Accept: "text/csv,text/plain",
    },
  });

  if (!response.ok) throw new Error(`Request failed for ${url}: ${response.status}`);
  return response.text();
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "Fuel-Watch-Live/0.1",
      Accept: "application/json",
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`Request failed for ${url}: ${response.status}`);
  return response.json();
}

function decodeBase64UrlJson(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function powerBiApiBase(clusterUri = "") {
  if (!clusterUri) return "";
  const url = new URL(clusterUri);
  const parts = url.hostname.split(".");
  parts[0] = parts[0].replace("-redirect", "").replace("global-", "") + "-api";
  return `${url.protocol}//${parts.join(".")}`;
}

function formatIsoDateForDisplay(datePart = "") {
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return "";
  const monthName = new Date(Date.UTC(year, month - 1, day)).toLocaleString("en-AU", {
    month: "short",
    timeZone: "UTC",
  });
  return `${day} ${monthName} ${year}`;
}

function parseSydneyObservedAt(datePart = "") {
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return "";
  const offset = month >= 10 || month <= 3 ? "+11:00" : "+10:00";
  const candidate = `${datePart}T23:59:00${offset}`;
  const ms = Date.parse(candidate);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : "";
}

function parseOfficialStatsFallback(html) {
  const statsAsOfMatch = html.match(/In ([0-9]{4}[–-][0-9]{2}), the total stocks held by industry under the MSO averaged:/i);
  const statsAsOf = statsAsOfMatch ? statsAsOfMatch[1].replace("-", "–") : FALLBACK_DATA.au.official.statsAsOf;
  const powerBiMatch = html.match(/<iframe[^>]+src="([^"]*app\.powerbi\.com\/view\?r=[^"]+)"/i);
  const powerBiUrl = powerBiMatch?.[1] || FALLBACK_DATA.au.official.powerBiUrl;

  const fallbackByKey = Object.fromEntries(FALLBACK_DATA.au.official.fuels.map((fuel) => [fuel.key, fuel]));
  const fuelPatterns = [
    { key: "petrol", label: "Petrol", volumeRegex: /<li>([\d,]+)\s*ML for gasoline \(petrol\)<\/li>/i, daysRegex: /<li>([\d,]+)\s*days for gasoline \(petrol\)<\/li>/i, surplusRegex: /gasoline stocks were ([\d,]+)% above the MSO/i },
    { key: "jet", label: "Jet Fuel", volumeRegex: /<li>([\d,]+)\s*ML for kerosene \(jet fuel\)<\/li>/i, daysRegex: /<li>([\d,]+)\s*days for kerosene \(jet fuel\)<\/li>/i, surplusRegex: /kerosene stocks were ([\d,]+)% above the MSO/i },
    { key: "diesel", label: "Diesel", volumeRegex: /<li>([\d,]+)\s*ML for diesel<\/li>/i, daysRegex: /<li>([\d,]+)\s*days for diesel<\/li>/i, surplusRegex: /diesel stocks were ([\d,]+)% above the MSO/i },
  ];

  return {
    sourceName: "DCCEEW",
    sourceUrl: SOURCE_URLS.dcceew,
    statsAsOf,
    observedAt: "",
    note: "Quarterly fallback parsed from the official DCCEEW MSO statistics page.",
    powerBiUrl,
    fuels: fuelPatterns.map((pattern) => {
      const fallback = fallbackByKey[pattern.key];
      return {
        key: pattern.key,
        label: pattern.label,
        volumeMl: safeNumber(html.match(pattern.volumeRegex)?.[1]?.replace(/,/g, ""), fallback.volumeMl),
        days: safeNumber(html.match(pattern.daysRegex)?.[1]?.replace(/,/g, ""), fallback.days),
        surplusPct: safeNumber(html.match(pattern.surplusRegex)?.[1]?.replace(/,/g, ""), fallback.surplusPct),
      };
    }),
    parserMode: "fallback",
  };
}

function extractWeeklyDateLiteral(modelsPayload) {
  const containers = modelsPayload?.exploration?.sections?.[0]?.visualContainers || [];
  for (const container of containers) {
    if (typeof container.query !== "string") continue;
    const match = container.query.match(/datetime'(\d{4}-\d{2}-\d{2})T00:00:00'/);
    if (match) return match[1];
  }
  return "";
}

function findDaysVisualQuery(modelsPayload, fieldName) {
  const containers = modelsPayload?.exploration?.sections?.[0]?.visualContainers || [];
  return containers.find((container) => typeof container.config === "string" && container.config.includes(fieldName)) || null;
}

function buildPowerBiQueryRequest(queryString, datasetId, reportId) {
  return {
    Query: JSON.parse(queryString),
    CacheKey: queryString,
    QueryId: "",
    ApplicationContext: {
      DatasetId: datasetId,
      Sources: [{ ReportId: reportId }],
    },
  };
}

function extractPowerBiScalarValue(result) {
  return Number(result?.result?.data?.dsr?.DS?.[0]?.PH?.[0]?.DM0?.[0]?.M0);
}

async function fetchAuWeeklyPowerBiStats(powerBiUrl) {
  const powerBiHtml = await fetchText(powerBiUrl);
  const clusterMatch = powerBiHtml.match(/var resolvedClusterUri = '([^']+)'/);
  const apiBase = powerBiApiBase(clusterMatch?.[1] || "");
  const reportToken = new URL(powerBiUrl).searchParams.get("r");
  if (!apiBase || !reportToken) {
    throw new Error("Unable to resolve public Power BI API context");
  }

  const decoded = decodeBase64UrlJson(reportToken);
  const reportId = decoded.k;
  const requestHeaders = {
    ActivityId: "fuel-watch-live",
    RequestId: crypto.randomUUID(),
    "X-PowerBI-ResourceKey": reportId,
  };

  const modelsPayload = await fetchJson(`${apiBase}/public/reports/${reportId}/modelsAndExploration?preferReadOnlySession=true`, requestHeaders);
  const model = modelsPayload?.models?.[0];
  const selectedDate = extractWeeklyDateLiteral(modelsPayload);
  if (!model?.id || !model?.dbName || !selectedDate) {
    throw new Error("Unable to parse weekly Power BI report metadata");
  }

  const petrolVisual = findDaysVisualQuery(modelsPayload, "MSO_Days_Petrol");
  const jetVisual = findDaysVisualQuery(modelsPayload, "MSO_Days_JetFuel");
  const dieselVisual = findDaysVisualQuery(modelsPayload, "MSO_Days_Diesel");
  if (!petrolVisual?.query || !jetVisual?.query || !dieselVisual?.query) {
    throw new Error("Unable to locate Australia weekly fuel-day visuals");
  }

  const queryBody = {
    version: "1.0.0",
    queries: [
      buildPowerBiQueryRequest(petrolVisual.query, model.dbName, reportId),
      buildPowerBiQueryRequest(jetVisual.query, model.dbName, reportId),
      buildPowerBiQueryRequest(dieselVisual.query, model.dbName, reportId),
    ],
    cancelQueries: [],
    modelId: model.id,
  };

  const queryPayload = await postJson(`${apiBase}/public/reports/querydata?synchronous=true`, queryBody, requestHeaders);
  const [petrol, jet, diesel] = (queryPayload?.results || []).map(extractPowerBiScalarValue);
  if (![petrol, jet, diesel].every(Number.isFinite)) {
    throw new Error("Australia weekly Power BI values were incomplete");
  }

  return {
    statsAsOf: formatIsoDateForDisplay(selectedDate),
    observedAt: parseSydneyObservedAt(selectedDate),
    lastRefreshTime: model.LastRefreshTime || "",
    fuels: { petrol, jet, diesel },
  };
}

async function parseOfficialStats(html) {
  const fallback = parseOfficialStatsFallback(html);
  if (!fallback.powerBiUrl) {
    return fallback;
  }

  try {
    const weekly = await fetchAuWeeklyPowerBiStats(fallback.powerBiUrl);
    const fallbackByKey = Object.fromEntries(fallback.fuels.map((fuel) => [fuel.key, fuel]));
    return {
      sourceName: "DCCEEW weekly",
      sourceUrl: SOURCE_URLS.dcceew,
      statsAsOf: weekly.statsAsOf,
      observedAt: weekly.observedAt,
      note: "Parsed from the official DCCEEW public Power BI weekly snapshot.",
      powerBiUrl: fallback.powerBiUrl,
      fuels: [
        { ...fallbackByKey.petrol, days: weekly.fuels.petrol },
        { ...fallbackByKey.jet, days: weekly.fuels.jet },
        { ...fallbackByKey.diesel, days: weekly.fuels.diesel },
      ],
      parserMode: "weekly",
      powerBiRefreshedAt: weekly.lastRefreshTime,
    };
  } catch (error) {
    return {
      ...fallback,
      note: `${fallback.note} Weekly Power BI extraction failed: ${error.message}`,
    };
  }
}

function parseNzOfficialStats(html) {
  const text = stripTags(html);
  const statsAsOfMatch = html.match(
    /Current fuel stock as at\s*11:59PM\s*(?:[A-Za-z]+\s+)?(\d{1,2}\s+[A-Za-z]+)\s*\(as days'? cover\)/i,
  );
  const publishedMatch = text.match(/Published:\s*([0-9]{1,2}\s+[A-Za-z]+\s+20[0-9]{2})/i);
  const statsAsOf = statsAsOfMatch?.[1] || publishedMatch?.[1] || FALLBACK_DATA.nz.official.statsAsOf;
  const observedAt = statsAsOfMatch ? parseObservedAt(statsAsOfMatch[1], publishedMatch?.[1]) : "";

  const rowMatch = html.match(
    /Total NZ stock\*[\s\S]{0,250}?<td>\s*<strong>([0-9]+(?:\.[0-9]+)?)<\/strong>\s*<\/td>[\s\S]{0,120}?<td>\s*<strong>([0-9]+(?:\.[0-9]+)?)<\/strong>\s*<\/td>[\s\S]{0,120}?<td>\s*<strong>([0-9]+(?:\.[0-9]+)?)<\/strong>\s*<\/td>/i,
  );

  if (!rowMatch) {
    throw new Error("Unable to parse MBIE total stock table");
  }

  return {
    sourceName: "MBIE",
    sourceUrl: SOURCE_URLS.nzOfficial,
    statsAsOf,
    observedAt,
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
    title: titleMatch ? stripTags(titleMatch[1]) : `${fuel} report`,
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
  const [petrolHtml, dieselHtml] = await Promise.all([fetchText(petrolUrl), fetchText(dieselUrl)]);
  return {
    landingUrl: SOURCE_URLS.aipLanding,
    reports: [
      parseReportPage(petrolHtml, petrolUrl, "petrol"),
      parseReportPage(dieselHtml, dieselUrl, "diesel"),
    ],
  };
}

function buildSeries(label, points) {
  const filtered = points.filter((point) => Number.isFinite(point.value));
  const latest = filtered.at(-1)?.value ?? null;
  const previous = filtered.at(-2)?.value ?? latest;
  const change = latest !== null && previous !== null ? latest - previous : null;
  return {
    label,
    current: latest,
    previous,
    change,
    direction: change === null ? "flat" : change > 0 ? "up" : change < 0 ? "down" : "flat",
    points: filtered.slice(-14).map((point) => ({
      date: new Date(point.timestamp).toISOString(),
      value: point.value,
    })),
  };
}

function parseFredCsvSeries(csv, label) {
  const lines = csv.trim().split(/\r?\n/).slice(1);
  const points = lines
    .map((line) => {
      const [date, value] = line.split(",");
      const parsed = Number(value);
      const timestamp = Date.parse(`${date}T00:00:00Z`);
      return {
        timestamp,
        value: Number.isFinite(parsed) ? parsed : null,
      };
    })
    .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.value));

  return buildSeries(label, points);
}

function parseFrankfurterRange(json, label) {
  const points = Object.entries(json?.rates || {})
    .map(([date, entry]) => ({
      timestamp: Date.parse(`${date}T00:00:00Z`),
      value: Number(entry?.USD),
    }))
    .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.value))
    .sort((a, b) => a.timestamp - b.timestamp);

  return buildSeries(label, points);
}

async function fetchMarketData() {
  const [brentCsv, audUsdJson] = await Promise.all([
    fetchCsv(SOURCE_URLS.brentCsv),
    fetchJson(SOURCE_URLS.audUsdRange),
  ]);
  return {
    brent: parseFredCsvSeries(brentCsv, "Brent Crude"),
    audUsd: parseFrankfurterRange(audUsdJson, "AUD/USD"),
    sourceName: "FRED Brent + Frankfurter FX",
  };
}

function buildScenarios(official) {
  return SCENARIOS.map((scenario) => ({
    ...scenario,
    fuels: official.fuels.map((fuel) => ({
      key: fuel.key,
      label: fuel.label,
      days: Math.round(fuel.days * scenario.multiplier),
      depletionDate: isoDateAfterDays(fuel.days * scenario.multiplier),
    })),
  }));
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

function isoDateAfterDaysFrom(days, startIso = "") {
  const startMs = new Date(startIso).getTime();
  const baseMs = Number.isFinite(startMs) ? startMs : Date.now();
  return new Date(baseMs + Number(days) * 24 * 60 * 60 * 1000).toISOString();
}

function buildCountrySummary(country, refreshedAt) {
  const tightest = [...country.official.fuels].sort((a, b) => a.days - b.days)[0];
  const averageDays =
    country.official.fuels.reduce((sum, fuel) => sum + Number(fuel.days || 0), 0) / country.official.fuels.length;
  return {
    tightestFuel: tightest.label,
    tightestDays: tightest.days,
    depletionAt: isoDateAfterDaysFrom(tightest.days, country.official.observedAt || refreshedAt),
    averageDays: Number(averageDays.toFixed(1)),
    statsAsOf: country.official.statsAsOf,
    basisAt: country.official.observedAt || refreshedAt,
  };
}

function buildSourceStatus(auCountry, nzCountry, market, warnings) {
  return [
    {
      label: "Official reserves",
      status: warnings.some((item) => item.includes("fallback official stats")) ? "Fallback" : "Live",
      detail: `${auCountry.official.sourceName} ${auCountry.official.statsAsOf}`,
    },
    {
      label: "Weekly pricing reports",
      status: warnings.some((item) => item.includes("AIP")) ? "Fallback" : "Live",
      detail: `${auCountry.reports.reports.length} linked reports`,
    },
    {
      label: "Market feed",
      status: warnings.some((item) => item.includes("Market")) ? "Offline" : "Live",
      detail: market.sourceName,
    },
    {
      label: "NZ official baseline",
      status: warnings.some((item) => item.includes("NZ official")) ? "Fallback" : "Live",
      detail: `${nzCountry.official.sourceName} ${nzCountry.official.statsAsOf}`,
    },
  ];
}

function buildPayload(auCountry, nzCountry, market, warnings) {
  const refreshedAt = new Date().toISOString();
  return {
    brand: FALLBACK_DATA.brand,
    refreshedAt,
    market,
    countries: {
      au: {
        ...auCountry,
        scenarios: buildScenarios(auCountry.official),
        hostNotes: buildCountryHostNotes(auCountry),
        summary: buildCountrySummary(auCountry, refreshedAt),
      },
      nz: {
        ...nzCountry,
        scenarios: buildScenarios(nzCountry.official),
        hostNotes: buildCountryHostNotes(nzCountry),
        summary: buildCountrySummary(nzCountry, refreshedAt),
      },
    },
    notes: [
      `DCCEEW baseline: ${auCountry.official.fuels[0].days} days petrol / ${auCountry.official.fuels[2].days} days diesel.`,
      `Latest AIP weekly reports are linked live for Australian petrol and diesel context.`,
      market.brent.current !== null
        ? `Brent is ${market.brent.current.toFixed(2)} USD/bbl (${market.brent.change >= 0 ? "+" : ""}${(market.brent.change ?? 0).toFixed(2)} vs prior session).`
        : "Brent market feed unavailable, using source fallback messaging.",
      "NZ MBIE baseline is shown alongside AU so the stream can compare both markets on one screen.",
    ],
    hostNotes: [],
    warnings,
    sourceStatus: buildSourceStatus(auCountry, nzCountry, market, warnings),
    sources: [
      { label: "DCCEEW MSO statistics", url: SOURCE_URLS.dcceew },
      { label: "AIP weekly prices landing page", url: SOURCE_URLS.aipLanding },
      { label: "MBIE fuel stocks update", url: SOURCE_URLS.nzOfficial },
      { label: "Brent market feed", url: "https://finance.yahoo.com/quote/BZ=F/" },
    ],
    intel: INTEL_TRACKERS,
    history: [],
  };
}

export async function onRequestGet() {
  const warnings = [];
  let auOfficial = FALLBACK_DATA.au.official;
  let auReports = FALLBACK_DATA.au.reports;
  let nzOfficial = FALLBACK_DATA.nz.official;
  let market = {
    brent: { label: "Brent Crude", current: null, change: null, direction: "flat", points: [] },
    audUsd: { label: "AUD/USD", current: null, change: null, direction: "flat", points: [] },
    sourceName: "Unavailable",
  };

  try {
    const dcceewHtml = await fetchText(SOURCE_URLS.dcceew);
    auOfficial = await parseOfficialStats(dcceewHtml);
    if (auOfficial.parserMode !== "weekly") {
      warnings.push("Using fallback official stats: Australia weekly Power BI unavailable");
    }
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

  const payload = buildPayload(auCountry, nzCountry, market, warnings);

  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}
